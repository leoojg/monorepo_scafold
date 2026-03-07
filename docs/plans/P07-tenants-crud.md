# P07 — Tenants CRUD

## Metadata
- **Depende de:** P06
- **Branch:** feat/tenants-crud
- **Worktree:** sim

## Objetivo
Implementar o CRUD completo de Tenants: backend (module, controller, service, DTOs, testes) e frontend (list page, detail page, form). TDD obrigatorio.

## Arquivos a criar

```
apps/api/src/modules/tenants/
├── tenants.module.ts
├── tenants.controller.ts
├── tenants.service.ts
├── dto/
│   ├── create-tenant.dto.ts
│   ├── update-tenant.dto.ts
│   ├── tenant-response.dto.ts
│   └── tenant-query.dto.ts
├── tenants.controller.spec.ts
└── tenants.service.spec.ts

apps/admin/src/
├── features/tenants/
│   ├── tenants-list-page.tsx
│   ├── tenant-detail-page.tsx
│   ├── tenant-form.tsx
│   └── columns.tsx
└── routes/_authenticated/
    └── tenants/
        ├── index.tsx
        └── $tenantId.tsx
```

## Passos de execucao

### Passo 1 — apps/api/src/modules/tenants/dto/create-tenant.dto.ts

```typescript
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
    message: 'slug must contain only lowercase letters, numbers and hyphens',
  })
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  settings?: Record<string, unknown>;
}
```

### Passo 2 — apps/api/src/modules/tenants/dto/update-tenant.dto.ts

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {}
```

### Passo 3 — apps/api/src/modules/tenants/dto/tenant-response.dto.ts

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TenantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: ['active', 'suspended', 'trial'] })
  status!: string;

  @ApiPropertyOptional()
  settings?: Record<string, unknown>;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
```

### Passo 4 — apps/api/src/modules/tenants/dto/tenant-query.dto.ts

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Trim } from '../../../common/decorators/trim.decorator';
import { ToLowerCase } from '../../../common/decorators/to-lower-case.decorator';
import { TenantStatus } from '../../../common/enums';

export class TenantQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by tenant name' })
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
```

### Passo 5 — Escrever testes do service PRIMEIRO (TDD RED)

#### apps/api/src/modules/tenants/tenants.service.spec.ts

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Tenant } from './tenant.entity';
import { TenantStatus } from '../../common/enums';

describe('TenantsService', () => {
  let service: TenantsService;
  let em: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        {
          provide: EntityManager,
          useValue: {
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            assign: jest.fn(),
            persistAndFlush: jest.fn(),
            flush: jest.fn(),
            removeAndFlush: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    em = module.get(EntityManager);
  });

  describe('findAll', () => {
    it('should return paginated tenants', async () => {
      const tenants = [
        { id: '1', name: 'Tenant A', slug: 'tenant-a', status: TenantStatus.ACTIVE },
      ];
      em.findAndCount.mockResolvedValue([tenants, 1]);

      const result = await service.findAll({ page: 1, limit: 20 } as any);

      expect(result.items).toEqual(tenants);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should apply search filter', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 20, search: 'acme' } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        Tenant,
        expect.objectContaining({ name: { $ilike: '%acme%' } }),
        expect.any(Object),
      );
    });

    it('should apply status filter', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        status: TenantStatus.ACTIVE,
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        Tenant,
        expect.objectContaining({ status: TenantStatus.ACTIVE }),
        expect.any(Object),
      );
    });

    it('should apply sort parameter', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        sort: '-createdAt',
        offset: 0,
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        Tenant,
        expect.any(Object),
        expect.objectContaining({ orderBy: { createdAt: 'DESC' } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return tenant when found', async () => {
      const tenant = { id: '1', name: 'Tenant A' };
      em.findOne.mockResolvedValue(tenant as any);

      const result = await service.findOne('1');

      expect(result).toEqual(tenant);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      em.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create and persist a tenant', async () => {
      const dto = { name: 'Acme', slug: 'acme' };
      const created = { id: '1', ...dto, status: TenantStatus.ACTIVE };
      em.create.mockReturnValue(created as any);

      const result = await service.create(dto as any);

      expect(em.create).toHaveBeenCalledWith(Tenant, {
        ...dto,
        status: TenantStatus.ACTIVE,
      });
      expect(em.persistAndFlush).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update and flush a tenant', async () => {
      const tenant = { id: '1', name: 'Old Name' };
      em.findOne.mockResolvedValue(tenant as any);

      const dto = { name: 'New Name' };
      await service.update('1', dto as any);

      expect(em.assign).toHaveBeenCalledWith(tenant, dto);
      expect(em.flush).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a tenant', async () => {
      const tenant = { id: '1' };
      em.findOne.mockResolvedValue(tenant as any);

      await service.remove('1');

      expect(em.removeAndFlush).toHaveBeenCalledWith(tenant);
    });
  });
});
```

