# P08 — Companies CRUD

## Metadata
- **Depende de:** P06
- **Branch:** feat/companies-crud
- **Worktree:** sim

## Objetivo
Implementar o CRUD completo de Companies scoped por tenant: backend (module, controller, service, DTOs, testes) e frontend (list page, detail page, form). TDD obrigatorio.

## Arquivos a criar

```
apps/api/src/modules/companies/
├── companies.module.ts
├── companies.controller.ts
├── companies.service.ts
├── dto/
│   ├── create-company.dto.ts
│   ├── update-company.dto.ts
│   ├── company-response.dto.ts
│   └── company-query.dto.ts
├── companies.controller.spec.ts
└── companies.service.spec.ts

apps/admin/src/
├── features/companies/
│   ├── companies-list-page.tsx
│   ├── company-detail-page.tsx
│   ├── company-form.tsx
│   └── columns.tsx
└── routes/_authenticated/
    └── tenants.$tenantId.companies/
        ├── index.tsx
        └── $companyId.tsx
```

## Passos de execucao

### Passo 1 — apps/api/src/modules/companies/dto/create-company.dto.ts

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Company Alpha' })
  @IsNotEmpty()
  @IsString()
  @Trim()
  name!: string;

  @ApiProperty({ example: '12.345.678/0001-90' })
  @IsNotEmpty()
  @IsString()
  @Trim()
  document!: string;

  @ApiProperty({ description: 'Tenant ID this company belongs to' })
  @IsNotEmpty()
  @IsUUID()
  tenantId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  settings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  billingInfo?: Record<string, unknown>;
}
```

### Passo 2 — apps/api/src/modules/companies/dto/update-company.dto.ts

```typescript
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';

export class UpdateCompanyDto extends PartialType(
  OmitType(CreateCompanyDto, ['tenantId'] as const),
) {}
```

### Passo 3 — apps/api/src/modules/companies/dto/company-response.dto.ts

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompanyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  document!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional()
  settings?: Record<string, unknown>;

  @ApiPropertyOptional()
  billingInfo?: Record<string, unknown>;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
```

### Passo 4 — apps/api/src/modules/companies/dto/company-query.dto.ts

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Trim } from '../../../common/decorators/trim.decorator';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

export class CompanyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by company name' })
  @IsOptional()
  @IsString()
  @Trim()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;
}
```

### Passo 5 — Escrever testes do service PRIMEIRO (TDD RED)

#### apps/api/src/modules/companies/companies.service.spec.ts

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { NotFoundException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { Company } from './company.entity';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let em: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
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
            getReference: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    em = module.get(EntityManager);
  });

  describe('findAll', () => {
    it('should return paginated companies for a tenant', async () => {
      const companies = [{ id: '1', name: 'Company A' }];
      em.findAndCount.mockResolvedValue([companies, 1]);

      const result = await service.findAll('tenant-1', {
        page: 1,
        limit: 20,
      } as any);

      expect(result.items).toEqual(companies);
      expect(result.total).toBe(1);
      expect(em.findAndCount).toHaveBeenCalledWith(
        Company,
        expect.objectContaining({ tenant: 'tenant-1' }),
        expect.any(Object),
      );
    });

    it('should apply search filter', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('tenant-1', {
        page: 1,
        limit: 20,
        search: 'alpha',
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        Company,
        expect.objectContaining({
          tenant: 'tenant-1',
          name: { $ilike: '%alpha%' },
        }),
        expect.any(Object),
      );
    });

    it('should apply isActive filter', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('tenant-1', {
        page: 1,
        limit: 20,
        isActive: true,
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        Company,
        expect.objectContaining({
          tenant: 'tenant-1',
          isActive: true,
        }),
        expect.any(Object),
      );
    });
  });

  describe('findOne', () => {
    it('should return company when found', async () => {
      const company = { id: '1', name: 'Company A' };
      em.findOne.mockResolvedValue(company as any);

      const result = await service.findOne('tenant-1', '1');
      expect(result).toEqual(company);
    });

    it('should throw NotFoundException when not found', async () => {
      em.findOne.mockResolvedValue(null);
      await expect(service.findOne('tenant-1', 'nope')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create company with tenant reference', async () => {
      const tenantRef = { id: 'tenant-1' };
      em.getReference.mockReturnValue(tenantRef as any);

      const dto = {
        name: 'Company A',
        document: '12345',
        tenantId: 'tenant-1',
      };
      const created = { id: '1', ...dto, tenant: tenantRef };
      em.create.mockReturnValue(created as any);

      const result = await service.create(dto as any);

      expect(em.getReference).toHaveBeenCalledWith('Tenant', 'tenant-1');
      expect(em.persistAndFlush).toHaveBeenCalled();
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update company', async () => {
      const company = { id: '1', name: 'Old' };
      em.findOne.mockResolvedValue(company as any);

      await service.update('tenant-1', '1', { name: 'New' } as any);

      expect(em.assign).toHaveBeenCalledWith(company, { name: 'New' });
      expect(em.flush).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove company', async () => {
      const company = { id: '1' };
      em.findOne.mockResolvedValue(company as any);

      await service.remove('tenant-1', '1');
      expect(em.removeAndFlush).toHaveBeenCalledWith(company);
    });
  });
});
```

