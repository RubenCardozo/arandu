import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { media } from '../../database/schema';
import { SupabaseService } from '../../common/supabase.service';

/**
 * Structured content block representation required by legacy Obsidian parser.
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

/**
 * Interface representing parsed article data extracted from YAML frontmatter and markdown body.
 */
export interface ParsedArticle {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  author_avatar?: string;
  source_name?: string;
  source_url?: string;
  category?: string;
  status?: string;
  published_at?: string;
  featured: boolean;
  order_priority: number;
  cover_image?: string;
  content: string;
}

/**
 * NestJS service providing Markdown file parsing and synchronization into Supabase.
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  // Dynamic path pointing to local articles folder
  private readonly sourcesPath = path.join(process.cwd(), 'articles');

  /**
   * Constructs the SyncService injecting optional database connections and Supabase client service.
   *
   * @param db Drizzle database client instance connected to PostgreSQL database.
   * @param supabaseService Supabase service providing configured Supabase client.
   */
  constructor(
    @Optional() @Inject('DATABASE_CONNECTION') private readonly db?: NodePgDatabase<any>,
    @Optional() private readonly supabaseService?: SupabaseService,
  ) {}

  /**
   * Reads markdown files from the specified articles directory, parses frontmatter and body content,
   * and performs an upsert operation into the Supabase articles table.
   *
   * @param articlesDirectory Optional path override for directory containing article markdown files.
   * @returns SyncResult summarizing synchronization status and processed count.
   */
  async syncArticlesFromDirectory(articlesDirectory?: string): Promise<SyncResult> {
    try {
      // Strictly resolve target directory to the dedicated articles folder
      const targetPath = articlesDirectory
        ? path.resolve(articlesDirectory.replace(/['"]/g, ''))
        : (process.env.ARTICLES_DIR
            ? path.resolve(process.env.ARTICLES_DIR.replace(/['"]/g, ''))
            : path.join(process.cwd(), 'articles'));

      this.logger.log(`Scanning articles from directory: ${targetPath}`);

      if (!fs.existsSync(targetPath)) {
        this.logger.warn(`Articles directory does not exist: ${targetPath}`);
        return { success: false, count: 0, message: `Articles directory not found: ${targetPath}` };
      }

      const files = fs.readdirSync(targetPath).filter((file) => file.endsWith('.md'));
      if (files.length === 0) {
        this.logger.warn(`No markdown articles found in directory: ${targetPath}`);
        return { success: true, count: 0, message: `No markdown files found in ${targetPath}` };
      }

      let syncedCount = 0;

      for (const file of files) {
        const filePath = path.join(targetPath, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        // Parse YAML frontmatter metadata and markdown body
        const parsedArticle = this.parseArticleMarkdown(fileContent, file);

        this.logger.log(`Synchronizing article into Supabase: "${parsedArticle.title}"`);

        // Build database payload object matching Supabase articles table schema
        const payload: Record<string, any> = {
          id: parsedArticle.id,
          title: parsedArticle.title,
          subtitle: parsedArticle.subtitle || null,
          author: parsedArticle.author || null,
          author_avatar: parsedArticle.author_avatar || null,
          source_name: parsedArticle.source_name || null,
          source_url: parsedArticle.source_url || null,
          category: parsedArticle.category || null,
          status: parsedArticle.status || 'draft',
          published_at: parsedArticle.published_at || null,
          featured: parsedArticle.featured,
          order_priority: parsedArticle.order_priority,
          cover_image: parsedArticle.cover_image || null,
          content: parsedArticle.content,
          updated_at: new Date().toISOString(),
        };

        // Perform Supabase upsert operation on the articles table strictly using 'id' as onConflict key
        if (this.supabaseService) {
          const client = this.supabaseService.getClient();
          const { error } = await client
            .from('articles')
            .upsert(payload, { onConflict: 'id' });

          if (error) {
            this.logger.error(`Supabase error upserting article "${parsedArticle.title}":`, error.message);
            throw new Error(`Failed to upsert article ${parsedArticle.title}: ${error.message}`);
          }
        }

        syncedCount++;
      }

      return {
        success: true,
        count: syncedCount,
        message: `Successfully synchronized ${syncedCount} articles to Supabase.`,
      };
    } catch (error) {
      this.logger.error('Failed to execute articles synchronization:', error);
      return {
        success: false,
        count: 0,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Parses raw YAML frontmatter content and extracts article metadata alongside the markdown body.
   *
   * @param fileContent Raw text content of the markdown file.
   * @param filename Optional filename used as fallback for article title.
   * @returns ParsedArticle structured article object.
   */
  public parseArticleMarkdown(fileContent: string, filename: string = 'article.md'): ParsedArticle {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
    const match = fileContent.match(frontmatterRegex);
    const metadata: Record<string, string> = {};
    let body = fileContent;

    // Process YAML Frontmatter key-value pairs safely
    if (match && match[1]) {
      const yamlBlock = match[1];
      body = fileContent.replace(frontmatterRegex, '').trim();
      const lines = yamlBlock.split(/\r?\n/);
      for (const line of lines) {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex !== -1) {
          const key = line.substring(0, separatorIndex).trim();
          const val = line.substring(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
          metadata[key] = val;
        }
      }
    }

    // Extract title from frontmatter, H1 header, or filename fallback
    const h1Regex = /^#\s+(.+)$/m;
    const h1Match = body.match(h1Regex);
    let title = metadata.title;
    if (!title && h1Match && h1Match[1]) {
      title = h1Match[1].trim().replace(/^["']|["']$/g, '');
    }
    if (!title) {
      title = filename.replace(/\.md$/i, '').replace(/_/g, ' ');
    }

    // Convert boolean and numeric frontmatter fields with safe fallbacks
    const featured = metadata.featured === 'true' || metadata.featured === '1';
    const orderPriority = metadata.order_priority ? parseInt(metadata.order_priority, 10) : 0;
    const articleId = metadata.id || this.slugify(title);

    return {
      id: articleId,
      title,
      subtitle: metadata.subtitle || undefined,
      author: metadata.author || undefined,
      author_avatar: metadata.author_avatar || undefined,
      source_name: metadata.source_name || undefined,
      source_url: metadata.source_url || undefined,
      category: metadata.category || undefined,
      status: metadata.status || 'published',
      published_at: metadata.published_at || undefined,
      featured: Boolean(featured),
      order_priority: isNaN(orderPriority) ? 0 : orderPriority,
      cover_image: metadata.cover_image || undefined,
      content: body,
    };
  }

  /**
   * Converts a given string into a normalized URL slug.
   *
   * @param text Text string to convert into slug format.
   * @returns Formatted slug string.
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Synchronizes articles from the Obsidian vault directory into the media database table.
   *
   * @param vaultPath Optional directory path override for custom vaults.
   * @returns SyncResult summary of synchronization outcome.
   */
  async syncObsidianArticles(vaultPath?: string): Promise<SyncResult> {
    try {
      const targetPath = vaultPath ? path.resolve(vaultPath.replace(/['"]/g, '')) : this.sourcesPath;
      this.logger.log(`Scanning articles from Obsidian folder: ${targetPath}`);

      if (!fs.existsSync(targetPath)) {
        this.logger.warn(`Sources path does not exist: ${targetPath}`);
        return { success: false, count: 0, message: `Path not found: ${targetPath}` };
      }

      const files = fs.readdirSync(targetPath).filter((file) => file.endsWith('.md'));
      let syncedCount = 0;

      for (const file of files) {
        const filePath = path.join(targetPath, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        const parsedData = this.parseOKFMarkdown(file, fileContent);

        this.logger.log(`Synchronizing Obsidian article: "${parsedData.title}" into database.`);

        if (this.db) {
          const existingRecord = await this.db
            .select()
            .from(media)
            .where(eq(media.contentUrl, parsedData.contentUrl))
            .execute();

          if (existingRecord.length > 0) {
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
        }

        syncedCount++;
      }

      return {
        success: true,
        count: syncedCount,
        message: `Successfully synchronized ${syncedCount} articles.`,
      };
    } catch (error) {
      this.logger.error('Failed to execute Obsidian Markdown synchronization:', error);
      return {
        success: false,
        count: 0,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Parses raw markdown content into structured OKF JSON format.
   *
   * @param content The raw markdown string.
   * @param filename Optional filename context.
   */
  public parseMarkdownOKF(content: string, filename: string = 'document.md') {
    return this.parseOKFMarkdown(filename, content);
  }

  /**
   * Internal parsing engine for Obsidian OKF documents.
   *
   * @param filename Name of the file being processed.
   * @param fileContent Raw text content of the markdown file.
   */
  private parseOKFMarkdown(filename: string, fileContent: string) {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
    const match = fileContent.match(frontmatterRegex);
    const metadata: Record<string, string> = {};
    let body = fileContent;

    if (match && match[1]) {
      const yamlBlock = match[1];
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

    const h1Regex = /^#\s+(.+)$/m;
    const h1Match = body.match(h1Regex);
    let title = '';
    if (h1Match && h1Match[1]) {
      title = h1Match[1].trim().replace(/^["']|["']$/g, '');
      body = body.replace(h1Regex, '').trim();
    } else if (metadata.title) {
      title = metadata.title;
    } else {
      title = filename.replace('.md', '').replace(/_/g, ' ');
    }

    const rawType = (metadata.type || 'article').toString().trim().toLowerCase();
    let type = 'article';
    if (rawType === 'podcast' || rawType === 'video') {
      type = rawType;
    } else {
      type = 'article';
    }

    const contentUrl = metadata.resource || metadata.provenance || 'https://arandu.ch';
    const category = metadata.category || 'cultura';
    const featured = metadata.featured === 'true';
    const reviewed = metadata.reviewed === 'true' || true;

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
      description: JSON.stringify(blocks),
      contentUrl,
      featured,
      reviewed,
    };
  }
}
