import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUserId } from '../../common/auth.guard';
import { SocialService } from './social.service';

@Controller('social')
@UseGuards(AuthGuard)
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Post('follow/:username')
  follow(@CurrentUserId() userId: string, @Param('username') username: string) {
    return this.social.follow(userId, username);
  }

  @Delete('follow/:username')
  unfollow(@CurrentUserId() userId: string, @Param('username') username: string) {
    return this.social.unfollow(userId, username);
  }

  @Get('match/:username')
  match(@CurrentUserId() userId: string, @Param('username') username: string) {
    return this.social.match(userId, username);
  }

  @Get('activity')
  activity(@CurrentUserId() userId: string) {
    return this.social.activity(userId);
  }
}
