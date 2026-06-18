import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { MediaRow, MediaViewModel, NewMedia } from '../models/media.model';

/**
 * Service responsible for all media (articles, videos, podcasts) data operations.
 * Wraps Supabase queries and file uploads, returning camelCase ViewModels to components.
 */
@Injectable({ providedIn: 'root' })
export class MediaService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Fetches all media records ordered by published_at descending.
   * @returns Array of MediaViewModel objects with camelCase properties.
   */
  async getAll(): Promise<MediaViewModel[]> {
    const { data, error } = await this.supabase.client
      .from('media')
      .select('*')
      .order('published_at', { ascending: false, nullsFirst: false });

    if (error) throw error;

    return (data as MediaRow[]).map((row) => this.toViewModel(row));
  }

  /**
   * Creates a new media record. Optionally uploads an image file first.
   * Automatically sets published_at to the current timestamp.
   * @param media - The new media payload (camelCase).
   * @param file  - Optional image file to upload to Supabase Storage.
   */
  async create(media: NewMedia, file?: File): Promise<void> {
    let imageUrl = media.imageUrl || '';

    if (file) {
      const ext = file.name.split('.').pop();
      const path = `editorial/${Math.random()}.${ext}`;
      imageUrl = await this.uploadFile('assets', path, file);
    }

    const { error } = await this.supabase.client
      .from('media')
      .insert([{
        title: media.title,
        type: media.type,
        category: media.category,
        description: media.description,
        content_url: media.contentUrl,
        embed_url: media.embedUrl,
        author: media.author,
        image_url: imageUrl,
        published_at: new Date().toISOString()
      }]);

    if (error) throw error;
  }

  /**
   * Uploads a file to the specified Supabase Storage bucket and path.
   * @param bucket - The storage bucket name (e.g. 'assets').
   * @param path   - The destination path inside the bucket.
   * @param file   - The File object to upload.
   * @returns The public URL of the uploaded file.
   */
  async uploadFile(bucket: string, path: string, file: File): Promise<string> {
    const { error: uploadError } = await this.supabase.client.storage
      .from(bucket)
      .upload(path, file);

    if (uploadError) throw uploadError;

    const { data } = this.supabase.client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /** Maps a raw Supabase row to a camelCase view model. */
  private toViewModel(row: MediaRow): MediaViewModel {
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      category: row.category,
      description: row.description,
      contentUrl: row.content_url,
      embedUrl: row.embed_url,
      author: row.author,
      imageUrl: row.image_url,
      publishedAt: row.published_at,
      createdAt: row.created_at
    };
  }
}
