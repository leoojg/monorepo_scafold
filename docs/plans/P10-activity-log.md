# P10 — Activity Log

## Metadata
- **Depende de:** P06
- **Branch:** feat/activity-log
- **Worktree:** sim

## Objetivo
Implementar a visualizacao do audit log: backend (controller, service, query DTO, testes) e frontend (activity page com timeline e diff viewer). TDD obrigatorio.

## Arquivos a criar

```
apps/api/src/modules/audit/
├── audit.controller.ts
├── audit.service.ts
├── dto/
│   ├── audit-log-response.dto.ts
│   └── audit-query.dto.ts
├── audit.controller.spec.ts
└── audit.service.spec.ts

apps/admin/src/
├── features/activity/
│   ├── activity-page.tsx
│   └── components/
│       ├── activity-timeline.tsx
│       └── change-detail-card.tsx
├── components/shared/
│   └── diff-viewer.tsx
└── routes/_authenticated/
    └── activity/
        └── index.tsx
```

## Passos de execucao

### Passo 1 — apps/api/src/modules/audit/dto/audit-log-response.dto.ts

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditChangeDiffDto {
  @ApiProperty()
  field!: string;

  @ApiPropertyOptional()
  from?: unknown;

  @ApiPropertyOptional()
  to?: unknown;
}

export class AuditChangesDto {
  @ApiPropertyOptional()
  before?: Record<string, unknown>;

  @ApiPropertyOptional()
  after?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [AuditChangeDiffDto] })
  diff?: AuditChangeDiffDto[];
}

export class AuditMetadataDto {
  @ApiPropertyOptional()
  ip?: string;

  @ApiPropertyOptional()
  userAgent?: string;

  @ApiPropertyOptional()
  route?: string;
}

export class AuditLogResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  entityType!: string;

  @ApiProperty()
  entityId!: string;

  @ApiProperty({ enum: ['create', 'update', 'delete'] })
  action!: string;

  @ApiPropertyOptional({ type: AuditChangesDto })
  changes?: AuditChangesDto;

  @ApiPropertyOptional()
  performedById?: string;

  @ApiProperty()
  performedByType!: string;

  @ApiPropertyOptional()
  tenantId?: string;

  @ApiPropertyOptional({ type: AuditMetadataDto })
  metadata?: AuditMetadataDto;

  @ApiProperty()
  createdAt!: Date;
}
```

### Passo 2 — apps/api/src/modules/audit/dto/audit-query.dto.ts

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { AuditAction } from '../../../common/enums';

export class AuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by entity type (e.g. Tenant, Company, User)' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Filter by entity ID' })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ enum: AuditAction })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({ description: 'Filter by tenant ID' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Filter by performer ID' })
  @IsOptional()
  @IsUUID()
  performedById?: string;
}
```

### Passo 3 — Escrever testes do service PRIMEIRO (TDD RED)

#### apps/api/src/modules/audit/audit.service.spec.ts

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { AuditService } from './audit.service';
import { AuditLog } from './audit-log.entity';
import { AuditAction } from '../../common/enums';

describe('AuditService', () => {
  let service: AuditService;
  let em: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: EntityManager,
          useValue: {
            findAndCount: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    em = module.get(EntityManager);
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      const logs = [
        {
          id: '1',
          entityType: 'Tenant',
          action: AuditAction.CREATE,
          createdAt: new Date(),
        },
      ];
      em.findAndCount.mockResolvedValue([logs, 1]);

      const result = await service.findAll({ page: 1, limit: 20 } as any);

      expect(result.items).toEqual(logs);
      expect(result.total).toBe(1);
    });

    it('should filter by entityType', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        entityType: 'Tenant',
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        AuditLog,
        expect.objectContaining({ entityType: 'Tenant' }),
        expect.any(Object),
      );
    });

    it('should filter by action', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        action: AuditAction.UPDATE,
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        AuditLog,
        expect.objectContaining({ action: AuditAction.UPDATE }),
        expect.any(Object),
      );
    });

    it('should filter by tenantId', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        tenantId: 'tenant-1',
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        AuditLog,
        expect.objectContaining({ tenantId: 'tenant-1' }),
        expect.any(Object),
      );
    });

    it('should filter by entityId', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        entityId: 'entity-1',
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        AuditLog,
        expect.objectContaining({ entityId: 'entity-1' }),
        expect.any(Object),
      );
    });

    it('should filter by performedById', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        performedById: 'op-1',
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        AuditLog,
        expect.objectContaining({ performedById: 'op-1' }),
        expect.any(Object),
      );
    });

    it('should order by createdAt DESC by default', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 20 } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        AuditLog,
        expect.any(Object),
        expect.objectContaining({ orderBy: { createdAt: 'DESC' } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return audit log by id', async () => {
      const log = { id: '1', entityType: 'Tenant' };
      em.findOne.mockResolvedValue(log as any);

      const result = await service.findOne('1');
      expect(result).toEqual(log);
    });

    it('should throw NotFoundException when not found', async () => {
      em.findOne.mockResolvedValue(null);

      await expect(service.findOne('nope')).rejects.toThrow();
    });
  });
});
```

### Passo 4 — Implementar service (TDD GREEN)

#### apps/api/src/modules/audit/audit.service.ts

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import { AuditLog } from './audit-log.entity';
import { AuditQueryDto } from './dto/audit-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class AuditService {
  constructor(private readonly em: EntityManager) {}

  async findAll(
    query: AuditQueryDto,
  ): Promise<PaginatedResponseDto<AuditLog>> {
    const where: FilterQuery<AuditLog> = {};

    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.action) where.action = query.action;
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.performedById) where.performedById = query.performedById;

    const orderBy: Record<string, 'ASC' | 'DESC'> = {};
    if (query.sort) {
      const desc = query.sort.startsWith('-');
      const field = desc ? query.sort.slice(1) : query.sort;
      orderBy[field] = desc ? 'DESC' : 'ASC';
    } else {
      orderBy.createdAt = 'DESC';
    }

    const [items, total] = await this.em.findAndCount(AuditLog, where, {
      limit: query.limit,
      offset: query.offset,
      orderBy,
    });

    return new PaginatedResponseDto(items, total, query.page!, query.limit!);
  }

  async findOne(id: string): Promise<AuditLog> {
    const log = await this.em.findOne(AuditLog, { id });
    if (!log) throw new NotFoundException(`Audit log ${id} not found`);
    return log;
  }
}
```

