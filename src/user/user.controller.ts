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

  @MessagePattern('find.all.user')
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
  update(@Payload() updateUserDto: UpdateUserDto) {
    return this.userService.update(updateUserDto.id, updateUserDto);
  }

  @MessagePattern('remove.user')
  remove(@Payload() id: number) {
    return this.userService.remove(id);
  }
}
