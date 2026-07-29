import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class VaultExportService implements OnModuleInit {
  private readonly logger = new Logger(VaultExportService.name);
  private sourcesBasePath: string;

  constructor(private configService: ConfigService) {
    this.sourcesBasePath = this.configService.get<string>(
      'SOURCES_PATH',
      path.join(process.cwd(), '..', 'sources'),
    );
  }

  async onModuleInit() {
    await this.initStructure();
  }

  private async initStructure(): Promise<void> {
    try {
      await fs.mkdir(this.sourcesBasePath, { recursive: true });
      this.logger.log(`Initialized sources directory at ${this.sourcesBasePath}`);
    } catch (error) {
      this.logger.error('Failed to initialize sources directory', error);
      throw error;
    }
  }

  async saveArticle(filename: string, markdownContent: string): Promise<void> {
    try {
      const filePath = path.join(this.sourcesBasePath, filename);
      await fs.writeFile(filePath, markdownContent, 'utf-8');
      this.logger.log(`Saved processed article to ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to save article ${filename}`, error);
      throw error;
    }
  }

  async hasArticle(filename: string): Promise<boolean> {
    try {
      const filePath = path.join(this.sourcesBasePath, filename);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
