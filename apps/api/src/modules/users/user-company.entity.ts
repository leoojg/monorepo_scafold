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
