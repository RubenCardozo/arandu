/**
 * Raw row shape from the Supabase `media` table.
 * All fields use snake_case to match the database schema.
 */
export interface MediaRow {
  id: string;
  title: string;
  type: 'article' | 'video' | 'podcast';
  content_url: string;
  category?: string;
  description?: string;
  embed_url?: string;
  author?: string;
  image_url?: string;
  published_at?: string;
  created_at?: string;
}

/**
 * View-model used by Angular components.
 * All fields use camelCase following TypeScript conventions.
 */
export interface MediaViewModel {
  id: string;
  title: string;
  type: 'article' | 'video' | 'podcast';
  category: string;
  description: string;
  contentUrl: string;
  embedUrl?: string;
  author: string;
  imageUrl?: string;
  publishedAt: string;
}
