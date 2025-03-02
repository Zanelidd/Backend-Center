import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import * as argon2 from 'argon2';
import { ReponseUser } from '../dto/response-user.dto';
import { loginDto } from '../dto/login.dto';
import { AuthService } from 'src/auth/service/auth.service';
import { PrismaService } from 'src/provider/database/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private prismaService: PrismaService,
    private authService: AuthService,
  ) {}
  async create(createUserDto: CreateUserDto): Promise<ReponseUser> {
    const { username, email, password } = createUserDto;
    const existingUser = await this.prismaService.user.findFirst({
      where: { username, email },
    });

    const hashingOptions = {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      time: 5,
      parellelism: 1,
    };

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    try {
      const hashPass = await argon2.hash(password, hashingOptions);

      const createdUser = await this.prismaService.user.create({
        data: {
          username: username,
          email: email,
          password: hashPass,
        },
        select: { id: true, username: true, email: true },
      });
      return new ReponseUser(createdUser);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async signIn(loginDto: loginDto) {
    const findUser = await this.prismaService.user.findUniqueOrThrow({
      where: { username: loginDto.username },
    });

    if (!findUser) {
      throw new NotFoundException(`User ${loginDto.username} not Found`);
    }
    return this.authService.login(loginDto.password, findUser);
  }

  async findAll() {
    try {
      const usersFind = await this.prismaService.user.findMany();
      if (!usersFind) {
        throw new InternalServerErrorException('Users not found');
      }
      return usersFind.map((user) => {
        return new ReponseUser(user);
      });
    } catch (error) {
      throw new InternalServerErrorException(
        error.message,
        'Failed to find users',
      );
    }
  }

  async findOne(id: number) {
    try {
      const userFind = await this.prismaService.user.findUnique({
        where: { id: id },
      });
      if (!userFind) {
        throw new InternalServerErrorException('User not found');
      }
      return new ReponseUser(userFind);
    } catch (error) {
      throw new InternalServerErrorException(
        error.message,
        'Failed to find user',
      );
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    if (updateUserDto.password) {
      const hashPassword = await argon2.hash(updateUserDto.password);
      updateUserDto.password = hashPassword;
    }
    return this.prismaService.user.update({
      where: { id: id },
      data: { ...updateUserDto },
    });
  }

  remove(id: number) {
    return this.prismaService.user.delete({ where: { id: id } });
  }
}
