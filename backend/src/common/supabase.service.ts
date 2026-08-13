import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabaseClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    let supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey =
      this.configService.get<string>('SUPABASE_KEY') ||
      this.configService.get<string>('SUPABASE_ANON_KEY') ||
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    // If SUPABASE_URL is not explicitly set, try to derive it from DATABASE_URL or default to localhost
    if (!supabaseUrl) {
      const dbUrl = this.configService.get<string>('DATABASE_URL');
      if (dbUrl) {
        try {
          const parsed = new URL(dbUrl);
          // If using internal container host like 'supabase-rxnw4jxvj4odwma88hriv05x-db'
          const hostParts = parsed.hostname.split('-');
          if (hostParts.length > 1) {
            const prefix = hostParts.slice(0, -1).join('-');
            supabaseUrl = `http://${prefix}-kong:8000`;
          }
        } catch {
          // Ignore URL parsing errors
        }
      }
    }

    // Default fallback to local kong endpoint if still undefined
    if (!supabaseUrl) {
      supabaseUrl = 'http://localhost:8000';
    }

    if (!supabaseKey) {
      throw new Error(
        'Supabase API key is missing. Please set SUPABASE_KEY or SUPABASE_ANON_KEY in environment variables.',
      );
    }

    this.supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  getClient(): SupabaseClient {
    return this.supabaseClient;
  }
}
