import { Options, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { SeedManager } from '@mikro-orm/seeder';
import { AuditSubscriber } from '../modules/audit/audit.subscriber';

export const mikroOrmBaseConfig: Options = {
  driver: PostgreSqlDriver,
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
};
