// src/posts/posts.controller.ts
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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { LikePostDto } from './dto/like-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { PostResponse, PaginatedPostsResponse } from '../common/types';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new post' })
  create(@GetUser('id') userId: string, @Body() dto: CreatePostDto): Promise<PostResponse> {
    return this.postsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all posts with pagination and filters' })
  @ApiQuery({ type: QueryPostsDto })
  findAll(@Query() query: QueryPostsDto): Promise<PaginatedPostsResponse> {
    return this.postsService.findAll(query);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get post by slug' })
  findOne(@Param('slug') slug: string, @GetUser('id') userId?: string): Promise<PostResponse> {
    return this.postsService.findOne(slug, userId);
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update post' })
  update(
    @Param('slug') slug: string,
    @GetUser('id') userId: string,
    @Body() dto: UpdatePostDto,
  ): Promise<PostResponse> {
    return this.postsService.update(slug, userId, dto);
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete post (soft delete)' })
  remove(@Param('slug') slug: string, @GetUser('id') userId: string): Promise<void> {
    return this.postsService.remove(slug, userId);
  }

  @Post(':slug/like')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like or dislike a post' })
  likePost(
    @Param('slug') slug: string,
    @GetUser('id') userId: string,
    @Body() dto: LikePostDto,
  ): Promise<PostResponse> {
    return this.postsService.likePost(slug, userId, dto.value);
  }
}
