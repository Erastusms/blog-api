import { PaginationMeta } from './pagination.types';

// src/common/types/comment.types.ts
export interface CommentAuthor {
  id: string;
  username: string;
}

export interface CommentResponse {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  depth: number;
  likesCount: number;
  dislikesCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  author: CommentAuthor;
  userLike?: number | null;
  children?: CommentResponse[];
}

export interface PaginatedCommentsResponse {
  data: CommentResponse[];
  meta: PaginationMeta;
}
