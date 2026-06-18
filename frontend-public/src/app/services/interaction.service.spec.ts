import { TestBed } from '@angular/core/testing';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { InteractionService } from './interaction.service';
import { SupabaseService } from './supabase.service';

describe('InteractionService', () => {
  let service: InteractionService;
  let supabaseServiceMock: any;
  let fromSpy: any;
  let selectSpy: any;
  let eqSpy: any;
  let orderSpy: any;
  let insertSpy: any;

  beforeEach(() => {
    const mockQueryBuilder: any = {};

    selectSpy = vi.fn().mockReturnValue(mockQueryBuilder);
    eqSpy = vi.fn().mockReturnValue(mockQueryBuilder);
    orderSpy = vi.fn().mockReturnValue(mockQueryBuilder);
    insertSpy = vi.fn().mockResolvedValue({ error: null });

    mockQueryBuilder.select = selectSpy;
    mockQueryBuilder.eq = eqSpy;
    mockQueryBuilder.order = orderSpy;
    mockQueryBuilder.insert = insertSpy;

    fromSpy = vi.fn().mockReturnValue(mockQueryBuilder);

    supabaseServiceMock = {
      client: {
        from: fromSpy
      }
    };

    TestBed.configureTestingModule({
      providers: [
        InteractionService,
        { provide: SupabaseService, useValue: supabaseServiceMock }
      ]
    });

    service = TestBed.inject(InteractionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getComments', () => {
    it('should query comments from supabase and format the result', async () => {
      const mockComments = [
        {
          id: '1',
          entity_id: 'entity-123',
          entity_type: 'media',
          author_name: 'Ruben',
          content: 'Excellent post!',
          created_at: '2026-06-18T10:00:00.000Z'
        }
      ];

      orderSpy.mockResolvedValue({ data: mockComments, error: null });

      const comments = await service.getComments('entity-123');

      expect(fromSpy).toHaveBeenCalledWith('comments');
      expect(selectSpy).toHaveBeenCalledWith('*');
      expect(eqSpy).toHaveBeenCalledWith('entity_id', 'entity-123');
      expect(orderSpy).toHaveBeenCalledWith('created_at', { ascending: true });
      expect(comments.length).toBe(1);
      expect(comments[0].authorName).toBe('Ruben');
      expect(comments[0].content).toBe('Excellent post!');
    });

    it('should return an empty array on error', async () => {
      orderSpy.mockResolvedValue({ data: null, error: { message: 'Database error' } });
      const comments = await service.getComments('entity-123');
      expect(comments).toEqual([]);
    });
  });

  describe('addComment', () => {
    it('should insert comment into supabase', async () => {
      insertSpy.mockResolvedValue({ error: null });
      await service.addComment('entity-123', 'media', 'Juan', 'Nice job!');
      expect(fromSpy).toHaveBeenCalledWith('comments');
      expect(insertSpy).toHaveBeenCalledWith([{
        entity_id: 'entity-123',
        entity_type: 'media',
        author_name: 'Juan',
        content: 'Nice job!'
      }]);
    });
  });

  describe('getRatingStats', () => {
    it('should calculate avgStars and count totalLikes', async () => {
      const mockRatings = [
        { stars: 5, is_like: false },
        { stars: 4, is_like: false },
        { stars: null, is_like: true },
        { stars: null, is_like: true }
      ];

      eqSpy.mockResolvedValue({ data: mockRatings, error: null });

      const stats = await service.getRatingStats('entity-123');

      expect(fromSpy).toHaveBeenCalledWith('ratings');
      expect(selectSpy).toHaveBeenCalledWith('stars, is_like');
      expect(eqSpy).toHaveBeenCalledWith('entity_id', 'entity-123');
      expect(stats.avgStars).toBe(4.5);
      expect(stats.totalLikes).toBe(2);
    });
  });

  describe('rate', () => {
    it('should insert rating stars into supabase', async () => {
      insertSpy.mockResolvedValue({ error: null });
      await service.rate('entity-123', 'media', 5);
      expect(fromSpy).toHaveBeenCalledWith('ratings');
      expect(insertSpy).toHaveBeenCalledWith([{
        entity_id: 'entity-123',
        entity_type: 'media',
        stars: 5,
        is_like: false
      }]);
    });
  });

  describe('like', () => {
    it('should insert like into supabase', async () => {
      insertSpy.mockResolvedValue({ error: null });
      await service.like('entity-123', 'media');
      expect(fromSpy).toHaveBeenCalledWith('ratings');
      expect(insertSpy).toHaveBeenCalledWith([{
        entity_id: 'entity-123',
        entity_type: 'media',
        is_like: true
      }]);
    });
  });
});
