import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUserId } from '../../common/auth.guard';
import { LibraryService } from './library.service';

@Controller('library')
@UseGuards(AuthGuard)
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Get()
  list(@CurrentUserId() userId: string, @Query('status') status?: string, @Query('mediaType') mediaType?: string) {
    return this.library.list(userId, status, mediaType);
  }

  @Get('tv/:tmdbId/episodes')
  episodeProgress(@CurrentUserId() userId: string, @Param('tmdbId') tmdbId: string) {
    return this.library.getEpisodeProgress(userId, tmdbId);
  }

  @Put('tv/:tmdbId/episodes')
  setEpisode(@CurrentUserId() userId: string, @Param('tmdbId') tmdbId: string, @Body() body: Record<string, unknown>) {
    return this.library.setEpisodeWatched(userId, tmdbId, body);
  }

  @Put('tv/:tmdbId/seasons/:season')
  setSeason(
    @CurrentUserId() userId: string,
    @Param('tmdbId') tmdbId: string,
    @Param('season') season: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.library.setSeasonWatched(userId, tmdbId, season, body);
  }

  @Post('lookup')
  lookup(@CurrentUserId() userId: string, @Body() body: Record<string, unknown>) {
    return this.library.lookup(userId, body.refs);
  }

  @Get('export')
  export(@CurrentUserId() userId: string, @Query('format') format?: string) {
    return format === 'simkl' ? this.library.exportSimklCsv(userId) : this.library.exportVelora(userId);
  }

  @Post('import')
  import(@CurrentUserId() userId: string, @Body() body: Record<string, unknown>) {
    const format = String(body.format ?? 'velora');
    if (format === 'simkl') return this.library.importSimkl(userId, body.data);
    return this.library.importVelora(userId, body.data);
  }

  @Post('import/must')
  importMust(@CurrentUserId() userId: string, @Body() body: Record<string, unknown>) {
    return this.library.importMust(userId, body);
  }

  @Put(':mediaType/:tmdbId')
  upsert(
    @CurrentUserId() userId: string,
    @Param('mediaType') mediaType: string,
    @Param('tmdbId') tmdbId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.library.upsert(userId, mediaType, tmdbId, body);
  }

  @Patch(':mediaType/:tmdbId')
  patch(
    @CurrentUserId() userId: string,
    @Param('mediaType') mediaType: string,
    @Param('tmdbId') tmdbId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.library.patch(userId, mediaType, tmdbId, body);
  }

  @Post(':mediaType/:tmdbId/move-to-want')
  moveToWant(@CurrentUserId() userId: string, @Param('mediaType') mediaType: string, @Param('tmdbId') tmdbId: string) {
    return this.library.moveToWant(userId, mediaType, tmdbId);
  }

  @Delete(':mediaType/:tmdbId')
  remove(@CurrentUserId() userId: string, @Param('mediaType') mediaType: string, @Param('tmdbId') tmdbId: string) {
    return this.library.remove(userId, mediaType, tmdbId);
  }
}

/** Aggregate per-title counts for the details page stats row. Public: counts only, no user data. */
@Controller('title-stats')
export class TitleStatsController {
  constructor(private readonly library: LibraryService) {}

  @Get(':mediaType/:tmdbId')
  stats(@Param('mediaType') mediaType: string, @Param('tmdbId') tmdbId: string) {
    return this.library.titleStats(mediaType, tmdbId);
  }
}
