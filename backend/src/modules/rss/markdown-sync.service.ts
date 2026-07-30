import { Injectable, Logger, Inject } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../database';
import * as schema from '../../database/schema';
import { media } from '../../database/schema';
import { OkfMetadata } from './interfaces/okf.interface';

/**
 * Service responsible for parsing YAML frontmatter from Markdown files
 * and synchronizing media records with Supabase using Drizzle ORM.
 */
@Injectable()
export class MarkdownSyncService {
  private readonly logger = new Logger(MarkdownSyncService.name);

  /**
   * Creates an instance of MarkdownSyncService.
   *
   * @param db Drizzle database instance injected from DatabaseModule.
   */
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  /**
   * Helper function to extract boolean values from YAML frontmatter values.
   * Accepts actual booleans or string representation ("true", "1", "yes").
   *
   * @param val Value extracted from YAML frontmatter metadata
   * @returns Clean boolean value
   */
  private parseBoolean(val: any): boolean {
    if (typeof val === 'boolean') {
      return val;
    }
    if (typeof val === 'string') {
      const normalized = val.trim().toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 'yes';
    }
    return false;
  }

  /**
   * Parses metadata from frontmatter and persists/updates a media record in Supabase.
   *
   * @param contentUrl Unique resource or identifier URL of the article
   * @param metadata Frontmatter key-value pairs (OkfMetadata)
   * @param body Article body content or description
   */
  async syncMediaArticle(
    contentUrl: string,
    metadata: OkfMetadata,
    body: string,
  ): Promise<void> {
    const featured = this.parseBoolean(metadata.featured);
    const reviewed = this.parseBoolean(metadata.reviewed);
    const title = metadata.title || 'Untitled';
    const author = metadata.author || null;
    const type = metadata.type || 'article';
    const category = metadata.category || null;
    const description = metadata.description || (body ? body.slice(0, 250).trim() : null);
    const imageUrl = metadata.imageUrl || (metadata.imageUrls && metadata.imageUrls.length > 0 ? metadata.imageUrls[0] : null);

    try {
      const existingRecords = await this.db
        .select()
        .from(media)
        .where(eq(media.contentUrl, contentUrl))
        .limit(1);

      if (existingRecords.length > 0) {
        await this.db
          .update(media)
          .set({
            title,
            type,
            category,
            description,
            author,
            imageUrl,
            featured,
            reviewed,
          })
          .where(eq(media.contentUrl, contentUrl));

        this.logger.log(`Updated media record for URL: ${contentUrl} (featured=${featured}, reviewed=${reviewed})`);
      } else {
        await this.db.insert(media).values({
          title,
          type,
          category,
          description,
          contentUrl,
          author,
          imageUrl,
          featured,
          reviewed,
        });

        this.logger.log(`Inserted new media record for URL: ${contentUrl} (featured=${featured}, reviewed=${reviewed})`);
      }
    } catch (error) {
      this.logger.error(`Failed to sync media record for ${contentUrl}`, error);
      throw error;
    }
  }
}
