import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SyncService, SyncResult } from './sync.service';

/**
 * Controller exposing Git/Markdown synchronization endpoints.
 * Handles ingestion of Obsidian OKF Markdown articles into Supabase.
 */
@Controller(['api/sync', 'sync'])
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * POST endpoint to trigger the Obsidian OKF Markdown sync process into Supabase.
   * Exposed at both /api/sync and /sync routes.
   *
   * @param body Optional request body containing a custom vaultPath override
   * @returns SyncResult summary of the synchronization execution
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async syncArticles(@Body() body?: { vaultPath?: string }): Promise<SyncResult> {
    return this.syncService.syncObsidianArticles(body?.vaultPath);
  }
}
