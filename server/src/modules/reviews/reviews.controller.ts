import { Body, Controller, Delete, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUserId } from '../../common/auth.guard';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('mine')
  @UseGuards(AuthGuard)
  mine(@CurrentUserId() userId: string) {
    return this.reviews.mine(userId);
  }

  @Get(':mediaType/:tmdbId/circle')
  @UseGuards(AuthGuard)
  circle(@CurrentUserId() userId: string, @Param('mediaType') mediaType: string, @Param('tmdbId') tmdbId: string) {
    return this.reviews.circle(userId, mediaType, tmdbId);
  }

  @Get(':mediaType/:tmdbId')
  list(@Param('mediaType') mediaType: string, @Param('tmdbId') tmdbId: string, @Query('season') season?: string) {
    return this.reviews.listForTitle(mediaType, tmdbId, season);
  }

  @Put(':mediaType/:tmdbId')
  @UseGuards(AuthGuard)
  upsert(
    @CurrentUserId() userId: string,
    @Param('mediaType') mediaType: string,
    @Param('tmdbId') tmdbId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.reviews.upsert(userId, mediaType, tmdbId, body);
  }

  @Delete(':mediaType/:tmdbId')
  @UseGuards(AuthGuard)
  remove(
    @CurrentUserId() userId: string,
    @Param('mediaType') mediaType: string,
    @Param('tmdbId') tmdbId: string,
    @Query('season') season?: string,
  ) {
    return this.reviews.remove(userId, mediaType, tmdbId, season);
  }
}
