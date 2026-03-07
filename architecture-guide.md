# Arquitetura — Admin Multi-Tenant

## 1. Decisões de Nomenclatura

### Administradores da Plataforma → **Operators**

O termo **Operator** é amplamente usado em plataformas SaaS enterprise (Auth0, Stripe internamente, AWS Control Tower). Ele diferencia claramente esses usuários dos "admins" que existem dentro de cada tenant, evitando ambiguidade. Alternativas comuns seriam "Super Admin" ou "Staff", mas "Operator" é mais profissional e preciso.

### Tenant = Organização/Conta — você está correto

Um **Tenant** é de fato uma organização ou conta. No banco e no código, a entidade se chama `Tenant`, mas na UI você pode exibir como "Organização" para o usuário final.

### Empresas → **Companies** (bom nome, manter)

Como você quer vincular cobranças e configurações de plataforma a esse nível, "Company" é semanticamente correto. Alternativas como "Workspace" ou "Business Unit" são mais vagas para seu caso de uso.

---

## 2. Banco de Dados

### PostgreSQL — a escolha ideal

**Por quê:**

- Suporte nativo a `jsonb` para armazenar diffs no audit log de forma eficiente e consultável
- Excelente suporte em MikroORM (é o driver mais maduro)
- Extensões úteis: `uuid-ossp` (PKs), `pg_trgm` (busca textual), `citext` (emails case-insensitive)
- Transações robustas e isolamento de dados confiável
- Ecossistema imenso e bem documentado

### Estratégia Multi-Tenant: **Shared Database com Discriminator Column**

Existem três abordagens:

| Estratégia | Prós | Contras |
|---|---|---|
| **DB por tenant** | Isolamento total | Complexidade operacional enorme |
| **Schema por tenant** | Bom isolamento | Migrations complicadas em escala |
| **Shared DB + tenant_id** | Simples, queries cross-tenant fáceis | Precisa de disciplina nos filtros |

Para um sistema admin onde operators precisam de visão cross-tenant, a abordagem **shared database** com coluna `tenant_id` é a mais pragmática. MikroORM suporta **Global Filters** que garantem o escopo automaticamente.

---

## 3. Contrato API — Geração Automática de Client com Orval

### Por que Orval?

O frontend **não compartilha** DTOs nem interfaces com o backend. Em vez disso, o Swagger do NestJS gera um schema OpenAPI, e o **Orval** consome esse schema para gerar automaticamente:

- Tipos TypeScript (request/response)
- Hooks do TanStack Query (queries e mutations)
- Uma instância Axios configurada como fetcher

Isso garante que o contrato entre backend e frontend é **sempre derivado da source of truth** (o Swagger), sem acoplamento via pacote compartilhado.

### Fluxo de Geração

```
NestJS (DTOs + Decorators)
  → Swagger Plugin gera openapi.json
    → Orval lê openapi.json
      → Gera types + hooks em apps/admin/src/api/generated/
```

### Configuração do Orval

```typescript
// apps/admin/orval.config.ts
import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: {
      // Em dev, aponta para o endpoint live do Swagger
      // Em CI, aponta para o arquivo gerado
      target: process.env.CI
        ? '../api/openapi.json'
        : 'http://localhost:3000/docs-json',
    },
    output: {
      target: './src/api/generated/endpoints.ts',
      schemas: './src/api/generated/schemas',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/api/client.ts',
          name: 'customInstance',
        },
        query: {
          useQuery: true,
          useInfinite: false,
          useSuspenseQuery: false,
          signal: true,
        },
        useNamedParameters: true,
      },
      mode: 'tags-split',
      prettier: true,
    },
  },
});
```

### Custom Axios Instance (Mutator)

```typescript
// apps/admin/src/api/client.ts
import Axios, { type AxiosRequestConfig } from 'axios';

const AXIOS_INSTANCE = Axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
});

AXIOS_INSTANCE.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  const promise = AXIOS_INSTANCE(config).then(({ data }) => data);
  return promise;
};

export default customInstance;
```

### Scripts no package.json do frontend

```jsonc
// apps/admin/package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "api:generate": "orval",
    "api:watch": "chokidar '../api/openapi.json' -c 'pnpm api:generate'"
  }
}
```

### Exportação do OpenAPI no Backend

