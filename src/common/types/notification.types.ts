// src/common/types/notification.types.ts
export interface NotificationComment {
  id: string;
  content: string;
  post: {
    slug: string;
    title: string;
  };
}

export interface NotificationResponse {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  commentId: string | null;
  read: boolean;
  createdAt: Date;
  comment?: NotificationComment | null;
}

export interface CreateNotificationDto {
  userId: string;
  type: string;
  title: string;
  message: string;
  commentId?: string;
}
