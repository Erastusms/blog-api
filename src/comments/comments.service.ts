import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';
import { CommentResponse, PaginatedCommentsResponse, PaginationMeta } from '../common/types';
import { Comment, Post } from '@prisma/client';

interface CommentWithAuthor extends Comment {
  author: {
    id: string;
    username: string;
  };
}

@Injectable()
export class CommentsService {
  private readonly MAX_DEPTH = 7;
  private readonly RATE_LIMIT_MAX = 5;
  private readonly RATE_LIMIT_WINDOW = 60; // seconds
  private readonly CACHE_KEY_PREFIX = 'comments:post:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(postSlug: string, userId: string, dto: CreateCommentDto): Promise<CommentResponse> {
    // Check rate limit
    await this.checkRateLimit(userId);

    // Find post
    const post = await this.findPostBySlug(postSlug);

    let depth = 0;
    let parentComment: Comment | null = null;

    // If replying to a comment
    if (dto.parentId) {
      parentComment = await this.validateParentComment(dto.parentId, post.id);
      depth = parentComment.depth + 1;

      if (depth > this.MAX_DEPTH) {
        throw new BadRequestException(`Maximum nesting depth of ${this.MAX_DEPTH} reached`);
      }
    }

    // Create comment
    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        postId: post.id,
        authorId: userId,
        parentId: dto.parentId,
        depth,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Update post comment count
    await this.prisma.post.update({
      where: { id: post.id },
      data: { commentsCount: { increment: 1 } },
    });

    // Create notification if replying to another user's comment
    if (parentComment && parentComment.authorId !== userId) {
      await this.notifications.createNotification({
        userId: parentComment.authorId,
        type: 'REPLY',
        title: 'New Reply',
        message: `${comment.author.username} replied to your comment`,
        commentId: comment.id,
      });
    }

    // Invalidate cache
    await this.invalidateCommentsCache(post.id);
    await this.invalidatePostCache(postSlug);