```typescript
// apps/api/scripts/generate-openapi.ts
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

### Pipeline no Turborepo

```jsonc
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "db:migrate": {
      "cache": false
    },
    "api:openapi": {
      "outputs": ["openapi.json"],
      "dependsOn": ["^build"]
    },
    "api:generate": {
      "dependsOn": ["api#api:openapi"],
      "outputs": ["src/api/generated/**"]
    }
  }
}
```

---

## 4. Estrutura do Monorepo

```
multi-tenant-admin/
├── apps/
│   ├── api/                    # NestJS Backend
│   └── admin/                  # React Frontend
├── packages/
│   ├── eslint-config/          # ESLint config compartilhado
│   └── tsconfig/               # TSConfig base compartilhado
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── .env.example
```

> **Nota:** não existe `packages/shared`. Enums e types que antes seriam compartilhados
> agora são gerados pelo Orval como union types no frontend, derivados dos schemas do Swagger.
> O backend é a single source of truth.

### `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

---

## 5. Backend — NestJS + MikroORM + class-validator + Swagger

### Estrutura do app `api/`

```
apps/api/
├── src/
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-operator.decorator.ts  # @CurrentOperator() param decorator
│   │   │   ├── api-paginated.decorator.ts     # Swagger decorator para respostas paginadas
│   │   │   ├── to-boolean.decorator.ts        # @ToBoolean() property decorator
│   │   │   ├── to-lower-case.decorator.ts     # @ToLowerCase() property decorator
│   │   │   ├── trim.decorator.ts              # @Trim() property decorator
│   │   │   └── to-int.decorator.ts            # @ToInt() property decorator
│   │   ├── dto/
│   │   │   ├── pagination-query.dto.ts        # Query params de paginação base
│   │   │   └── paginated-response.dto.ts      # Wrapper de resposta paginada genérico
│   │   ├── filters/
│   │   │   ├── http-exception.filter.ts
│   │   │   └── mikro-orm-exception.filter.ts
│   │   ├── guards/
│   │   │   └── operator-auth.guard.ts
│   │   ├── interceptors/
│   │   │   └── audit-context.interceptor.ts   # Popula AsyncLocalStorage com operador
│   │   └── interfaces/
│   │       └── request-context.interface.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── auth-response.dto.ts
│   │   │
│   │   ├── operators/
│   │   │   ├── operators.module.ts
│   │   │   ├── operators.service.ts
│   │   │   ├── operator.entity.ts
│   │   │   └── dto/
│   │   │       └── operator-response.dto.ts
│   │   │
│   │   ├── tenants/
│   │   │   ├── tenants.module.ts
│   │   │   ├── tenants.controller.ts
│   │   │   ├── tenants.service.ts
│   │   │   ├── tenant.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-tenant.dto.ts
│   │   │       ├── update-tenant.dto.ts
│   │   │       ├── tenant-response.dto.ts
│   │   │       └── tenant-query.dto.ts       # Extends PaginationQueryDto
│   │   │
│   │   ├── companies/
│   │   │   ├── companies.module.ts
│   │   │   ├── companies.controller.ts
│   │   │   ├── companies.service.ts
│   │   │   ├── company.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-company.dto.ts
│   │   │       ├── update-company.dto.ts
│   │   │       ├── company-response.dto.ts
│   │   │       └── company-query.dto.ts
│   │   │
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── user.entity.ts
│   │   │   ├── user-company.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-user.dto.ts
│   │   │       ├── update-user.dto.ts
│   │   │       ├── user-response.dto.ts
│   │   │       └── user-query.dto.ts
│   │   │
│   │   └── audit/
│   │       ├── audit.module.ts
│   │       ├── audit.controller.ts
│   │       ├── audit.service.ts
│   │       ├── audit-log.entity.ts
│   │       ├── audit.subscriber.ts
│   │       └── dto/
│   │           ├── audit-log-response.dto.ts
│   │           └── audit-query.dto.ts
│   │
│   ├── database/
│   │   ├── mikro-orm.config.ts
│   │   ├── migrations/
│   │   └── seeders/
│   │       └── operator.seeder.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── scripts/
│   └── generate-openapi.ts       # Gera openapi.json para o Orval
├── mikro-orm.config.ts
├── nest-cli.json
├── tsconfig.json
└── package.json
```

### 5.1 Transform Decorators Reutilizáveis

Todos os transformers ficam em `common/decorators/` e são compostos como property decorators. Nenhum DTO individual implementa lógica de transform — apenas aplica os decorators.

