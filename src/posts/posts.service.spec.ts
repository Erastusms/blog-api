import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('PostsService', () => {
  let service: PostsService;
  let prisma: PrismaService;
  let redis: RedisService;

  const mockPrismaService = {
    post: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    postLike: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a post', async () => {
      const userId = 'user-id';
      const dto = {
        title: 'Test Post',
        content: 'Test content',
        tags: ['test'],
        published: true,
      };

      const mockPost = {
        id: 'post-id',
        ...dto,
        slug: 'test-post-abc123',
        authorId: userId,
        likesCount: 0,
        dislikesCount: 0,
        commentsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        author: { id: userId, username: 'testuser', email: 'test@test.com' },
      };

      mockPrismaService.post.create.mockResolvedValue(mockPost);
      mockRedisService.delPattern.mockResolvedValue(undefined);

      const result = await service.create(userId, dto);

      expect(result).toEqual(mockPost);
      expect(prisma.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: dto.title,
          content: dto.content,
          tags: dto.tags,
          published: dto.published,
          authorId: userId,
        }),
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
    });
  });

  describe('findOne', () => {
    it('should return a post by slug', async () => {
      const slug = 'test-post-abc123';
      const mockPost = {
        id: 'post-id',
        title: 'Test Post',
        slug,
        content: 'Test content',
        tags: ['test'],
        published: true,
        authorId: 'user-id',
        likesCount: 0,
        dislikesCount: 0,
        commentsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        author: { id: 'user-id', username: 'testuser', email: 'test@test.com' },
        _count: { comments: 0 },
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.findOne(slug);

      expect(result).toEqual({ ...mockPost, userLike: null });
      expect(prisma.post.findUnique).toHaveBeenCalledWith({
        where: { slug, deletedAt: null },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if post not found', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a post', async () => {
      const slug = 'test-post';
      const userId = 'user-id';
      const dto = { title: 'Updated Title' };

      const mockPost = {
        id: 'post-id',
        slug,
        authorId: userId,
        title: 'Old Title',
        content: 'Content',
        tags: [],
        published: true,
        likesCount: 0,
        dislikesCount: 0,
        commentsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const updatedPost = {
        ...mockPost,
        ...dto,
        author: { id: userId, username: 'testuser' },
      };

      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.post.update.mockResolvedValue(updatedPost);
      mockRedisService.del.mockResolvedValue(undefined);
      mockRedisService.delPattern.mockResolvedValue(undefined);

      const result = await service.update(slug, userId, dto);

      expect(result.title).toBe(dto.title);
    });

    it('should throw ForbiddenException if user is not author', async () => {
      const mockPost = {
        id: 'post-id',
        slug: 'test-post',
        authorId: 'other-user-id',
        title: 'Title',
        content: 'Content',
        tags: [],
        published: true,
        likesCount: 0,
        dislikesCount: 0,
        commentsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);

      await expect(service.update('test-post', 'user-id', { title: 'New' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
