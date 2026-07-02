import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { JobRow, JobViewModel } from '../models/job.model';

/**
 * Service responsible for fetching and transforming job listings from Supabase.
 * Encapsulates all job-related database logic and maps DB rows to view models.
 */
@Injectable({ providedIn: 'root' })
export class JobsService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Creates a new job listing in Supabase.
   */
  async create(jobData: {
    title: string;
    company: string;
    description: string;
    requirements: string;
    salary: string;
    jobType: string;
    contactEmail: string;
    contactPhone: string;
    ownerId: string;
  }): Promise<{ data?: any; error?: string }> {
    try {
      const { data, error } = await this.supabase.client
        .from('jobs')
        .insert([{
          title: jobData.title,
          company: jobData.company,
          description: jobData.description,
          requirements: jobData.requirements,
          salary: jobData.salary,
          job_type: jobData.jobType,
          contact_email: jobData.contactEmail,
          contact_phone: jobData.contactPhone,
          owner_id: jobData.ownerId
        }])
        .select();

      if (error) {
        console.error('JobsService.create – Supabase insert error:', error);
        return { error: error.message };
      }

      return { data };
    } catch (err: any) {
      console.error('JobsService.create – unexpected error:', err);
      return { error: err.message || 'An unexpected error occurred.' };
    }
  }

  /**
   * Fetches all jobs ordered by created_at DESC.
   * Maps DB rows (snake_case) to view models (camelCase).
   * @returns Array of JobViewModel, or empty array on error.
   */
  async getAll(): Promise<JobViewModel[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('JobsService.getAll – Supabase query error:', error);
        return [];
      }

      return (data as JobRow[] | null)?.map(row => this.toViewModel(row)) ?? [];
    } catch (err) {
      console.error('JobsService.getAll – unexpected error:', err);
      return [];
    }
  }

  /**
   * Searches jobs by title or description matching the search query (case-insensitive).
   * @param query Search string.
   */
  async search(query: string): Promise<JobViewModel[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('jobs')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('JobsService.search – Supabase query error:', error);
        return [];
      }

      return (data as JobRow[] | null)?.map(row => this.toViewModel(row)) ?? [];
    } catch (err) {
      console.error('JobsService.search – unexpected error:', err);
      return [];
    }
  }

  /**
   * Transforms a raw Supabase row into a camelCase view model.
   * Provides sensible defaults for optional fields.
   */
  private toViewModel(row: JobRow): JobViewModel {
    return {
      id: row.id,
      title: row.title,
      company: row.company ?? '',
      description: row.description ?? '',
      requirements: row.requirements ?? '',
      salary: row.salary ?? '',
      jobType: row.job_type ?? '',
      contactEmail: row.contact_email ?? '',
      contactPhone: row.contact_phone ?? '',
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
