# Refresh Token Strategy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add refresh token rotation with HttpOnly cookies, enabling short-lived access tokens (15min) with silent renewal via long-lived refresh tokens (7 days).

**Architecture:** New `RefreshToken` entity with family-based rotation tracking. Login issues access token (body) + refresh token (HttpOnly cookie). Axios interceptor handles silent refresh on 401. Revocation on operator deactivation/password change.

**Tech Stack:** NestJS, MikroORM, Passport-JWT, bcrypt (SHA-256 for token hashing), Axios interceptors, HttpOnly cookies

**Design doc:** `docs/plans/2026-03-08-refresh-token-design.md`

---

## Task 1: RefreshToken Entity

**Files:**
- Create: `apps/api/src/modules/auth/refresh-token.entity.ts`
- Test: `apps/api/src/modules/auth/refresh-token.entity.spec.ts`

**Step 1: Write the failing test**

```typescript
// apps/api/src/modules/auth/refresh-token.entity.spec.ts
import { RefreshToken } from './refresh-token.entity';

describe('RefreshToken', () => {
  it('should create a refresh token with required fields', () => {
    const token = new RefreshToken();
    token.tokenHash = 'abc123hash';
    token.family = 'family-uuid';
    token.expiresAt = new Date('2026-04-01');

    expect(token.tokenHash).toBe('abc123hash');
    expect(token.family).toBe('family-uuid');
    expect(token.expiresAt).toEqual(new Date('2026-04-01'));
    expect(token.createdAt).toBeInstanceOf(Date);
    expect(token.usedAt).toBeNull();
    expect(token.revokedAt).toBeNull();
  });

  it('should have isValid computed property', () => {
    const token = new RefreshToken();
    token.expiresAt = new Date(Date.now() + 86400000); // tomorrow
    token.usedAt = null;
    token.revokedAt = null;

    expect(token.isValid).toBe(true);
  });

  it('should be invalid when expired', () => {
    const token = new RefreshToken();
    token.expiresAt = new Date(Date.now() - 86400000); // yesterday
    token.usedAt = null;
    token.revokedAt = null;

    expect(token.isValid).toBe(false);
  });

  it('should be invalid when used', () => {
    const token = new RefreshToken();
    token.expiresAt = new Date(Date.now() + 86400000);
    token.usedAt = new Date();
    token.revokedAt = null;

    expect(token.isValid).toBe(false);
  });

  it('should be invalid when revoked', () => {
    const token = new RefreshToken();
    token.expiresAt = new Date(Date.now() + 86400000);
    token.usedAt = null;
    token.revokedAt = new Date();

    expect(token.isValid).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest src/modules/auth/refresh-token.entity.spec.ts --no-coverage`
Expected: FAIL — `Cannot find module './refresh-token.entity'`

**Step 3: Write minimal implementation**

