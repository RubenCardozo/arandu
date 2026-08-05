import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SyncService } from './sync.service';
import { SupabaseService } from '../../common/supabase.service';

describe('SyncService', () => {
  let service: SyncService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'OBSIDIAN_VAULT_PATH') return '/mock/path';
      return null;
    }),
  };

  const mockSupabaseClient = {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      insert: jest.fn().mockResolvedValue({ data: [], error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue(mockSupabaseClient),
  };

  beforeEach(async () => {
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

  it('should correctly parse YAML frontmatter, H1 title, block-structured description, mapped type, and contentUrl', () => {
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
