import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from '../service/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { loginDto } from '../dto/login.dto';
import { AuthGuard } from '../../auth/guard/auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signUp')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('verify')
  verifyAndCreate(@Body() body: { token: string }) {
    return this.usersService.verifyAndCreateAccount(body.token);
  }

  @Post('verifyTokenModifyPassword')
  verifyTokenModify(@Body() body: { token: string }) {
    return this.usersService.verifyTokenModifyPassword(body.token);
  }

  @Post('signIn')
  login(@Body() loginDto: loginDto) {
    return this.usersService.signIn(loginDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Post('/findForModifyPassword')
  findOneByMail(@Body() form: { email: string }) {
    return this.usersService.findOneByMail(form.email);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
