import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaClient } from '@prisma/client';
import { PaginationDto } from 'src/common';
import { RpcException } from '@nestjs/microservices';
import { Gender, Goal, UserType } from './enums/user.enum';

@Injectable()
export class UserService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('User-Service');


  onModuleInit() {
    this.$connect();
    this.logger.log('MongoDb connected')
  }


  async create(createUserDto: CreateUserDto) {
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
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error'
      })
    }
  }

  async findAll(paginationDto: PaginationDto) {
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
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error'
      })
    }
  }

  async findById(id: string) {
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
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error'
      })
    }
  }

  async update(id:string, updateUserDto: UpdateUserDto) {
    try {
      await this.findById(id)
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
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    }
  }

  async remove(id: string) {
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
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    }
  }

  async calculateTotalUsers(): Promise<number> {
    try {
      return await this.user.count({
        where: { isActive: true }
      });
    } catch (error) {
      this.logger.error('Error calculating total users:', error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error calculating total users'
      });
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
      this.logger.error('Error calculating new users:', error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error calculating new users statistics'
      });
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
      this.logger.error('Error calculating user activity:', error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error calculating user activity statistics'
      });
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
      this.logger.error('Error retrieving active users with age:', error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'An error occurred while retrieving active users with age.',
      });
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
            not:null
          }
        }
      });

      return goalCounts.map(stat => ({
        goal: stat.goal as Goal,
        count: stat._count.goal
      }));
    } catch (error) {
      this.logger.error('Error calculating goal stats:', error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error calculating goal statistics'
      });
    }
  }

  async calculateGenderStats(){
    try {
      const genderCounts = await this.user.groupBy({
        by: ['gender'],
        _count: {
          gender: true
        },
        where: {
          isActive: true,
          gender: {
            not:null
          }
        }
      });

      return genderCounts.map(stat => ({
        gender: stat.gender as Gender,
        count: stat._count.gender
      }));
    } catch (error) {
      this.logger.error('Error calculating gender stats:', error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error calculating gender statistics'
      });
    }
  }
  
}
