import { Module } from '@nestjs/common';

import { UserModule } from './user/user.module';
import { RatingModule } from './rating/rating.module';

@Module({
  imports: [UserModule, RatingModule],
})
export class AppModule {}
