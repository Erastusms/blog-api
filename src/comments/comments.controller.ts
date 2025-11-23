// src/comments/comments.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';
import { LikeCommentDto } from './dto/like-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CommentResponse, PaginatedCommentsResponse } from '../common/types';
import { OptionalJwtAuthGuard } from '../posts/guards/optional-jwt-auth.guard';

@ApiTags('Comments')
@Controller('posts/:postSlug/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create comment on post' })
  create(
    @Param('postSlug') postSlug: string,
    @GetUser('id') userId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponse> {
    return this.commentsService.create(postSlug, userId, dto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all comments for a post' })
  findAll(
    @Param('postSlug') postSlug: string,
    @Query() query: QueryCommentsDto,
    @GetUser('id') userId?: string,
  ): Promise<PaginatedCommentsResponse> {
    return this.commentsService.findByPost(postSlug, query, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update comment' })
  update(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() dto: UpdateCommentDto,
  ): Promise<CommentResponse> {
    return this.commentsService.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete comment (soft delete)' })
  remove(@Param('id') id: string, @GetUser('id') userId: string): Promise<void> {
    return this.commentsService.remove(id, userId);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like or dislike a comment' })
  likeComment(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() dto: LikeCommentDto,
  ): Promise<CommentResponse> {
    return this.commentsService.likeComment(id, userId, dto.value);
  }
}