```typescript
// === common/decorators/to-boolean.decorator.ts ===
import { Transform } from 'class-transformer';

/**
 * Transforma valores 'true', '1', 'yes', true → true
 * e 'false', '0', 'no', false, undefined → false
 *
 * Útil para query params que chegam como string.
 */
export function ToBoolean(): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['true', '1', 'yes'].includes(value.toLowerCase());
    }
    return false;
  });
}

// === common/decorators/trim.decorator.ts ===
import { Transform } from 'class-transformer';

/**
 * Remove espaços em branco nas extremidades de strings.
 */
export function Trim(): PropertyDecorator {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}

// === common/decorators/to-lower-case.decorator.ts ===
import { Transform } from 'class-transformer';

/**
 * Converte string para lowercase (ideal para emails, slugs).
 */
export function ToLowerCase(): PropertyDecorator {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  );
}

// === common/decorators/to-int.decorator.ts ===
import { Transform } from 'class-transformer';

/**
 * Converte string para integer (ideal para query params de paginação).
 */
export function ToInt(): PropertyDecorator {
  return Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  });
}

// === common/decorators/current-operator.decorator.ts ===
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentOperator = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const operator = request.user;
    return data ? operator?.[data] : operator;
  },
);

// === common/decorators/api-paginated.decorator.ts ===
import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';

/**
 * Decorator para documentar respostas paginadas no Swagger.
 *
 * Uso: @ApiPaginatedResponse(TenantResponseDto)
 */
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

### 5.2 Paginação — Infraestrutura Base

```typescript
// === common/dto/pagination-query.dto.ts ===
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
    description: 'Campo para ordenação (ex: "createdAt" ou "-createdAt" para DESC)',
  })
  @IsOptional()
  @IsString()
  sort?: string;

  get offset(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }
}

// === common/dto/paginated-response.dto.ts ===
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

### 5.3 Exemplo: Query DTO + Controller + Service (paginados)

```typescript
// === modules/tenants/dto/tenant-query.dto.ts ===
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Trim } from '../../../common/decorators/trim.decorator';
import { ToLowerCase } from '../../../common/decorators/to-lower-case.decorator';
import { TenantStatus } from '../enums';

export class TenantQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Busca por nome do tenant' })
  @IsOptional()
  @IsString()
  @Trim()
  search?: string;

  @ApiPropertyOptional({ enum: TenantStatus })
  @IsOptional()
  @IsEnum(TenantStatus)
  @ToLowerCase()
  status?: TenantStatus;
}

// === modules/tenants/dto/create-tenant.dto.ts ===
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, Matches } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator';
import { ToLowerCase } from '../../../common/decorators/to-lower-case.decorator';

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Corporation' })
  @IsNotEmpty()
  @IsString()
  @Trim()
  name!: string;

  @ApiProperty({ example: 'acme-corp' })
  @IsNotEmpty()
  @IsString()
  @Trim()
  @ToLowerCase()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug deve conter apenas letras minúsculas, números e hífens',
  })
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  settings?: Record<string, unknown>;
}

// === modules/tenants/tenants.controller.ts ===
@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(OperatorAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tenants (paginado)' })
  @ApiPaginatedResponse(TenantResponseDto)
  async findAll(
    @Query() query: TenantQueryDto,
  ): Promise<PaginatedResponseDto<TenantResponseDto>> {
    return this.tenantsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar tenant por ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar tenant' })
  async create(@Body() dto: CreateTenantDto): Promise<TenantResponseDto> {
    return this.tenantsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar tenant' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover tenant' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tenantsService.remove(id);
  }
}

// === modules/tenants/tenants.service.ts ===
@Injectable()
export class TenantsService {
  constructor(private readonly em: EntityManager) {}

  async findAll(query: TenantQueryDto): Promise<PaginatedResponseDto<Tenant>> {
    const where: FilterQuery<Tenant> = {};

    if (query.search) {
      where.name = { $ilike: `%${query.search}%` };
    }
    if (query.status) {
      where.status = query.status;
    }

    const orderBy: Record<string, 'ASC' | 'DESC'> = {};
    if (query.sort) {
      const desc = query.sort.startsWith('-');
      const field = desc ? query.sort.slice(1) : query.sort;
      orderBy[field] = desc ? 'DESC' : 'ASC';
    } else {
      orderBy.createdAt = 'DESC';
    }

    const [items, total] = await this.em.findAndCount(Tenant, where, {
      limit: query.limit,
      offset: query.offset,
      orderBy,
    });

    return new PaginatedResponseDto(items, total, query.page!, query.limit!);
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.em.findOne(Tenant, { id });
    if (!tenant) throw new NotFoundException(`Tenant ${id} não encontrado`);
    return tenant;
  }

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const tenant = this.em.create(Tenant, {
      ...dto,
      status: TenantStatus.ACTIVE,
    });
    await this.em.persistAndFlush(tenant);
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);
    this.em.assign(tenant, dto);
    await this.em.flush();
    return tenant;
  }

  async remove(id: string): Promise<void> {
    const tenant = await this.findOne(id);
    await this.em.removeAndFlush(tenant);
  }
}
```