### Passo 6 — Implementar o service (TDD GREEN)

#### apps/api/src/modules/tenants/tenants.service.ts

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import { Tenant } from './tenant.entity';
import { TenantQueryDto } from './dto/tenant-query.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { TenantStatus } from '../../common/enums';

@Injectable()
export class TenantsService {
  constructor(private readonly em: EntityManager) {}

  async findAll(
    query: TenantQueryDto,
  ): Promise<PaginatedResponseDto<Tenant>> {
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
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
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

### Passo 7 — Escrever testes do controller (TDD RED)

#### apps/api/src/modules/tenants/tenants.controller.spec.ts

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

describe('TenantsController', () => {
  let controller: TenantsController;
  let service: jest.Mocked<TenantsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [
        {
          provide: TenantsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TenantsController>(TenantsController);
    service = module.get(TenantsService);
  });

  it('findAll should call service.findAll', async () => {
    const result = new PaginatedResponseDto([], 0, 1, 20);
    service.findAll.mockResolvedValue(result);

    const response = await controller.findAll({ page: 1, limit: 20 } as any);

    expect(response).toEqual(result);
  });

  it('findOne should call service.findOne', async () => {
    const tenant = { id: '1', name: 'Acme' };
    service.findOne.mockResolvedValue(tenant as any);

    const response = await controller.findOne('1');

    expect(response).toEqual(tenant);
  });

  it('create should call service.create', async () => {
    const dto = { name: 'Acme', slug: 'acme' };
    const created = { id: '1', ...dto };
    service.create.mockResolvedValue(created as any);

    const response = await controller.create(dto as any);

    expect(response).toEqual(created);
  });

  it('update should call service.update', async () => {
    const dto = { name: 'Updated' };
    const updated = { id: '1', name: 'Updated' };
    service.update.mockResolvedValue(updated as any);

    const response = await controller.update('1', dto as any);

    expect(response).toEqual(updated);
  });

  it('remove should call service.remove', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove('1');

    expect(service.remove).toHaveBeenCalledWith('1');
  });
});
```

### Passo 8 — Implementar controller (TDD GREEN)

#### apps/api/src/modules/tenants/tenants.controller.ts

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantQueryDto } from './dto/tenant-query.dto';
import { TenantResponseDto } from './dto/tenant-response.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated.decorator';
import { OperatorAuthGuard } from '../../common/guards/operator-auth.guard';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(OperatorAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'List tenants (paginated)' })
  @ApiPaginatedResponse(TenantResponseDto)
  async findAll(
    @Query() query: TenantQueryDto,
  ): Promise<PaginatedResponseDto<TenantResponseDto>> {
    return this.tenantsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create tenant' })
  async create(@Body() dto: CreateTenantDto): Promise<TenantResponseDto> {
    return this.tenantsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove tenant' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tenantsService.remove(id);
  }
}
```

### Passo 9 — Tenants module

#### apps/api/src/modules/tenants/tenants.module.ts

```typescript
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Tenant } from './tenant.entity';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [MikroOrmModule.forFeature([Tenant])],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
```

### Passo 10 — Registrar no AppModule

Adicionar `TenantsModule` ao array de imports do `AppModule`.

### Passo 11 — Frontend: columns definition

#### apps/admin/src/features/tenants/columns.tsx

```tsx
import { type Column } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { Link } from '@tanstack/react-router';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

export const columns: Column<TenantRow>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (tenant) => (
      <Link
        to="/tenants/$tenantId"
        params={{ tenantId: tenant.id }}
        className="font-medium text-primary hover:underline"
      >
        {tenant.name}
      </Link>
    ),
  },
  {
    key: 'slug',
    header: 'Slug',
  },
  {
    key: 'status',
    header: 'Status',
    render: (tenant) => <StatusBadge status={tenant.status} />,
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (tenant) => new Date(tenant.createdAt).toLocaleDateString(),
  },
];
```

### Passo 12 — Frontend: tenant form

#### apps/admin/src/features/tenants/tenant-form.tsx

```tsx
import { useState, type FormEvent } from 'react';

interface TenantFormData {
  name: string;
  slug: string;
}

interface TenantFormProps {
  initialData?: TenantFormData;
  onSubmit: (data: TenantFormData) => void;
  isLoading?: boolean;
}

export function TenantForm({ initialData, onSubmit, isLoading }: TenantFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [slug, setSlug] = useState(initialData?.slug ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ name, slug });
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!initialData) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="slug" className="text-sm font-medium">
          Slug
        </label>
        <input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          pattern="^[a-z0-9-]+$"
          required
        />
        <p className="text-xs text-muted-foreground">
          Only lowercase letters, numbers and hyphens
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : initialData ? 'Update' : 'Create'}
      </button>
    </form>
  );
}
```

### Passo 13 — Frontend: tenants list page

#### apps/admin/src/features/tenants/tenants-list-page.tsx

```tsx
import { useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { columns } from './columns';
import { customInstance } from '@/api/client';
import { useQuery } from '@tanstack/react-query';

async function fetchTenants(params: { page: number; limit: number; search?: string }) {
  return customInstance<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }>({
    url: '/tenants',
    method: 'GET',
    params,
  });
}

export function TenantsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', { page, search }],
    queryFn: () =>
      fetchTenants({
        page,
        limit: 20,
        search: search || undefined,
      }),
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
        searchPlaceholder="Search tenants..."
      />
    </div>
  );
}
```

### Passo 14 — Frontend: tenant detail page

#### apps/admin/src/features/tenants/tenant-detail-page.tsx

```tsx
import { useQuery } from '@tanstack/react-query';
import { customInstance } from '@/api/client';
import { StatusBadge } from '@/components/shared/status-badge';

interface TenantDetailPageProps {
  tenantId: string;
}

async function fetchTenant(id: string) {
  return customInstance<{
    id: string;
    name: string;
    slug: string;
    status: string;
    settings?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }>({
    url: `/tenants/${id}`,
    method: 'GET',
  });
}

export function TenantDetailPage({ tenantId }: TenantDetailPageProps) {
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenants', tenantId],
    queryFn: () => fetchTenant(tenantId),
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  if (!tenant) {
    return <div className="text-muted-foreground">Tenant not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{tenant.name}</h1>
        <StatusBadge status={tenant.status} />
      </div>

      <div className="grid gap-4 rounded-lg border p-6">
        <div>
          <p className="text-sm text-muted-foreground">Slug</p>
          <p className="font-medium">{tenant.slug}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Created</p>
          <p className="font-medium">
            {new Date(tenant.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Last Updated</p>
          <p className="font-medium">
            {new Date(tenant.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Passo 15 — Routes

#### apps/admin/src/routes/_authenticated/tenants/index.tsx

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { TenantsListPage } from '@/features/tenants/tenants-list-page';

export const Route = createFileRoute('/_authenticated/tenants/')({
  component: TenantsListPage,
});
```

#### apps/admin/src/routes/_authenticated/tenants/$tenantId.tsx

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { TenantDetailPage } from '@/features/tenants/tenant-detail-page';

export const Route = createFileRoute('/_authenticated/tenants/$tenantId')({
  component: () => {
    const { tenantId } = Route.useParams();
    return <TenantDetailPage tenantId={tenantId} />;
  },
});
```

### Passo 16 — Rodar testes

```bash
cd apps/api && pnpm test -- --testPathPattern=tenants
```

## Verificacao final

- [ ] `pnpm test` — todos os testes de tenants passam
- [ ] `pnpm typecheck` — backend e frontend sem erros
- [ ] API: `GET /api/v1/tenants` retorna lista paginada
- [ ] API: `POST /api/v1/tenants` cria tenant
- [ ] API: `GET /api/v1/tenants/:id` retorna tenant
- [ ] API: `PATCH /api/v1/tenants/:id` atualiza tenant
- [ ] API: `DELETE /api/v1/tenants/:id` remove tenant
- [ ] Frontend: pagina de listagem renderiza com DataTable
- [ ] Frontend: pagina de detalhe mostra dados do tenant

## Commit

Apos verificacao final, commitar todas as alteracoes:
- Mensagem: `feat(P07): tenants CRUD - backend module + frontend pages + testes`
- Escrever mensagem em `/tmp/commit-msg.txt`, usar `git commit -F /tmp/commit-msg.txt`, apagar o arquivo depois.

## Ao finalizar
1. Atualizar `docs/plans/PROGRESS.md` -> P07 status `completed`
2. Mover este arquivo para `docs/plans/done/`
3. Merge branch `feat/tenants-crud` na main
4. Limpar worktree
