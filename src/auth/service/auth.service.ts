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
  ): Promise<{ access_token: string; userId: number; username: string }> {
    if (!user.password) {
      throw new NotFoundException({
        message: `Password not found`,
        statusCode: 401,
      });
    }

    const isPasswordValid = await argon2.verify(user.password, password);

    if (!isPasswordValid) {
      throw new UnauthorizedException({ message: `Invalid password` });
    }

    const payload = { sub: user.id, username: user.username };
    const access_token = this.jwtServices.sign(payload, {
      secret: this.configService.get<string>('TOKEN_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRATION'),
    });

    return { access_token, username: user.username, userId: user.id };
  }

  generateToken(payload: any): string {
    return this.jwtServices.sign(payload, {
      secret: this.configService.get<string>('TOKEN_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRATION'),
    });
  }

  verifyToken(token: string): any {
    try {
      return this.jwtServices.verify(token, {
        secret: this.configService.get<string>('TOKEN_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }
}
