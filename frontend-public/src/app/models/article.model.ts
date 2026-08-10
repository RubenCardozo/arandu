/**
 * Represents a raw row record from the Supabase `articles` database table.
 */
export interface ArticleRow {
  id: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  author_avatar: string | null;
  source_name: string | null;
  source_url: string | null;
  category: string | null;
  status: string | null;
  published_at: string | null;
  featured: boolean | null;
  order_priority: number | null;
  cover_image: string | null;
  content: string;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Strongly-typed view model consumed by Angular components.
 */
export interface ArticleViewModel {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  authorAvatar: string;
  sourceName: string;
  sourceUrl: string;
  category: string;
  status: string;
  publishedAt: string;
  featured: boolean;
  orderPriority: number;
  coverImage: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}
