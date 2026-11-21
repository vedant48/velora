import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUserId, OptionalAuthGuard } from '../../common/auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('search')
  search(@Query('q') q: string) {
    return this.users.search(q);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  updateMe(@CurrentUserId() userId: string, @Body() body: Record<string, unknown>) {
    return this.users.updateMe(userId, body);
  }

  @Get(':username')
  @UseGuards(OptionalAuthGuard)
  profile(@Param('username') username: string, @CurrentUserId() viewerId?: string) {
    return this.users.publicProfile(username, viewerId);
  }

  @Get(':username/library')
  publicLibrary(@Param('username') username: string, @Query('status') status?: string) {
    return this.users.publicLibrary(username, status);
  }
}
