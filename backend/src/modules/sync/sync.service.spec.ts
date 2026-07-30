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
      upsert: jest.fn().mockResolvedValue({ data: [], error: null }),
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

  it('should correctly parse YAML frontmatter and Markdown body using Regex', () => {
    const markdownContent = `---
title: "Test OKF Article"
procedencia: "https://example.com/article"
resource: "https://example.com/article"
contenido: "Custom OKF content"
---
# Main Heading

This is the body content of the article.`;

    const { metadata, body } = service.parseMarkdownOKF(markdownContent);

    expect(metadata.title).toBe('Test OKF Article');
    expect(metadata.procedencia).toBe('https://example.com/article');
    expect(metadata.resource).toBe('https://example.com/article');
    expect(body).toContain('# Main Heading');
    expect(body).toContain('This is the body content of the article.');
  });
});
