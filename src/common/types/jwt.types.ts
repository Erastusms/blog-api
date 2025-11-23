// src/common/types/jwt.types.ts
export interface JwtPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

export interface JwtTokens {
  accessToken: string;
  refreshToken: string;
}
