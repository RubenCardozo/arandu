import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { OkfFormat } from './interfaces/okf.interface';

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

  async saveArticle(filename: string, okfData: OkfFormat): Promise<void> {
    try {
      const filePath = path.join(this.sourcesBasePath, filename);
      const markdownContent = this.generateMarkdown(okfData);
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

  private generateMarkdown(data: OkfFormat): string {
    let md = '---\n';
    md += `type: "${data.type || 'article'}"\n`;
    md += `procedencia: "${data.procedencia || ''}"\n`;
    
    if (data.metadatos) {
      for (const [key, value] of Object.entries(data.metadatos)) {
        if (typeof value === 'object' && value !== null) {
          md += `${key}:\n`;
          for (const [subKey, subValue] of Object.entries(value)) {
             md += `  ${subKey}: "${String(subValue).replace(/"/g, '\\"')}"\n`;
          }
        } else {
          md += `${key}: "${String(value).replace(/"/g, '\\"')}"\n`;
        }
      }
    }

    if (data.entidades && data.entidades.length > 0) {
      md += 'entidades:\n';
      for (const entity of data.entidades) {
        md += `  - "${entity.name}"\n`;
      }
    }
    
    md += '---\n\n';
    md += data.contenido || '';
    
    return md;
  }
}
