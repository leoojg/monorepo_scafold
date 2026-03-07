# P09 — Users CRUD

## Metadata
- **Depende de:** P06
- **Branch:** feat/users-crud
- **Worktree:** sim

## Objetivo
Implementar o CRUD completo de Users scoped por tenant, incluindo o vinculo user-company: backend (module, controller, service, DTOs, testes) e frontend (list page, detail page, form). TDD obrigatorio.

## Arquivos a criar

```
apps/api/src/modules/users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   ├── user-response.dto.ts
│   └── user-query.dto.ts
├── users.controller.spec.ts
└── users.service.spec.ts

apps/admin/src/
├── features/users/
│   ├── users-list-page.tsx
│   ├── user-detail-page.tsx
│   ├── user-form.tsx
│   └── columns.tsx
└── routes/_authenticated/
    └── tenants.$tenantId.users/
        ├── index.tsx
        └── $userId.tsx
```

## Passos de execucao

### Passo 1 — apps/api/src/modules/users/dto/create-user.dto.ts

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsUUID,
  MinLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Trim } from '../../../common/decorators/trim.decorator';
import { ToLowerCase } from '../../../common/decorators/to-lower-case.decorator';
import { UserRole, CompanyRole } from '../../../common/enums';

export class UserCompanyAssignmentDto {
  @ApiProperty()
  @IsUUID()
  companyId!: string;

  @ApiProperty({ enum: CompanyRole })
  @IsEnum(CompanyRole)
  role!: CompanyRole;
}

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  @Trim()
  name!: string;

  @ApiProperty({ example: 'john@acme.com' })
  @IsEmail()
  @IsNotEmpty()
  @Trim()
  @ToLowerCase()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ description: 'Tenant ID' })
  @IsNotEmpty()
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({ type: [UserCompanyAssignmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserCompanyAssignmentDto)
  companies?: UserCompanyAssignmentDto[];
}
```

### Passo 2 — apps/api/src/modules/users/dto/update-user.dto.ts

```typescript
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['tenantId', 'password'] as const),
) {}
```

### Passo 3 — apps/api/src/modules/users/dto/user-response.dto.ts

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class UserCompanyResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  companyName!: string;

  @ApiProperty({ enum: ['admin', 'member', 'viewer'] })
  role!: string;
}

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: ['tenant_admin', 'company_admin'] })
  role!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: [UserCompanyResponseDto] })
  companies!: UserCompanyResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
```

### Passo 4 — apps/api/src/modules/users/dto/user-query.dto.ts

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Trim } from '../../../common/decorators/trim.decorator';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';
import { UserRole } from '../../../common/enums';

export class UserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  @Trim()
  search?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;
}
```

### Passo 5 — Escrever testes do service PRIMEIRO (TDD RED)

#### apps/api/src/modules/users/users.service.spec.ts

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let em: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
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

    service = module.get<UsersService>(UsersService);
    em = module.get(EntityManager);
  });

  describe('findAll', () => {
    it('should return paginated users for a tenant', async () => {
      const users = [{ id: '1', name: 'John', email: 'john@test.com' }];
      em.findAndCount.mockResolvedValue([users, 1]);

      const result = await service.findAll('tenant-1', {
        page: 1,
        limit: 20,
      } as any);

      expect(result.items).toEqual(users);
      expect(result.total).toBe(1);
    });

    it('should apply search filter on name and email', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('tenant-1', {
        page: 1,
        limit: 20,
        search: 'john',
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          tenant: 'tenant-1',
          $or: [
            { name: { $ilike: '%john%' } },
            { email: { $ilike: '%john%' } },
          ],
        }),
        expect.any(Object),
      );
    });

    it('should apply role filter', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('tenant-1', {
        page: 1,
        limit: 20,
        role: 'tenant_admin',
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          tenant: 'tenant-1',
          role: 'tenant_admin',
        }),
        expect.any(Object),
      );
    });
  });

  describe('findOne', () => {
    it('should return user when found', async () => {
      const user = { id: '1', name: 'John' };
      em.findOne.mockResolvedValue(user as any);

      const result = await service.findOne('tenant-1', '1');
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException when not found', async () => {
      em.findOne.mockResolvedValue(null);
      await expect(service.findOne('tenant-1', 'nope')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create user with hashed password', async () => {
      const tenantRef = { id: 'tenant-1' };
      em.getReference.mockReturnValue(tenantRef as any);

      const dto = {
        name: 'John',
        email: 'john@test.com',
        password: 'password123',
        tenantId: 'tenant-1',
        role: 'tenant_admin',
      };
      const created = { id: '1', name: 'John' };
      em.create.mockReturnValue(created as any);

      const result = await service.create(dto as any);

      expect(em.create).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          name: 'John',
          email: 'john@test.com',
          role: 'tenant_admin',
          tenant: tenantRef,
        }),
      );
      expect(em.persistAndFlush).toHaveBeenCalled();
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const user = { id: '1', name: 'Old' };
      em.findOne.mockResolvedValue(user as any);

      await service.update('tenant-1', '1', { name: 'New' } as any);

      expect(em.assign).toHaveBeenCalledWith(user, { name: 'New' });
      expect(em.flush).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove user', async () => {
      const user = { id: '1' };
      em.findOne.mockResolvedValue(user as any);

      await service.remove('tenant-1', '1');
      expect(em.removeAndFlush).toHaveBeenCalledWith(user);
    });
  });
});
```

