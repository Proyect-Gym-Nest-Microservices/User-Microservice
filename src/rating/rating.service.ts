import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateRatingDto } from './dto/create-rating.dto';
import { PrismaClient } from '@prisma/client';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { TargetType } from './enums/target-type.enum';

@Injectable()
export class RatingService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(RatingService.name);

  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy
  ) {
    super()
  }

  onModuleInit() {
    this.$connect();
    this.logger.log('MongoDb connected')
  }

  private handleError(error: any, defaultMessage: string, httpStatus: HttpStatus) {
    if (error instanceof RpcException) {
      throw error;
    }
    if (error instanceof TimeoutError) {
      throw new RpcException({
        status: HttpStatus.GATEWAY_TIMEOUT,
        message: 'Operation timed out',
      });
    }
    throw new RpcException({
      status: HttpStatus.INTERNAL_SERVER_ERROR || httpStatus,
      message: error.message || defaultMessage,
    });
  }

  private async calculateAverageScore(ratings: { score: number }[], targetId: string) {
    if (ratings.length === 0) {
      return { score: 0, totalRatings: 0, targetId: targetId };
    }

    const totalScore = ratings.reduce((sum, rating) => sum + rating.score, 0);
    const averageScore = parseFloat((totalScore / ratings.length).toFixed(2));

    return {
      targetId: targetId,
      score: averageScore,
      totalRatings: ratings.length
    };
  }

  private async updateTargetScore(tx:any,targetType: TargetType, targetId: string) {
    try {

      const ratings = await tx.rating.findMany({
        where: { targetId, targetType },
        select: { score: true }
      });

      const rateDto = await this.calculateAverageScore(ratings, targetId);
      const eventMap: Record<TargetType, string> = {
        [TargetType.EXERCISE]: 'rate.exercise',
        [TargetType.WORKOUT]: 'rate.workout',
        [TargetType.TRAINING]: 'rate.training.plan',
        [TargetType.EQUIPMENT]: 'rate.equipment',
        [TargetType.NUTRITION]: 'rate.nutrition'
      };

      const event = eventMap[targetType];
      if (!event) {
        throw new Error(`Unsupported target type: ${targetType}`);
      }

      await firstValueFrom(
        this.client.send(event, rateDto)
      );

    } catch (error) {
      this.handleError(
        error,
        `Error updating score for target type ${targetType} and ID ${targetId}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }

  }

  async createRating(createRatingDto: CreateRatingDto) {
    const { score, targetId, userId, targetType } = createRatingDto
    try {

      if (score < 0 || score > 5) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Rating must be between 0 and 5'
        });
      }

      return this.$transaction(async (tx) => {

        const existingRating = await tx.rating.findUnique({
          where: {
            userId_targetId_targetType: {
              userId,
              targetId,
              targetType
            }
          }
        });
  
        const rating = existingRating
          ? await tx.rating.update({
            where: { id: existingRating.id },
            data: { score }
          })
          : await tx.rating.create({
            data: { userId, targetId, targetType, score }
          })
  
  
        await this.updateTargetScore(tx,targetType, targetId);
        return rating;
      }, {
        timeout:30000
      })


    } catch (error) {
      this.handleError(
        error,
        'Internal server error rating',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

}
