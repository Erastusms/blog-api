import { PaginationMeta } from './pagination.types';

// src/common/types/post.types.ts
export interface PostAuthor {
  id: string;
  username: string;
  email?: string;
}

export interface PostResponse {
  id: string;
  title: string;
  content: string;
  slug: string;
  tags: string[];
  published: boolean;
  authorId: string;
  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  author: PostAuthor;
  userLike?: number | null;
  _count?: {
    comments: number;
  };
}

export interface PaginatedPostsResponse {
  data: PostResponse[];
  meta: PaginationMeta;
}
