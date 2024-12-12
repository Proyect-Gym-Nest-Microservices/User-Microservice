import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaClient } from '@prisma/client';
import { PaginationDto } from 'src/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { Gender, Goal, UserType } from './enums/user.enum';
import { NATS_SERVICE } from 'src/config';
import { firstValueFrom, TimeoutError } from 'rxjs';

@Injectable()
export class UserService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('User-Service');

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

  private async findUserResourceIds(
    userId: string,
    resourceIdKey: 'workoutIds' | 'trainingPlanIds' | 'nutritionIds'
  ): Promise<string[]> {
    const user = await this.user.findUnique({
      where: { id: userId },
      select: { [resourceIdKey]: true }
    });

    if (!user) {
      throw new RpcException({
        message: `User with id ${userId} not found`,
        status: HttpStatus.NOT_FOUND
      });
    }

    return user[resourceIdKey] || [];
  }

  private async fetchResourcesByIds(pattern: string, ids: string[]) {
    if (ids.length === 0) return [];

    return await firstValueFrom(
      this.client.send(pattern, { ids })
    );
  }


  async createUser(createUserDto: CreateUserDto) {
    try {
      const user = await this.user.findUnique({
        where: {
          email: createUserDto.email,
          isActive: true
        }
      })

      if (user) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'User already exists'
        })
      }
      const newUser = await this.user.create({
        data: createUserDto
      })
      return newUser;
    } catch (error) {
      this.handleError(
        error,
        'Internal server error creating user',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  async findAllUser(paginationDto: PaginationDto) {
    const { limit, page } = paginationDto
    const totalUsers = await this.user.count({ where: { isActive: true } });
    const lastPage = Math.ceil(totalUsers / limit)
    return {
      data: await this.user.findMany({
        where: { isActive: true },
        skip: (page - 1) * limit,
        take: limit
      }),
      meta: {
        totalUsers,
        page,
        lastPage
      }
    };
  }

  async findByEmail(email: string) {
    try {
      const user = await this.user.findUnique({ where: { email, isActive: true } })
      if (!user) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: `User not found`
        })
      }
      return user;

    } catch (error) {
      this.handleError(
        error,
        'Internal server error when searching for user by email',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  async findUserById(id: string) {
    try {
      const user = await this.user.findUnique({ where: { id, isActive: true } })
      if (!user) {
        throw new RpcException({
          message: `User with id ${id} not found`,
          status: HttpStatus.NOT_FOUND
        })
      }
      return user;

    } catch (error) {
      this.handleError(
        error,
        'Internal server error finding user',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.findUserById(id)
      console.log(user)
      console.log(updateUserDto.trainingPlanIds)
      if (updateUserDto.trainingPlanIds?.length) {
        await firstValueFrom(
          this.client.send('find.training.plan.by.ids', { ids:updateUserDto.trainingPlanIds})
        );
      }
      
      console.log(updateUserDto.workoutIds)
      if (updateUserDto.workoutIds?.length) {
        await firstValueFrom(
          this.client.send('find.workout.by.ids', {ids:updateUserDto.workoutIds})
        );
      }
      
      console.log(updateUserDto.nutritionIds)
      if (updateUserDto.nutritionIds?.length) {
        await firstValueFrom(
          this.client.send('find.nutrition.plan.by.ids', {ids:updateUserDto.nutritionIds})
        );
      }


      const updatedUser = await this.user.update({
        where: { id, isActive: true },
        data: {
          ...updateUserDto,
          updatedAt: new Date()
        },
      });

      if (!updatedUser) {
        throw new RpcException({
          message: `User with id ${id} not found`,
          status: HttpStatus.NOT_FOUND,
        });
      }
      return {
        success: true,
        user: updatedUser
      };;

    } catch (error) {
      this.handleError(
        error,
        'Internal server error updating user',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  async removeUser(id: string) {
    try {
      const updatedUser = await this.user.update({
        where: { id, isActive: true },
        data: {
          isActive: false,
          updatedAt: new Date()
        },
      });

      if (!updatedUser) {
        throw new RpcException({
          message: `User with id ${id} not found or already inactive`,
          status: HttpStatus.NOT_FOUND,
        });
      }

      return {
        success: true,
        message: `User with id ${id} has been deactivated`
      };

    } catch (error) {
      this.handleError(
        error,
        'Internal server error deleting user',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }



  async getUserWorkouts(userId: string) {
    try {
      const workoutIds = await this.findUserResourceIds(userId, 'workoutIds');
      const workouts = await this.fetchResourcesByIds('find.workout.by.ids', workoutIds);
      return workouts;
    } catch (error) {
      this.handleError(
        error,
        'Internal server error while fetching workouts',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  async getUserTrainingPlans(userId: string) {
    try {
      const trainingPlanIds = await this.findUserResourceIds(userId, 'trainingPlanIds');
      const trainingPlans = await this.fetchResourcesByIds('find.training.plan.by.ids', trainingPlanIds);
      return trainingPlans;
    } catch (error) {
      this.handleError(
        error,
        'Internal server error while fetching training plans',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  async getUserNutritions(userId: string) {
    try {
      const nutritionIds = await this.findUserResourceIds(userId, 'nutritionIds');
      const nutritions = await this.fetchResourcesByIds('find.nutrition.plan.by.ids', nutritionIds);
      return nutritions;
    } catch (error) {
      this.handleError(
        error,
        'Internal server error while fetching nutritions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async calculateTotalUsers(): Promise<number> {
    try {
      return await this.user.count({
        where: { isActive: true }
      });
    } catch (error) {
      this.handleError(
        error,
        'Error calculating total users',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  async calculateNewUsers(startDate: Date, endDate: Date): Promise<number> {
    try {
      return await this.user.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          isActive: true
        }
      });
    } catch (error) {
      this.handleError(
        error,
        'Error calculating new users statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  async calculateUserActivity(startDate: Date, endDate: Date) {
    try {
      const activeUsers = await this.user.count({
        where: {
          lastLogin: {
            gte: startDate,
            lte: endDate
          },
          isActive: true
        }
      });

      const totalUsers = await this.calculateTotalUsers();
      const inactiveUsers = totalUsers - activeUsers;

      return { activeUsers, inactiveUsers };
    } catch (error) {
      this.handleError(
        error,
        'Error calculating user activity statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }


  async getActiveUsersWithAge() {
    try {
      const users = await this.user.findMany({
        select: {
          age: true,
        },
        where: {
          isActive: true,
          age: {
            not: null,
          },
        },
      });

      return users;
    } catch (error) {
      this.handleError(
        error,
        'An error occurred while retrieving active users with age.',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  async calculateGoalStats() {
    try {
      const goalCounts = await this.user.groupBy({
        by: ['goal'],
        _count: {
          goal: true
        },
        where: {
          isActive: true,
          goal: {
            not: null
          }
        }
      });

      return goalCounts.map(stat => ({
        goal: stat.goal as Goal,
        count: stat._count.goal
      }));
    } catch (error) {
      this.handleError(
        error,
        'Error calculating goal statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  async calculateGenderStats() {
    try {
      const genderCounts = await this.user.groupBy({
        by: ['gender'],
        _count: {
          gender: true
        },
        where: {
          isActive: true,
          gender: {
            not: null
          }
        }
      });

      return genderCounts.map(stat => ({
        gender: stat.gender as Gender,
        count: stat._count.gender
      }));
    } catch (error) {
      this.handleError(
        error,
        'Error calculating gender statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

}
