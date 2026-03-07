# P02 — Backend Base

## Metadata
- **Depende de:** P01
- **Branch:** main
- **Worktree:** nao

## Objetivo
Criar o app NestJS com MikroORM configurado, ValidationPipe global, Swagger setup, decorators comuns e DTOs base de paginacao.

## Arquivos a criar

```
apps/api/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-operator.decorator.ts
│   │   │   ├── api-paginated.decorator.ts
│   │   │   ├── to-boolean.decorator.ts
│   │   │   ├── to-lower-case.decorator.ts
│   │   │   ├── trim.decorator.ts
│   │   │   └── to-int.decorator.ts
│   │   ├── dto/
│   │   │   ├── pagination-query.dto.ts
│   │   │   └── paginated-response.dto.ts
│   │   ├── filters/
│   │   │   ├── http-exception.filter.ts
│   │   │   └── mikro-orm-exception.filter.ts
│   │   └── interfaces/
│   │       └── request-context.interface.ts
│   └── database/
│       └── mikro-orm.config.ts
```

## Passos de execucao

### Passo 1 — apps/api/package.json

```json
{
  "name": "@admin/api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,test}/**/*.ts\"",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "api:openapi": "ts-node scripts/generate-openapi.ts",
    "db:migrate": "npx mikro-orm migration:up",
    "db:migrate:create": "npx mikro-orm migration:create",
    "db:seed": "npx mikro-orm seeder:run"
  },
  "dependencies": {
    "@mikro-orm/core": "^6.4.0",
    "@mikro-orm/migrations": "^6.4.0",
    "@mikro-orm/nestjs": "^6.0.0",
    "@mikro-orm/postgresql": "^6.4.0",
    "@mikro-orm/seeder": "^6.4.0",
    "@nestjs/common": "^10.4.0",
    "@nestjs/config": "^3.3.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/platform-express": "^10.4.0",
    "@nestjs/swagger": "^7.4.0",
    "bcrypt": "^5.1.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0"
  },
  "devDependencies": {
    "@admin/eslint-config": "workspace:*",
    "@admin/tsconfig": "workspace:*",
    "@nestjs/cli": "^10.4.0",
    "@nestjs/schematics": "^10.2.0",
    "@nestjs/testing": "^10.4.0",
    "@types/bcrypt": "^5.0.0",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.0",
    "@types/node": "^22.0.0",
    "@types/passport-jwt": "^4.0.0",
    "eslint": "^8.57.0",
    "jest": "^29.7.0",
    "prettier": "^3.4.0",
    "ts-jest": "^29.2.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.7.0"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s", "!**/index.ts", "!main.ts"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node",
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/$1"
    }
  }
}
```

### Passo 2 — apps/api/tsconfig.json

```json
{
  "extends": "@admin/tsconfig/nestjs.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### Passo 3 — apps/api/tsconfig.build.json

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "test", "**/*.spec.ts"]
}
```

### Passo 4 — apps/api/nest-cli.json

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,
          "introspectComments": true
        }
      }
    ]
  }
}
```

### Passo 5 — apps/api/src/common/decorators/to-boolean.decorator.ts

```typescript
import { Transform } from 'class-transformer';

export function ToBoolean(): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['true', '1', 'yes'].includes(value.toLowerCase());
    }
    return false;
  });
}
```

### Passo 6 — apps/api/src/common/decorators/trim.decorator.ts

```typescript
import { Transform } from 'class-transformer';

export function Trim(): PropertyDecorator {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}
```

### Passo 7 — apps/api/src/common/decorators/to-lower-case.decorator.ts

```typescript
import { Transform } from 'class-transformer';

export function ToLowerCase(): PropertyDecorator {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  );
}
```

### Passo 8 — apps/api/src/common/decorators/to-int.decorator.ts

```typescript
import { Transform } from 'class-transformer';

export function ToInt(): PropertyDecorator {
  return Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  });
}
```

### Passo 9 — apps/api/src/common/decorators/current-operator.decorator.ts

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentOperator = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const operator = request.user;
    return data ? operator?.[data] : operator;
  },
);
```

