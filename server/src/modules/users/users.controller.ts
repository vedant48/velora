import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard, CurrentUserId } from '../../common/auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('search')
  @UseGuards(AuthGuard)
  search(@Query('q') q: string) {
    return this.users.search(q);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  updateMe(@CurrentUserId() userId: string, @Body() body: Record<string, unknown>) {
    return this.users.updateMe(userId, body);
  }

  @Delete('me')
  @UseGuards(AuthGuard)
  deleteMe(@CurrentUserId() userId: string) {
    return this.users.deleteMe(userId);
  }

  /** Upload/replace the caller's profile photo (raw JPEG or PNG bytes). */
  @Put('me/avatar')
  @UseGuards(AuthGuard)
  setAvatar(@CurrentUserId() userId: string, @Req() req: Request) {
    const body = req.body;
    const bytes = Buffer.isBuffer(body) ? new Uint8Array(body) : body ? new Uint8Array(body as ArrayBuffer) : null;
    if (!bytes || bytes.length === 0) throw new BadRequestException('Send the image bytes as the request body');
    return this.users.setAvatar(userId, bytes);
  }

  @Delete('me/avatar')
  @UseGuards(AuthGuard)
  removeAvatar(@CurrentUserId() userId: string) {
    return this.users.removeAvatar(userId);
  }

  /**
   * A user's profile photo. Avatars are profile basics: visible to signed-in
   * members like display name and bio, including for private accounts.
   * The client appends ?v=<avatarAt>, which busts caches on replacement;
   * removal returns 404 at the origin immediately. Because photos are
   * user-controlled, cache lifetime is deliberately short (5 minutes plus
   * revalidation): a removed or replaced photo can linger in client/edge
   * caches at most that long, and conditional revalidation keeps repeat
   * views cheap. Removed photos are never promised as instantly gone from
   * every cache.
   */
  @Get(':username/avatar')
  @UseGuards(AuthGuard)
  async avatar(@Param('username') username: string, @Req() req: Request, @Res() res: Response) {
    const found = await this.users.getAvatar(username);
    if (!found) {
      res.set('Cache-Control', 'no-store');
      throw new NotFoundException('No profile photo');
    }
    const etag = `W/"avatar-${found.data.length}-${found.updatedAt}"`;
    res.set({
      'Content-Type': found.mime,
      'Cache-Control': 'public, max-age=300, must-revalidate',
      ETag: etag,
      'Last-Modified': new Date(found.updatedAt.split('#')[0]).toUTCString(),
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    res.send(Buffer.from(found.data));
  }

  @Get(':username')
  @UseGuards(AuthGuard)
  profile(@Param('username') username: string, @CurrentUserId() viewerId?: string) {
    return this.users.publicProfile(username, viewerId);
  }

  @Get(':username/library')
  @UseGuards(AuthGuard)
  publicLibrary(@Param('username') username: string, @CurrentUserId() viewerId: string, @Query('status') status?: string) {
    return this.users.publicLibrary(username, status, viewerId);
  }
}
