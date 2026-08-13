// eslint-disable-next-line @typescript-eslint/no-require-imports
// @ts-ignore
import postgres = require('postgres');
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

import { ConfigService } from '@nestjs/config';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';
export const DRIZZLE_DB = 'DRIZZLE_DB';

/**
 * Provider responsible for establishing the PostgreSQL database connection via Drizzle ORM.
 * Injects ConfigService to safely retrieve the DATABASE_URL environment variable at startup.
 */
export const dbConnectionProvider = {
  provide: DATABASE_CONNECTION,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const connectionString = configService.get<string>('DATABASE_URL');
    if (!connectionString || connectionString.trim() === '') {
      throw new Error('DATABASE_URL environment variable is missing or empty.');
    }
    const queryClient = postgres(connectionString);
    return drizzle(queryClient, { schema });
  },
};

export const drizzleDbProvider = {
  provide: DRIZZLE_DB,
  useExisting: DATABASE_CONNECTION,
};

