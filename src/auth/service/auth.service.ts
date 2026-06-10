import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { User } from '@prisma/client';

type AccessTokenPayload = { sub: number; username: string };
type RegisterTokenPayload = { username: string; email: string; hashPass: string; action: 'register' };
type ChangePasswordTokenPayload = { email: string; action: 'change password' };
type TokenPayload = AccessTokenPayload | RegisterTokenPayload | ChangePasswordTokenPayload;

@Injectable()
export class AuthService {
  constructor(
    private jwtServices: JwtService,
    private configService: ConfigService,
  ) {}

  async login(
    password: string,
    user: User,
  ): Promise<{
    access_token: string;
    email: string;
    username: string;
    userId: number;
  }> {
    if (!user) {
      throw new NotFoundException();
    }
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
      secret: this.configService.getOrThrow<string>('TOKEN_SECRET'),
      expiresIn: this.configService.getOrThrow<string>('JWT_EXPIRATION'),
    });
    return {
      access_token,
      username: user.username,
      email: user.email,
      userId: user.id,
    };
  }

  async me(user: User): Promise<{ username: string; userId: number }> {
    return { username: user.username, userId: user.id };
  }

  generateToken(payload: TokenPayload, expiresIn?: string): string {
    return this.jwtServices.sign(payload, {
      secret: this.configService.getOrThrow<string>('TOKEN_SECRET'),
      expiresIn:
        expiresIn ?? this.configService.getOrThrow<string>('JWT_EXPIRATION'),
    });
  }

  verifyToken(token: string): Record<string, unknown> {
    const tokenVerify = this.jwtServices.verify(token, {
      secret: this.configService.getOrThrow<string>('TOKEN_SECRET'),
    });

    if (!tokenVerify) {
      throw new UnauthorizedException();
    }
    return tokenVerify;
  }
}
