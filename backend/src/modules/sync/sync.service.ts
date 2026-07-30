import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../common/supabase.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface representing parsed OKF Markdown document data.
 */
export interface OkfParsedDocument {
  title: string;
  content: string;
  resource: string;
  metadata: Record<string, string>;
}

/**
 * Interface representing the synchronization result summary.
 */
export interface SyncResult {
  success: boolean;
  syncedCount: number;
  totalFiles: number;
  vaultPath: string;
  errors: string[];
  records?: any[];
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Parses YAML frontmatter and body from a Markdown file string using a pure Regex approach.
   * Extracts frontmatter metadata key-value pairs and isolates the Markdown body.
   *
   * @param fileContent Raw text content of the Markdown file
   * @returns Object containing key-value metadata pairs and the main body text
   */
  public parseMarkdownOKF(fileContent: string): { metadata: Record<string, string>; body: string } {
    // Regex matching frontmatter delimited by triple-dashes at the top of the file
    const frontmatterRegex = /^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]*/;
    const match = fileContent.match(frontmatterRegex);

    const metadata: Record<string, string> = {};
    let body = fileContent;

    if (match) {
      const yamlBlock = match[1];
      // Strip frontmatter from the document to retain only the body
      body = fileContent.replace(frontmatterRegex, '').trim();

      // Split YAML block line by line for key-value extraction
      const lines = yamlBlock.split(/\r?\n/);
      for (const line of lines) {
        const trimmedLine = line.trim();
        // Skip empty lines and comment lines
        if (!trimmedLine || trimmedLine.startsWith('#')) {
          continue;
        }

        const colonIndex = trimmedLine.indexOf(':');
        if (colonIndex !== -1) {
          const key = trimmedLine.substring(0, colonIndex).trim();
          let value = trimmedLine.substring(colonIndex + 1).trim();

          // Strip wrapping single or double quotes from value
          value = value.replace(/^['"]|['"]$/g, '');
          metadata[key] = value;
        }
      }
    }

    return { metadata, body };
  }

  /**
   * Resolves the physical local path of the Obsidian vault sources directory.
   * Reads OBSIDIAN_VAULT_PATH via ConfigService or process.env, and falls back to safe relative paths for local development.
   *
   * @returns Resolved directory path or null if not found
   */
  private resolveVaultPath(): string | null {
    // 1. Check dynamic environment variable configured via NestJS ConfigService or process.env
    const envPath =
      this.configService.get<string>('OBSIDIAN_VAULT_PATH') ||
      process.env.OBSIDIAN_VAULT_PATH;

    if (envPath && fs.existsSync(envPath)) {
      return envPath;
    }

    // 2. Safe relative fallback paths for local development or Docker containers
    const relativeFallbacks = [
      path.resolve(process.cwd(), 'wiki', 'sources'),
      path.resolve(process.cwd(), '..', 'arandu-backoffice', 'wiki', 'sources'),
      path.resolve(process.cwd(), 'arandu-backoffice', 'wiki', 'sources'),
    ];

    for (const candidate of relativeFallbacks) {
      if (candidate && fs.existsSync(candidate)) {
        return candidate;
      }
    }

    // Return explicit envPath if defined (even if not yet existing at check time) or fallback to first relative path
    return envPath || relativeFallbacks[0];
  }

  /**
   * Synchronizes Obsidian OKF Markdown articles with the Supabase `noticias` table.
   * Ingests files, parses metadata and body, and performs an upsert into Supabase.
   *
   * @param customVaultPath Optional override for vault sources folder path
   * @returns SyncResult object summarizing the synchronization execution
   */
  async syncObsidianArticles(customVaultPath?: string): Promise<SyncResult> {
    const vaultPath = customVaultPath || this.resolveVaultPath();

    if (!vaultPath || !fs.existsSync(vaultPath)) {
      const errorMsg = `Obsidian vault sources directory not found at path: ${vaultPath || 'unspecified'}`;
      this.logger.error(errorMsg);
      throw new BadRequestException(errorMsg);
    }

    this.logger.log(`Starting OKF article ingestion from vault path: ${vaultPath}`);

    // Read all .md files in the vault sources directory
    const files = fs.readdirSync(vaultPath).filter((file) => file.endsWith('.md'));
    this.logger.log(`Found ${files.length} Markdown file(s) for processing.`);

    const syncedRecords: any[] = [];
    const errors: string[] = [];

    const supabase = this.supabaseService.getClient();

    for (const file of files) {
      const filePath = path.join(vaultPath, file);
      try {
        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const { metadata, body } = this.parseMarkdownOKF(rawContent);

        // Extract OKF mandatory and optional fields with fallbacks
        const title = metadata.title || metadata.titulo || file.replace(/\.md$/i, '');
        const content = metadata.contenido || metadata.content || body;
        const resource = metadata.procedencia || metadata.resource || metadata.original_url || metadata.url || '';

        // Prepare object mapping field names for both English & Spanish schema variations
        const payload = {
          title,
          content,
          resource,
          titulo: title,
          contenido: content,
          procedencia: resource,
          updated_at: new Date().toISOString(),
        };

        // Perform upsert into Supabase `noticias` table
        const { data, error } = await supabase
          .from('noticias')
          .upsert([payload], { onConflict: 'title' });

        if (error) {
          // If conflict on 'title' fails due to target column constraint name, attempt fallback upsert on 'titulo'
          const fallbackResponse = await supabase
            .from('noticias')
            .upsert([payload], { onConflict: 'titulo' });

          if (fallbackResponse.error) {
            this.logger.warn(`Upsert failed for file ${file}: ${error.message}`);
            errors.push(`File ${file}: ${error.message}`);
            continue;
          }
        }

        syncedRecords.push({ file, title });
        this.logger.log(`Successfully ingested article: "${title}" (${file})`);
      } catch (err: any) {
        const message = err?.message || String(err);
        this.logger.error(`Error processing file ${file}: ${message}`);
        errors.push(`File ${file}: ${message}`);
      }
    }

    this.logger.log(`Completed sync process. ${syncedRecords.length}/${files.length} articles ingested.`);

    return {
      success: errors.length === 0,
      syncedCount: syncedRecords.length,
      totalFiles: files.length,
      vaultPath,
      errors,
      records: syncedRecords,
    };
  }
}
