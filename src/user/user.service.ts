import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaClient, TargetType } from '@prisma/client';
import { PaginationDto } from 'src/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { Gender, Goal } from './enums/user.enum';
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

  async onModuleInit() {
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

  private async fetchResourcesByIds(pattern: string, ids: string[] | number[]) {
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
      if (updateUserDto.trainingPlanIds?.length) {
        await firstValueFrom(
          this.client.send('find.training.plan.by.ids', { ids: updateUserDto.trainingPlanIds })
        );
      }

      if (updateUserDto.workoutIds?.length) {
        await firstValueFrom(
          this.client.send('find.workout.by.ids', { ids: updateUserDto.workoutIds })
        );
      }

      if (updateUserDto.nutritionIds?.length) {
        await firstValueFrom(
          this.client.send('find.nutrition.plan.by.ids', { ids: updateUserDto.nutritionIds })
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
      const user = await this.user.findUnique({
        where: { id: userId },
        select: { workoutIds: true }
      })
      if (!user) {
        throw new RpcException({
          message: `User with id ${userId} not found`,
          status: HttpStatus.NOT_FOUND
        });
      }


      const workouts = await this.fetchResourcesByIds('find.workout.by.ids', user.workoutIds);
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
      const user = await this.user.findUnique({
        where: { id: userId },
        select: { trainingPlanIds: true }
      })
      if (!user) {
        throw new RpcException({
          message: `User with id ${userId} not found`,
          status: HttpStatus.NOT_FOUND
        });
      }

      const trainingPlans = await this.fetchResourcesByIds('find.training.plan.by.ids', user.trainingPlanIds);
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
      const user = await this.user.findUnique({
        where: { id: userId },
        select: { nutritionIds: true }
      })
      if (!user) {
        throw new RpcException({
          message: `User with id ${userId} not found`,
          status: HttpStatus.NOT_FOUND
        });
      }
      const nutritions = await this.fetchResourcesByIds('find.nutrition.plan.by.ids', user.nutritionIds);
      return nutritions;
    } catch (error) {
      this.handleError(
        error,
        'Internal server error while fetching nutritions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async calculateUserStatistics(startDate: Date, endDate: Date) {
    try {
      const [totalUsers, newUsers, activeUsersData, usersWithAge, goalStats, genderCounts] = await Promise.all([
        this.user.count({
          where: {
            isActive: true,
          }
        }),
        this.user.count({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            isActive: true
          }
        }),
        this.user.count({
          where: {
            lastLogin: { gte: startDate, lte: endDate },
            isActive: true
          }
        }),
        this.user.findMany({
          select: { age: true },
          where: {
            isActive: true, age: { not: null },
          }
        }),
        this.user.groupBy({
          by: ['goal'],
          _count: { goal: true },
          where: {
            isActive: true, goal: { not: null },
          }
        }),
        this.user.groupBy({
          by: ['gender'],
          _count: { gender: true },
          where: {
            isActive: true, gender: { not: null },
          }
        })
      ]);

      return {
        totalUsers,
        newUsers,
        userActivity: {
          activeUsers: activeUsersData,
          inactiveUsers: totalUsers - activeUsersData
        },
        ageRange: usersWithAge,
        goalStats: goalStats.map(stat => ({
          goal: stat.goal as Goal,
          count: stat._count.goal
        })),
        genderStats: genderCounts.map(stat => ({
          gender: stat.gender as Gender,
          count: stat._count.gender,
        }))
      };

    } catch (error) {
      this.handleError(
        error,
        'Error retrieving user statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }



  async calculateGenderStatsByTarget(targetType: TargetType, targetId: number) {
    try {

      const userStats = await this.user.findMany({
        where: {
          isActive: true,
          gender: { not: null },
          rating: {
            some: { targetType, targetId }
          }
        },
        select: {
          gender: true,
          rating: {
            where: {
              targetType,
              targetId
            },
            select: {
              score: true
            }
          }
        }
      });


      const genderStatsMap = new Map();


      userStats.forEach(({ gender }) => {

        if (!genderStatsMap.has(gender)) {
          genderStatsMap.set(gender, {
            userCount: 0,
          });
        }
        const stats = genderStatsMap.get(gender);
        stats.userCount++;

      });

      const results = Array.from(genderStatsMap.entries()).map(([gender, stats]) => ({
        gender: gender as Gender,
        count: stats.userCount,
        targetType,
        targetId
      }));

      return results;

    } catch (error) {
      this.handleError(
        error,
        `Error calculating gender statistics for ${targetType}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


}


