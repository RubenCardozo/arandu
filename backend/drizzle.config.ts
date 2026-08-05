import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

/**
 * Drizzle Kit configuration for managing database migrations and schema pushes.
 * Configured for PostgreSQL on Supabase using Drizzle ORM.
 */
export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
});