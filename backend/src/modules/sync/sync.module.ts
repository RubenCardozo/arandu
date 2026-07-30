import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

/**
 * Module encapsulating Git/Markdown synchronization operations for ingesting Obsidian OKF articles into Supabase.
 */
@Module({
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
