import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { OperatorsService } from '../operators/operators.service';
import { RefreshTokensService } from './refresh-tokens.service';

describe('AuthService', () => {
  let authService: AuthService;
  let operatorsService: jest.Mocked<OperatorsService>;
  let jwtService: jest.Mocked<JwtService>;
  let refreshTokensService: jest.Mocked<RefreshTokensService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: OperatorsService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
          },
        },
        {
          provide: RefreshTokensService,
          useValue: {
            createRefreshToken: jest.fn().mockResolvedValue({
              rawToken: 'mock-raw-refresh-token',
              refreshToken: { id: 'rt-id' },
            }),
            rotateRefreshToken: jest.fn(),
            revokeByOperator: jest.fn(),
            revokeByRawToken: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    operatorsService = module.get(OperatorsService);
    jwtService = module.get(JwtService);
    refreshTokensService = module.get(RefreshTokensService);
  });

  describe('login', () => {
    const loginDto = {
      email: 'admin@platform.com',
      password: 'correct-password',
    };

    it('should return access token and operator data on valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 12);
      const mockOperator = {
        id: 'uuid-1',
        name: 'Root Operator',
        email: 'admin@platform.com',
        passwordHash: hashedPassword,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      operatorsService.findByEmail.mockResolvedValue(mockOperator as any);

      const result = await authService.login(loginDto);

      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-raw-refresh-token');
      expect(result.operator.email).toBe('admin@platform.com');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'uuid-1',
        email: 'admin@platform.com',
      });
      expect(refreshTokensService.createRefreshToken).toHaveBeenCalledWith(
        mockOperator,
      );
    });

    it('should throw UnauthorizedException when operator not found', async () => {
      operatorsService.findByEmail.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when operator is inactive', async () => {
      operatorsService.findByEmail.mockResolvedValue({
        id: 'uuid-1',
        isActive: false,
      } as any);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      const hashedPassword = await bcrypt.hash('different-password', 12);
      operatorsService.findByEmail.mockResolvedValue({
        id: 'uuid-1',
        email: 'admin@platform.com',
        passwordHash: hashedPassword,
        isActive: true,
      } as any);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
