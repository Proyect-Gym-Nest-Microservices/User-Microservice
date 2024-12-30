import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RatingService } from './rating.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';

@Controller()
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @MessagePattern('create.rating')
  createRating(@Payload() createRatingDto: CreateRatingDto) {
    return this.ratingService.createRating(createRatingDto);
  }


}
