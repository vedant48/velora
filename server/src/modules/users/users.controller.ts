import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
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
