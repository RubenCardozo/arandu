import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ServiceItemRow, ServiceItemViewModel } from '../models/service-item.model';

/**
 * Service responsible for fetching and transforming service catalog entries from Supabase.
 * Encapsulates all service-catalog-related database logic and maps DB rows to view models.
 */
@Injectable({ providedIn: 'root' })
export class ServicesCatalogService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Creates a new service record. Optionally uploads an image file first.
   */
  async create(service: any, file?: File): Promise<void> {
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
        image_url: imageUrl,
        owner_id: service.ownerId,
        gallery_urls: service.galleryUrls || [],
        landing_template: service.landingTemplate ?? null,
        landing_config: service.landingConfig ?? {}
      }]);

    if (error) throw error;
  }

  /**
   * Uploads a file to the specified Supabase Storage bucket and path.
   */
  async uploadFile(bucket: string, path: string, file: File): Promise<string> {
    const { error: uploadError } = await this.supabase.client.storage
      .from(bucket)
      .upload(path, file);

    if (uploadError) throw uploadError;

    const { data } = this.supabase.client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Fetches all services ordered by created_at DESC.
   * Maps DB rows (snake_case) to view models (camelCase).
   * @returns Array of ServiceItemViewModel, or empty array on error.
   */
  async getAll(): Promise<ServiceItemViewModel[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('ServicesCatalogService.getAll – Supabase query error:', error);
        return [];
      }

      return (data as ServiceItemRow[] | null)?.map(row => this.toViewModel(row)) ?? [];
    } catch (err) {
      console.error('ServicesCatalogService.getAll – unexpected error:', err);
      return [];
    }
  }

  /**
   * Searches services by title or description matching the search query (case-insensitive).
   * @param query Search string.
   */
  async search(query: string): Promise<ServiceItemViewModel[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('services')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('ServicesCatalogService.search – Supabase query error:', error);
        return [];
      }

      return (data as ServiceItemRow[] | null)?.map(row => this.toViewModel(row)) ?? [];
    } catch (err) {
      console.error('ServicesCatalogService.search – unexpected error:', err);
      return [];
    }
  }

  /**
   * Transforms a raw Supabase row into a camelCase view model.
   * Provides sensible defaults for optional fields.
   */
  private toViewModel(row: ServiceItemRow): ServiceItemViewModel {
    return {
      id: row.id,
      title: row.title,
      category: row.category ?? '',
      description: row.description ?? '',
      contactName: row.contact_name ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      website: row.website ?? '',
      imageUrl: row.image_url,
      clicks: row.clicks ?? 0,
      ownerId: row.owner_id ?? '',
      createdAt: row.created_at
        ? new Date(row.created_at)
            .toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
            .toUpperCase()
        : '',
      galleryUrls: row.gallery_urls ?? [],
      landingTemplate: row.landing_template ?? undefined,
      landingConfig: row.landing_config ?? {}
    };
  }
}
