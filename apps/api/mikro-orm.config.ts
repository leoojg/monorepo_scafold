import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '../../.env' });

import config from './src/database/mikro-orm.config';
export default config;