### Passo 10 — apps/api/src/common/dto/paginated-response.dto.ts

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  items: T[];

  @ApiProperty({ example: 150 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 8 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrevious: boolean;

  constructor(items: T[], total: number, page: number, limit: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
    this.hasNext = page < this.totalPages;
    this.hasPrevious = page > 1;
  }
}
```

### Passo 11 — apps/api/src/common/dto/pagination-query.dto.ts

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Min, Max, IsString } from 'class-validator';
import { ToInt } from '../decorators/to-int.decorator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @ToInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @ToInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Campo para ordenacao (ex: "createdAt" ou "-createdAt" para DESC)',
  })
  @IsOptional()
  @IsString()
  sort?: string;

  get offset(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }
}
```

### Passo 12 — apps/api/src/common/decorators/api-paginated.decorator.ts

```typescript
import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';

export function ApiPaginatedResponse<T extends Type>(model: T) {
  return applyDecorators(
    ApiExtraModels(PaginatedResponseDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  );
}
```

### Passo 13 — apps/api/src/common/filters/http-exception.filter.ts

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const error =
      typeof exceptionResponse === 'string'
        ? { message: exceptionResponse }
        : (exceptionResponse as Record<string, unknown>);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      ...error,
    });
  }
}
```

### Passo 14 — apps/api/src/common/filters/mikro-orm-exception.filter.ts

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { Response } from 'express';

@Catch(UniqueConstraintViolationException)
export class MikroOrmExceptionFilter implements ExceptionFilter {
  catch(exception: UniqueConstraintViolationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(HttpStatus.CONFLICT).json({
      statusCode: HttpStatus.CONFLICT,
      message: 'A record with this value already exists',
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Passo 15 — apps/api/src/common/interfaces/request-context.interface.ts

```typescript
export interface RequestContext {
  performedById: string;
  performedByType: 'operator' | 'system';
  tenantId?: string;
  metadata?: {
    ip?: string;
    userAgent?: string;
    route?: string;
  };
}
```

### Passo 16 — apps/api/src/database/mikro-orm.config.ts

```typescript
import { defineConfig, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { SeedManager } from '@mikro-orm/seeder';

export default defineConfig({
  driver: PostgreSqlDriver,
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  dbName: process.env.DB_NAME ?? 'admin_platform',
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD,
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  extensions: [Migrator, SeedManager],
  migrations: {
    path: './src/database/migrations',
    pathTs: './src/database/migrations',
  },
  seeder: {
    path: './src/database/seeders',
    pathTs: './src/database/seeders',
  },
  filters: {
    tenant: {
      cond: (args) => ({ tenant: args.tenantId }),
      default: false,
    },
  },
});
```

### Passo 17 — apps/api/src/app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import mikroOrmConfig from './database/mikro-orm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    MikroOrmModule.forRoot(mikroOrmConfig),
  ],
})
export class AppModule {}
```

### Passo 18 — apps/api/src/main.ts

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MikroOrmExceptionFilter } from './common/filters/mikro-orm-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new MikroOrmExceptionFilter(),
  );

  const config = new DocumentBuilder()
    .setTitle('Admin Platform API')
    .setDescription('Multi-tenant admin management API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticacao de Operators')
    .addTag('tenants', 'Gerenciamento de Tenants')
    .addTag('companies', 'Gerenciamento de Empresas')
    .addTag('users', 'Gerenciamento de Usuarios')
    .addTag('audit', 'Activity Log')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.API_PORT ?? 3000;
  await app.listen(port);
}
bootstrap();
```

### Passo 19 — Instalar dependencias

```bash
cd apps/api && pnpm install
```

## Verificacao final

- [ ] `pnpm install` roda sem erros na raiz
- [ ] `cd apps/api && pnpm typecheck` roda sem erros
- [ ] Todos os arquivos em `common/` existem e tem sintaxe valida
- [ ] `main.ts` e `app.module.ts` compilam corretamente

## Commit

Apos verificacao final, commitar todas as alteracoes:
- Mensagem: `feat(P02): backend base - NestJS, MikroORM, ValidationPipe, Swagger, decorators e DTOs`
- Escrever mensagem em `/tmp/commit-msg.txt`, usar `git commit -F /tmp/commit-msg.txt`, apagar o arquivo depois.

## Ao finalizar
1. Atualizar `docs/plans/PROGRESS.md` -> P02 status `completed`, proximo -> P03
2. Mover este arquivo para `docs/plans/done/`
