import { Module } from '@nestjs/common';
import { VaultExportService } from './vault-export.service';
import { RssService } from './rss.service';

@Module({
  providers: [VaultExportService, RssService],
  exports: [VaultExportService, RssService],
})
export class RssModule {}
