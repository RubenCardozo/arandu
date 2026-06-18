/**
 * Raw row shape from the Supabase `restaurants` table.
 * All fields use snake_case to match the database schema.
 */
export interface RestaurantRow {
  id: string;
  name: string;
  description?: string;
  address?: string;
  neighborhood?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  logo_url?: string;
  cover_url?: string;
  clicks?: number;
  owner_id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * View-model used by Angular components.
 * All fields use camelCase following TypeScript conventions.
 */
export interface RestaurantViewModel {
  id: string;
  name: string;
  description: string;
  address: string;
  neighborhood: string;
  phone: string;
  website: string;
  instagram: string;
  logoUrl?: string;
  coverUrl?: string;
  clicks: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}