### 5.4 Entidades

```typescript
// === operator.entity.ts ===
@Entity({ tableName: 'operators' })
export class Operator {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property()
  name!: string;

  @Property({ unique: true })
  email!: string;

  @Property({ hidden: true })
  passwordHash!: string;

  @Property({ default: true })
  isActive!: boolean;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

// === tenant.entity.ts ===
@Entity({ tableName: 'tenants' })
export class Tenant {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property()
  name!: string;

  @Property({ unique: true })
  slug!: string;

  @Enum(() => TenantStatus)
  status: TenantStatus = TenantStatus.ACTIVE;

  @Property({ type: 'jsonb', nullable: true })
  settings?: Record<string, unknown>;

  @OneToMany(() => Company, (c) => c.tenant)
  companies = new Collection<Company>(this);

  @OneToMany(() => User, (u) => u.tenant)
  users = new Collection<User>(this);

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

// === company.entity.ts ===
@Entity({ tableName: 'companies' })
@Filter({ name: 'tenant', cond: { tenant: { id: '$tenantId' } } })
export class Company {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Tenant)
  tenant!: Tenant;

  @Property()
  name!: string;

  @Property({ unique: true })
  document!: string;

  @Property({ default: true })
  isActive!: boolean;

  @Property({ type: 'jsonb', nullable: true })
  settings?: Record<string, unknown>;

  @Property({ type: 'jsonb', nullable: true })
  billingInfo?: Record<string, unknown>;

  @OneToMany(() => UserCompany, (uc) => uc.company)
  userCompanies = new Collection<UserCompany>(this);

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

// === user.entity.ts ===
@Entity({ tableName: 'users' })
@Filter({ name: 'tenant', cond: { tenant: { id: '$tenantId' } } })
export class User {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Tenant)
  tenant!: Tenant;

  @Property()
  name!: string;

  @Property({ unique: true })
  email!: string;

  @Property({ hidden: true })
  passwordHash!: string;

  @Enum(() => UserRole)
  role!: UserRole;

  @Property({ default: true })
  isActive!: boolean;

  @OneToMany(() => UserCompany, (uc) => uc.user)
  userCompanies = new Collection<UserCompany>(this);

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

// === user-company.entity.ts ===
@Entity({ tableName: 'user_companies' })
export class UserCompany {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Company)
  company!: Company;

  @Enum(() => CompanyRole)
  role!: CompanyRole;

  @Property()
  createdAt: Date = new Date();
}

// === audit-log.entity.ts ===
@Entity({ tableName: 'audit_logs' })
export class AuditLog {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property()
  entityType!: string;

  @Property()
  entityId!: string;

  @Enum(() => AuditAction)
  action!: AuditAction;

  @Property({ type: 'jsonb', nullable: true })
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    diff?: Array<{ field: string; from: unknown; to: unknown }>;
  };

  @Property({ nullable: true })
  performedById?: string;

  @Property()
  performedByType!: string;

  @Property({ nullable: true })
  tenantId?: string;

  @Property({ type: 'jsonb', nullable: true })
  metadata?: {
    ip?: string;
    userAgent?: string;
    route?: string;
  };

  @Property()
  createdAt: Date = new Date();
}
```

### 5.5 Enums (definidos no backend — fonte única de verdade)

```typescript
// Podem ficar em cada módulo ou centralizados em common/enums.ts

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
}

export enum UserRole {
  TENANT_ADMIN = 'tenant_admin',
  COMPANY_ADMIN = 'company_admin',
}

export enum CompanyRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}
```

> O Orval gera esses enums no frontend como union types
> (ex: `type TenantStatus = 'active' | 'suspended' | 'trial'`).
> Não é necessário sincronizar manualmente.

