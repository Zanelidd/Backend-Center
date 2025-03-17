import { user } from '@prisma/client';

export class ReponseUser {
  userId: number;
  username: string;

  constructor(user: Omit<user, 'password'>) {
    this.userId = user.id;
    this.username = user.username;
  }
}
