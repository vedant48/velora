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

  @Delete(':mediaType/:tmdbId')
  remove(@CurrentUserId() userId: string, @Param('mediaType') mediaType: string, @Param('tmdbId') tmdbId: string) {
    return this.library.remove(userId, mediaType, tmdbId);
  }
}
