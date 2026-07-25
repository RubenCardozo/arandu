import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database';
import * as schema from '../../database/schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, eq } from 'drizzle-orm';
import { CreateCommentDto, CreateRatingDto } from './dto';

@Injectable()
export class InteractionsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: PostgresJsDatabase<typeof schema>,
  ) {}

  async createComment(dto: CreateCommentDto) {
    const [inserted] = await this.db
      .insert(schema.comments)
      .values({
        entityId: dto.entityId,
        entityType: dto.entityType,
        authorName: dto.authorName,
        content: dto.content,
      })
      .returning();
    return inserted;
  }

  async createRating(dto: CreateRatingDto) {
    // If we have a voterId conflict constraint, we upsert the vote
    if (dto.voterId) {
      const [inserted] = await this.db
        .insert(schema.ratings)
        .values({
          entityId: dto.entityId,
          entityType: dto.entityType,
          voterId: dto.voterId,
          stars: dto.stars ?? null,
          isLike: dto.isLike ?? false,
          isDislike: dto.isDislike ?? false,
        })
        .onConflictDoUpdate({
          target: [schema.ratings.entityId, schema.ratings.voterId],
          set: {
            isLike: dto.isLike ?? false,
            isDislike: dto.isDislike ?? false,
            stars: dto.stars ?? null,
          },
        })
        .returning();
      return inserted;
    } else {
      const [inserted] = await this.db
        .insert(schema.ratings)
        .values({
          entityId: dto.entityId,
          entityType: dto.entityType,
          stars: dto.stars ?? null,
          isLike: dto.isLike ?? false,
          isDislike: dto.isDislike ?? false,
        })
        .returning();
      return inserted;
    }
  }

  async deleteRating(entityId: string, voterId: string) {
    await this.db
      .delete(schema.ratings)
      .where(
        and(
          eq(schema.ratings.entityId, entityId),
          eq(schema.ratings.voterId, voterId),
        ),
      );
    return { success: true };
  }
}
