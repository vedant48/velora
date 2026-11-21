import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUserId } from '../../common/auth.guard';
import { SimklService } from './simkl.service';

@Controller('simkl')
@UseGuards(AuthGuard)
export class SimklController {
  constructor(private readonly simkl: SimklService) {}

  @Get('status')
  status(@CurrentUserId() userId: string) {
    return this.simkl.status(userId);
  }

  @Post('connect')
  connect(@CurrentUserId() userId: string, @Body() body: Record<string, unknown>) {
    return this.simkl.connect(userId, body.code, body.redirectUri);
  }

  @Delete('disconnect')
  disconnect(@CurrentUserId() userId: string) {
    return this.simkl.disconnect(userId);
  }

  @Post('import')
  import(@CurrentUserId() userId: string) {
    return this.simkl.importFromSimkl(userId);
  }

  @Post('export')
  export(@CurrentUserId() userId: string) {
    return this.simkl.exportToSimkl(userId);
  }
}
