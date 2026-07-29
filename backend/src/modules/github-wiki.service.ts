import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { OkfFormat } from './rss/interfaces/okf.interface';

@Injectable()
export class GithubWikiService {
  private readonly logger = new Logger(GithubWikiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Generates OKF Markdown content and uploads it directly to the target GitHub Wiki repository.
   * Uses environmental PAT and repository variables.
   *
   * @param filename Target filename (e.g. "some_article.md")
   * @param okfData Parsed OKF news content from Gemini
   */
  async uploadOkfMarkdown(filename: string, okfData: OkfFormat): Promise<void> {
    const githubPat = this.configService.get<string>('GITHUB_PAT');
    const githubRepoWiki = this.configService.get<string>('GITHUB_REPO_WIKI');

    if (!githubPat || !githubRepoWiki) {
      this.logger.warn(
        'GitHub credentials missing (GITHUB_PAT or GITHUB_REPO_WIKI not configured). Skipping wiki upload.',
      );
      return;
    }

    try {
      const markdownContent = this.generateMarkdown(okfData);
      const base64Content = Buffer.from(markdownContent, 'utf-8').toString('base64');
      const url = `https://api.github.com/repos/${githubRepoWiki}/contents/raw/${filename}`;

      const headers = {
        Authorization: `Bearer ${githubPat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Arandu-NestJS-Backend',
      };

      // Check if the file already exists on GitHub to obtain its SHA (required for updates)
      let sha: string | undefined;
      try {
        const response = await firstValueFrom(
          this.httpService.get(url, { headers }),
        );
        if (response.data && response.data.sha) {
          sha = response.data.sha;
          this.logger.debug(`Found existing file SHA: ${sha} for ${filename}`);
        }
      } catch (error: any) {
        // If file does not exist (404), proceed without SHA
        if (error?.response?.status !== 404) {
          this.logger.error(`Error checking existing file: ${error?.message || error}`);
        }
      }

      const body = {
        message: `Upload translated news article: ${okfData.metadatos?.title || filename}`,
        content: base64Content,
        ...(sha ? { sha } : {}),
      };

      await firstValueFrom(
        this.httpService.put(url, body, { headers }),
      );

      this.logger.log(`Successfully uploaded ${filename} to GitHub Wiki repo ${githubRepoWiki}`);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || error;
      this.logger.error(`Failed to upload ${filename} to GitHub Wiki: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Commits and pushes raw draft markdown to the private GitHub repository.
   *
   * @param filename Target filename (e.g. "some_article.md")
   * @param markdownContent Markdown content string with YAML frontmatter
   * @param title Original article title (used for commit message)
   */
  async uploadRawDraft(
    filename: string,
    markdownContent: string,
    title: string,
  ): Promise<void> {
    const githubPat = this.configService.get<string>('GITHUB_PAT');
    const githubRepoWiki = this.configService.get<string>('GITHUB_REPO_WIKI');

    if (!githubPat || !githubRepoWiki) {
      this.logger.warn(
        'GitHub credentials missing (GITHUB_PAT or GITHUB_REPO_WIKI not configured). Skipping wiki upload.',
      );
      return;
    }

    try {
      const base64Content = Buffer.from(markdownContent, 'utf-8').toString('base64');
      const url = `https://api.github.com/repos/${githubRepoWiki}/contents/raw/${filename}`;

      const headers = {
        Authorization: `Bearer ${githubPat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Arandu-NestJS-Backend',
      };

      // Check if the file already exists on GitHub to obtain its SHA (required for updates)
      let sha: string | undefined;
      try {
        const response = await firstValueFrom(
          this.httpService.get(url, { headers }),
        );
        if (response.data && response.data.sha) {
          sha = response.data.sha;
          this.logger.debug(`Found existing file SHA: ${sha} for ${filename}`);
        }
      } catch (error: any) {
        // If file does not exist (404), proceed without SHA
        if (error?.response?.status !== 404) {
          this.logger.error(`Error checking existing file: ${error?.message || error}`);
        }
      }

      const body = {
        message: `Upload raw draft news article: ${title || filename}`,
        content: base64Content,
        ...(sha ? { sha } : {}),
      };

      await firstValueFrom(
        this.httpService.put(url, body, { headers }),
      );

      this.logger.log(`Successfully uploaded ${filename} to GitHub Wiki repo ${githubRepoWiki}`);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || error;
      this.logger.error(`Failed to upload ${filename} to GitHub Wiki: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Formats the OkfFormat data into a Markdown content string with YAML frontmatter.
   */
  private generateMarkdown(data: OkfFormat): string {
    const title = data.metadatos?.title || 'Untitled';
    const cleanDescription = data.contenido
      ? data.contenido.replace(/[\n\r]+/g, ' ').replace(/[#*`_\[\]]/g, '').slice(0, 150).trim() + '...'
      : 'No description available.';
    const resource = data.procedencia || '';
    
    // Create evolutionary tag set from the extracted entities
    const entityTags = data.entidades
      ? data.entidades.map(e => e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
      : [];
    const tags = Array.from(new Set(['geneva', 'local-news', ...entityTags]));
    const timestamp = data.metadatos?.pubDate || new Date().toISOString();

    let md = '---\n';
    md += `type: Source\n`;
    md += `title: "${title.replace(/"/g, '\\"')}"\n`;
    md += `description: "${cleanDescription.replace(/"/g, '\\"')}"\n`;
    md += `resource: "${resource}"\n`;
    md += `tags:\n`;
    for (const tag of tags) {
      md += `  - "${tag}"\n`;
    }
    md += `timestamp: "${timestamp}"\n`;
    md += '---\n\n';
    md += data.contenido || '';
    
    return md;
  }
}
