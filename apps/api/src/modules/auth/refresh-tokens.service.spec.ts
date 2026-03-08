import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokensService } from './refresh-tokens.service';
import { RefreshToken } from './refresh-token.entity';

describe('RefreshTokensService', () => {
  let service: RefreshTokensService;
  let em: jest.Mocked<EntityManager>;
  let configService: jest.Mocked<ConfigService>;

  const mockOperator = {
    id: 'operator-uuid',
    email: 'admin@platform.com',
    name: 'Admin',
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokensService,
        {
          provide: EntityManager,
          useValue: {
            create: jest.fn(),
            persistAndFlush: jest.fn(),
            findOne: jest.fn(),
            nativeUpdate: jest.fn(),
            flush: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RefreshTokensService>(RefreshTokensService);
    em = module.get(EntityManager);
    configService = module.get(ConfigService);
  });

  describe('createRefreshToken', () => {
    it('should create a refresh token and return the raw token', async () => {
      const mockRefreshToken = new RefreshToken();
      em.create.mockReturnValue(mockRefreshToken as any);

      const result = await service.createRefreshToken(mockOperator as any);

      expect(result.rawToken).toBeDefined();
      expect(typeof result.rawToken).toBe('string');
      expect(result.refreshToken).toBe(mockRefreshToken);
      expect(em.create).toHaveBeenCalledWith(
        RefreshToken,
        expect.objectContaining({
          operator: mockOperator,
          tokenHash: expect.any(String),
          family: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      );
      expect(em.persistAndFlush).toHaveBeenCalledWith(mockRefreshToken);
    });

    it('should use provided family for token rotation', async () => {
      const mockRefreshToken = new RefreshToken();
      em.create.mockReturnValue(mockRefreshToken as any);

      await service.createRefreshToken(mockOperator as any, 'existing-family');

      expect(em.create).toHaveBeenCalledWith(
        RefreshToken,
        expect.objectContaining({
          family: 'existing-family',
        }),
      );
    });
  });

  describe('rotateRefreshToken', () => {
    it('should mark old token as used and create a new one', async () => {
      const oldToken = new RefreshToken();
      oldToken.id = 'old-id';
      oldToken.family = 'family-uuid';
      oldToken.operator = mockOperator as any;
      oldToken.expiresAt = new Date(Date.now() + 86400000);
      oldToken.usedAt = null;
      oldToken.revokedAt = null;

      em.findOne.mockResolvedValue(oldToken);

      const newMockToken = new RefreshToken();
      em.create.mockReturnValue(newMockToken as any);

      const result = await service.rotateRefreshToken('raw-token-string');

      expect(oldToken.usedAt).toBeInstanceOf(Date);
      expect(result.rawToken).toBeDefined();
      expect(result.operator).toBe(mockOperator);
    });

    it('should throw UnauthorizedException when token not found', async () => {
      em.findOne.mockResolvedValue(null);

      await expect(service.rotateRefreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should revoke entire family when reused token detected', async () => {
      const reusedToken = new RefreshToken();
      reusedToken.id = 'reused-id';
      reusedToken.family = 'compromised-family';
      reusedToken.operator = mockOperator as any;
      reusedToken.expiresAt = new Date(Date.now() + 86400000);
      reusedToken.usedAt = new Date(); // already used = reuse attempt
      reusedToken.revokedAt = null;

      em.findOne.mockResolvedValue(reusedToken);

      await expect(service.rotateRefreshToken('reused-raw')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(em.nativeUpdate).toHaveBeenCalledWith(
        RefreshToken,
        { family: 'compromised-family', revokedAt: null },
        { revokedAt: expect.any(Date) },
      );
    });

    it('should throw UnauthorizedException when token is revoked', async () => {
      const revokedToken = new RefreshToken();
      revokedToken.expiresAt = new Date(Date.now() + 86400000);
      revokedToken.usedAt = null;
      revokedToken.revokedAt = new Date();

      em.findOne.mockResolvedValue(revokedToken);

      await expect(service.rotateRefreshToken('revoked-raw')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      const expiredToken = new RefreshToken();
      expiredToken.expiresAt = new Date(Date.now() - 86400000);
      expiredToken.usedAt = null;
      expiredToken.revokedAt = null;

      em.findOne.mockResolvedValue(expiredToken);

      await expect(service.rotateRefreshToken('expired-raw')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('revokeByOperator', () => {
    it('should revoke all tokens for an operator', async () => {
      await service.revokeByOperator('operator-uuid');

      expect(em.nativeUpdate).toHaveBeenCalledWith(
        RefreshToken,
        { operator: 'operator-uuid', revokedAt: null },
        { revokedAt: expect.any(Date) },
      );
    });
  });

  describe('revokeByRawToken', () => {
    it('should revoke a single token by raw token', async () => {
      const mockToken = new RefreshToken();
      mockToken.revokedAt = null;
      em.findOne.mockResolvedValue(mockToken);

      await service.revokeByRawToken('raw-token');

      expect(mockToken.revokedAt).toBeInstanceOf(Date);
      expect(em.flush).toHaveBeenCalled();
    });
  });
});
