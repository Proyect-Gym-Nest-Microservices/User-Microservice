import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaClient } from '@prisma/client';
import { PaginationDto } from 'src/common';
import { RpcException } from '@nestjs/microservices';

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
      this.logger.error(error)
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

  async update(updateUserDto: UpdateUserDto) {
    const {id, ...user} = updateUserDto
    try {

      const updatedUser = await this.user.update({
        where: { id, isActive: true },
        data: { 
          ...user,
          updateAt: new Date() 
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
        updatedFields: Object.keys(user)
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
          updateAt: new Date() 
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
}
