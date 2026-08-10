import { describe, it, jest, beforeEach, expect } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SyncService } from './sync.service';
import { SupabaseService } from '../../common/supabase.service';

describe('SyncService', () => {
  let service: SyncService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: any) => {
      if (key === 'OBSIDIAN_VAULT_PATH') return '/mock/path';
      return null;
    }),
  };

  const mockUpsert = jest.fn<any>().mockResolvedValue({ data: [] as any[], error: null });

  const mockSupabaseClient = {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn<any>().mockResolvedValue({ data: [] as any[], error: null }),
        }),
      }),
      insert: jest.fn<any>().mockResolvedValue({ data: [] as any[], error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn<any>().mockResolvedValue({ data: [] as any[], error: null }),
      }),
      upsert: mockUpsert,
    }),
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue(mockSupabaseClient),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should correctly parse all 13 frontmatter fields and markdown content', () => {
    const markdownContent = `---
id: "art-123"
title: "Article Title Test"
subtitle: "Article Subtitle Test"
author: "Jane Doe"
author_avatar: "https://example.com/avatar.jpg"
source_name: "Tech News"
source_url: "https://example.com/news/123"
category: "technology"
status: "published"
published_at: "2026-08-09T10:00:00Z"
featured: true
order_priority: 5
cover_image: "https://example.com/cover.jpg"
---
# Main Article Body Title

This is the main markdown content of the article.
It contains multiple paragraphs and details.`;

    const parsed = service.parseArticleMarkdown(markdownContent, 'test-article.md');

    expect(parsed).toEqual({
      id: 'art-123',
      title: 'Article Title Test',
      subtitle: 'Article Subtitle Test',
      author: 'Jane Doe',
      author_avatar: 'https://example.com/avatar.jpg',
      source_name: 'Tech News',
      source_url: 'https://example.com/news/123',
      category: 'technology',
      status: 'published',
      published_at: '2026-08-09T10:00:00Z',
      featured: true,
      order_priority: 5,
      cover_image: 'https://example.com/cover.jpg',
      content: `# Main Article Body Title\n\nThis is the main markdown content of the article.\nIt contains multiple paragraphs and details.`,
    });
  });

  it('should generate a slug id from title when id is not provided in frontmatter', () => {
    const markdownContent = `---
title: "Sample Article Title for Slug!"
category: "technology"
---
# Main Content

Sample body text.`;

    const parsed = service.parseArticleMarkdown(markdownContent, 'sample.md');
    expect(parsed.id).toBe('sample-article-title-for-slug');
  });

  it('should correctly parse YAML frontmatter, H1 title, block-structured description, mapped type, and contentUrl for Obsidian OKF notes', () => {
    const markdownContent = `---
type: "source"
resource: "https://example.com/article-source"
author: "Geneva Reporter"
category: "cultura"
---
# Obras en la rue de Carouge: el tranvía 12 interrumpido durante el verano

Las obras de renovación de las vías del tranvía comenzarán este lunes.

## Impacto en el tráfico

El tráfico se verá interrumpido en varios sectores:
* Línea 12 desviada por Plainpalais
* Autobuses de sustitución puestos en servicio

Se aconseja a los usuarios planificar sus desplazamientos.`;

    const parsed = service.parseMarkdownOKF(markdownContent);

    expect(parsed.title).toBe('Obras en la rue de Carouge: el tranvía 12 interrumpido durante el verano');
    expect(parsed.type).toBe('article');
    expect(parsed.contentUrl).toBe('https://example.com/article-source');

    const blocks = JSON.parse(parsed.description);
    expect(blocks).toEqual([
      {
        type: 'text',
        content: 'Las obras de renovación de las vías del tranvía comenzarán este lunes.',
      },
      {
        type: 'subtitle',
        content: 'Impacto en el tráfico',
      },
      {
        type: 'text',
        content: 'El tráfico se verá interrumpido en varios sectores:',
      },
      {
        type: 'text',
        content: '• Línea 12 desviada por Plainpalais',
      },
      {
        type: 'text',
        content: '• Autobuses de sustitución puestos en servicio',
      },
      {
        type: 'text',
        content: 'Se aconseja a los usuarios planificar sus desplazamientos.',
      },
    ]);
  });
});
