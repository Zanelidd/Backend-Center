import { User } from '@prisma/client';

export class ReponseUser {
  userId: number;
  username: string;

  constructor(user: Omit<User, 'password'>) {
    this.userId = user.id;
    this.username = user.username;
  }
}
