// src/comments/dto/create-comment.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'This is a great post!' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    required: false,
    description: 'Parent comment ID for nested replies',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