### Passo 5 — Escrever testes do controller (TDD RED)

#### apps/api/src/modules/audit/audit.controller.spec.ts

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

describe('AuditController', () => {
  let controller: AuditController;
  let service: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    service = module.get(AuditService);
  });

  it('findAll should call service.findAll', async () => {
    const result = new PaginatedResponseDto([], 0, 1, 20);
    service.findAll.mockResolvedValue(result);

    const response = await controller.findAll({ page: 1, limit: 20 } as any);

    expect(response).toEqual(result);
  });

  it('findOne should call service.findOne', async () => {
    const log = { id: '1', entityType: 'Tenant' };
    service.findOne.mockResolvedValue(log as any);

    const response = await controller.findOne('1');

    expect(response).toEqual(log);
  });
});
```

### Passo 6 — Implementar controller (TDD GREEN)

#### apps/api/src/modules/audit/audit.controller.ts

```typescript
import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated.decorator';
import { OperatorAuthGuard } from '../../common/guards/operator-auth.guard';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(OperatorAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs (paginated)' })
  @ApiPaginatedResponse(AuditLogResponseDto)
  async findAll(
    @Query() query: AuditQueryDto,
  ): Promise<PaginatedResponseDto<AuditLogResponseDto>> {
    return this.auditService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuditLogResponseDto> {
    return this.auditService.findOne(id);
  }
}
```

### Passo 7 — Atualizar audit.module.ts

```typescript
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuditLog } from './audit-log.entity';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  imports: [MikroOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
```

### Passo 8 — Frontend: diff viewer

#### apps/admin/src/components/shared/diff-viewer.tsx

```tsx
interface DiffEntry {
  field: string;
  from?: unknown;
  to?: unknown;
}

interface DiffViewerProps {
  diff: DiffEntry[];
}

export function DiffViewer({ diff }: DiffViewerProps) {
  if (diff.length === 0) {
    return <p className="text-sm text-muted-foreground">No changes</p>;
  }

  return (
    <div className="space-y-2">
      {diff.map((entry) => (
        <div key={entry.field} className="rounded border p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {entry.field}
          </p>
          <div className="mt-1 flex gap-4 text-sm">
            <div className="flex-1">
              <span className="text-xs text-muted-foreground">From:</span>
              <pre className="mt-0.5 rounded bg-red-50 p-1.5 text-xs text-red-800">
                {JSON.stringify(entry.from, null, 2) ?? 'null'}
              </pre>
            </div>
            <div className="flex-1">
              <span className="text-xs text-muted-foreground">To:</span>
              <pre className="mt-0.5 rounded bg-green-50 p-1.5 text-xs text-green-800">
                {JSON.stringify(entry.to, null, 2) ?? 'null'}
              </pre>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Passo 9 — Frontend: change detail card

#### apps/admin/src/features/activity/components/change-detail-card.tsx

```tsx
import { DiffViewer } from '@/components/shared/diff-viewer';

interface ChangeDetailCardProps {
  log: {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    changes?: {
      diff?: Array<{ field: string; from?: unknown; to?: unknown }>;
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
    };
  };
}

export function ChangeDetailCard({ log }: ChangeDetailCardProps) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{log.entityType}</span>
        <span className="text-xs text-muted-foreground">({log.entityId})</span>
      </div>

      {log.changes?.diff && log.changes.diff.length > 0 ? (
        <DiffViewer diff={log.changes.diff} />
      ) : log.action === 'create' && log.changes?.after ? (
        <pre className="rounded bg-green-50 p-3 text-xs text-green-800">
          {JSON.stringify(log.changes.after, null, 2)}
        </pre>
      ) : log.action === 'delete' && log.changes?.before ? (
        <pre className="rounded bg-red-50 p-3 text-xs text-red-800">
          {JSON.stringify(log.changes.before, null, 2)}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground">No details available</p>
      )}
    </div>
  );
}
```

### Passo 10 — Frontend: activity timeline

#### apps/admin/src/features/activity/components/activity-timeline.tsx

```tsx
import { ChangeDetailCard } from './change-detail-card';

const actionColors: Record<string, string> = {
  create: 'bg-green-500',
  update: 'bg-blue-500',
  delete: 'bg-red-500',
};

const actionLabels: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
};

interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes?: any;
  performedByType: string;
  performedById?: string;
  createdAt: string;
}

interface ActivityTimelineProps {
  logs: AuditLogEntry[];
  onSelectLog?: (log: AuditLogEntry) => void;
  selectedLogId?: string;
}

export function ActivityTimeline({
  logs,
  onSelectLog,
  selectedLogId,
}: ActivityTimelineProps) {
  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`h-3 w-3 rounded-full ${actionColors[log.action] ?? 'bg-gray-400'}`}
            />
            <div className="w-px flex-1 bg-border" />
          </div>

          <div className="flex-1 pb-4">
            <button
              onClick={() => onSelectLog?.(log)}
              className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-accent ${
                selectedLogId === log.id ? 'border-primary bg-accent' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      log.action === 'create'
                        ? 'bg-green-100 text-green-800'
                        : log.action === 'update'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {actionLabels[log.action] ?? log.action}
                  </span>
                  <span className="text-sm font-medium">{log.entityType}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                by {log.performedByType}
                {log.performedById ? ` (${log.performedById.slice(0, 8)}...)` : ''}
              </p>
            </button>

            {selectedLogId === log.id && (
              <div className="mt-2">
                <ChangeDetailCard log={log} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Passo 11 — Frontend: activity page

#### apps/admin/src/features/activity/activity-page.tsx

```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customInstance } from '@/api/client';
import { ActivityTimeline } from './components/activity-timeline';
import { Pagination } from '@/components/data-table/pagination';

async function fetchAuditLogs(params: {
  page: number;
  limit: number;
  entityType?: string;
  action?: string;
}) {
  return customInstance<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }>({
    url: '/audit',
    method: 'GET',
    params,
  });
}

export function ActivityPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [selectedLogId, setSelectedLogId] = useState<string>();

  const { data, isLoading } = useQuery({
    queryKey: ['audit', { page, entityType, action }],
    queryFn: () =>
      fetchAuditLogs({
        page,
        limit: 20,
        entityType: entityType || undefined,
        action: action || undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Activity Log</h1>

      <div className="flex gap-4">
        <select
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All entities</option>
          <option value="Tenant">Tenant</option>
          <option value="Company">Company</option>
          <option value="User">User</option>
          <option value="UserCompany">UserCompany</option>
        </select>

        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : data?.items.length === 0 ? (
        <p className="text-muted-foreground">No activity found</p>
      ) : (
        <>
          <ActivityTimeline
            logs={data?.items ?? []}
            selectedLogId={selectedLogId}
            onSelectLog={(log) =>
              setSelectedLogId(
                selectedLogId === log.id ? undefined : log.id,
              )
            }
          />
          {data && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              hasNext={data.hasNext}
              hasPrevious={data.hasPrevious}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
```

### Passo 12 — Route

#### apps/admin/src/routes/_authenticated/activity/index.tsx

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { ActivityPage } from '@/features/activity/activity-page';

export const Route = createFileRoute('/_authenticated/activity/')({
  component: ActivityPage,
});
```

### Passo 13 — Rodar testes

```bash
cd apps/api && pnpm test -- --testPathPattern=audit
```

## Verificacao final

- [ ] `pnpm test` — todos os testes de audit passam
- [ ] `pnpm typecheck` — sem erros
- [ ] API: `GET /api/v1/audit` retorna logs paginados
- [ ] API: `GET /api/v1/audit/:id` retorna log individual
- [ ] API: filtros por entityType, action, tenantId funcionam
- [ ] Frontend: timeline renderiza com logs
- [ ] Frontend: clicar em entry expande o diff viewer
- [ ] Frontend: filtros de entityType e action funcionam

## Ao finalizar
1. Atualizar `docs/plans/PROGRESS.md` -> P10 status `completed`
2. Mover este arquivo para `docs/plans/done/`
3. Merge branch `feat/activity-log` na main
4. Limpar worktree
