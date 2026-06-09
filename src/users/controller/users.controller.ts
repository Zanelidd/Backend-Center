import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(ThrottlerGuard)
  @Post('signUp')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(ThrottlerGuard)
  @Post('verify')
  verifyAndCreate(@Body() body: { token: string }) {
    return this.usersService.verifyAndCreateAccount(body.token);
  }

  @UseGuards(ThrottlerGuard)
  @Post('verifyTokenModifyPassword')
  verifyTokenModify(@Body() body: { token: string }) {
    return this.usersService.verifyTokenModifyPassword(body.token);
  }

  @UseGuards(ThrottlerGuard)
  @Post('signIn')
  login(@Body() loginDto: loginDto) {
    return this.usersService.signIn(loginDto);
  }
  @UseGuards(AuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: { sub: number; username: string }) {
    return { userId: user.sub, username: user.username };
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { sub: number },
  ) {
    if (user.sub !== +id) {
      throw new ForbiddenException();
    }
    return this.usersService.findOne(+id);
  }

  @UseGuards(ThrottlerGuard)
  @Post('/findForModifyPassword')
  findOneByMail(@Body() form: { email: string }) {
    return this.usersService.findOneByMail(form.email);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: { sub: number },
  ) {
    if (user.sub !== +id) {
      throw new ForbiddenException('Vous ne pouvez pas modifier ce compte');
    }
    return this.usersService.update(+id, updateUserDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { sub: number }) {
    if (user.sub !== +id) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer ce compte');
    }
    return this.usersService.remove(+id);
  }
}
