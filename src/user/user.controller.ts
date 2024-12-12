import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from 'src/common';
import { MongoIdDto } from './dto/mongo-id.dto';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) { }

  @MessagePattern('create.user')
  createUser(@Payload() createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto);
  }

  @MessagePattern('find.all.users')
  findAllUser(@Payload() paginationDto: PaginationDto) {
    return this.userService.findAllUser(paginationDto);
  }

  @MessagePattern('find.user.by.id')
  findById(@Payload() mongoIdDto: MongoIdDto) {
    return this.userService.findUserById(mongoIdDto.id);
  }
  @MessagePattern('find.user.by.email')
  findByEmail(@Payload() email: string) {
    return this.userService.findByEmail(email);
  }

  @MessagePattern('update.user')
  updateUser(@Payload() payload: { id: string, updateUserDto: UpdateUserDto }) {
    return this.userService.updateUser(payload.id, payload.updateUserDto);
  }

  @MessagePattern('remove.user')
  removeUser(@Payload() mongoIdDto: MongoIdDto) {
    return this.userService.removeUser(mongoIdDto.id);
  }

  @MessagePattern('get.user.workouts')
  getUserWorkouts(@Payload() mongoIdDto: MongoIdDto) {
    return this.userService.getUserWorkouts(mongoIdDto.id);
  }
  @MessagePattern('get.user.training.plans')
  getUserTrainingPlans(@Payload() mongoIdDto: MongoIdDto ) {
    return this.userService.getUserTrainingPlans(mongoIdDto.id);
  }
  @MessagePattern('get.user.nutritions')
  getUserNutritions(@Payload() mongoIdDto: MongoIdDto ) {
    return this.userService.getUserNutritions(mongoIdDto.id);
  }

  @MessagePattern('calculate.total.users')
  calculateTotalUsers() {
    return this.userService.calculateTotalUsers();
  }

  @MessagePattern('calculate.new.users')
  calculateNewUsers(
    @Payload() payload: { startDate: Date; endDate: Date },
  ) {
    return this.userService.calculateNewUsers(
      payload.startDate,
      payload.endDate,
    );
  }

  @MessagePattern('calculate.user.activity')
  calculateUserActivity(
    @Payload() payload: { startDate: Date; endDate: Date },
  ) {
    return this.userService.calculateUserActivity(
      payload.startDate,
      payload.endDate,
    );
  }

  @MessagePattern('get.active.users.with.age')
  getActiveUsersWithAge() {
    return this.userService.getActiveUsersWithAge();
  }

  @MessagePattern('calculate.goal.stats')
  calculateGoalStats() {
    return this.userService.calculateGoalStats();
  }

  @MessagePattern('calculate.gender.stats')
  calculateGenderStats() {
    return this.userService.calculateGenderStats();
  }
}
