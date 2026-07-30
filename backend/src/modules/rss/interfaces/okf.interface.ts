export interface OkfEntity {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export interface OkfMetadata {
  title?: string;
  author?: string;
  pubDate?: string;
  imageUrls?: string[];
  featured?: boolean;
  reviewed?: boolean;
  [key: string]: any;
}

export interface OkfFormat {
  type: string;
  contenido: string; // Markdown body content
  procedencia: string; // Original URL or source identifier
  metadatos: OkfMetadata; // Key-value pairs for frontmatter
  entidades: OkfEntity[]; // Extracted entities
}
