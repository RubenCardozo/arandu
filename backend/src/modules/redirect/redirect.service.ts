import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../db';
import * as schema from '../../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class RedirectService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async registerClick(id: string, type: string) {
    let table;
    switch (type) {
      case 'restaurant':
        table = schema.restaurants;
        break;
      case 'event':
        table = schema.events;
        break;
      case 'job':
        table = schema.jobs;
        break;
      case 'service':
        table = schema.services;
        break;
      default:
        return;
    }

    try {
      await this.db
        .update(table)
        .set({ clicks: sql`${table.clicks} + 1` })
        .where(eq(table.id, id));
    } catch (error) {
      console.error(`Error registering click for ${type} ${id}:`, error);
    }
  }
}
