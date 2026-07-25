export interface OkfEntity {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export interface OkfFormat {
  type: string;
  contenido: string; // Markdown body content
  procedencia: string; // Original URL or source identifier
  metadatos: Record<string, any>; // Key-value pairs for frontmatter
  entidades: OkfEntity[]; // Extracted entities
}
