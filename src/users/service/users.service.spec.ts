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
    pendingRegistration: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
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
      (argon2.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockPrismaService.pendingRegistration.create.mockResolvedValue({});
    });

    it('should store pending registration and send verification email', async () => {
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
      expect(mockPrismaService.pendingRegistration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: mockCreateUserDto.username,
          email: mockCreateUserDto.email,
          hashPass: 'hashedPassword',
          expiresAt: expect.any(Date),
        }),
      });
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
    const mockToken = 'some-uuid-token';
    const mockPending = {
      id: 1,
      token: mockToken,
      username: 'testuser',
      email: 'test@example.com',
      hashPass: 'alreadyHashedPassword',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };
    const mockCreatedUser = {
      id: 1,
      username: mockPending.username,
      email: mockPending.email,
    };

    beforeEach(() => {
      mockPrismaService.pendingRegistration.findUnique.mockResolvedValue(mockPending);
      mockPrismaService.pendingRegistration.delete.mockResolvedValue({});
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);
      mockAuthService.generateToken.mockReturnValue('newAccessToken');
    });

    it('should look up pending row, create user, delete row, and return access token', async () => {
      const result = await service.verifyAndCreateAccount(mockToken);

      expect(result).toEqual({
        access_token: 'newAccessToken',
        userId: mockCreatedUser.id,
        username: mockCreatedUser.username,
      });
      expect(mockPrismaService.pendingRegistration.findUnique).toHaveBeenCalledWith({
        where: { token: mockToken },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          username: mockPending.username,
          email: mockPending.email,
          password: mockPending.hashPass,
        },
        select: { id: true, username: true, email: true },
      });
      expect(mockPrismaService.pendingRegistration.delete).toHaveBeenCalledWith({
        where: { token: mockToken },
      });
      expect(mockAuthService.generateToken).toHaveBeenCalledWith({
        sub: mockCreatedUser.id,
        username: mockCreatedUser.username,
      });
    });

    it('should throw UnauthorizedException if token is not found', async () => {
      mockPrismaService.pendingRegistration.findUnique.mockResolvedValue(null);

      await expect(service.verifyAndCreateAccount(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should delete the expired row and throw UnauthorizedException', async () => {
      mockPrismaService.pendingRegistration.findUnique.mockResolvedValue({
        ...mockPending,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.verifyAndCreateAccount(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPrismaService.pendingRegistration.delete).toHaveBeenCalledWith({
        where: { token: mockToken },
      });
    });

    it('should throw ConflictException if user already exists (Prisma P2002)', async () => {
      const prismaError = { code: 'P2002', meta: { target: ['email'] } };
      mockPrismaService.user.create.mockRejectedValue(prismaError);

      await expect(service.verifyAndCreateAccount(mockToken)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw InternalServerErrorException on unexpected DB error', async () => {
      mockPrismaService.user.create.mockRejectedValue(new Error('DB down'));

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