### Passo 6 — Implementar service (TDD GREEN)

#### apps/api/src/modules/users/users.service.ts

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { Tenant } from '../tenants/tenant.entity';
import { UserQueryDto } from './dto/user-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly em: EntityManager) {}

  async findAll(
    tenantId: string,
    query: UserQueryDto,
  ): Promise<PaginatedResponseDto<User>> {
    const where: FilterQuery<User> = { tenant: tenantId };

    if (query.search) {
      where.$or = [
        { name: { $ilike: `%${query.search}%` } },
        { email: { $ilike: `%${query.search}%` } },
      ];
    }
    if (query.role) {
      where.role = query.role;
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

    const [items, total] = await this.em.findAndCount(User, where, {
      limit: query.limit,
      offset: query.offset,
      orderBy,
      populate: ['userCompanies.company'],
    });

    return new PaginatedResponseDto(items, total, query.page!, query.limit!);
  }

  async findOne(tenantId: string, id: string): Promise<User> {
    const user = await this.em.findOne(
      User,
      { id, tenant: tenantId },
      { populate: ['userCompanies.company'] },
    );
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const tenant = this.em.getReference('Tenant', dto.tenantId) as Tenant;
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = this.em.create(User, {
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role,
      tenant,
      isActive: true,
    });

    await this.em.persistAndFlush(user);
    return user;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.findOne(tenantId, id);
    this.em.assign(user, dto);
    await this.em.flush();
    return user;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const user = await this.findOne(tenantId, id);
    await this.em.removeAndFlush(user);
  }
}
```

### Passo 7 — Escrever testes do controller (TDD RED)

#### apps/api/src/modules/users/users.controller.spec.ts

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
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

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
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

  it('findOne should pass tenantId and userId', async () => {
    service.findOne.mockResolvedValue({ id: '1' } as any);

    await controller.findOne('tenant-1', '1');

    expect(service.findOne).toHaveBeenCalledWith('tenant-1', '1');
  });

  it('create should call service.create', async () => {
    const dto = {
      name: 'John',
      email: 'john@test.com',
      password: 'pass1234',
      tenantId: 'tenant-1',
      role: 'tenant_admin',
    };
    service.create.mockResolvedValue({ id: '1' } as any);

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

#### apps/api/src/modules/users/users.controller.ts

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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated.decorator';
import { OperatorAuthGuard } from '../../common/guards/operator-auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(OperatorAuthGuard)
@Controller('tenants/:tenantId/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users for a tenant (paginated)' })
  @ApiPaginatedResponse(UserResponseDto)
  async findAll(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: UserQueryDto,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    return this.usersService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return this.usersService.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create user' })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove user' })
  async remove(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.usersService.remove(tenantId, id);
  }
}
```

### Passo 9 — Users module

#### apps/api/src/modules/users/users.module.ts

```typescript
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { User } from './user.entity';
import { UserCompany } from './user-company.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [MikroOrmModule.forFeature([User, UserCompany])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

### Passo 10 — Registrar no AppModule

Adicionar `UsersModule` ao array de imports do `AppModule`.

### Passo 11 — Frontend: columns

#### apps/admin/src/features/users/columns.tsx

```tsx
import { type Column } from '@/components/data-table/data-table';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  tenant_admin: 'Tenant Admin',
  company_admin: 'Company Admin',
};

