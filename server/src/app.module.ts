import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './common/database.service';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LibraryModule } from './modules/library/library.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SocialModule } from './modules/social/social.module';
import { SimklModule } from './modules/simkl/simkl.module';

@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
class CommonModule {}

@Module({
  imports: [CommonModule, AuthModule, UsersModule, LibraryModule, ReviewsModule, SocialModule, SimklModule],
  controllers: [HealthController],
})
export class AppModule {}
