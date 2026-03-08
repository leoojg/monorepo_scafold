import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
            logoutAll: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('false'),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should set refresh token cookie and return access token + operator', async () => {
      const loginDto = { email: 'admin@platform.com', password: 'pass' };
      authService.login.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'raw-refresh',
        operator: { id: '1', name: 'Admin', email: 'admin@platform.com' },
      });

      const result = await controller.login(loginDto, mockResponse as any);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'raw-refresh',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/api/v1/auth',
        }),
      );
      expect(result).toEqual({
        accessToken: 'access-token',
        operator: { id: '1', name: 'Admin', email: 'admin@platform.com' },
      });
    });
  });

  describe('refresh', () => {
    it('should rotate refresh token and set new cookie', async () => {
      authService.refresh.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-raw-refresh',
        operator: { id: '1', name: 'Admin', email: 'admin@platform.com' },
      });

      const mockReq = { cookies: { refresh_token: 'old-raw-refresh' } };
      const result = await controller.refresh(mockReq as any, mockResponse as any);

      expect(authService.refresh).toHaveBeenCalledWith('old-raw-refresh');
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'new-raw-refresh',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({
        accessToken: 'new-access',
        operator: { id: '1', name: 'Admin', email: 'admin@platform.com' },
      });
    });

    it('should throw when no refresh token cookie present', async () => {
      const mockReq = { cookies: {} };

      await expect(
        controller.refresh(mockReq as any, mockResponse as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke refresh token and clear cookie', async () => {
      const mockReq = { cookies: { refresh_token: 'raw-token' } };

      await controller.logout(mockReq as any, mockResponse as any);

      expect(authService.logout).toHaveBeenCalledWith('raw-token');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ path: '/api/v1/auth' }),
      );
    });
  });

  describe('logoutAll', () => {
    it('should revoke all tokens and clear cookie', async () => {
      const mockReq = {
        user: { id: 'operator-uuid' },
        cookies: {},
      };

      await controller.logoutAll(mockReq as any, mockResponse as any);

      expect(authService.logoutAll).toHaveBeenCalledWith('operator-uuid');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ path: '/api/v1/auth' }),
      );
    });
  });
});
