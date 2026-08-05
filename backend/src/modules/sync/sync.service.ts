import { Injectable, Inject, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
// Pointing accurately to backend/src/database/schema.ts
import { media } from '../../database/schema';

/**
 * Structured content block representation required by the Angular frontend.
 */
interface ContentBlock {
  type: 'text' | 'subtitle';
  content: string;
}

/**
 * Return type required strictly by the SyncController signature.
 */
export interface SyncResult {
  success: boolean;
  count: number;
  message?: string;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  
  // Dynamic path pointing to your locally synchronized private Obsidian vault folder from .env
  private readonly sourcesPath = process.env.OBSIDIAN_VAULT_PATH
    ? path.resolve(process.env.OBSIDIAN_VAULT_PATH.replace(/['"]/g, '')) // Cleans any quotes safely
    : path.join(__dirname, '../../../../wiki/sources');

  /**
   * Constructs the service injecting the Drizzle database instance.
   * @param db Drizzle database client instance connected to Supabase PostgreSQL.
   */
  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: NodePgDatabase<any>,
  ) {}

  /**
   * Main entrypoint called by the controller. Processes files from the Obsidian vault.
   * @param vaultPath Optional directory path override for custom vaults.
   */
  async syncObsidianArticles(vaultPath?: string): Promise<SyncResult> {
    try {
      // Use custom path if provided by controller body, otherwise fallback to configured env path
      const targetPath = vaultPath ? path.resolve(vaultPath.replace(/['"]/g, '')) : this.sourcesPath;
      this.logger.log(`Scanning articles from Obsidian folder: ${targetPath}`);
      
      if (!fs.existsSync(targetPath)) {
        this.logger.warn(`Sources path does not exist: ${targetPath}`);
        return { success: false, count: 0, message: `Path not found: ${targetPath}` };
      }

      const files = fs.readdirSync(targetPath).filter(file => file.endsWith('.md'));
      let syncedCount = 0;

      for (const file of files) {
        const filePath = path.join(targetPath, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        
        // Parse the Obsidian OKF file content structure
        const parsedData = this.parseOKFMarkdown(file, fileContent);
        
        this.logger.log(`Synchronizing article: "${parsedData.title}" into database.`);

        // DB Insert or Update on Conflict
        const existingRecord = await this.db
          .select()
          .from(media)
          .where(eq(media.contentUrl, parsedData.contentUrl))
          .execute();

        if (existingRecord.length > 0) {
          // Update existing article
          await this.db
            .update(media)
            .set({
              title: parsedData.title,
              type: parsedData.type,
              category: parsedData.category,
              description: parsedData.description,
              reviewed: parsedData.reviewed,
              featured: parsedData.featured,
            })
            .where(eq(media.contentUrl, parsedData.contentUrl))
            .execute();
        } else {
          // Insert new article record
          await this.db
            .insert(media)
            .values({
              title: parsedData.title,
              type: parsedData.type,
              category: parsedData.category,
              description: parsedData.description,
              contentUrl: parsedData.contentUrl,
              reviewed: parsedData.reviewed,
              featured: parsedData.featured,
            })
            .execute();
        }

        syncedCount++;
      }

      return { 
        success: true, 
        count: syncedCount, 
        message: `Successfully synchronized ${syncedCount} articles.` 
      };
    } catch (error) {
      this.logger.error('Failed to execute Markdown synchronization:', error);
      return { 
        success: false, 
        count: 0, 
        message: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Main parsing engine for Obsidian OKF documents.
   * Extracts frontmatter metadata, cleans titles, and converts body lines to JSON blocks.
   */
  private parseOKFMarkdown(filename: string, fileContent: string) {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
    const match = fileContent.match(frontmatterRegex);
    const metadata: Record<string, string> = {};
    let body = fileContent;

    // 1. Process YAML Frontmatter properties safely by accessing first capture group
    if (match && match[3]) {
      const yamlBlock = match[3];
      body = fileContent.replace(frontmatterRegex, '').trim();
      const lines = yamlBlock.split('\n');
      for (const line of lines) {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex !== -1) {
          const key = line.substring(0, separatorIndex).trim();
          const val = line.substring(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
          metadata[key] = val;
        }
      }
    }

    // 2. Extract Spanish H1 Heading (cleaning markdown hashtags) by accessing first capture group
    const h1Regex = /^#\s+(.+)$/m;
    const h1Match = body.match(h1Regex);
    let title = '';
    if (h1Match && h1Match[3]) {
      title = h1Match[3].trim().replace(/^["']|["']$/g, '');
      body = body.replace(h1Regex, '').trim(); // Remove H1 from the text body array
    } else if (metadata.title) {
      title = metadata.title;
    } else {
      title = filename.replace('.md', '').replace(/_/g, ' ');
    }

    // 3. Align types to database enum constraints ('podcast', 'video', 'article') with fallback mapping
    const rawType = (metadata.type || 'article').toString().trim().toLowerCase();
    let type = 'article';
    if (rawType === 'podcast' || rawType === 'video') {
      type = rawType;
    } else {
      // Fallback unauthorized values (e.g. 'source', 'news', 'post', 'blog') to 'article'
      type = 'article';
    }

    const contentUrl = metadata.resource || metadata.provenance || 'https://arandu.ch';
    const category = metadata.category || 'cultura';
    const featured = metadata.featured === 'true';
    const reviewed = metadata.reviewed === 'true' || true; // Default true for Obsidian validated notes

    // 4. Transform body content into structured block array representation
    const blocks: ContentBlock[] = [];
    const lines = body.split(/\r?\n/);
    let currentParagraphText = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        if (currentParagraphText) {
          blocks.push({ type: 'text', content: currentParagraphText.trim() });
          currentParagraphText = '';
        }
        continue;
      }

      if (trimmedLine.startsWith('## ') || trimmedLine.startsWith('### ')) {
        if (currentParagraphText) {
          blocks.push({ type: 'text', content: currentParagraphText.trim() });
          currentParagraphText = '';
        }
        const subtitleText = trimmedLine.replace(/^#+\s+/, '');
        blocks.push({ type: 'subtitle', content: subtitleText });
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        if (currentParagraphText) {
          blocks.push({ type: 'text', content: currentParagraphText.trim() });
          currentParagraphText = '';
        }
        const bulletText = '• ' + trimmedLine.replace(/^[-*]\s+/, '');
        blocks.push({ type: 'text', content: bulletText });
      } else {
        currentParagraphText += (currentParagraphText ? '\n' : '') + trimmedLine;
      }
    }

    if (currentParagraphText) {
      blocks.push({ type: 'text', content: currentParagraphText.trim() });
    }

    return {
      title,
      type,
      category,
      description: JSON.stringify(blocks), // Strictly stringified for text DB column
      contentUrl,
      featured,
      reviewed,
    };
  }
}
