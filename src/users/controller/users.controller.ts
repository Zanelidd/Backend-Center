import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { UsersService } from '../service/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { loginDto } from '../dto/login.dto';
import { AuthGuard } from '../../auth/guard/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TokenDto } from '../dto/token.dto';
import { FindByEmailDto } from '../dto/find-by-email.dto';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1000 * 60 * 60, // 1h — must match JWT_EXPIRATION
};

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
  async verifyAndCreate(
    @Body() body: TokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, ...user } =
      await this.usersService.verifyAndCreateAccount(body.token);
    res.cookie('access_token', access_token, COOKIE_OPTIONS);
    return user;
  }

  @UseGuards(ThrottlerGuard)
  @Post('verifyTokenModifyPassword')
  verifyTokenModify(@Body() body: TokenDto) {
    return this.usersService.verifyTokenModifyPassword(body.token);
  }

  @UseGuards(ThrottlerGuard)
  @Post('signIn')
  async login(
    @Body() loginDto: loginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, ...user } = await this.usersService.signIn(loginDto);
    res.cookie('access_token', access_token, COOKIE_OPTIONS);
    return user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return { message: 'Logged out' };
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
  findOneByMail(@Body() form: FindByEmailDto) {
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
