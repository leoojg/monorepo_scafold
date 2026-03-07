# P04 — Auth Module

## Metadata
- **Depende de:** P03
- **Branch:** main
- **Worktree:** nao

## Objetivo
Criar o modulo de autenticacao JWT para operators, incluindo login, guard, strategy e script de geracao do OpenAPI.

## Arquivos a criar

```
apps/api/src/
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── auth-response.dto.ts
│   └── operators/
│       ├── operators.module.ts
│       ├── operators.service.ts
│       └── dto/
│           └── operator-response.dto.ts
├── common/
│   └── guards/
│       └── operator-auth.guard.ts
scripts/
└── generate-openapi.ts
```

## Passos de execucao

### Passo 1 — apps/api/src/modules/auth/dto/login.dto.ts

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator';
import { ToLowerCase } from '../../../common/decorators/to-lower-case.decorator';

export class LoginDto {
  @ApiProperty({ example: 'admin@platform.com' })
  @IsEmail()
  @IsNotEmpty()
  @Trim()
  @ToLowerCase()
  email!: string;

  @ApiProperty({ example: 'change-me-immediately' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
```

### Passo 2 — apps/api/src/modules/auth/dto/auth-response.dto.ts

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  operator!: {
    id: string;
    name: string;
    email: string;
  };
}
```

### Passo 3 — apps/api/src/modules/operators/dto/operator-response.dto.ts

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class OperatorResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
```

### Passo 4 — apps/api/src/modules/operators/operators.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Operator } from './operator.entity';

@Injectable()
export class OperatorsService {
  constructor(private readonly em: EntityManager) {}

  async findByEmail(email: string): Promise<Operator | null> {
    return this.em.findOne(Operator, { email });
  }

  async findById(id: string): Promise<Operator | null> {
    return this.em.findOne(Operator, { id });
  }
}
```

### Passo 5 — apps/api/src/modules/operators/operators.module.ts

```typescript
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Operator } from './operator.entity';
import { OperatorsService } from './operators.service';

@Module({
  imports: [MikroOrmModule.forFeature([Operator])],
  providers: [OperatorsService],
  exports: [OperatorsService],
})
export class OperatorsModule {}
```

### Passo 6 — apps/api/src/modules/auth/auth.service.ts

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OperatorsService } from '../operators/operators.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly operatorsService: OperatorsService,
    private readonly jwtService: JwtService,
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

    return {
      accessToken,
      operator: {
        id: operator.id,
        name: operator.name,
        email: operator.email,
      },
    };
  }
}
```

### Passo 7 — apps/api/src/modules/auth/strategies/jwt.strategy.ts

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { OperatorsService } from '../../operators/operators.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly operatorsService: OperatorsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'change-me-in-production'),
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const operator = await this.operatorsService.findById(payload.sub);
    if (!operator || !operator.isActive) {
      throw new UnauthorizedException();
    }
    return operator;
  }
}
```

### Passo 8 — apps/api/src/common/guards/operator-auth.guard.ts

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OperatorAuthGuard extends AuthGuard('jwt') {}
```

### Passo 9 — apps/api/src/modules/auth/auth.controller.ts

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login de operator' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }
}
```

### Passo 10 — apps/api/src/modules/auth/auth.module.ts

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
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
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1d'),
        },
      }),
    }),
    OperatorsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

### Passo 11 — Atualizar app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import mikroOrmConfig from './database/mikro-orm.config';
import { AuthModule } from './modules/auth/auth.module';
import { OperatorsModule } from './modules/operators/operators.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    MikroOrmModule.forRoot(mikroOrmConfig),
    AuthModule,
    OperatorsModule,
  ],
})
export class AppModule {}
```

### Passo 12 — apps/api/scripts/generate-openapi.ts

```typescript
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { writeFileSync } from 'fs';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('Admin Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  writeFileSync('./openapi.json', JSON.stringify(document, null, 2));

  await app.close();
  console.log('OpenAPI spec generated: openapi.json');
}

generate();
```

## Testes

### apps/api/src/modules/auth/auth.service.spec.ts

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { OperatorsService } from '../operators/operators.service';

describe('AuthService', () => {
  let authService: AuthService;
  let operatorsService: jest.Mocked<OperatorsService>;
  let jwtService: jest.Mocked<JwtService>;

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
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    operatorsService = module.get(OperatorsService);
    jwtService = module.get(JwtService);
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
      expect(result.operator.email).toBe('admin@platform.com');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'uuid-1',
        email: 'admin@platform.com',
      });
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
```

### apps/api/src/modules/auth/auth.controller.spec.ts

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe('login', () => {
    it('should call authService.login and return result', async () => {
      const loginDto = { email: 'admin@platform.com', password: 'pass' };
      const expected = {
        accessToken: 'token',
        operator: { id: '1', name: 'Admin', email: 'admin@platform.com' },
      };

      authService.login.mockResolvedValue(expected);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expected);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });
});
```

### Rodar testes

```bash
cd apps/api && pnpm test
```

## Verificacao final

- [ ] `pnpm typecheck` passa sem erros
- [ ] `pnpm test` passa — todos os testes de auth
- [ ] `POST /api/v1/auth/login` funciona com credenciais do seed (se API rodando)
- [ ] `pnpm api:openapi` gera arquivo `openapi.json`
- [ ] Swagger UI acessivel em `http://localhost:3000/docs`

## Ao finalizar
1. Atualizar `docs/plans/PROGRESS.md` -> P04 status `completed`, proximo -> P05
2. Mover este arquivo para `docs/plans/done/`
