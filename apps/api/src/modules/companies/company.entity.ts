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