### 5.6 Validation Pipe Global

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

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

  const config = new DocumentBuilder()
    .setTitle('Admin Platform API')
    .setDescription('Multi-tenant admin management API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticação de Operators')
    .addTag('tenants', 'Gerenciamento de Tenants')
    .addTag('companies', 'Gerenciamento de Empresas')
    .addTag('users', 'Gerenciamento de Usuários')
    .addTag('audit', 'Activity Log')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(3000);
}
bootstrap();
```

### 5.7 Audit Subscriber (Diff Logging)

```typescript
// audit.subscriber.ts
import {
  EventSubscriber,
  FlushEventArgs,
  ChangeSet,
  ChangeSetType,
} from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { AuditLog } from './audit-log.entity';
import { AuditAction } from '../../common/enums';

const AUDITABLE_ENTITIES = ['Tenant', 'Company', 'User', 'UserCompany'];

@Injectable()
export class AuditSubscriber implements EventSubscriber {
  private readonly context: AsyncLocalStorage<{
    performedById: string;
    performedByType: string;
    tenantId?: string;
    metadata?: Record<string, unknown>;
  }>;

  async afterFlush(args: FlushEventArgs): Promise<void> {
    const changeSets = args.uow.getChangeSets();
    const auditLogs: AuditLog[] = [];

    for (const cs of changeSets) {
      if (!AUDITABLE_ENTITIES.includes(cs.name)) continue;
      if (cs.name === 'AuditLog') continue;

      const log = this.createAuditLog(cs);
      if (log) auditLogs.push(log);
    }

    if (auditLogs.length > 0) {
      const em = args.uow.getEntityManager().fork();
      auditLogs.forEach((log) => em.persist(log));
      await em.flush();
    }
  }

  private createAuditLog(cs: ChangeSet<any>): AuditLog | null {
    const ctx = this.context?.getStore();
    const log = new AuditLog();

    log.entityType = cs.name;
    log.entityId = cs.entity.id;
    log.performedById = ctx?.performedById;
    log.performedByType = ctx?.performedByType ?? 'system';
    log.tenantId = cs.entity.tenant?.id ?? cs.entity.tenantId ?? ctx?.tenantId;
    log.metadata = ctx?.metadata as any;

    switch (cs.type) {
      case ChangeSetType.CREATE:
        log.action = AuditAction.CREATE;
        log.changes = { after: this.sanitize(cs.payload) };
        break;

      case ChangeSetType.UPDATE:
        log.action = AuditAction.UPDATE;
        log.changes = {
          before: this.extractBefore(cs),
          after: this.sanitize(cs.payload),
          diff: this.computeDiff(cs),
        };
        break;

      case ChangeSetType.DELETE:
        log.action = AuditAction.DELETE;
        log.changes = { before: this.sanitize(cs.originalEntity) };
        break;

      default:
        return null;
    }

    return log;
  }

  private computeDiff(cs: ChangeSet<any>): Array<{ field: string; from: unknown; to: unknown }> {
    return Object.keys(cs.payload).map((field) => ({
      field,
      from: cs.originalEntity?.[field],
      to: cs.payload[field],
    }));
  }

  private extractBefore(cs: ChangeSet<any>): Record<string, unknown> {
    const before: Record<string, unknown> = {};
    for (const field of Object.keys(cs.payload)) {
      before[field] = cs.originalEntity?.[field];
    }
    return before;
  }

