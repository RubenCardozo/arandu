/**
 * Service item model definitions for the Supabase 'services' table.
 */

/** Raw row shape matching the Supabase 'services' table (snake_case). */
export interface ServiceItemRow {
  id: string;
  title: string;
  category: string;
  description: string;
  contact_name: string;
  phone: string;
  email: string;
  website: string;
  image_url: string;
  clicks: number;
  owner_id: string;
  created_at: string;
}

/** View model with camelCase properties for use in Angular templates. */
export interface ServiceItemViewModel {
  id: string;
  title: string;
  category: string;
  description: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  imageUrl: string;
  clicks: number;
  ownerId: string;
  createdAt: string;
}

/** Payload for inserting a new service record (no id, no timestamps, no clicks). */
export interface NewServiceItem {
  title: string;
  category: string;
  description: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  imageUrl: string;
}
