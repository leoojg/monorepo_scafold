import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  OneToMany,
  Collection,
  OptionalProps,
} from '@mikro-orm/core';
import { TenantStatus } from '../../common/enums';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';

@Entity({ tableName: 'tenants' })
export class Tenant {
  [OptionalProps]?: 'id' | 'status' | 'createdAt' | 'updatedAt' | 'companies' | 'users';

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
