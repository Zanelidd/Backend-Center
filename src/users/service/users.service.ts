import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import * as argon2 from 'argon2';
import { ReponseUser } from '../dto/response-user.dto';
import { loginDto } from '../dto/login.dto';
import { AuthService } from '../../auth/service/auth.service';
import { PrismaService } from '../../provider/database/prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class UsersService {
  constructor(
    private prismaService: PrismaService,
    private authService: AuthService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<{ message: string }> {
    const { username, email, password } = createUserDto;

    const existingUser = await this.prismaService.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      throw new UnauthorizedException('This email or username already exists');
    }

    const hashingOptions = {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      time: 5,
      parellelism: 1,
    };

    const hashPass = await argon2.hash(password, hashingOptions);

    const verificationToken = this.authService.generateToken({
      username,
      email,
      hashPass,
      action: 'register',
    });

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: `"Pokemon Center" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Pokemon Center Account Verification',
      html: `
        <h1>Welcome to Pokemon Center!</h1>
        <p>To verify your account, please click on the link below:</p>
        <a href="${verificationLink}">Verify my account</a>
        <p>This link will expire in 24 hours.</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return {
        message: 'Verification email sent. Please check your inbox.',
      };
    } catch (error) {
      console.error('Email sending error:', error);
      throw new InternalServerErrorException(
        'Error sending verification email',
      );
    }
  }

  async verifyAndCreateAccount(
    token: string,
  ): Promise<{ access_token: string; userId: number; username: string }> {
    try {
      const decodedToken = this.authService.verifyToken(token);

      if (
        !decodedToken ||
        !decodedToken.action ||
        decodedToken.action !== 'register'
      ) {
        throw new UnauthorizedException('Invalid Token');
      }

      const { username, email, hashPass } = decodedToken;

      try {
        const createdUser = await this.prismaService.user.create({
          data: {
            username,
            email,
            password: hashPass,
          },
          select: {
            id: true,
            username: true,
            email: true,
            password: true,
          },
        });

        return {
          access_token: this.authService.generateToken({
            sub: createdUser.id,
            username: createdUser.username,
          }),
          userId: createdUser.id,
          username: createdUser.username,
        };
      } catch (error) {
        if (error.code === 'P2002') {
          const field = error.meta?.target?.[0];
          throw new ConflictException(
            `A user with this ${field === 'username' ? 'username' : 'email'} ready exist`,
          );
        }
        throw error;
      }
    } catch (error) {
      console.error('Verification error:', error);
      if (
        error instanceof UnauthorizedException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error during verification');
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
        new InternalServerErrorException('Users not found');
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
