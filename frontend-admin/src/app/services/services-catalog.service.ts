import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ServiceItemRow, ServiceItemViewModel, NewServiceItem } from '../models/service-item.model';

/**
 * Service responsible for all service-catalog data operations.
 * Wraps Supabase queries and file uploads, returning camelCase ViewModels to components.
 */
@Injectable({ providedIn: 'root' })
export class ServicesCatalogService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Fetches all service records ordered by created_at descending.
   * @returns Array of ServiceItemViewModel objects with camelCase properties.
   */
  async getAll(): Promise<ServiceItemViewModel[]> {
    const { data, error } = await this.supabase.client
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data as ServiceItemRow[]).map((row) => this.toViewModel(row));
  }

  /**
   * Creates a new service record. Optionally uploads an image file first.
   * @param service - The new service payload (camelCase).
   * @param file    - Optional image file to upload to Supabase Storage.
   */
  async create(service: NewServiceItem, file?: File): Promise<void> {
    let imageUrl = service.imageUrl || '';

    if (file) {
      const ext = file.name.split('.').pop();
      const path = `services/${Math.random()}.${ext}`;
      imageUrl = await this.uploadFile('assets', path, file);
    }

    const { error } = await this.supabase.client
      .from('services')
      .insert([{
        title: service.title,
        category: service.category,
        description: service.description,
        contact_name: service.contactName,
        phone: service.phone,
        email: service.email,
        website: service.website,
        image_url: imageUrl
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
  private toViewModel(row: ServiceItemRow): ServiceItemViewModel {
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      description: row.description,
      contactName: row.contact_name,
      phone: row.phone,
      email: row.email,
      website: row.website,
      imageUrl: row.image_url,
      clicks: row.clicks,
      ownerId: row.owner_id,
      createdAt: row.created_at
    };
  }
}
