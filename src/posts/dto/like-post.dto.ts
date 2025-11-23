// src/posts/dto/like-post.dto.ts
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum LikeValue {
  LIKE = 1,
  DISLIKE = -1,
}

export class LikePostDto {
  @ApiProperty({ enum: LikeValue, example: LikeValue.LIKE })
  @IsEnum(LikeValue)
  value: LikeValue;
}
