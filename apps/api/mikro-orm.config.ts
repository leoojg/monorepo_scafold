import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '../../.env' });

import { mikroOrmConfig } from './src/database/mikro-orm.config';
export default mikroOrmConfig;