```typescript
// apps/api/src/modules/auth/refresh-token.entity.ts
import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { Operator } from '../operators/operator.entity';

@Entity({ tableName: 'refresh_tokens' })
export class RefreshToken {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ index: true })
  tokenHash!: string;

  @ManyToOne(() => Operator)
  operator!: Operator;

  @Property({ type: 'uuid', index: true })
  family!: string;

  @Property()
  expiresAt!: Date;

  @Property({ nullable: true })
  usedAt: Date | null = null;

  @Property({ nullable: true })
  revokedAt: Date | null = null;

  @Property()
  createdAt: Date = new Date();

  get isValid(): boolean {
    return !this.usedAt && !this.revokedAt && this.expiresAt > new Date();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest src/modules/auth/refresh-token.entity.spec.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

Message: `feat(api): add RefreshToken entity with family-based rotation tracking`

---

## Task 2: Database Migration

**Files:**
- Create: `apps/api/src/database/migrations/Migration<timestamp>.ts` (generated)
- Modify: `apps/api/.env` (env vars)
- Modify: `.env.example` (env vars)

**Step 1: Generate migration**

Run: `cd apps/api && npx mikro-orm migration:create`

This should auto-detect the new `RefreshToken` entity and generate the migration.

**Step 2: Verify the generated migration**

Open the generated migration file and verify it contains:
- `CREATE TABLE refresh_tokens` with all columns
- Foreign key to `operators` table
- Indexes on `token_hash` and `family`

**Step 3: Add environment variables**

Add to `.env.example`:
```
JWT_REFRESH_SECRET=change-me-in-production
JWT_REFRESH_EXPIRES_IN=7d
```

Add the same to `apps/api/.env` (with actual dev values).

Update `JWT_EXPIRES_IN=1d` to `JWT_EXPIRES_IN=15m` in both files.

**Step 4: Run migration**

Run: `cd apps/api && npx mikro-orm migration:up`
Expected: Migration applied successfully.

**Step 5: Commit**

Message: `feat(api): add refresh_tokens migration and env config`

---

## Task 3: RefreshTokensService

**Files:**
- Create: `apps/api/src/modules/auth/refresh-tokens.service.ts`
- Test: `apps/api/src/modules/auth/refresh-tokens.service.spec.ts`

**Step 1: Write the failing tests**

```typescript
// apps/api/src/modules/auth/refresh-tokens.service.spec.ts
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
      revokedToken.revokedAt = new Date(); // revoked

      em.findOne.mockResolvedValue(revokedToken);

      await expect(service.rotateRefreshToken('revoked-raw')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      const expiredToken = new RefreshToken();
      expiredToken.expiresAt = new Date(Date.now() - 86400000); // expired
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

  describe('revokeByTokenHash', () => {
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
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest src/modules/auth/refresh-tokens.service.spec.ts --no-coverage`
Expected: FAIL — `Cannot find module './refresh-tokens.service'`

**Step 3: Write minimal implementation**

```typescript
// apps/api/src/modules/auth/refresh-tokens.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash, randomUUID } from 'crypto';
import { RefreshToken } from './refresh-token.entity';
import { Operator } from '../operators/operator.entity';

@Injectable()
export class RefreshTokensService {
  constructor(
    private readonly em: EntityManager,
    private readonly configService: ConfigService,
  ) {}

  async createRefreshToken(
    operator: Operator,
    family?: string,
  ): Promise<{ rawToken: string; refreshToken: RefreshToken }> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d');

    const refreshToken = this.em.create(RefreshToken, {
      tokenHash,
      operator,
      family: family ?? randomUUID(),
      expiresAt: this.parseExpiry(expiresIn),
    });

    await this.em.persistAndFlush(refreshToken);

    return { rawToken, refreshToken };
  }

  async rotateRefreshToken(
    rawToken: string,
  ): Promise<{ rawToken: string; refreshToken: RefreshToken; operator: Operator }> {
    const tokenHash = this.hashToken(rawToken);
    const existing = await this.em.findOne(
      RefreshToken,
      { tokenHash },
      { populate: ['operator'] },
    );

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse detection: token already used = compromised
    if (existing.usedAt) {
      await this.em.nativeUpdate(
        RefreshToken,
        { family: existing.family, revokedAt: null },
        { revokedAt: new Date() },
      );
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (existing.revokedAt || existing.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Mark as used
    existing.usedAt = new Date();

    // Create new token in same family
    const result = await this.createRefreshToken(existing.operator, existing.family);
    await this.em.flush();

    return { ...result, operator: existing.operator };
  }

  async revokeByOperator(operatorId: string): Promise<void> {
    await this.em.nativeUpdate(
      RefreshToken,
      { operator: operatorId, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  async revokeByRawToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const token = await this.em.findOne(RefreshToken, { tokenHash });
    if (token) {
      token.revokedAt = new Date();
      await this.em.flush();
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseExpiry(value: string): Date {
    const match = value.match(/^(\d+)([dhms])$/);
    if (!match) return new Date(Date.now() + 7 * 86400000); // default 7d

    const amount = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000,
    };

    return new Date(Date.now() + amount * multipliers[unit]);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest src/modules/auth/refresh-tokens.service.spec.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

Message: `feat(api): add RefreshTokensService with rotation and reuse detection`

---

## Task 4: Update AuthService — Login with Refresh Token

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts`
- Modify: `apps/api/src/modules/auth/auth.service.spec.ts`

**Step 1: Update tests for login returning refresh token**

Add to `auth.service.spec.ts` — update the imports, setup, and the success test:

```typescript
// Add import
import { RefreshTokensService } from './refresh-tokens.service';

// In beforeEach, add RefreshTokensService mock provider:
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

// Add variable:
let refreshTokensService: jest.Mocked<RefreshTokensService>;

// In beforeEach after compile:
refreshTokensService = module.get(RefreshTokensService);

// Update the success test:
it('should return access token, refresh token, and operator data on valid credentials', async () => {
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
  expect(refreshTokensService.createRefreshToken).toHaveBeenCalledWith(mockOperator);
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest src/modules/auth/auth.service.spec.ts --no-coverage`
Expected: FAIL — `result.refreshToken` is undefined

**Step 3: Update AuthService login method**

```typescript
// apps/api/src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OperatorsService } from '../operators/operators.service';
import { RefreshTokensService } from './refresh-tokens.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly operatorsService: OperatorsService,
    private readonly jwtService: JwtService,
    private readonly refreshTokensService: RefreshTokensService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const operator = await this.operatorsService.findByEmail(dto.email);

    if (!operator || !operator.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      operator.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: operator.id, email: operator.email };
    const accessToken = this.jwtService.sign(payload);

    const { rawToken } = await this.refreshTokensService.createRefreshToken(operator);

    return {
      accessToken,
      refreshToken: rawToken,
      operator: {
        id: operator.id,
        name: operator.name,
        email: operator.email,
      },
    };
  }
}
```

**Step 4: Update AuthResponseDto**

```typescript
// apps/api/src/modules/auth/dto/auth-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  operator!: {
    id: string;
    name: string;
    email: string;
  };
}
```

**Step 5: Run test to verify it passes**

Run: `cd apps/api && npx jest src/modules/auth/auth.service.spec.ts --no-coverage`
Expected: PASS

**Step 6: Commit**

Message: `feat(api): integrate refresh token creation into login flow`

---

## Task 5: Add Refresh, Logout, and Logout-All to AuthService

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts`
- Modify: `apps/api/src/modules/auth/auth.service.spec.ts`

**Step 1: Write failing tests for new methods**

Add to `auth.service.spec.ts`:

```typescript
describe('refresh', () => {
  it('should return new access token and refresh token', async () => {
    const mockOperator = {
      id: 'uuid-1',
      email: 'admin@platform.com',
      name: 'Admin',
      isActive: true,
    };

    refreshTokensService.rotateRefreshToken.mockResolvedValue({
      rawToken: 'new-raw-refresh',
      refreshToken: { id: 'new-rt-id' } as any,
      operator: mockOperator as any,
    });

    const result = await authService.refresh('old-raw-token');

    expect(result.accessToken).toBe('mock-token');
    expect(result.refreshToken).toBe('new-raw-refresh');
    expect(result.operator.email).toBe('admin@platform.com');
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 'uuid-1',
      email: 'admin@platform.com',
    });
  });

  it('should throw when operator is inactive', async () => {
    refreshTokensService.rotateRefreshToken.mockResolvedValue({
      rawToken: 'new-raw',
      refreshToken: { id: 'rt-id' } as any,
      operator: { id: 'uuid-1', isActive: false } as any,
    });

    await expect(authService.refresh('token')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('logout', () => {
  it('should revoke a single refresh token', async () => {
    await authService.logout('raw-token');

    expect(refreshTokensService.revokeByRawToken).toHaveBeenCalledWith('raw-token');
  });
});

describe('logoutAll', () => {
  it('should revoke all refresh tokens for an operator', async () => {
    await authService.logoutAll('operator-uuid');

    expect(refreshTokensService.revokeByOperator).toHaveBeenCalledWith('operator-uuid');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest src/modules/auth/auth.service.spec.ts --no-coverage`
Expected: FAIL — `authService.refresh is not a function`

**Step 3: Add methods to AuthService**

Add these methods to `auth.service.ts`:

```typescript
async refresh(rawRefreshToken: string): Promise<AuthResponseDto> {
  const { rawToken, operator } =
    await this.refreshTokensService.rotateRefreshToken(rawRefreshToken);

  if (!operator.isActive) {
    await this.refreshTokensService.revokeByOperator(operator.id);
    throw new UnauthorizedException('Operator is inactive');
  }

  const payload = { sub: operator.id, email: operator.email };
  const accessToken = this.jwtService.sign(payload);

  return {
    accessToken,
    refreshToken: rawToken,
    operator: {
      id: operator.id,
      name: operator.name,
      email: operator.email,
    },
  };
}

async logout(rawRefreshToken: string): Promise<void> {
  await this.refreshTokensService.revokeByRawToken(rawRefreshToken);
}

async logoutAll(operatorId: string): Promise<void> {
  await this.refreshTokensService.revokeByOperator(operatorId);
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest src/modules/auth/auth.service.spec.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

Message: `feat(api): add refresh, logout, and logout-all methods to AuthService`

---

## Task 6: Update AuthController with Cookie Handling

**Files:**
- Modify: `apps/api/src/modules/auth/auth.controller.ts`
- Modify: `apps/api/src/modules/auth/auth.controller.spec.ts`

**Step 1: Write failing tests for new endpoints**

Replace the entire `auth.controller.spec.ts`:

```typescript
// apps/api/src/modules/auth/auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let configService: jest.Mocked<ConfigService>;

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
    configService = module.get(ConfigService);
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
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest src/modules/auth/auth.controller.spec.ts --no-coverage`
Expected: FAIL

**Step 3: Rewrite AuthController**

```typescript
// apps/api/src/modules/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { OperatorAuthGuard } from '../../common/guards/operator-auth.guard';

const COOKIE_NAME = 'refresh_token';
const COOKIE_PATH = '/api/v1/auth';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login de operator' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...result } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return result;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[COOKIE_NAME];
    if (!rawToken) {
      throw new UnauthorizedException('No refresh token');
    }

    const { refreshToken, ...result } = await this.authService.refresh(rawToken);
    this.setRefreshCookie(res, refreshToken);
    return result;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout (revoke current session)' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[COOKIE_NAME];
    if (rawToken) {
      await this.authService.logout(rawToken);
    }
    this.clearRefreshCookie(res);
  }

  @Post('logout-all')
  @UseGuards(OperatorAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all sessions' })
  async logoutAll(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(req.user!['id']);
    this.clearRefreshCookie(res);
  }

  private setRefreshCookie(res: Response, token: string): void {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: COOKIE_PATH,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearRefreshCookie(res: Response): void {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: COOKIE_PATH,
    });
  }
}
```

**Step 4: Install cookie-parser**

Run: `cd apps/api && pnpm add cookie-parser && pnpm add -D @types/cookie-parser`

**Step 5: Add cookie-parser to main.ts**

Add to `apps/api/src/main.ts` after `NestFactory.create`:

```typescript
import * as cookieParser from 'cookie-parser';
// ...
app.use(cookieParser());
```

**Step 6: Update CORS in main.ts**

Update the `enableCors` call to include credentials:

```typescript
app.enableCors({
  origin: process.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:5173',
  credentials: true,
  maxAge: 3600,
});
```

**Step 7: Run test to verify it passes**

Run: `cd apps/api && npx jest src/modules/auth/auth.controller.spec.ts --no-coverage`
Expected: PASS

**Step 8: Commit**

Message: `feat(api): add refresh, logout, logout-all endpoints with cookie handling`

---

## Task 7: Update AuthModule

**Files:**
- Modify: `apps/api/src/modules/auth/auth.module.ts`

**Step 1: Update module to include RefreshTokensService**

```typescript
// apps/api/src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokensService } from './refresh-tokens.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OperatorsModule } from '../operators/operators.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'change-me-in-production'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),
    OperatorsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokensService, JwtStrategy],
  exports: [AuthService, RefreshTokensService],
})
export class AuthModule {}
```

**Step 2: Run all auth tests**

Run: `cd apps/api && npx jest src/modules/auth/ --no-coverage`
Expected: ALL PASS

**Step 3: Commit**

Message: `feat(api): register RefreshTokensService in AuthModule`

---

## Task 8: Revoke Tokens on Operator Deactivation/Password Change

**Files:**
- Modify: `apps/api/src/modules/operators/operators.service.ts`
- Create: `apps/api/src/modules/operators/operators.service.spec.ts` (if not exists, or modify)

**Step 1: Check if operators service has update methods**

Look at the current operators service. If it doesn't have update/deactivate methods, this task hooks into the existing flows where `isActive` or `passwordHash` changes. Since the operators module is likely used by other controllers, we need to add a hook.

The simplest approach: export `RefreshTokensService` from `AuthModule`, import `AuthModule` in `OperatorsModule`, and call `revokeByOperator` when `isActive` or `passwordHash` changes.

However, to avoid circular dependencies (AuthModule already imports OperatorsModule), we'll use a NestJS event approach or restructure.

**Better approach:** Move the revocation logic into a MikroORM subscriber or into the service that handles operator updates. Since the operators service is simple (only `findByEmail` and `findById`), and operator updates likely happen through a different controller (admin CRUD), we should hook into wherever `operator.isActive` or `operator.passwordHash` is updated.

**Simplest approach without circular deps:** Extract `RefreshTokensService` into its own module.

```typescript
// Create: apps/api/src/modules/auth/refresh-tokens.module.ts
import { Module } from '@nestjs/common';
import { RefreshTokensService } from './refresh-tokens.service';

@Module({
  providers: [RefreshTokensService],
  exports: [RefreshTokensService],
})
export class RefreshTokensModule {}
```

Then update `AuthModule` to import `RefreshTokensModule` instead of providing `RefreshTokensService` directly.

For the actual revocation hook, find where operator updates happen (likely in operators or users controllers) and add the call there.

**Step 2: Write test for revocation on operator update**

Look at the existing operators controller or service that handles updates. Add a test that verifies `refreshTokensService.revokeByOperator` is called when `isActive` changes to `false` or when `passwordHash` changes.

**Note:** This task depends on how operator updates are currently handled. The executor should:
1. Find where operator `isActive` and `passwordHash` are modified
2. Inject `RefreshTokensService` there
3. Call `revokeByOperator` when those fields change
4. Add tests for the integration

**Step 3: Commit**

Message: `feat(api): revoke refresh tokens on operator deactivation or password change`

---

## Task 9: Frontend — Axios Silent Refresh Interceptor

**Files:**
- Modify: `apps/admin/src/api/client.ts`

**Step 1: Update the Axios client with silent refresh logic**

```typescript
// apps/admin/src/api/client.ts
import Axios, { type AxiosRequestConfig, type AxiosError } from 'axios';

const AXIOS_INSTANCE = Axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
  withCredentials: true, // send cookies with every request
});

