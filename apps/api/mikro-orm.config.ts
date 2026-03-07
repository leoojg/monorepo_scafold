import { defineConfig } from '@mikro-orm/postgresql';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '../../.env' });

import { mikroOrmBaseConfig } from './src/database/mikro-orm.config';

export default defineConfig({
  ...mikroOrmBaseConfig,
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  dbName: process.env.DB_NAME ?? 'admin_platform',
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD,
});
