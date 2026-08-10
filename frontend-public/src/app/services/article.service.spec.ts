import { ArticleService } from './article.service';
import { ArticleRow } from '../models/article.model';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('ArticleService', () => {
  let service: ArticleService;
  let mockQueryBuilder: any;
  let mockData: ArticleRow[];
  let mockError: any;
  let mockSupabaseClient: any;

  beforeEach(() => {
    mockData = [
      {
        id: 'art-1',
        title: 'Featured Hero Article',
        subtitle: 'Hero Subtitle',
        author: 'Jane Doe',
        author_avatar: 'https://example.com/avatar.jpg',
        source_name: 'Arandu',
        source_url: 'https://arandu.ch/art-1',
        category: 'Culture',
        status: 'published',
        published_at: '2026-08-09T10:00:00Z',
        featured: true,
        order_priority: 10,
        cover_image: 'https://example.com/cover1.jpg',
        content: 'Content of featured hero article.',
        created_at: '2026-08-09T09:00:00Z',
        updated_at: '2026-08-09T09:00:00Z',
      },
      {
        id: 'art-2',
        title: 'Standard Article',
        subtitle: 'Standard Subtitle',
        author: 'John Smith',
        author_avatar: null,
        source_name: null,
        source_url: null,
        category: 'News',
        status: 'published',
        published_at: '2026-08-08T10:00:00Z',
        featured: false,
        order_priority: 0,
        cover_image: null,
        content: 'Content of standard article.',
        created_at: '2026-08-08T09:00:00Z',
        updated_at: '2026-08-08T09:00:00Z',
      },
    ];
    mockError = null;

    mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => Promise.resolve({ data: mockData[0], error: mockError })),
      then: vi.fn().mockImplementation((onfulfilled: any) => {
        return Promise.resolve({ data: mockData, error: mockError }).then(onfulfilled);
      }),
    };

    mockSupabaseClient = {
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    };

    service = new ArticleService(mockSupabaseClient as any);
  });

  it('should be created and expose initialized signals', () => {
    expect(service).toBeTruthy();
    expect(service.articles()).toEqual([]);
    expect(service.featuredArticle()).toBeNull();
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
    expect(service.client).toBe(mockSupabaseClient);
  });

  describe('loadArticles', () => {
    it('should fetch published articles sorted by date and update reactive signals', async () => {
      const result = await service.loadArticles();

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'published');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('published_at', { ascending: false, nullsFirst: false });
      expect(result.length).toBe(2);
      expect(service.articles().length).toBe(2);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();

      expect(result[0].id).toBe('art-1');
      expect(result[0].title).toBe('Featured Hero Article');
      expect(result[0].featured).toBe(true);
      expect(result[0].orderPriority).toBe(10);

      expect(result[1].id).toBe('art-2');
      expect(result[1].featured).toBe(false);
    });

    it('should handle Supabase load errors cleanly using signals', async () => {
      mockError = { message: 'Failed to connect to Supabase' };

      const result = await service.loadArticles();

      expect(result).toEqual([]);
      expect(service.articles()).toEqual([]);
      expect(service.error()).toBe('Failed to connect to Supabase');
      expect(service.loading()).toBe(false);
    });
  });

  describe('loadFeatured', () => {
    it('should isolate single main article marked as featured: true with highest order_priority', async () => {
      const featuredMock = [mockData[0]];
      mockQueryBuilder.then = vi.fn().mockImplementation((onfulfilled: any) => {
        return Promise.resolve({ data: featuredMock, error: mockError }).then(onfulfilled);
      });

      const featured = await service.loadFeatured();

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'published');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('featured', true);
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('order_priority', { ascending: false, nullsFirst: false });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(1);

      expect(featured).not.toBeNull();
      expect(featured?.id).toBe('art-1');
      expect(featured?.featured).toBe(true);
      expect(service.featuredArticle()?.id).toBe('art-1');
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('should return null if no featured article is found', async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((onfulfilled: any) => {
        return Promise.resolve({ data: [], error: null }).then(onfulfilled);
      });

      const featured = await service.loadFeatured();

      expect(featured).toBeNull();
      expect(service.featuredArticle()).toBeNull();
      expect(service.loading()).toBe(false);
    });
  });

  describe('featuredArticles signal & getFeaturedArticles', () => {
    it('should compute featured articles sorted by priority and date', async () => {
      await service.loadArticles();

      const featured = service.featuredArticles();
      expect(featured.length).toBe(1);
      expect(featured[0].id).toBe('art-1');
      expect(featured[0].featured).toBe(true);
    });

    it('should fetch articles automatically if getFeaturedArticles is called when state is empty', async () => {
      const heroFeatured = await service.getFeaturedArticles(3);

      expect(heroFeatured.length).toBe(1);
      expect(heroFeatured[0].title).toBe('Featured Hero Article');
    });
  });

  describe('filterByCategory', () => {
    it('should filter articles by category name', async () => {
      await service.loadArticles();

      const cultureArticles = service.filterByCategory('Culture');
      expect(cultureArticles.length).toBe(1);
      expect(cultureArticles[0].id).toBe('art-1');
    });
  });
});

