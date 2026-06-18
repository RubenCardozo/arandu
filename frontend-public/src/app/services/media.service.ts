import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { MediaRow, MediaViewModel } from '../models/media.model';

/**
 * Service responsible for fetching and transforming media data from Supabase.
 * Encapsulates all media-related database logic and maps DB rows to view models.
 */
@Injectable({ providedIn: 'root' })
export class MediaService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Fetches all media ordered by published_at DESC.
   * Maps DB rows (snake_case) to view models (camelCase).
   * @returns Array of MediaViewModel, or empty array on error.
   */
  async getAll(): Promise<MediaViewModel[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('media')
        .select('*')
        .order('published_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('MediaService.getAll – Supabase query error:', error);
        return [];
      }

      return (data as MediaRow[] | null)?.map(row => this.toViewModel(row)) ?? [];
    } catch (err) {
      console.error('MediaService.getAll – unexpected error:', err);
      return [];
    }
  }

  /**
   * Fetches the latest N media items ordered by published_at DESC.
   * @param limit Maximum number of items to return (default 6).
   * @returns Array of MediaViewModel, or empty array on error.
   */
  async getLatest(limit: number = 6): Promise<MediaViewModel[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('media')
        .select('*')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (error) {
        console.error('MediaService.getLatest – Supabase query error:', error);
        return [];
      }

      return (data as MediaRow[] | null)?.map(row => this.toViewModel(row)) ?? [];
    } catch (err) {
      console.error('MediaService.getLatest – unexpected error:', err);
      return [];
    }
  }

  /**
   * Searches media items by title or description matching the search query (case-insensitive).
   * @param query Search string.
   */
  async search(query: string): Promise<MediaViewModel[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('media')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('published_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('MediaService.search – Supabase query error:', error);
        return [];
      }

      return (data as MediaRow[] | null)?.map(row => this.toViewModel(row)) ?? [];
    } catch (err) {
      console.error('MediaService.search – unexpected error:', err);
      return [];
    }
  }

  /**
   * Transforms a raw Supabase row into a camelCase view model.
   * Handles date formatting and provides sensible defaults for optional fields.
   */
  private toViewModel(row: MediaRow): MediaViewModel {
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      category: row.category ?? 'Editorial',
      description: row.description ?? '',
      contentUrl: row.content_url ?? '#',
      embedUrl: row.embed_url,
      author: row.author ?? 'Redacción',
      imageUrl: row.image_url,
      publishedAt: row.published_at
        ? new Date(row.published_at)
            .toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
            .toUpperCase()
        : ''
    };
  }
}
