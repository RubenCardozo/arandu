/**
 * Media model definitions for the Supabase 'media' table.
 * Covers articles, videos, and podcasts.
 */

/** Raw row shape matching the Supabase 'media' table (snake_case). */
export interface MediaRow {
  id: string;
  title: string;
  type: string;
  category: string;
  description: string;
  content_url: string;
  embed_url: string;
  author: string;
  image_url: string;
  published_at: string;
  created_at: string;
}

/** View model with camelCase properties for use in Angular templates. */
export interface MediaViewModel {
  id: string;
  title: string;
  type: string;
  category: string;
  description: string;
  contentUrl: string;
  embedUrl: string;
  author: string;
  imageUrl: string;
  publishedAt: string;
  createdAt: string;
}

/** Payload for inserting a new media record (no id, no timestamps). */
export interface NewMedia {
  title: string;
  type: string;
  category: string;
  description: string;
  contentUrl: string;
  embedUrl: string;
  author: string;
  imageUrl: string;
}
