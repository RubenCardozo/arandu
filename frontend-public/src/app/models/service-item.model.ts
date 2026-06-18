/**
 * Raw row shape from the Supabase `services` table.
 * All fields use snake_case to match the database schema.
 */
export interface ServiceItemRow {
  id: string;
  title: string;
  category?: string;
  description?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  image_url?: string;
  clicks?: number;
  owner_id?: string;
  created_at?: string;
}

/**
 * View-model used by Angular components.
 * All fields use camelCase following TypeScript conventions.
 */
export interface ServiceItemViewModel {
  id: string;
  title: string;
  category: string;
  description: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  imageUrl?: string;
  clicks: number;
  ownerId: string;
  createdAt: string;
}
