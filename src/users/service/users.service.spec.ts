import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../provider/database/prisma/prisma.service';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as nodemailer from 'nodemailer';
import { AuthService } from '../../auth/service/auth.service';
import { ConfigService } from '@nestjs/config';
import { loginDto } from '../dto/login.dto';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({}),
  }),
}));

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockAuthService = {
    generateToken: jest.fn(),
    verifyToken: jest.fn(),
    login: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('mock-value'),
    get: jest.fn().mockReturnValue('mock-value'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({}),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockCreateUserDto = {
      email: 'test@example.com',
      password: 'Password1!strong',
      username: 'testuser',
    };

    beforeEach(() => {
      mockAuthService.generateToken.mockReturnValue('verificationToken');
      (argon2.hash as jest.Mock).mockResolvedValue('hashedPassword');
    });

    it('should send verification email when user does not exist', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      const result = await service.create(mockCreateUserDto);

      expect(result).toEqual({
        message: 'Verification email sent. Please check your inbox.',
      });
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: mockCreateUserDto.username },
            { email: mockCreateUserDto.email },
          ],
        },
      });
      expect(argon2.hash).toHaveBeenCalledWith(
        mockCreateUserDto.password,
        expect.any(Object),
      );
      expect(mockAuthService.generateToken).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'register' }),
        'mock-value',
      );
    });

    it('should throw ConflictException if username or email already in use', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 1,
        email: mockCreateUserDto.email,
      });

      await expect(service.create(mockCreateUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('verifyAndCreateAccount', () => {
    const mockToken = 'validToken';
    const mockDecodedToken = {
      username: 'testuser',
      email: 'test@example.com',
      hashPass: 'alreadyHashedPassword',
      action: 'register',
    };

    const mockCreatedUser = {
      id: 1,
      username: mockDecodedToken.username,
      email: mockDecodedToken.email,
    };

    beforeEach(() => {
      mockAuthService.verifyToken.mockReturnValue(mockDecodedToken);
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);
      mockAuthService.generateToken.mockReturnValue('newAccessToken');
    });

    it('should verify token, create user, and return access token', async () => {
      const result = await service.verifyAndCreateAccount(mockToken);

      expect(result).toEqual({
        access_token: 'newAccessToken',
        userId: mockCreatedUser.id,
        username: mockCreatedUser.username,
      });
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith(mockToken);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          username: mockDecodedToken.username,
          email: mockDecodedToken.email,
          password: mockDecodedToken.hashPass,
        },
        select: { id: true, username: true, email: true },
      });
      expect(mockAuthService.generateToken).toHaveBeenCalledWith({
        sub: mockCreatedUser.id,
        username: mockCreatedUser.username,
      });
    });

    it('should throw ConflictException if user already exists (Prisma P2002)', async () => {
      const prismaError = { code: 'P2002', meta: { target: ['email'] } };
      mockPrismaService.user.create.mockRejectedValue(prismaError);

      await expect(service.verifyAndCreateAccount(mockToken)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw UnauthorizedException if action is not register', async () => {
      mockAuthService.verifyToken.mockReturnValue({ action: 'other' });

      await expect(service.verifyAndCreateAccount(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw InternalServerErrorException if token verification throws unexpectedly', async () => {
      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(service.verifyAndCreateAccount(mockToken)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('signIn', () => {
    const mockLoginDto: loginDto = {
      username: 'testuser',
      password: 'password123',
    };

    const mockUser = {
      id: 1,
      username: mockLoginDto.username,
      password: 'hashedPassword',
    };

    const mockLoginResponse = {
      access_token: 'accessToken',
      userId: 1,
      username: 'testuser',
    };

    it('should sign in successfully', async () => {
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const result = await service.signIn(mockLoginDto);

      expect(result).toEqual(mockLoginResponse);
      expect(mockPrismaService.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { username: mockLoginDto.username },
      });
      expect(mockAuthService.login).toHaveBeenCalledWith(
        mockLoginDto.password,
        mockUser,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUniqueOrThrow.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(service.signIn(mockLoginDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should hash the password and only pass explicit fields to Prisma', async () => {
      (argon2.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
      mockPrismaService.user.update.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      });

      const result = await service.update(1, { password: 'NewPassword1!' });

      expect(argon2.hash).toHaveBeenCalledWith('NewPassword1!', expect.any(Object));
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password: 'hashedNewPassword' },
        select: { id: true, username: true, email: true },
      });
      expect(result).toEqual({ id: 1, username: 'testuser', email: 'test@example.com' });
    });

    it('should send an empty data object when no password is provided', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      });

      await service.update(1, {});

      expect(argon2.hash).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {},
        select: { id: true, username: true, email: true },
      });
    });
  });
});
