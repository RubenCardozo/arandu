/**
 * Raw row shape from the Supabase `jobs` table.
 * All fields use snake_case to match the database schema.
 */
export interface JobRow {
  id: string;
  title: string;
  company?: string;
  description?: string;
  requirements?: string;
  salary?: string;
  job_type?: string;
  contact_email?: string;
  contact_phone?: string;
  clicks?: number;
  owner_id?: string;
  created_at?: string;
}

/**
 * View-model used by Angular components.
 * All fields use camelCase following TypeScript conventions.
 */
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
