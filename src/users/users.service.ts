import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import * as argon2 from 'argon2';
import { ReponseUser } from './dto/response-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}
  async create(createUserDto: CreateUserDto): Promise<User> {
    const { username, email, password } = createUserDto;
    const existingUser = await this.usersRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }
    const user = new User();
    user.username = username;
    user.email = email;

    try {
      user.hashPass = await argon2.hash(password);

      const savedUser = await this.usersRepository.save(user);
      delete savedUser.hashPass;
      return savedUser;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message,
        'Failed to create user',
      );
    }
  }

  async findAll() {
    try {
      const usersFind = await this.usersRepository.find();
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
      const userFind = await this.usersRepository.findOneBy({ id: id });
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
    return this.usersRepository.update(id, updateUserDto);
  }

  remove(id: number) {
    return this.usersRepository.delete(id);
  }
}