AXIOS_INSTANCE.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
}

AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      (originalRequest as any)._retry ||
      originalRequest.url === '/auth/refresh' ||
      originalRequest.url === '/auth/login'
    ) {
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_operator');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(AXIOS_INSTANCE(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    (originalRequest as any)._retry = true;

    try {
      const { data } = await AXIOS_INSTANCE.post('/auth/refresh');
      const newToken = data.accessToken;

      localStorage.setItem('auth_token', newToken);
      if (data.operator) {
        localStorage.setItem('auth_operator', JSON.stringify(data.operator));
      }

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      processQueue(null, newToken);

      return AXIOS_INSTANCE(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_operator');
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  const promise = AXIOS_INSTANCE(config).then(({ data }) => data);
  return promise;
};

export default customInstance;
```

**Step 2: Verify the app builds**

Run: `cd apps/admin && pnpm typecheck`
Expected: No errors

**Step 3: Commit**

Message: `feat(admin): add silent refresh interceptor with request queuing`

---

## Task 10: Frontend — Update Auth Provider for Logout

**Files:**
- Modify: `apps/admin/src/features/auth/auth-provider.tsx`
- Modify: `apps/admin/src/features/auth/login-page.tsx`

**Step 1: Update AuthProvider logout to call API**

```typescript
// apps/admin/src/features/auth/auth-provider.tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { customInstance } from '@/api/client';

interface Operator {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  operator: Operator | null;
  token: string | null;
  login: (token: string, operator: Operator) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('auth_token'),
  );
  const [operator, setOperator] = useState<Operator | null>(() => {
    const stored = localStorage.getItem('auth_operator');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback((newToken: string, newOperator: Operator) => {
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_operator', JSON.stringify(newOperator));
    setToken(newToken);
    setOperator(newOperator);
  }, []);

  const logout = useCallback(async () => {
    try {
      await customInstance({ url: '/auth/logout', method: 'POST' });
    } catch {
      // ignore errors — clear local state regardless
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_operator');
    setToken(null);
    setOperator(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        operator,
        token,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

**Step 2: LoginPage — no changes needed**

The login page already reads `accessToken` and `operator` from the response body. The refresh token is now set as a cookie by the server automatically — no frontend code needed.

**Step 3: Verify build**

Run: `cd apps/admin && pnpm typecheck`
Expected: No errors

**Step 4: Commit**

Message: `feat(admin): update auth provider to call logout API endpoint`

---

## Task 11: Run All Tests and Final Verification

**Step 1: Run all backend tests**

Run: `cd apps/api && pnpm test --no-coverage`
Expected: ALL PASS

**Step 2: Run typecheck on both apps**

Run: `pnpm typecheck` (from root, via turborepo)
Expected: No errors

**Step 3: Run the API and verify manually**

Run: `cd apps/api && pnpm dev`

Test with curl:
```bash
# Login — should return accessToken + operator, Set-Cookie header with refresh_token
curl -v -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@platform.com","password":"change-me-immediately"}'

# Refresh — send cookie, should get new accessToken + new Set-Cookie
curl -v -X POST http://localhost:3000/api/v1/auth/refresh \
  -b "refresh_token=<token-from-login>"

# Logout — send cookie, should clear it
curl -v -X POST http://localhost:3000/api/v1/auth/logout \
  -b "refresh_token=<token>"
```

**Step 4: Final commit if any adjustments**

Message: `fix(api): address issues found during manual verification`