### Passo 6 — Implementar service (TDD GREEN)

#### apps/api/src/modules/companies/companies.service.ts

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import { Company } from './company.entity';
import { Tenant } from '../tenants/tenant.entity';
import { CompanyQueryDto } from './dto/company-query.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly em: EntityManager) {}

  async findAll(
    tenantId: string,
    query: CompanyQueryDto,
  ): Promise<PaginatedResponseDto<Company>> {
    const where: FilterQuery<Company> = { tenant: tenantId };

    if (query.search) {
      where.name = { $ilike: `%${query.search}%` };
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const orderBy: Record<string, 'ASC' | 'DESC'> = {};
    if (query.sort) {
      const desc = query.sort.startsWith('-');
      const field = desc ? query.sort.slice(1) : query.sort;
      orderBy[field] = desc ? 'DESC' : 'ASC';
    } else {
      orderBy.createdAt = 'DESC';
    }

    const [items, total] = await this.em.findAndCount(Company, where, {
      limit: query.limit,
      offset: query.offset,
      orderBy,
    });

    return new PaginatedResponseDto(items, total, query.page!, query.limit!);
  }

  async findOne(tenantId: string, id: string): Promise<Company> {
    const company = await this.em.findOne(Company, { id, tenant: tenantId });
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return company;
  }

  async create(dto: CreateCompanyDto): Promise<Company> {
    const tenant = this.em.getReference('Tenant', dto.tenantId) as Tenant;
    const company = this.em.create(Company, {
      name: dto.name,
      document: dto.document,
      settings: dto.settings,
      billingInfo: dto.billingInfo,
      tenant,
      isActive: true,
    });
    await this.em.persistAndFlush(company);
    return company;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateCompanyDto,
  ): Promise<Company> {
    const company = await this.findOne(tenantId, id);
    this.em.assign(company, dto);
    await this.em.flush();
    return company;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const company = await this.findOne(tenantId, id);
    await this.em.removeAndFlush(company);
  }
}
```

### Passo 7 — Escrever testes do controller (TDD RED)

#### apps/api/src/modules/companies/companies.controller.spec.ts

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

describe('CompaniesController', () => {
  let controller: CompaniesController;
  let service: jest.Mocked<CompaniesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [
        {
          provide: CompaniesService,
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

    controller = module.get<CompaniesController>(CompaniesController);
    service = module.get(CompaniesService);
  });

  it('findAll should pass tenantId to service', async () => {
    const result = new PaginatedResponseDto([], 0, 1, 20);
    service.findAll.mockResolvedValue(result);

    await controller.findAll('tenant-1', { page: 1, limit: 20 } as any);

    expect(service.findAll).toHaveBeenCalledWith('tenant-1', {
      page: 1,
      limit: 20,
    });
  });

  it('findOne should pass tenantId and companyId', async () => {
    service.findOne.mockResolvedValue({ id: '1' } as any);

    await controller.findOne('tenant-1', '1');

    expect(service.findOne).toHaveBeenCalledWith('tenant-1', '1');
  });

  it('create should call service.create', async () => {
    const dto = { name: 'Co', document: '123', tenantId: 'tenant-1' };
    service.create.mockResolvedValue({ id: '1', ...dto } as any);

    await controller.create(dto as any);

    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('update should pass tenantId', async () => {
    service.update.mockResolvedValue({ id: '1' } as any);

    await controller.update('tenant-1', '1', { name: 'Updated' } as any);

    expect(service.update).toHaveBeenCalledWith('tenant-1', '1', {
      name: 'Updated',
    });
  });

  it('remove should pass tenantId', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove('tenant-1', '1');

    expect(service.remove).toHaveBeenCalledWith('tenant-1', '1');
  });
});
```

