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
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('test-secret');
    mockConfigService.getOrThrow.mockReturnValue('test-secret');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
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
    };

    it('should return access token, email and user info on successful login', async () => {
      mockJwtService.sign.mockReturnValue('mockToken');
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login('password123', mockUser);

      expect(result).toEqual({
        access_token: 'mockToken',
        userId: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: mockUser.id, username: mockUser.username },
        { secret: 'test-secret', expiresIn: 'test-secret' },
      );
    });

    it('should throw NotFoundException if user is null', async () => {
      await expect(service.login('password123', null as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      await expect(service.login('wrongpass', mockUser)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('generateToken', () => {
    it('should use JWT_EXPIRATION when no expiresIn is provided', () => {
      mockJwtService.sign.mockReturnValue('signedToken');

      const result = service.generateToken({ sub: 1, username: 'user' });

      expect(result).toBe('signedToken');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: 1, username: 'user' },
        { secret: 'test-secret', expiresIn: 'test-secret' },
      );
    });

    it('should use the provided expiresIn when given', () => {
      mockJwtService.sign.mockReturnValue('emailToken');

      const result = service.generateToken(
        { username: 'user', email: 'a@b.com', hashPass: 'h', action: 'register' },
        '24h',
      );

      expect(result).toBe('emailToken');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'register' }),
        { secret: 'test-secret', expiresIn: '24h' },
      );
    });
  });

  describe('verifyToken', () => {
    it('should return the decoded payload for a valid token', () => {
      const mockPayload = { sub: 1, email: 'test@example.com' };
      mockJwtService.verify.mockReturnValue(mockPayload);

      const result = service.verifyToken('validToken');

      expect(result).toEqual(mockPayload);
      expect(mockJwtService.verify).toHaveBeenCalledWith('validToken', {
        secret: 'test-secret',
      });
    });

    it('should propagate the error when jwtService.verify throws', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      expect(() => service.verifyToken('bad.token')).toThrow('invalid signature');
    });
  });
});
