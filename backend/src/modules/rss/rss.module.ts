import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VaultExportService } from './vault-export.service';
import { RssService } from './rss.service';
import { GithubWikiService } from '../github-wiki.service';

@Module({
  imports: [HttpModule],
  providers: [VaultExportService, RssService, GithubWikiService],
  exports: [VaultExportService, RssService, GithubWikiService],
})
export class RssModule {}