    return comment as CommentResponse;
  }

  async findByPost(
    postSlug: string,
    query: QueryCommentsDto,
    userId?: string,
  ): Promise<PaginatedCommentsResponse> {
    const post = await this.findPostBySlug(postSlug);

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Get all comments for this post
    const comments = await this.prisma.comment.findMany({
      where: {
        postId: post.id,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Add user's like status if authenticated
    let commentsWithLikes = comments as CommentResponse[];
    if (userId) {
      commentsWithLikes = await this.addUserLikeStatus(comments, userId);
    }

    // Build tree structure
    const tree = this.buildCommentTree(commentsWithLikes);

    // Paginate root comments only
    const paginatedTree = tree.slice(skip, skip + limit);

    const meta: PaginationMeta = {
      total: tree.length,
      page,
      limit,
      totalPages: Math.ceil(tree.length / limit),
    };

    return {
      data: paginatedTree,
      meta,
    };
  }

  async update(commentId: string, userId: string, dto: UpdateCommentDto): Promise<CommentResponse> {
    const comment = await this.findCommentById(commentId);

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content: dto.content },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Invalidate cache
    await this.invalidateCommentsCache(comment.postId);

    return updated as CommentResponse;
  }

  async remove(commentId: string, userId: string): Promise<void> {
    const comment = await this.findCommentById(commentId);

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Soft delete
    await this.prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    // Update post comment count
    await this.prisma.post.update({
      where: { id: comment.postId },
      data: { commentsCount: { decrement: 1 } },
    });

    // Invalidate cache
    await this.invalidateCommentsCache(comment.postId);
  }

  async likeComment(commentId: string, userId: string, value: number): Promise<CommentResponse> {
    const comment = await this.findCommentById(commentId);

    const existingLike = await this.prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    if (existingLike) {
      await this.handleExistingLike(existingLike, commentId, userId, value);
    } else {
      await this.createNewLike(commentId, userId, value);
    }

    // Invalidate cache
    await this.invalidateCommentsCache(comment.postId);

    const updated = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return updated as CommentResponse;
  }

  private async findPostBySlug(slug: string): Promise<Post> {
    const post = await this.prisma.post.findUnique({
      where: { slug, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  private async findCommentById(commentId: string): Promise<Comment> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId, deletedAt: null },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  private async validateParentComment(parentId: string, postId: string): Promise<Comment> {
    const parentComment = await this.prisma.comment.findUnique({
      where: { id: parentId, deletedAt: null },
    });

    if (!parentComment) {
      throw new NotFoundException('Parent comment not found');
    }

    if (parentComment.postId !== postId) {
      throw new BadRequestException('Parent comment does not belong to this post');
    }

    return parentComment;
  }

  private async addUserLikeStatus(
    comments: CommentWithAuthor[],
    userId: string,
  ): Promise<CommentResponse[]> {
    const commentIds = comments.map((c) => c.id);
    const userLikes = await this.prisma.commentLike.findMany({
      where: {
        userId,
        commentId: { in: commentIds },
      },
    });

    const likesMap = new Map(userLikes.map((l) => [l.commentId, l.value]));

    return comments.map((comment) => ({
      ...comment,
      userLike: likesMap.get(comment.id) ?? null,
      children: [],
    }));
  }

  private buildCommentTree(comments: CommentResponse[]): CommentResponse[] {
    const commentMap = new Map<string, CommentResponse>();
    const rootComments: CommentResponse[] = [];

    // Create a map of all comments
    comments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, children: [] });
    });

    // Build the tree
    comments.forEach((comment) => {
      const node = commentMap.get(comment.id);
      if (!node) return;

      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent?.children) {
          parent.children.push(node);
        }
      } else {
        rootComments.push(node);
      }
    });

    return rootComments;
  }

  private async checkRateLimit(userId: string): Promise<void> {
    const key = `rate_limit:comment:user:${userId}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, this.RATE_LIMIT_WINDOW);
    }

    if (current > this.RATE_LIMIT_MAX) {
      throw new BadRequestException(
        `Rate limit exceeded. Maximum ${this.RATE_LIMIT_MAX} comments per ${this.RATE_LIMIT_WINDOW} seconds.`,
      );
    }
  }

  private async handleExistingLike(
    existingLike: { value: number },
    commentId: string,
    userId: string,
    value: number,
  ): Promise<void> {
    if (existingLike.value === value) {
      await this.prisma.$transaction([
        this.prisma.commentLike.delete({
          where: {
            userId_commentId: {
              userId,
              commentId,
            },
          },
        }),
        this.prisma.comment.update({
          where: { id: commentId },
          data: {
            likesCount: value === 1 ? { decrement: 1 } : undefined,
            dislikesCount: value === -1 ? { decrement: 1 } : undefined,
          },
        }),
      ]);
    } else {
      await this.prisma.$transaction([
        this.prisma.commentLike.update({
          where: {
            userId_commentId: {
              userId,
              commentId,
            },
          },
          data: { value },
        }),
        this.prisma.comment.update({
          where: { id: commentId },
          data: {
            likesCount: value === 1 ? { increment: 1 } : { decrement: 1 },
            dislikesCount: value === -1 ? { increment: 1 } : { decrement: 1 },
          },
        }),
      ]);
    }
  }

  private async createNewLike(commentId: string, userId: string, value: number): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.commentLike.create({
        data: {
          userId,
          commentId,
          value,
        },
      }),
      this.prisma.comment.update({
        where: { id: commentId },
        data: {
          likesCount: value === 1 ? { increment: 1 } : undefined,
          dislikesCount: value === -1 ? { increment: 1 } : undefined,
        },
      }),
    ]);
  }

  private async invalidateCommentsCache(postId: string): Promise<void> {
    await this.redis.delPattern(`${this.CACHE_KEY_PREFIX}${postId}:*`);
  }

  private async invalidatePostCache(postSlug: string): Promise<void> {
    await this.redis.del(`post:${postSlug}`);
  }
}
