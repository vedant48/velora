import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUserId } from '../../common/auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  signup(@Body() body: Record<string, unknown>) {
    return this.auth.signup(body.username, body.password, body.displayName);
  }

  @Post('login')
  login(@Body() body: Record<string, unknown>) {
    return this.auth.login(body.username, body.password);
  }

  @Post('google')
  google(@Body() body: Record<string, unknown>) {
    return this.auth.googleLogin(body.idToken);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUserId() userId: string) {
    return this.auth.me(userId);
  }
}
