/**
 * Job model definitions for the Supabase 'jobs' table.
 */

/** Raw row shape matching the Supabase 'jobs' table (snake_case). */
export interface JobRow {
  id: string;
  title: string;
  company: string;
  description: string;
  requirements: string;
  salary: string;
  job_type: string;
  contact_email: string;
  contact_phone: string;
  clicks: number;
  owner_id: string;
  created_at: string;
}

/** View model with camelCase properties for use in Angular templates. */
export interface JobViewModel {
  id: string;
  title: string;
  company: string;
  description: string;
  requirements: string;
  salary: string;
  jobType: string;
  contactEmail: string;
  contactPhone: string;
  clicks: number;
  ownerId: string;
  createdAt: string;
}

/** Payload for inserting a new job record (no id, no timestamps, no clicks). */
export interface NewJob {
  title: string;
  company: string;
  description: string;
  requirements: string;
  salary: string;
  jobType: string;
  contactEmail: string;
  contactPhone: string;
}
