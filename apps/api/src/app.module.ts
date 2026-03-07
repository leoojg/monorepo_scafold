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
