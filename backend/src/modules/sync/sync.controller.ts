import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SyncService, SyncResult } from './sync.service';

/**
 * Controller exposing Git and Markdown synchronization HTTP endpoints.
 * Handles ingestion of articles and Obsidian OKF Markdown files into Supabase.
 */
@Controller(['api/sync', 'sync'])
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * POST endpoint to trigger synchronization of markdown files from the articles directory into Supabase.
   * Exposed at /api/sync/articles and /sync/articles.
   *
   * @param body Optional request body containing a custom articlesPath override.
   * @returns SyncResult summary of synchronization outcome.
   */
  @Post('articles')
  @HttpCode(HttpStatus.OK)
  async syncArticles(@Body() body?: { articlesPath?: string }): Promise<SyncResult> {
    return this.syncService.syncArticlesFromDirectory(body?.articlesPath);
  }

  /**
   * POST endpoint to trigger synchronization of Obsidian vault notes into database.
   *
   * @param body Optional request body containing a custom vaultPath override.
   * @returns SyncResult summary of synchronization outcome.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async syncObsidian(@Body() body?: { vaultPath?: string }): Promise<SyncResult> {
    return this.syncService.syncObsidianArticles(body?.vaultPath);
  }
}
