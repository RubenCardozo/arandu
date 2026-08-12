// eslint-disable-next-line @typescript-eslint/no-require-imports
// @ts-ignore
import postgres = require('postgres');
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';
export const DRIZZLE_DB = 'DRIZZLE_DB';

export const dbConnectionProvider = {
  provide: DATABASE_CONNECTION,
  useFactory: () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is missing.');
    }
    const queryClient = postgres(connectionString);
    return drizzle(queryClient, { schema });
  },
};

export const drizzleDbProvider = {
  provide: DRIZZLE_DB,
  useExisting: DATABASE_CONNECTION,
};

