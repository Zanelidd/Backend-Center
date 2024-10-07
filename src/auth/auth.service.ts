import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor() {}

  async login(password: string, hashPassword: string) {
    const passwordverif = await argon2.verify(hashPassword, password);
    if (!passwordverif) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
