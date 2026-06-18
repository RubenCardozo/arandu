import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { JobRow, JobViewModel, NewJob } from '../models/job.model';

/**
 * Service responsible for all job-listing data operations.
 * Wraps Supabase queries and returns camelCase ViewModels to components.
 */
@Injectable({ providedIn: 'root' })
export class JobsService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Fetches all job records ordered by created_at descending.
   * @returns Array of JobViewModel objects with camelCase properties.
   */
  async getAll(): Promise<JobViewModel[]> {
    const { data, error } = await this.supabase.client
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data as JobRow[]).map((row) => this.toViewModel(row));
  }

  /**
   * Creates a new job record.
   * @param job - The new job payload (camelCase).
   */
  async create(job: NewJob): Promise<void> {
    const { error } = await this.supabase.client
      .from('jobs')
      .insert([{
        title: job.title,
        company: job.company,
        description: job.description,
        requirements: job.requirements,
        salary: job.salary,
        job_type: job.jobType,
        contact_email: job.contactEmail,
        contact_phone: job.contactPhone
      }]);

    if (error) throw error;
  }

  /** Maps a raw Supabase row to a camelCase view model. */
  private toViewModel(row: JobRow): JobViewModel {
    return {
      id: row.id,
      title: row.title,
      company: row.company,
      description: row.description,
      requirements: row.requirements,
      salary: row.salary,
      jobType: row.job_type,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      clicks: row.clicks,
      ownerId: row.owner_id,
      createdAt: row.created_at
    };
  }
}
