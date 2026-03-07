# P05 — Audit Infrastructure

## Metadata
- **Depende de:** P04
- **Branch:** main
- **Worktree:** nao

## Objetivo
Criar a infraestrutura de audit log: subscriber do MikroORM com diff computation, AsyncLocalStorage para contexto do operator, e interceptor que popula o contexto.

## Arquivos a criar

```
apps/api/src/
├── modules/
│   └── audit/
│       ├── audit.module.ts
│       ├── audit.subscriber.ts
│       └── audit-context.storage.ts
├── common/
│   └── interceptors/
│       └── audit-context.interceptor.ts
```

## Passos de execucao

### Passo 1 — apps/api/src/modules/audit/audit-context.storage.ts

```typescript
import { AsyncLocalStorage } from 'async_hooks';
import { RequestContext } from '../../common/interfaces/request-context.interface';

export const auditContextStorage = new AsyncLocalStorage<RequestContext>();
```

### Passo 2 — apps/api/src/common/interceptors/audit-context.interceptor.ts

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { auditContextStorage } from '../../modules/audit/audit-context.storage';
import { RequestContext } from '../interfaces/request-context.interface';

@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const operator = request.user;

    const ctx: RequestContext = {
      performedById: operator?.id,
      performedByType: operator ? 'operator' : 'system',
      metadata: {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        route: `${request.method} ${request.path}`,
      },
    };

    return new Observable((subscriber) => {
      auditContextStorage.run(ctx, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
```

### Passo 3 — apps/api/src/modules/audit/audit.subscriber.ts

```typescript
import {
  EventSubscriber,
  FlushEventArgs,
  ChangeSet,
  ChangeSetType,
} from '@mikro-orm/core';
import { AuditLog } from './audit-log.entity';
import { AuditAction } from '../../common/enums';
import { auditContextStorage } from './audit-context.storage';

const AUDITABLE_ENTITIES = ['Tenant', 'Company', 'User', 'UserCompany'];

export class AuditSubscriber implements EventSubscriber {
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
    const ctx = auditContextStorage.getStore();
    const log = new AuditLog();

    log.entityType = cs.name;
    log.entityId = cs.entity.id;
    log.performedById = ctx?.performedById;
    log.performedByType = ctx?.performedByType ?? 'system';
    log.tenantId =
      cs.entity.tenant?.id ?? cs.entity.tenantId ?? ctx?.tenantId;
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

  private computeDiff(
    cs: ChangeSet<any>,
  ): Array<{ field: string; from: unknown; to: unknown }> {
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

### Passo 4 — apps/api/src/modules/audit/audit.module.ts

```typescript
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuditLog } from './audit-log.entity';

@Module({
  imports: [MikroOrmModule.forFeature([AuditLog])],
  exports: [],
})
export class AuditModule {}
```

### Passo 5 — Atualizar mikro-orm.config.ts para incluir subscriber

```typescript
// apps/api/src/database/mikro-orm.config.ts
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

### Passo 6 — Registrar interceptor globalmente no main.ts

Adicionar ao `main.ts` apos os filters:

```typescript
import { AuditContextInterceptor } from './common/interceptors/audit-context.interceptor';

// Dentro da funcao bootstrap, apos app.useGlobalFilters(...)
app.useGlobalInterceptors(new AuditContextInterceptor());
```

### Passo 7 — Atualizar app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import mikroOrmConfig from './database/mikro-orm.config';
import { AuthModule } from './modules/auth/auth.module';
import { OperatorsModule } from './modules/operators/operators.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    MikroOrmModule.forRoot(mikroOrmConfig),
    AuthModule,
    OperatorsModule,
    AuditModule,
  ],
})
export class AppModule {}
```

## Testes

### apps/api/src/modules/audit/audit.subscriber.spec.ts

```typescript
import { ChangeSetType } from '@mikro-orm/core';
import { AuditSubscriber } from './audit.subscriber';
import { AuditAction } from '../../common/enums';
import { auditContextStorage } from './audit-context.storage';

describe('AuditSubscriber', () => {
  let subscriber: AuditSubscriber;

  beforeEach(() => {
    subscriber = new AuditSubscriber();
  });

  describe('afterFlush', () => {
    it('should create audit log for CREATE changeset on auditable entity', async () => {
      const persistedLogs: any[] = [];
      const mockEm = {
        persist: (log: any) => persistedLogs.push(log),
        flush: jest.fn().mockResolvedValue(undefined),
      };

      const mockArgs = {
        uow: {
          getChangeSets: () => [
            {
              name: 'Tenant',
              type: ChangeSetType.CREATE,
              entity: { id: 'tenant-1' },
              payload: { name: 'Acme', slug: 'acme' },
            },
          ],
          getEntityManager: () => ({ fork: () => mockEm }),
        },
      } as any;

      await subscriber.afterFlush(mockArgs);

      expect(persistedLogs).toHaveLength(1);
      expect(persistedLogs[0].action).toBe(AuditAction.CREATE);
      expect(persistedLogs[0].entityType).toBe('Tenant');
      expect(persistedLogs[0].entityId).toBe('tenant-1');
      expect(persistedLogs[0].changes.after).toEqual({
        name: 'Acme',
        slug: 'acme',
      });
    });

    it('should create audit log with diff for UPDATE changeset', async () => {
      const persistedLogs: any[] = [];
      const mockEm = {
        persist: (log: any) => persistedLogs.push(log),
        flush: jest.fn().mockResolvedValue(undefined),
      };

      const mockArgs = {
        uow: {
          getChangeSets: () => [
            {
              name: 'Tenant',
              type: ChangeSetType.UPDATE,
              entity: { id: 'tenant-1' },
              payload: { name: 'Acme Updated' },
              originalEntity: { name: 'Acme' },
            },
          ],
          getEntityManager: () => ({ fork: () => mockEm }),
        },
      } as any;

      await subscriber.afterFlush(mockArgs);

      expect(persistedLogs).toHaveLength(1);
      expect(persistedLogs[0].action).toBe(AuditAction.UPDATE);
      expect(persistedLogs[0].changes.diff).toEqual([
        { field: 'name', from: 'Acme', to: 'Acme Updated' },
      ]);
    });

    it('should skip non-auditable entities', async () => {
      const mockArgs = {
        uow: {
          getChangeSets: () => [
            {
              name: 'SomeOtherEntity',
              type: ChangeSetType.CREATE,
              entity: { id: '1' },
              payload: {},
            },
          ],
          getEntityManager: () => ({ fork: () => ({}) }),
        },
      } as any;

      await subscriber.afterFlush(mockArgs);
      // No error thrown, no logs created
    });

    it('should sanitize passwordHash from changes', async () => {
      const persistedLogs: any[] = [];
      const mockEm = {
        persist: (log: any) => persistedLogs.push(log),
        flush: jest.fn().mockResolvedValue(undefined),
      };

      const mockArgs = {
        uow: {
          getChangeSets: () => [
            {
              name: 'User',
              type: ChangeSetType.CREATE,
              entity: { id: 'user-1', tenant: { id: 't-1' } },
              payload: { name: 'John', passwordHash: 'secret-hash' },
            },
          ],
          getEntityManager: () => ({ fork: () => mockEm }),
        },
      } as any;

      await subscriber.afterFlush(mockArgs);

      expect(persistedLogs[0].changes.after.passwordHash).toBeUndefined();
      expect(persistedLogs[0].changes.after.name).toBe('John');
    });

    it('should include context from AsyncLocalStorage when available', async () => {
      const persistedLogs: any[] = [];
      const mockEm = {
        persist: (log: any) => persistedLogs.push(log),
        flush: jest.fn().mockResolvedValue(undefined),
      };

      const mockArgs = {
        uow: {
          getChangeSets: () => [
            {
              name: 'Tenant',
              type: ChangeSetType.CREATE,
              entity: { id: 'tenant-1' },
              payload: { name: 'Acme' },
            },
          ],
          getEntityManager: () => ({ fork: () => mockEm }),
        },
      } as any;

      await auditContextStorage.run(
        {
          performedById: 'op-1',
          performedByType: 'operator',
          metadata: { ip: '127.0.0.1', route: 'POST /tenants' },
        },
        async () => {
          await subscriber.afterFlush(mockArgs);
        },
      );

      expect(persistedLogs[0].performedById).toBe('op-1');
      expect(persistedLogs[0].performedByType).toBe('operator');
      expect(persistedLogs[0].metadata).toEqual({
        ip: '127.0.0.1',
        route: 'POST /tenants',
      });
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
- [ ] `pnpm test` passa — todos os testes do audit subscriber
- [ ] AuditSubscriber esta registrado no mikro-orm.config.ts
- [ ] AuditContextInterceptor esta registrado no main.ts
- [ ] AuditModule esta importado no AppModule

## Ao finalizar
1. Atualizar `docs/plans/PROGRESS.md` -> P05 status `completed`, proximo -> P06
2. Mover este arquivo para `docs/plans/done/`
