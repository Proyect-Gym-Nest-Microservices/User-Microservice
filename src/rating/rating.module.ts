import { Module } from '@nestjs/common';
import { RatingService } from './rating.service';
import { RatingController } from './rating.controller';
import { NatsModule } from '../transports/nats.module';

@Module({
  controllers: [RatingController],
  providers: [RatingService],
  imports: [NatsModule]

})
export class RatingModule { }
