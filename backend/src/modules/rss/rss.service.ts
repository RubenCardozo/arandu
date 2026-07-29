import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import Parser from 'rss-parser';
import { VaultExportService } from './vault-export.service';
import { GithubWikiService } from '../github-wiki.service';

@Injectable()
export class RssService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RssService.name);
  private parser: Parser;
  private feedUrls: string[];

  /**
   * Definitive list of allowed keywords for Geneva communes and translations.
   * Used to fast-fail articles before calling the Gemini API.
   */
  private readonly allowedKeywords = [
    "Genève", "Geneva", "Genf", "Ginebra", "Ginevra", "Vernier", "Lancy", 
    "Meyrin", "Carouge", "Onex", "Thônex", "Versoix", "Grand-Saconnex", 
    "Chêne-Bougeries", "Veyrier", "Plan-les-Ouates", "Bernex", 
    "Collonge-Bellerive", "Cologny", "Confignon", "Satigny", 
    "Pregny-Chambésy", "Bellevue", "Perly-Certoux", "Troinex", 
    "Chêne-Bourg", "Vandœuvres", "Meinier", "Choulex", "Jussy", 
    "Bardonnex", "Genthod", "Presinge", "Corsier", "Cartigny", "Avusy", 
    "Laconnex", "Soral", "Dardagny", "Russin", "Aire-la-Ville", "Avully", 
    "Chancy", "Gy", "Hermance", "Puplinge", "Collex-Bossy", "Céligny"
  ];

  constructor(
    private configService: ConfigService,
    private vaultExportService: VaultExportService,
    private githubWikiService: GithubWikiService,
  ) {
    this.parser = new Parser();
    
    /**
     * Reads a comma-separated list of RSS feed URLs from the RSS_FEED_URLS environment variable.
     * This allows processing multiple feeds autonomously in a loop.
     */
    const rssFeedsEnv = this.configService.get<string>('RSS_FEED_URLS', '');
    this.feedUrls = rssFeedsEnv ? rssFeedsEnv.split(',').map(url => url.trim()) : [];
  }

  async onApplicationBootstrap() {
    this.logger.log('RssService initialized. Bi-hourly aggregation schedule is active.');
    if (this.feedUrls.length === 0) {
      this.logger.warn('No RSS feeds configured. Please set RSS_FEED_URLS in your .env file.');
    } else {
      // Execute immediately on startup
      this.handleCron();
    }
  }

  @Cron('0 */6 * * *') 
  async handleCron() {
    this.logger.log('Starting bi-hourly RSS aggregation...');
    
    if (this.feedUrls.length === 0) {
      this.logger.warn('No feeds to process. Exiting cron job.');
      return;
    }

    for (const url of this.feedUrls) {
      if (url.includes('letemps.ch')) {
        this.logger.warn(`Skipping feed URL (letemps.ch bypass): ${url}`);
        continue;
      }

      try {
        const feed = await this.parser.parseURL(url);
        this.logger.log(`Fetched feed: ${feed.title}. Items: ${feed.items.length}`);

        for (const item of feed.items) {
          try {
            const safeTitle = (item.title || 'untitled').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `${safeTitle}.md`;

            const exists = await this.vaultExportService.hasArticle(filename);
            if (exists) {
              this.logger.debug(`Article already processed, skipping: ${filename}`);
              continue;
            }

            this.logger.log(`Processing new article: ${item.title}`);
            
            const originalTitle = item.title || 'Untitled';
            const originalDescription = item.contentSnippet || item.content || '';
            
            const searchTitle = originalTitle.toLowerCase();
            const searchDescription = originalDescription.toLowerCase();
            
            const hasKeyword = this.allowedKeywords.some(keyword => {
              const kw = keyword.toLowerCase();
              return searchTitle.includes(kw) || searchDescription.includes(kw);
            });

            if (!hasKeyword) {
              const logPath = require('path').join(process.cwd(), '..', 'sources', 'discarded-news.log');
              const logEntry = `[${new Date().toISOString()}] FAST-FAIL REJECTED: ${item.title}\nURL: ${item.link || url}\nREASON: Missing allowed keywords\n\n`;
              try {
                await require('fs/promises').appendFile(logPath, logEntry, 'utf-8');
                this.logger.debug(`Article rejected by fast-fail keyword filter: ${item.title}`);
              } catch (err) {
                this.logger.error('Failed to write to discarded-news.log', err);
              }
              continue;
            }

            const resource = item.link || url;
            const timestamp = new Date().toISOString();
            const body = item.content || item.contentSnippet || '';

            /**
             * Formats the raw French RSS feed item directly to an OKF Markdown file.
             * Sets the type to 'source' and references the original URL under 'resource'
             * to guarantee provenance, matching the platform's editorial guidelines.
             */
            let markdownContent = '---\n';
            markdownContent += `type: source\n`;
            markdownContent += `title: "${originalTitle.replace(/"/g, '\\"')}"\n`;
            markdownContent += `description: "${originalDescription.replace(/[\n\r]+/g, ' ').replace(/"/g, '\\"')}"\n`;
            markdownContent += `resource: "${resource}"\n`;
            markdownContent += `timestamp: "${timestamp}"\n`;
            markdownContent += '---\n\n';
            markdownContent += body;

            // Save raw article locally and upload to the raw/ folder of GitHub Wiki repo
            await this.vaultExportService.saveArticle(filename, markdownContent);
            try {
              await this.githubWikiService.uploadRawDraft(filename, markdownContent, originalTitle);
            } catch (uploadError) {
              this.logger.error(`Error uploading article ${filename} to GitHub Wiki`, uploadError);
            }
          } catch (itemError) {
            this.logger.error(`Error processing item "${item.title || 'untitled'}" from feed ${url}`, itemError);
            continue;
          }
        }
      } catch (error) {
        const logPath = require('path').join(process.cwd(), '..', 'sources', 'discarded-news.log');
        const errorMessage = error instanceof Error ? error.message : String(error);
        const logEntry = `[${new Date().toISOString()}] FEED ERROR: Failed to process or reach feed\nURL: ${url}\nREASON: ${errorMessage}\n\n`;
        try {
          await require('fs/promises').appendFile(logPath, logEntry, 'utf-8');
        } catch (err) {
          this.logger.error('Failed to write feed error to discarded-news.log', err);
        }
        this.logger.error(`Error processing feed ${url}`, error);
        continue;
      }
    }
    this.logger.log('RSS aggregation completed successfully.');
  }
}
