/**
 * Restaurant model definitions for the Supabase 'restaurants' table.
 */

/** Raw row shape matching the Supabase 'restaurants' table (snake_case). */
export interface RestaurantRow {
  id: string;
  name: string;
  description: string;
  address: string;
  neighborhood: string;
  phone: string;
  website: string;
  instagram: string;
  logo_url: string;
  cover_url: string;
  clicks: number;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

/** View model with camelCase properties for use in Angular templates. */
export interface RestaurantViewModel {
  id: string;
  name: string;
  description: string;
  address: string;
  neighborhood: string;
  phone: string;
  website: string;
  instagram: string;
  logoUrl: string;
  coverUrl: string;
  clicks: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

/** Payload for inserting a new restaurant (no id, no timestamps, no clicks). */
export interface NewRestaurant {
  name: string;
  description: string;
  address: string;
  neighborhood: string;
  phone: string;
  website: string;
  instagram: string;
  logoUrl: string;
}