  private sanitize(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...data };
    delete sanitized.passwordHash;
    delete sanitized.password;
    return sanitized;
  }
}
```

### 5.8 MikroORM Config

```typescript
// database/mikro-orm.config.ts
import { defineConfig, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { SeedManager } from '@mikro-orm/seeder';
import { AuditSubscriber } from '../modules/audit/audit.subscriber';

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
  subscribers: [new AuditSubscriber()],
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

### 5.9 Seed de Operators

```typescript
// database/seeders/operator.seeder.ts
import { EntityManager } from '@mikro-orm/postgresql';
import { Seeder } from '@mikro-orm/seeder';
import { Operator } from '../../modules/operators/operator.entity';
import * as bcrypt from 'bcrypt';

export class OperatorSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const exists = await em.count(Operator, {});
    if (exists > 0) return;

    const operator = em.create(Operator, {
      name: 'Root Operator',
      email: 'admin@platform.com',
      passwordHash: await bcrypt.hash('change-me-immediately', 12),
      isActive: true,
    });

    await em.persistAndFlush(operator);
  }
}
```

---

## 6. Frontend — React + Vite + shadcn + TanStack (com Orval)

### Estrutura do app `admin/`

```
apps/admin/
├── src/
│   ├── api/
│   │   ├── client.ts                 # Axios instance + mutator para Orval
│   │   └── generated/                # ⚠️ GERADO — não editar
│   │       ├── schemas/
│   │       │   ├── tenantResponseDto.ts
│   │       │   ├── createTenantDto.ts
│   │       │   ├── paginatedResponseDto.ts
│   │       │   └── ...
│   │       ├── tenants.ts            # useGetTenants, useCreateTenant, etc.
│   │       ├── companies.ts
│   │       ├── users.ts
│   │       ├── audit.ts
│   │       └── auth.ts
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn components
│   │   ├── layout/
│   │   │   ├── app-layout.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── header.tsx
│   │   ├── data-table/
│   │   │   ├── data-table.tsx        # Tabela genérica com paginação built-in
│   │   │   ├── columns-helper.tsx
│   │   │   ├── pagination.tsx
│   │   │   └── toolbar.tsx
│   │   └── shared/
│   │       ├── confirm-dialog.tsx
│   │       ├── status-badge.tsx
│   │       └── diff-viewer.tsx
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── login-page.tsx
│   │   │   └── auth-provider.tsx
│   │   ├── dashboard/
│   │   │   └── dashboard-page.tsx
│   │   ├── tenants/
│   │   │   ├── tenants-list-page.tsx
│   │   │   ├── tenant-detail-page.tsx
│   │   │   ├── tenant-form.tsx
│   │   │   └── components/
│   │   │       └── tenant-stats-card.tsx
│   │   ├── companies/
│   │   │   ├── companies-list-page.tsx
│   │   │   ├── company-detail-page.tsx
│   │   │   └── company-form.tsx
│   │   ├── users/
│   │   │   ├── users-list-page.tsx
│   │   │   ├── user-detail-page.tsx
│   │   │   └── user-form.tsx
│   │   └── activity/
│   │       ├── activity-page.tsx
│   │       └── components/
│   │           ├── activity-timeline.tsx
│   │           └── change-detail-card.tsx
│   │
│   ├── lib/
│   │   ├── utils.ts
│   │   └── query-client.ts
│   │
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── login.tsx
│   │   ├── _authenticated.tsx
│   │   └── _authenticated/
│   │       ├── index.tsx
│   │       ├── tenants/
│   │       │   ├── index.tsx
│   │       │   └── $tenantId.tsx
│   │       ├── tenants.$tenantId.companies/
│   │       │   ├── index.tsx
│   │       │   └── $companyId.tsx
│   │       ├── tenants.$tenantId.users/
│   │       │   ├── index.tsx
│   │       │   └── $userId.tsx
│   │       └── activity/
│   │           └── index.tsx
│   │
│   ├── app.tsx
│   └── main.tsx
│
├── orval.config.ts
├── index.html
├── tailwind.config.ts
├── components.json
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Exemplo de Uso — Hooks Gerados + DataTable

```tsx
// features/tenants/tenants-list-page.tsx
import { useState } from 'react';
import { useGetTenants } from '@/api/generated/tenants';
import { DataTable } from '@/components/data-table/data-table';
import { columns } from './columns';

export function TenantsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Hook 100% gerado pelo Orval — tipos inferidos do OpenAPI
  const { data, isLoading } = useGetTenants({
    page,
    limit: 20,
    search: search || undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        pagination={{
          page: data?.page ?? 1,
          totalPages: data?.totalPages ?? 0,
          hasNext: data?.hasNext ?? false,
          hasPrevious: data?.hasPrevious ?? false,
          onPageChange: setPage,
        }}
        onSearchChange={setSearch}
      />
    </div>
  );
}
```

---

## 7. Modelo de Permissões — Resumo Visual

```
┌─────────────────────────────────────────────────┐
│                   PLATAFORMA                     │
│                                                  │
│  Operator (admin@platform.com)                   │
│  ├── Visão total sobre todos os tenants          │
│  ├── CRUD de tenants, companies, users           │
│  └── Acesso ao audit log completo                │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │              TENANT (Org Alpha)              │ │
│  │                                              │ │
│  │  Tenant Admin (joao@alpha.com)               │ │
│  │  ├── Visão sobre TODAS as empresas           │ │
│  │  └── Gerencia usuários do tenant             │ │
│  │                                              │ │
│  │  ┌──────────────┐  ┌──────────────────────┐  │ │
│  │  │ Company A    │  │ Company B            │  │ │
│  │  │              │  │                      │  │ │
│  │  │ Company Admin│  │ Company Admin        │  │ │
│  │  │ (maria@...)  │  │ (carlos@...)         │  │ │
│  │  │ Só vê Comp A │  │ Só vê Comp B         │  │ │
│  │  └──────────────┘  └──────────────────────┘  │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## 8. Diagrama ER

```
operators
├── id (uuid, PK)
├── name
├── email (unique)
├── password_hash
├── is_active
├── created_at
└── updated_at

tenants
├── id (uuid, PK)
├── name
├── slug (unique)
├── status (enum)
├── settings (jsonb)
├── created_at
└── updated_at

companies
├── id (uuid, PK)
├── tenant_id (FK → tenants)
├── name
├── document (unique)
├── is_active
├── settings (jsonb)
├── billing_info (jsonb)
├── created_at
└── updated_at

users
├── id (uuid, PK)
├── tenant_id (FK → tenants)
├── name
├── email (unique)
├── password_hash
├── role (enum: tenant_admin | company_admin)
├── is_active
├── created_at
└── updated_at

user_companies (pivot)
├── id (uuid, PK)
├── user_id (FK → users)
├── company_id (FK → companies)
├── role (enum: admin | member | viewer)
└── created_at

audit_logs
├── id (uuid, PK)
├── entity_type
├── entity_id
├── action (enum: create | update | delete)
├── changes (jsonb)
├── performed_by_id
├── performed_by_type
├── tenant_id (nullable)
├── metadata (jsonb)
└── created_at
```

---

## 9. Checklist de Implementação

### Fase 1 — Fundação
- [ ] Setup monorepo (pnpm + turborepo)
- [ ] Configurar `packages/tsconfig` e `packages/eslint-config`
- [ ] Setup NestJS com MikroORM + PostgreSQL
- [ ] Configurar ValidationPipe global (transform + whitelist + forbidNonWhitelisted)
- [ ] Criar decorators reutilizáveis (`@ToBoolean`, `@Trim`, `@ToLowerCase`, `@ToInt`)
- [ ] Criar DTOs base de paginação (`PaginationQueryDto` + `PaginatedResponseDto`)
- [ ] Criar decorator `@ApiPaginatedResponse` para Swagger
- [ ] Criar entidades e migration inicial
- [ ] Seed de operator inicial
- [ ] Módulo de Auth (JWT) para operators
- [ ] Setup Swagger + script `generate-openapi.ts`

### Fase 2 — CRUD Core (tudo paginado)
- [ ] CRUD de Tenants (TenantQueryDto extends PaginationQueryDto)
- [ ] CRUD de Companies (scoped por tenant, paginado)
- [ ] CRUD de Users (com roles, vínculo a companies, paginado)
- [ ] Global Filter de tenant_id no MikroORM

### Fase 3 — Audit Log
- [ ] Entidade AuditLog
- [ ] AuditSubscriber com diff computation
- [ ] AsyncLocalStorage + AuditContextInterceptor
- [ ] Endpoint de listagem com filtros (paginado)

### Fase 4 — Frontend + Orval
- [ ] Setup Vite + React + TanStack Router
- [ ] Instalar e configurar shadcn/ui
- [ ] Configurar Orval (`orval.config.ts` + mutator)
- [ ] Gerar client inicial: `pnpm api:generate`
- [ ] Adicionar `api:generate` no pipeline do Turborepo
- [ ] Layout (sidebar, header, auth guard)
- [ ] Tela de Login
- [ ] DataTable genérica com paginação built-in
- [ ] Dashboard com métricas básicas
- [ ] CRUD pages para Tenants, Companies, Users (usando hooks gerados)
- [ ] Activity page com timeline e diff viewer

### Fase 5 — Polish
- [ ] Filtros avançados nos query DTOs
- [ ] Tratamento de erros global (backend filters + frontend error boundaries)
- [ ] Loading states e skeleton screens
- [ ] Testes (unitários no backend, e2e com Playwright)
- [ ] Docker Compose para dev (API + PostgreSQL)
- [ ] CI pipeline: build API → openapi.json → Orval → build frontend
