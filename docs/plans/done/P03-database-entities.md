# P03 — Database + Entidades

## Metadata
- **Depende de:** P02
- **Branch:** main
- **Worktree:** nao

## Objetivo
Criar todas as entidades do sistema, enums, migration inicial e seed do operator root.

## Arquivos a criar

```
apps/api/src/
├── common/
│   └── enums.ts
├── modules/
│   ├── operators/
│   │   └── operator.entity.ts
│   ├── tenants/
│   │   └── tenant.entity.ts
│   ├── companies/
│   │   └── company.entity.ts
│   ├── users/
│   │   ├── user.entity.ts
│   │   └── user-company.entity.ts
│   └── audit/
│       └── audit-log.entity.ts
├── database/
│   ├── migrations/       (gerado pelo CLI)
│   └── seeders/
│       └── operator.seeder.ts
```

## Passos de execucao

### Passo 1 — apps/api/src/common/enums.ts

```typescript
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

### Passo 2 — apps/api/src/modules/operators/operator.entity.ts

```typescript
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

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
```

### Passo 3 — apps/api/src/modules/tenants/tenant.entity.ts

```typescript
import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { TenantStatus } from '../../common/enums';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';

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
```

### Passo 4 — apps/api/src/modules/companies/company.entity.ts

```typescript
import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  Filter,
} from '@mikro-orm/core';
import { Tenant } from '../tenants/tenant.entity';
import { UserCompany } from '../users/user-company.entity';

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
```

### Passo 5 — apps/api/src/modules/users/user.entity.ts

```typescript
import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  Enum,
  Filter,
} from '@mikro-orm/core';
import { Tenant } from '../tenants/tenant.entity';
import { UserCompany } from './user-company.entity';
import { UserRole } from '../../common/enums';

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
```

### Passo 6 — apps/api/src/modules/users/user-company.entity.ts

```typescript
import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  Enum,
} from '@mikro-orm/core';
import { User } from './user.entity';
import { Company } from '../companies/company.entity';
import { CompanyRole } from '../../common/enums';

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
```

### Passo 7 — apps/api/src/modules/audit/audit-log.entity.ts

```typescript
import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
} from '@mikro-orm/core';
import { AuditAction } from '../../common/enums';

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

### Passo 8 — apps/api/src/database/seeders/operator.seeder.ts

```typescript
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

### Passo 9 — Registrar entidades no app.module.ts

Atualizar `apps/api/src/app.module.ts` para importar os modulos MikroORM das entidades:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import mikroOrmConfig from './database/mikro-orm.config';
import { Operator } from './modules/operators/operator.entity';
import { Tenant } from './modules/tenants/tenant.entity';
import { Company } from './modules/companies/company.entity';
import { User } from './modules/users/user.entity';
import { UserCompany } from './modules/users/user-company.entity';
import { AuditLog } from './modules/audit/audit-log.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    MikroOrmModule.forRoot(mikroOrmConfig),
    MikroOrmModule.forFeature([
      Operator,
      Tenant,
      Company,
      User,
      UserCompany,
      AuditLog,
    ]),
  ],
})
export class AppModule {}
```

### Passo 10 — Criar mikro-orm.config.ts na raiz do api (para CLI)

```typescript
// apps/api/mikro-orm.config.ts
import config from './src/database/mikro-orm.config';
export default config;
```

### Passo 11 — Gerar migration inicial

```bash
cd apps/api && npx mikro-orm migration:create --initial
```

### Passo 12 — Rodar migration e seed (requer PostgreSQL rodando)

```bash
cd apps/api && npx mikro-orm migration:up && npx mikro-orm seeder:run
```

## Testes

### apps/api/src/modules/operators/operator.entity.spec.ts

```typescript
import { Operator } from './operator.entity';

describe('Operator Entity', () => {
  it('should create an operator instance', () => {
    const operator = new Operator();
    operator.name = 'Test Operator';
    operator.email = 'test@platform.com';
    operator.passwordHash = 'hashed';
    operator.isActive = true;

    expect(operator.name).toBe('Test Operator');
    expect(operator.email).toBe('test@platform.com');
    expect(operator.isActive).toBe(true);
    expect(operator.createdAt).toBeInstanceOf(Date);
    expect(operator.updatedAt).toBeInstanceOf(Date);
  });
});
```

### apps/api/src/modules/tenants/tenant.entity.spec.ts

```typescript
import { Tenant } from './tenant.entity';
import { TenantStatus } from '../../common/enums';

describe('Tenant Entity', () => {
  it('should create a tenant with default status ACTIVE', () => {
    const tenant = new Tenant();
    tenant.name = 'Acme Corp';
    tenant.slug = 'acme-corp';

    expect(tenant.name).toBe('Acme Corp');
    expect(tenant.slug).toBe('acme-corp');
    expect(tenant.status).toBe(TenantStatus.ACTIVE);
    expect(tenant.createdAt).toBeInstanceOf(Date);
  });
});
```

### Rodar testes

```bash
cd apps/api && pnpm test
```

## Verificacao final

- [ ] `pnpm typecheck` passa sem erros
- [ ] `pnpm test` passa sem erros
- [ ] Migration foi gerada em `src/database/migrations/`
- [ ] Seed cria operator root no banco (se PostgreSQL disponivel)
- [ ] Todas as entidades estao em seus respectivos modulos

## Commit

Apos verificacao final, commitar todas as alteracoes:
- Mensagem: `feat(P03): database entities, enums, migration inicial e seed do operator`
- Escrever mensagem em `/tmp/commit-msg.txt`, usar `git commit -F /tmp/commit-msg.txt`, apagar o arquivo depois.

## Ao finalizar
1. Atualizar `docs/plans/PROGRESS.md` -> P03 status `completed`, proximo -> P04
2. Mover este arquivo para `docs/plans/done/`
