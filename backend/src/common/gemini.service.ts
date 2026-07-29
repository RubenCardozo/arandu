import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

/**
 * Service to interface with the Google GenAI SDK (Gemini API)
 * for processing news and checking content safety.
 */
@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private ai: GoogleGenAI;

  /**
   * Initializes the Google GenAI SDK with the API key from config.
   * @param configService NestJS configuration service.
   */
  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || 'dummy-key';
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Translates and filters RSS news items into the Open Knowledge Format (OKF) structure.
   * Leverages Gemini's structured output capability.
   * 
   * @param title Raw title of the article.
   * @param content Raw description or content of the article.
   * @param pubDate Original publication date of the article.
   * @param url Link to the original article source.
   * @returns The structured OKF object or null if rejected.
   */
  async processRssArticle(
    title: string,
    content: string,
    pubDate: string,
    url: string,
  ): Promise<any | null> {
    try {
      const prompt = `
        Role: You are a strict editorial assistant for Arandu, a digital newspaper exclusively for the local community of Geneva (Genève), Switzerland.
        
        Task: Translate and format the following news item into a strict JSON object following the Open Knowledge Format (OKF).
        
        EDITORIAL CRITERIA (CRITICAL):
        - ACCEPT ONLY news directly related to "Genève" (Geneva), its cantons, neighborhoods (e.g., Eaux-Vives, Plainpalais), local politics, or local community events.
        - REJECT news if it is general Swiss national news, international news, celebrity gossip, or generic sports.
        
        News Item:
        Title: ${title}
        Content: ${content}
        Date: ${pubDate}
        URL: ${url}
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              rejected: {
                type: 'BOOLEAN',
                description: 'Set to true if the article does not meet the local Geneva criteria and must be discarded.',
              },
              reason: {
                type: 'STRING',
                description: 'Explanation for rejection if rejected is true.',
              },
              type: {
                type: 'STRING',
                description: 'Should be "article" if accepted.',
              },
              contenido: {
                type: 'STRING',
                description: 'The translated Spanish news article body in Markdown format.',
              },
              procedencia: {
                type: 'STRING',
                description: 'The original URL of the news item.',
              },
              metadatos: {
                type: 'OBJECT',
                properties: {
                  title: {
                    type: 'STRING',
                    description: 'The translated Spanish title.',
                  },
                  author: {
                    type: 'STRING',
                    description: 'Author of the article if available.',
                  },
                  pubDate: {
                    type: 'STRING',
                    description: 'Publication date of the article.',
                  },
                  imageUrls: {
                    type: 'ARRAY',
                    items: { type: 'STRING' },
                    description: 'List of media or image URLs extracted from the article.',
                  },
                },
                required: ['title'],
              },
              entidades: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    id: { type: 'STRING' },
                    name: { type: 'STRING' },
                    type: { type: 'STRING' },
                    description: { type: 'STRING' },
                  },
                  required: ['id', 'name', 'type'],
                },
                description: 'Key entities extracted (e.g. neighborhoods, politicians, places, organizations).',
              },
            },
            required: ['rejected'],
          },
        },
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        if (data.rejected) {
          const logPath = require('path').join(process.cwd(), '..', 'sources', 'discarded-news.log');
          const logEntry = `[${new Date().toISOString()}] REJECTED: ${title}\nURL: ${url}\nREASON: ${data.reason}\n\n`;
          try {
            await require('fs/promises').appendFile(logPath, logEntry, 'utf-8');
            this.logger.debug(`Article rejected by editorial filter: ${title}`);
          } catch (err) {
            this.logger.error('Failed to write to discarded-news.log', err);
          }
          return null;
        }
        return data;
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to process item with Gemini: ${title}`, error);
      return null;
    }
  }

  /**
   * Checks the input text for toxicity using the Gemini API.
   * Used to filter user-submitted comments before insertion.
   * 
   * @param text The comment content to evaluate.
   * @returns An object stating if the content is toxic and a reason.
   */
  async checkToxicity(text: string): Promise<{ toxic: boolean; reason?: string }> {
    try {
      const prompt = `
        Role: You are a Toxicity Guardian moderator for Arandu, a digital newspaper platform.
        
        Task: Analyze the user comment provided below. Determine if it contains hate speech, profanity, heavy insults, threats of violence, or extreme toxicity.
        
        Comment: "${text}"
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              toxic: {
                type: 'BOOLEAN',
                description: 'Set to true if the comment is toxic, abusive, or contains hate speech.',
              },
              reason: {
                type: 'STRING',
                description: 'Brief reason if toxic is true.',
              },
            },
            required: ['toxic'],
          },
        },
      });

      if (response.text) {
        return JSON.parse(response.text);
      }
      return { toxic: false };
    } catch (error) {
      this.logger.error('Error executing toxicity check', error);
      // Fail open or closed depending on trust posture; zero-trust suggests failing closed or log.
      // We will allow the comment but log the error to avoid blocking users due to intermittent API issues.
      return { toxic: false };
    }
  }
}
