import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseService } from './supabase.service';
import { GeminiService } from './gemini.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SupabaseService, GeminiService],
  exports: [SupabaseService, GeminiService],
})
export class CommonModule {}
