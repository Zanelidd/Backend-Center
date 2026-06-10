import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import * as argon2 from 'argon2';
import { ReponseUser } from '../dto/response-user.dto';
import { loginDto } from '../dto/login.dto';
import { AuthService } from '../../auth/service/auth.service';
import { PrismaService } from '../../provider/database/prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {
  private readonly transporter: nodemailer.Transporter;

  constructor(
    private prismaService: PrismaService,
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: this.configService.getOrThrow<string>('EMAIL_USER'),
        pass: this.configService.getOrThrow<string>('EMAIL_PASSWORD'),
      },
    });
  }

  async create(createUserDto: CreateUserDto): Promise<{ message: string }> {
    const { username, email, password } = createUserDto;

    const existingUser = await this.prismaService.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Username or email already in use.');
    }

    const hashingOptions = {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      time: 5,
      parallelism: 1,
    };

    const hashPass = await argon2.hash(password, hashingOptions);

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prismaService.pendingRegistration.create({
      data: { token, username, email, hashPass, expiresAt },
    });

    const verificationLink = `${this.configService.getOrThrow<string>('FRONTEND_URL')}/verify-email?token=${token}`;

    const mailOptions = {
      from: `"Pokémon Center" <${this.configService.getOrThrow<string>('EMAIL_USER')}>`,
      to: email,
      subject: 'Pokemon Center Account Verification',
      html: `
        <h1>Welcome to Pokémon Center!</h1>
        <p>To verify your account, please click on the link below:</p>
        <a href="${verificationLink}">Verify my account</a>
        <p>This link will expire in 24 hours.</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
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
    const pending = await this.prismaService.pendingRegistration.findUnique({
      where: { token },
    });

    if (!pending) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (pending.expiresAt < new Date()) {
      await this.prismaService.pendingRegistration.delete({ where: { token } });
      throw new UnauthorizedException('Token expired');
    }

    try {
      const createdUser = await this.prismaService.user.create({
        data: {
          username: pending.username,
          email: pending.email,
          password: pending.hashPass,
        },
        select: {
          id: true,
          username: true,
          email: true,
        },
      });

      await this.prismaService.pendingRegistration.delete({ where: { token } });

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
          `A user with this ${field === 'username' ? 'username' : 'email'} already exists`,
        );
      }
      throw new InternalServerErrorException('Error during verification');
    }
  }

  async verifyTokenModifyPassword(token: string) {
    try {
      const decodedToken = this.authService.verifyToken(token);

      if (
        !decodedToken ||
        !decodedToken.action ||
        decodedToken.action !== 'change password'
      ) {
        throw new UnauthorizedException('Invalid Token');
      }

      const { email } = decodedToken;
      return { email };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired reset link');
    }
  }

  async signIn(loginDto: loginDto) {
    const findUser = await this.prismaService.user.findUniqueOrThrow({
      where: { username: loginDto.username },
    });
    return this.authService.login(loginDto.password, findUser);
  }

  async findAll() {
    try {
      const usersFind = await this.prismaService.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
        },
      });
      return usersFind.map((user) => {
        return new ReponseUser(user);
      });
    } catch (error) {
      console.error('findAll failed:', error);
      throw new InternalServerErrorException('Failed to find users');
    }
  }

  async findOne(id: number) {
    const userFind = await this.prismaService.user.findUnique({
      where: { id: id },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });
    if (!userFind) {
      throw new NotFoundException('User not found');
    }
    return new ReponseUser(userFind);
  }

  async findOneByMail(email: string) {
    const userFind = await this.prismaService.user.findUnique({
      where: { email: email },
    });

    if (!userFind) {
      return { message: 'If this email is registered, you will receive an email.' };
    }

    const verificationToken = this.authService.generateToken(
      { email, action: 'change password' },
      this.configService.getOrThrow<string>('EMAIL_TOKEN_EXPIRATION'),
    );

    const verificationLink = `${this.configService.getOrThrow<string>('FRONTEND_URL')}/forget-pass?token=${verificationToken}`;

    const mailOptions = {
      from: `"Pokémon Center" <${this.configService.getOrThrow<string>('EMAIL_USER')}>`,
      to: email,
      subject: 'Pokemon Center Account Verification',
      html: `
        <h1>Welcome to Pokémon Center!</h1>
        <p>To change your password, please click on the link below:</p>
        <a href="${verificationLink}">Change my password:</a>
        <p>This link will expire in 24 hours.</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
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

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    let email: unknown;
    try {
      const decoded = this.authService.verifyToken(token);
      if (!decoded?.action || decoded.action !== 'change password') {
        throw new UnauthorizedException('Invalid or expired reset link');
      }
      email = decoded.email;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired reset link');
    }

    const user = await this.prismaService.user.findUnique({
      where: { email: email as string },
    });
    if (!user) throw new UnauthorizedException('Invalid or expired reset link');

    const hashPass = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 5,
      parallelism: 1,
    });

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { password: hashPass },
    });

    return { message: 'Password updated successfully' };
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const data: { password?: string } = {};
    if (updateUserDto.password) {
      data.password = await argon2.hash(updateUserDto.password, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 5,
        parallelism: 1,
      });
    }
    return this.prismaService.user.update({
      where: { id },
      data,
      select: { id: true, username: true, email: true },
    });
  }

  async remove(id: number) {
    await this.prismaService.user.delete({ where: { id: id } });
    return { message: 'Account deleted' };
  }
}