### Passo 8 — Implementar controller (TDD GREEN)

#### apps/api/src/modules/companies/companies.controller.ts

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
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyQueryDto } from './dto/company-query.dto';
import { CompanyResponseDto } from './dto/company-response.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated.decorator';
import { OperatorAuthGuard } from '../../common/guards/operator-auth.guard';

@ApiTags('companies')
@ApiBearerAuth()
@UseGuards(OperatorAuthGuard)
@Controller('tenants/:tenantId/companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'List companies for a tenant (paginated)' })
  @ApiPaginatedResponse(CompanyResponseDto)
  async findAll(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: CompanyQueryDto,
  ): Promise<PaginatedResponseDto<CompanyResponseDto>> {
    return this.companiesService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  async findOne(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CompanyResponseDto> {
    return this.companiesService.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create company' })
  async create(
    @Body() dto: CreateCompanyDto,
  ): Promise<CompanyResponseDto> {
    return this.companiesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update company' })
  async update(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ): Promise<CompanyResponseDto> {
    return this.companiesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove company' })
  async remove(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.companiesService.remove(tenantId, id);
  }
}
```

### Passo 9 — Companies module

#### apps/api/src/modules/companies/companies.module.ts

```typescript
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Company } from './company.entity';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';

@Module({
  imports: [MikroOrmModule.forFeature([Company])],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
```

### Passo 10 — Registrar no AppModule

Adicionar `CompaniesModule` ao array de imports do `AppModule`.

### Passo 11 — Frontend: columns

#### apps/admin/src/features/companies/columns.tsx

```tsx
import { type Column } from '@/components/data-table/data-table';
import { Link } from '@tanstack/react-router';

interface CompanyRow {
  id: string;
  name: string;
  document: string;
  isActive: boolean;
  createdAt: string;
}

export const columns: Column<CompanyRow>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (company) => (
      <span className="font-medium">{company.name}</span>
    ),
  },
  {
    key: 'document',
    header: 'Document',
  },
  {
    key: 'isActive',
    header: 'Status',
    render: (company) => (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          company.isActive
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {company.isActive ? 'Active' : 'Inactive'}
      </span>
    ),
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (company) => new Date(company.createdAt).toLocaleDateString(),
  },
];
```

### Passo 12 — Frontend: company form

#### apps/admin/src/features/companies/company-form.tsx

```tsx
import { useState, type FormEvent } from 'react';

interface CompanyFormData {
  name: string;
  document: string;
}

interface CompanyFormProps {
  initialData?: CompanyFormData;
  onSubmit: (data: CompanyFormData) => void;
  isLoading?: boolean;
}

export function CompanyForm({ initialData, onSubmit, isLoading }: CompanyFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [document, setDocument] = useState(initialData?.document ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ name, document });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="document" className="text-sm font-medium">Document</label>
        <input
          id="document"
          value={document}
          onChange={(e) => setDocument(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
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

### Passo 13 — Frontend: list page

#### apps/admin/src/features/companies/companies-list-page.tsx

```tsx
import { useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { columns } from './columns';
import { customInstance } from '@/api/client';
import { useQuery } from '@tanstack/react-query';

interface CompaniesListPageProps {
  tenantId: string;
}

async function fetchCompanies(tenantId: string, params: { page: number; limit: number; search?: string }) {
  return customInstance<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }>({
    url: `/tenants/${tenantId}/companies`,
    method: 'GET',
    params,
  });
}

export function CompaniesListPage({ tenantId }: CompaniesListPageProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['companies', tenantId, { page, search }],
    queryFn: () => fetchCompanies(tenantId, { page, limit: 20, search: search || undefined }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Companies</h1>
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
        searchPlaceholder="Search companies..."
      />
    </div>
  );
}
```

### Passo 14 — Frontend: detail page

#### apps/admin/src/features/companies/company-detail-page.tsx

```tsx
import { useQuery } from '@tanstack/react-query';
import { customInstance } from '@/api/client';

interface CompanyDetailPageProps {
  tenantId: string;
  companyId: string;
}

export function CompanyDetailPage({ tenantId, companyId }: CompanyDetailPageProps) {
  const { data: company, isLoading } = useQuery({
    queryKey: ['companies', tenantId, companyId],
    queryFn: () =>
      customInstance<any>({
        url: `/tenants/${tenantId}/companies/${companyId}`,
        method: 'GET',
      }),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (!company) return <div className="text-muted-foreground">Company not found</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{company.name}</h1>
      <div className="grid gap-4 rounded-lg border p-6">
        <div>
          <p className="text-sm text-muted-foreground">Document</p>
          <p className="font-medium">{company.document}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="font-medium">{company.isActive ? 'Active' : 'Inactive'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Created</p>
          <p className="font-medium">{new Date(company.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
```

### Passo 15 — Routes

#### apps/admin/src/routes/_authenticated/tenants.$tenantId.companies/index.tsx

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { CompaniesListPage } from '@/features/companies/companies-list-page';

export const Route = createFileRoute('/_authenticated/tenants/$tenantId/companies/')({
  component: () => {
    const { tenantId } = Route.useParams();
    return <CompaniesListPage tenantId={tenantId} />;
  },
});
```

#### apps/admin/src/routes/_authenticated/tenants.$tenantId.companies/$companyId.tsx

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { CompanyDetailPage } from '@/features/companies/company-detail-page';

export const Route = createFileRoute('/_authenticated/tenants/$tenantId/companies/$companyId')({
  component: () => {
    const { tenantId, companyId } = Route.useParams();
    return <CompanyDetailPage tenantId={tenantId} companyId={companyId} />;
  },
});
```

### Passo 16 — Rodar testes

```bash
cd apps/api && pnpm test -- --testPathPattern=companies
```

## Verificacao final

- [ ] `pnpm test` — todos os testes de companies passam
- [ ] `pnpm typecheck` — sem erros
- [ ] API: `GET /api/v1/tenants/:tenantId/companies` retorna lista paginada
- [ ] API: `POST /api/v1/tenants/:tenantId/companies` cria company
- [ ] API: `PATCH /api/v1/tenants/:tenantId/companies/:id` atualiza
- [ ] API: `DELETE /api/v1/tenants/:tenantId/companies/:id` remove
- [ ] Frontend: listagem e detalhe renderizam

## Commit

Apos verificacao final, commitar todas as alteracoes:
- Mensagem: `feat(P08): companies CRUD - backend module scoped por tenant + frontend pages + testes`
- Escrever mensagem em `/tmp/commit-msg.txt`, usar `git commit -F /tmp/commit-msg.txt`, apagar o arquivo depois.

## Ao finalizar
1. Atualizar `docs/plans/PROGRESS.md` -> P08 status `completed`
2. Mover este arquivo para `docs/plans/done/`
3. Merge branch `feat/companies-crud` na main
4. Limpar worktree
