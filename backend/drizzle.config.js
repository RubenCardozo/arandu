require('dotenv').config();

/**
 * Drizzle Kit CommonJS configuration file.
 * Controls schema migrations and push actions targeting Supabase PostgreSQL.
 */
module.exports = {
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
};
