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
