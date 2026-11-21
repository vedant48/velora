import { Module } from '@nestjs/common';
import { LibraryModule } from '../library/library.module';
import { SimklController } from './simkl.controller';
import { SimklService } from './simkl.service';

@Module({
  imports: [LibraryModule],
  controllers: [SimklController],
  providers: [SimklService],
})
export class SimklModule {}
