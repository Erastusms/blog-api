import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface UserProfilePost {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
}

export interface UserProfile {
  id: string;
  username: string;
  createdAt: Date;
  posts: UserProfilePost[];
  _count: {
    posts: number;
    comments: number;
  };
}

export interface UserBasic {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  _count: {
    posts: number;
    comments: number;
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string): Promise<UserBasic> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            comments: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByUsername(username: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        createdAt: true,
        posts: {
          where: { published: true, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            title: true,
            slug: true,
            tags: true,
            likesCount: true,
            commentsCount: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            posts: true,
            comments: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
