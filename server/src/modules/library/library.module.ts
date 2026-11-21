import { Module } from '@nestjs/common';
import { LibraryController, TitleStatsController } from './library.controller';
import { LibraryService } from './library.service';

@Module({
  controllers: [LibraryController, TitleStatsController],
  providers: [LibraryService],
  exports: [LibraryService],
})
export class LibraryModule {}
