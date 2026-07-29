import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../database';
import * as schema from '../../database/schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, eq } from 'drizzle-orm';
import { CreateCommentDto, CreateRatingDto } from './dto';
import { GeminiService } from '../../common/gemini.service';

/**
 * Service to handle user interactions (comments, ratings, and likes) with digital assets.
 * Implements security moderation checks before persisting interactions.
 */
@Injectable()
export class InteractionsService {
  /**
   * Constructs the service.
   * @param db Drizzle database connection injected globally for schema operations.
   * @param geminiService AI service to run automated moderation checks.
   */
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: PostgresJsDatabase<typeof schema>,
    private geminiService: GeminiService,
  ) {}

  /**
   * Creates a new user comment after verifying it passes the automated toxicity filter.
   * Throws a BadRequestException if the content is identified as toxic.
   * 
   * @param dto Data transfer object containing authorName, entityId, entityType, and comment content.
   * @returns The inserted database comment record.
   */
  async createComment(dto: CreateCommentDto) {
    // Run content toxicity verification prior to DB insert
    const check = await this.geminiService.checkToxicity(dto.content);
    if (check.toxic) {
      throw new BadRequestException(
        `Comment rejected due to toxicity policy${check.reason ? ': ' + check.reason : ''}`
      );
    }

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

  /**
   * Registers a 1-to-5 star rating or an interaction like/dislike.
   * Supports upserts if a voterId is supplied.
   * 
   * @param dto Data transfer object containing rating metrics and voter identification.
   * @returns The updated or inserted database rating record.
   */
  async createRating(dto: CreateRatingDto) {
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

  /**
   * Deletes a user rating or like from the database.
   * 
   * @param entityId ID of the related asset.
   * @param voterId ID of the voter whose rating is to be deleted.
   * @returns A success status object.
   */
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
