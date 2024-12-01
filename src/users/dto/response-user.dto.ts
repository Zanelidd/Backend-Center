import { user } from '@prisma/client';

export class ReponseUser {
  id: number;
  username: string;
  email: string;

  constructor(user: Omit<user, 'password'>) {
    this.id = user.id;
    this.username = user.username;
    this.email = user.email;
  }
}
