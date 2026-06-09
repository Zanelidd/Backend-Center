import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../provider/database/prisma/prisma.service';
import {
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from '../../auth/service/auth.service';
import { loginDto } from '../dto/login.dto';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
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
      password: 'password123',
      username: 'testuser',
    };

    const mockVerificationToken = 'verificationToken';

    beforeEach(() => {
      mockAuthService.generateToken.mockReturnValue(mockVerificationToken);
    });

    it('should send verification email successfully', async () => {
      const mockUser = {
        id: 1,
        email: mockCreateUserDto.email,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.create(mockCreateUserDto);

      expect(result).toEqual({
        message: 'Verification email sent. Please check your inbox.',
      });
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email: mockCreateUserDto.email },
      });
    });

    it('should throw UnauthorizedException if user already exists', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 1,
        email: mockCreateUserDto.email,
      });

      await expect(service.create(mockCreateUserDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyAndCreateAccount', () => {
    const mockToken = 'validToken';
    const mockDecodedToken = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      action: 'register',
    };

    const mockCreatedUser = {
      id: 1,
      username: mockDecodedToken.username,
      email: mockDecodedToken.email,
      password: 'password123',
    };

    const mockLoginResponse = {
      access_token: 'verificationToken',
      userId: 1,
      username: 'testuser',
    };

    beforeEach(() => {
      mockAuthService.verifyToken.mockReturnValue(mockDecodedToken);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);
      mockAuthService.login.mockResolvedValue(mockLoginResponse);
    });

    it('should verify and create account successfully', async () => {
      const result = await service.verifyAndCreateAccount(mockToken);

      expect(result).toEqual(mockLoginResponse);
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith(mockToken);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: mockDecodedToken.username },
            { email: mockDecodedToken.email },
          ],
        },
      });
      expect(argon2.hash).toHaveBeenCalledWith(
        mockDecodedToken.password,
        expect.any(Object),
      );
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          username: mockDecodedToken.username,
          email: mockDecodedToken.email,
          password: 'hashedPassword',
        },
        select: {
          id: true,
          username: true,
          email: true,
          password: true,
        },
      });
      expect(mockAuthService.login).toHaveBeenCalledWith(
        mockDecodedToken.password,
        mockCreatedUser,
      );
    });

    it('should throw UnauthorizedException if user already exists', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 1,
        email: mockDecodedToken.email,
      });

      await expect(service.verifyAndCreateAccount(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
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
      email: 'test@example.com',
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
});
