import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import slugify from 'slugify'; // Ganti baris import ini
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { PostResponse, PaginatedPostsResponse, PaginationMeta } from '../common/types';
import { Post, Prisma } from '@prisma/client';

@Injectable()
export class PostsService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_KEY_PREFIX = {
    POST: 'post:',
    LIST: 'posts:list:',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(userId: string, dto: CreatePostDto): Promise<PostResponse> {
    const slug = this.generateSlug(dto.title);

    const post = await this.prisma.post.create({
      data: {
        title: dto.title,
        content: dto.content,
        slug,
        tags: dto.tags ?? [],
        published: dto.published ?? false,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    await this.invalidatePostsCache();

    return post as PostResponse;
  }

  async findAll(query: QueryPostsDto): Promise<PaginatedPostsResponse> {
    const { page = 1, limit = 10, search, tag, published } = query;
    const skip = (page - 1) * limit;

    // Try to get from cache
    const cacheKey = `${this.CACHE_KEY_PREFIX.LIST}${JSON.stringify(query)}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as PaginatedPostsResponse;
    }

    const where = this.buildWhereClause(search, tag, published);

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    const meta: PaginationMeta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    const result: PaginatedPostsResponse = {
      data: posts as PostResponse[],
      meta,
    };

    // Cache result
    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);

    return result;
  }

  async findOne(slug: string, userId?: string): Promise<PostResponse> {
    // Try cache first
    const cacheKey = `${this.CACHE_KEY_PREFIX.POST}${slug}`;
    const cached = await this.redis.get(cacheKey);

    let post: Post & {
      author: { id: string; username: string; email: string };
      _count: { comments: number };
    };

    if (cached) {
      post = JSON.parse(cached);
    } else {
      const foundPost = await this.prisma.post.findUnique({
        where: { slug, deletedAt: null },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      });

      if (!foundPost) {
        throw new NotFoundException('Post not found');
      }

      post = foundPost;
      await this.redis.set(cacheKey, JSON.stringify(post), this.CACHE_TTL);
    }

    const result: PostResponse = {
      ...post,
      userLike: null,
    };

    // Get user's like status if authenticated
    if (userId) {
      const userLike = await this.prisma.postLike.findUnique({
        where: {
          userId_postId: {
            userId,
            postId: post.id,
          },
        },
      });
      result.userLike = userLike?.value ?? null;
    }

    return result;
  }

  async update(slug: string, userId: string, dto: UpdatePostDto): Promise<PostResponse> {
    const post = await this.findPostBySlug(slug);

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    const newSlug = dto.title ? this.generateSlug(dto.title) : undefined;

    const updated = await this.prisma.post.update({
      where: { id: post.id },
      data: {
        ...dto,
        slug: newSlug,
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

    // Invalidate cache
    await this.invalidatePostCache(post.slug);
    if (newSlug && newSlug !== post.slug) {
      await this.invalidatePostCache(newSlug);
    }
    await this.invalidatePostsCache();

    return updated as PostResponse;
  }

  async remove(slug: string, userId: string): Promise<void> {
    const post = await this.findPostBySlug(slug);

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Soft delete
    await this.prisma.post.update({
      where: { id: post.id },
      data: { deletedAt: new Date() },
    });

    // Invalidate cache
    await this.invalidatePostCache(slug);
    await this.invalidatePostsCache();
  }

  async likePost(slug: string, userId: string, value: number): Promise<PostResponse> {
    const post = await this.findPostBySlug(slug);

    const existingLike = await this.prisma.postLike.findUnique({
      where: {
        userId_postId: {
          userId,
          postId: post.id,
        },
      },
    });

    if (existingLike) {
      await this.handleExistingLike(existingLike, post.id, userId, value);
    } else {
      await this.createNewLike(post.id, userId, value);
    }

    // Invalidate cache
    await this.invalidatePostCache(slug);

    return this.findOne(slug, userId);
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

  private buildWhereClause(
    search?: string,
    tag?: string,
    published?: boolean,
  ): Prisma.PostWhereInput {
    const where: Prisma.PostWhereInput = {
      deletedAt: null,
    };

    if (published !== undefined) {
      where.published = published;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    if (tag) {
      where.tags = { has: tag };
    }

    return where;
  }

  private async handleExistingLike(
    existingLike: { value: number },
    postId: string,
    userId: string,
    value: number,
  ): Promise<void> {
    if (existingLike.value === value) {
      // Remove like/dislike
      await this.prisma.$transaction([
        this.prisma.postLike.delete({
          where: {
            userId_postId: {
              userId,
              postId,
            },
          },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: {
            likesCount: value === 1 ? { decrement: 1 } : undefined,
            dislikesCount: value === -1 ? { decrement: 1 } : undefined,
          },
        }),
      ]);
    } else {
      // Change from like to dislike or vice versa
      await this.prisma.$transaction([
        this.prisma.postLike.update({
          where: {
            userId_postId: {
              userId,
              postId,
            },
          },
          data: { value },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: {
            likesCount: value === 1 ? { increment: 1 } : { decrement: 1 },
            dislikesCount: value === -1 ? { increment: 1 } : { decrement: 1 },
          },
        }),
      ]);
    }
  }

  private async createNewLike(postId: string, userId: string, value: number): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.postLike.create({
        data: {
          userId,
          postId,
          value,
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: {
          likesCount: value === 1 ? { increment: 1 } : undefined,
          dislikesCount: value === -1 ? { increment: 1 } : undefined,
        },
      }),
    ]);
  }

  private generateSlug(title: string): string {
    const baseSlug = slugify(title, { lower: true, strict: true });
    const random = Math.random().toString(36).substring(2, 8);
    return `${baseSlug}-${random}`;
  }

  private async invalidatePostCache(slug: string): Promise<void> {
    await this.redis.del(`${this.CACHE_KEY_PREFIX.POST}${slug}`);
  }

  private async invalidatePostsCache(): Promise<void> {
    await this.redis.delPattern(`${this.CACHE_KEY_PREFIX.LIST}*`);
  }
}
