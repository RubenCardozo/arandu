import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import Parser from 'rss-parser';
import { GoogleGenAI } from '@google/genai';
import { VaultExportService } from './vault-export.service';
import { OkfFormat } from './interfaces/okf.interface';

@Injectable()
export class RssService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RssService.name);
  private parser: Parser;
  private ai: GoogleGenAI;
  private feedUrls: string[];

  constructor(
    private configService: ConfigService,
    private vaultExportService: VaultExportService,
  ) {
    this.parser = new Parser();
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || 'dummy-key';
    this.ai = new GoogleGenAI({ apiKey });
    
    // Support multiple feeds, separated by commas in .env
    const rssFeedsEnv = this.configService.get<string>('RSS_FEEDS', '');
    this.feedUrls = rssFeedsEnv ? rssFeedsEnv.split(',').map(url => url.trim()) : [];
  }

  async onApplicationBootstrap() {
    this.logger.log('RssService initialized. Bi-hourly aggregation schedule is active.');
    if (this.feedUrls.length === 0) {
      this.logger.warn('No RSS feeds configured. Please set RSS_FEEDS in your .env file.');
    }
  }

  @Cron(CronExpression.EVERY_2_HOURS)
  async handleCron() {
    this.logger.log('Starting bi-hourly RSS aggregation...');
    
    if (this.feedUrls.length === 0) {
      this.logger.warn('No feeds to process. Exiting cron job.');
      return;
    }

    for (const url of this.feedUrls) {
      try {
        const feed = await this.parser.parseURL(url);
        this.logger.log(`Fetched feed: ${feed.title}. Items: ${feed.items.length}`);

        for (const item of feed.items) {
          const safeTitle = (item.title || 'untitled').replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const filename = `${safeTitle}.md`;

          const exists = await this.vaultExportService.hasArticle(filename);
          if (exists) {
            this.logger.debug(`Article already processed, skipping: ${filename}`);
            continue;
          }

          this.logger.log(`Processing new article: ${item.title}`);
          const okfData = await this.processWithGenAI(item, url);

          if (okfData) {
            await this.vaultExportService.saveArticle(filename, okfData);
          }
        }
      } catch (error) {
        this.logger.error(`Error processing feed ${url}`, error);
      }
    }
    this.logger.log('RSS aggregation completed successfully.');
  }

  private async processWithGenAI(item: any, sourceUrl: string): Promise<OkfFormat | null> {
    try {
      const prompt = `
        You are a Swiss News processing assistant.
        Translate and format the following news item into a strict JSON object following the Open Knowledge Format (OKF).
        The JSON must contain:
        - "type": "article"
        - "contenido": The translated Spanish news article in Markdown format.
        - "procedencia": The original URL (${item.link || sourceUrl}).
        - "metadatos": An object containing "title" (translated to Spanish), "author", "pubDate", and any image URLs found.
        - "entidades": An array of objects extracting key entities (e.g. neighborhoods, politicians, places, organizations). Each entity should have "id", "name", "type", and "description".

        Return ONLY a valid JSON object without markdown code blocks, just the raw JSON.

        News Item:
        Title: ${item.title}
        Content: ${item.content || item.contentSnippet}
        Date: ${item.pubDate}
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text) as OkfFormat;
        return data;
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to process item with Gemini: ${item.title}`, error);
      return null;
    }
  }
}
