import { TestBed } from '@angular/core/testing';
import { MediaService } from './media.service';
import { SupabaseService } from './supabase.service';
import { MediaRow } from '../models/media.model';
import { vi } from 'vitest';

describe('MediaService', () => {
  let service: MediaService;
  let mockQueryBuilder: any;
  let mockData: MediaRow[];
  let mockError: any;

  beforeEach(() => {
    mockData = [
      {
        id: '1',
        title: 'Plainpalais Transformation',
        type: 'article',
        content_url: 'https://example.com/1',
        category: 'Urbanism',
        description: 'Plainpalais changes.',
        embed_url: 'https://youtube.com/embed/1',
        author: 'John Doe',
        image_url: 'https://example.com/img1.jpg',
        published_at: '2026-06-12T10:00:00Z',
        created_at: '2026-06-12T09:00:00Z'
      },
      {
        id: '2',
        title: 'Latin Culinary Geneva',
        type: 'video',
        content_url: 'https://example.com/2',
        category: 'Gastronomy',
        description: 'Best local restaurants.',
        author: 'Jane Smith',
        published_at: '2026-06-11T12:00:00Z',
        created_at: '2026-06-11T11:00:00Z'
      }
    ];
    mockError = null;

    mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((onfulfilled: any) => {
        return Promise.resolve({ data: mockData, error: mockError }).then(onfulfilled);
      })
    };

    const mockSupabase = {
      get client() {
        return {
          from: vi.fn().mockReturnValue(mockQueryBuilder)
        };
      }
    };

    TestBed.configureTestingModule({
      providers: [
        MediaService,
        { provide: SupabaseService, useValue: mockSupabase }
      ]
    });

    service = TestBed.inject(MediaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAll', () => {
    it('should fetch all media and transform snake_case rows to camelCase view models', async () => {
      const result = await service.getAll();

      expect(result.length).toBe(2);

      // Verify item 1 transformation
      expect(result[0].id).toBe('1');
      expect(result[0].title).toBe('Plainpalais Transformation');
      expect(result[0].type).toBe('article');
      expect(result[0].category).toBe('Urbanism');
      expect(result[0].description).toBe('Plainpalais changes.');
      expect(result[0].contentUrl).toBe('https://example.com/1');
      expect(result[0].embedUrl).toBe('https://youtube.com/embed/1');
      expect(result[0].author).toBe('John Doe');
      expect(result[0].imageUrl).toBe('https://example.com/img1.jpg');
      // Should be converted to formatted uppercase date
      expect(result[0].publishedAt).toContain('12 JUN');

      // Verify item 2 transformation (handles missing optional fields gracefully)
      expect(result[1].id).toBe('2');
      expect(result[1].type).toBe('video');
      expect(result[1].category).toBe('Gastronomy');
      expect(result[1].author).toBe('Jane Smith');
      expect(result[1].embedUrl).toBeUndefined();
      expect(result[1].publishedAt).toContain('11 JUN');
    });

    it('should return an empty array and log error when query fails', async () => {
      mockData = [];
      mockError = { message: 'Database query failed' };

      const result = await service.getAll();
      expect(result).toEqual([]);
    });

    it('should return empty array if get client throws unexpected error', async () => {
      // Mock client to throw error
      const mockSupabaseWithThrow = {
        get client() {
          throw new Error('Supabase unavailable');
        }
      };
      
      const faultyService = new MediaService(mockSupabaseWithThrow as any);
      const result = await faultyService.getAll();
      expect(result).toEqual([]);
    });
  });

  describe('getLatest', () => {
    it('should call limit and retrieve latest items', async () => {
      const result = await service.getLatest(6);
      
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(6);
      expect(result.length).toBe(2);
      expect(result[0].title).toBe('Plainpalais Transformation');
    });

    it('should handle errors gracefully by returning empty array', async () => {
      mockData = [];
      mockError = { message: 'Limit query failed' };

      const result = await service.getLatest(6);
      expect(result).toEqual([]);
    });
  });
});
