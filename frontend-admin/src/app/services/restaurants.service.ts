import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { RestaurantRow, RestaurantViewModel, NewRestaurant } from '../models/restaurant.model';

/**
 * Service responsible for all restaurant/directory data operations.
 * Wraps Supabase queries and file uploads, returning camelCase ViewModels to components.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantsService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Fetches all restaurant records ordered by created_at descending.
   * @returns Array of RestaurantViewModel objects with camelCase properties.
   */
  async getAll(): Promise<RestaurantViewModel[]> {
    const { data, error } = await this.supabase.client
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data as RestaurantRow[]).map((row) => this.toViewModel(row));
  }

  /**
   * Creates a new restaurant record. Optionally uploads a logo file first.
   * @param restaurant - The new restaurant payload (camelCase).
   * @param file       - Optional logo file to upload to Supabase Storage.
   */
  async create(restaurant: NewRestaurant, file?: File): Promise<void> {
    let logoUrl = restaurant.logoUrl || '';

    if (file) {
      const ext = file.name.split('.').pop();
      const path = `logos/${Math.random()}.${ext}`;
      logoUrl = await this.uploadFile('assets', path, file);
    }

    const { error } = await this.supabase.client
      .from('restaurants')
      .insert([{
        name: restaurant.name,
        description: restaurant.description,
        address: restaurant.address,
        neighborhood: restaurant.neighborhood,
        phone: restaurant.phone,
        website: restaurant.website,
        instagram: restaurant.instagram,
        logo_url: logoUrl
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
  private toViewModel(row: RestaurantRow): RestaurantViewModel {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      address: row.address,
      neighborhood: row.neighborhood,
      phone: row.phone,
      website: row.website,
      instagram: row.instagram,
      logoUrl: row.logo_url,
      coverUrl: row.cover_url,
      clicks: row.clicks,
      ownerId: row.owner_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