export const columns: Column<UserRow>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (user) => <span className="font-medium">{user.name}</span>,
  },
  {
    key: 'email',
    header: 'Email',
  },
  {
    key: 'role',
    header: 'Role',
    render: (user) => (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
        {roleLabels[user.role] ?? user.role}
      </span>
    ),
  },
  {
    key: 'isActive',
    header: 'Status',
    render: (user) => (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          user.isActive
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {user.isActive ? 'Active' : 'Inactive'}
      </span>
    ),
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (user) => new Date(user.createdAt).toLocaleDateString(),
  },
];
```

### Passo 12 — Frontend: user form

#### apps/admin/src/features/users/user-form.tsx

```tsx
import { useState, type FormEvent } from 'react';

interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: string;
}

interface UserFormProps {
  initialData?: Omit<UserFormData, 'password'>;
  onSubmit: (data: UserFormData) => void;
  isLoading?: boolean;
}

export function UserForm({ initialData, onSubmit, isLoading }: UserFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [email, setEmail] = useState(initialData?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initialData?.role ?? 'company_admin');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data: UserFormData = { name, email, role };
    if (!initialData) data.password = password;
    onSubmit(data);
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
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      {!initialData && (
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            minLength={8}
            required
          />
        </div>
      )}
      <div className="space-y-2">
        <label htmlFor="role" className="text-sm font-medium">Role</label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="tenant_admin">Tenant Admin</option>
          <option value="company_admin">Company Admin</option>
        </select>
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

#### apps/admin/src/features/users/users-list-page.tsx

```tsx
import { useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { columns } from './columns';
import { customInstance } from '@/api/client';
import { useQuery } from '@tanstack/react-query';

interface UsersListPageProps {
  tenantId: string;
}

async function fetchUsers(tenantId: string, params: { page: number; limit: number; search?: string }) {
  return customInstance<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }>({
    url: `/tenants/${tenantId}/users`,
    method: 'GET',
    params,
  });
}

export function UsersListPage({ tenantId }: UsersListPageProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users', tenantId, { page, search }],
    queryFn: () => fetchUsers(tenantId, { page, limit: 20, search: search || undefined }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
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
        searchPlaceholder="Search users..."
      />
    </div>
  );
}
```

### Passo 14 — Frontend: detail page

#### apps/admin/src/features/users/user-detail-page.tsx

```tsx
import { useQuery } from '@tanstack/react-query';
import { customInstance } from '@/api/client';

interface UserDetailPageProps {
  tenantId: string;
  userId: string;
}

export function UserDetailPage({ tenantId, userId }: UserDetailPageProps) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['users', tenantId, userId],
    queryFn: () =>
      customInstance<any>({
        url: `/tenants/${tenantId}/users/${userId}`,
        method: 'GET',
      }),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (!user) return <div className="text-muted-foreground">User not found</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{user.name}</h1>
      <div className="grid gap-4 rounded-lg border p-6">
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium">{user.email}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Role</p>
          <p className="font-medium">{user.role}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="font-medium">{user.isActive ? 'Active' : 'Inactive'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Created</p>
          <p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
```

### Passo 15 — Routes

#### apps/admin/src/routes/_authenticated/tenants.$tenantId.users/index.tsx

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { UsersListPage } from '@/features/users/users-list-page';

export const Route = createFileRoute('/_authenticated/tenants/$tenantId/users/')({
  component: () => {
    const { tenantId } = Route.useParams();
    return <UsersListPage tenantId={tenantId} />;
  },
});
```

#### apps/admin/src/routes/_authenticated/tenants.$tenantId.users/$userId.tsx

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { UserDetailPage } from '@/features/users/user-detail-page';

export const Route = createFileRoute('/_authenticated/tenants/$tenantId/users/$userId')({
  component: () => {
    const { tenantId, userId } = Route.useParams();
    return <UserDetailPage tenantId={tenantId} userId={userId} />;
  },
});
```

### Passo 16 — Rodar testes

```bash
cd apps/api && pnpm test -- --testPathPattern=users
```

## Verificacao final

- [ ] `pnpm test` — todos os testes de users passam
- [ ] `pnpm typecheck` — sem erros
- [ ] API: CRUD completo em `/api/v1/tenants/:tenantId/users`
- [ ] Frontend: listagem e detalhe renderizam

## Ao finalizar
1. Atualizar `docs/plans/PROGRESS.md` -> P09 status `completed`
2. Mover este arquivo para `docs/plans/done/`
3. Merge branch `feat/users-crud` na main
4. Limpar worktree
