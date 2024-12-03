import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from 'src/common';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern('create.user')
  create(@Payload() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @MessagePattern('find.all.users')
  findAll(@Payload() paginationDto:PaginationDto) {
    return this.userService.findAll(paginationDto);
  }

  @MessagePattern('find.user.by.id')
  findById(@Payload() id: string) {
    return this.userService.findById(id);
  }
  @MessagePattern('find.user.by.email')
  findByEmail(@Payload() email: string) {
    return this.userService.findByEmail(email);
  }

  @MessagePattern('update.user')
  update(@Payload() payload: { id: string, updateUserDto: UpdateUserDto }) {
    return this.userService.update( payload.id, payload.updateUserDto);
  }

  @MessagePattern('remove.user')
  remove(@Payload() id: string) {
    return this.userService.remove(id);
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
