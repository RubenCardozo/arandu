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
        : ''
    };
  }
}
