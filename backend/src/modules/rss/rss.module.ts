import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VaultExportService } from './vault-export.service';
import { RssService } from './rss.service';
import { GithubWikiService } from '../github-wiki.service';
import { MarkdownSyncService } from './markdown-sync.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [HttpModule, DatabaseModule],
  providers: [VaultExportService, RssService, GithubWikiService, MarkdownSyncService],
  exports: [VaultExportService, RssService, GithubWikiService, MarkdownSyncService],
})
export class RssModule {}
