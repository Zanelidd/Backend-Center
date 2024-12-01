import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { user } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private jwtServices: JwtService,
    private configService: ConfigService,
  ) {}

  async login(
    password: string,
    user: user,
  ): Promise<{ access_token: string; username: string; userId: number }> {
    if (!user.password) {
      throw new NotFoundException(`Password not found`);
    }
    try {
      const isPasswordValid = await argon2.verify(user.password, password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Wrong password');
      }
      const payload = { sub: user.id, username: user.username };
      const access_token = this.jwtServices.sign(payload, {
        secret: this.configService.get<string>('TOKEN_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION'),
      });

      return { access_token, username: user.username, userId: user.id };
    } catch (error) {
      if (error) {
        if (error.message.includes('invalid type')) {
          throw new BadRequestException('Invalid password format');
        } else if (error.message.includes('output too short')) {
          throw new InternalServerErrorException('Internal server error');
        } else {
          throw new UnauthorizedException('Error verifying password');
        }
      } else {
        throw error;
      }
    }
  }
}
