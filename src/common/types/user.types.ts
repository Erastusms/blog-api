// src/common/types/user.types.ts
export interface UserResponse {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
}

export interface UserWithTokens extends UserResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}
