import {
  Injectable,
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
  ): Promise<{ access_token: string; username: string }> {
    if (!user.password) {
      throw new NotFoundException(`Pass not found`);
    }
    const passwordverif = await argon2.verify(user.password, password);
    if (!passwordverif) {
      throw new UnauthorizedException();
    }
    const payload = { sub: user.id, username: user.username };

    return {
      access_token: this.jwtServices.sign(payload, {
        secret: this.configService.get('TOKEN_SECRET'),
      }),
      username: user.username,
    };
  }
}
