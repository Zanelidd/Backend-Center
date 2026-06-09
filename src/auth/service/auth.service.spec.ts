import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

jest.mock('argon2', () => ({
  verify: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      password: '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$c29tZXNhbHQ',
      isEmailVerified: true,
    };

    const mockLoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return access token and user info on successful login', async () => {
      mockJwtService.sign.mockReturnValue('mockToken');
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login(mockLoginDto.password, mockUser);

      expect(result).toEqual({
        access_token: 'mockToken',
        userId: mockUser.id,
        username: mockUser.username,
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: mockUser.id, username: mockUser.username },
        {
          secret: 'test-secret',
          expiresIn: 'test-secret',
        },
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      await expect(
        service.login(mockLoginDto.password, null as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login(mockLoginDto.password, mockUser),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyToken', () => {
    const mockToken = 'validToken';
    const mockPayload = {
      sub: 1,
      email: 'test@example.com',
    };

    it('should return payload for valid token', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);

      const result = await service.verifyToken(mockToken);

      expect(result).toEqual(mockPayload);
      expect(mockJwtService.verify).toHaveBeenCalledWith(mockToken, {
        secret: 'test-secret',
      });
    });

    it('should throw UnauthorizedException for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      expect(() => service.verifyToken(invalidToken)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
