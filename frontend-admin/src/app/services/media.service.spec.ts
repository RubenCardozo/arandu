import { TestBed } from '@angular/core/testing';
import { MediaService } from './media.service';
import { SupabaseService } from './supabase.service';
import { MediaRow, NewMedia } from '../models/media.model';
import { vi } from 'vitest';

describe('MediaService', () => {
  let service: MediaService;
  let mockQueryBuilder: any;
  let mockStorageBuilder: any;
  let mockData: MediaRow[];
  let mockError: any;
  let mockUploadError: any;

  beforeEach(() => {
    mockData = [
      {
        id: '1',
        title: 'Plainpalais Update',
        type: 'article',
        category: 'Urbanism',
        description: 'New structures in Geneva.',
        content_url: 'https://example.com/1',
        embed_url: 'https://youtube.com/embed/1',
        author: 'Admin User',
        image_url: 'https://example.com/logo.png',
        published_at: '2026-06-18T10:00:00Z',
        created_at: '2026-06-18T09:00:00Z'
      }
    ];
    mockError = null;
    mockUploadError = null;

    mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockImplementation((payload: any) => {
        if (mockError) {
          return Promise.resolve({ data: null, error: mockError });
        }
        return Promise.resolve({ data: payload, error: null });
      }),
      then: vi.fn().mockImplementation((onfulfilled: any) => {
        return Promise.resolve({ data: mockData, error: mockError }).then(onfulfilled);
      })
    };

    mockStorageBuilder = {
      upload: vi.fn().mockImplementation((path: string, file: File) => {
        if (mockUploadError) {
          return Promise.resolve({ data: null, error: mockUploadError });
        }
        return Promise.resolve({ data: { path }, error: null });
      }),
      getPublicUrl: vi.fn().mockImplementation((path: string) => {
        return { data: { publicUrl: `https://supabase.co/storage/v1/object/public/assets/${path}` } };
      })
    };

    const mockSupabase = {
      get client() {
        return {
          from: vi.fn().mockReturnValue(mockQueryBuilder),
          storage: {
            from: vi.fn().mockReturnValue(mockStorageBuilder)
          }
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
    it('should fetch articles and map raw snake_case properties to camelCase ViewModels', async () => {
      const result = await service.getAll();

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('1');
      expect(result[0].title).toBe('Plainpalais Update');
      expect(result[0].contentUrl).toBe('https://example.com/1');
      expect(result[0].embedUrl).toBe('https://youtube.com/embed/1');
      expect(result[0].imageUrl).toBe('https://example.com/logo.png');
      expect(result[0].publishedAt).toBe('2026-06-18T10:00:00Z');
      expect(result[0].createdAt).toBe('2026-06-18T09:00:00Z');
    });

    it('should throw error when database query fails', async () => {
      mockError = new Error('Database query failure');
      
      await expect(service.getAll()).rejects.toThrow('Database query failure');
    });
  });

  describe('uploadFile', () => {
    it('should upload file to Supabase Storage and return the public URL', async () => {
      const mockFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
      
      const publicUrl = await service.uploadFile('assets', 'editorial/test.png', mockFile);
      
      expect(mockStorageBuilder.upload).toHaveBeenCalledWith('editorial/test.png', mockFile);
      expect(publicUrl).toBe('https://supabase.co/storage/v1/object/public/assets/editorial/test.png');
    });

    it('should throw error when upload fails', async () => {
      const mockFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
      mockUploadError = new Error('Upload error');

      await expect(service.uploadFile('assets', 'editorial/test.png', mockFile)).rejects.toThrow('Upload error');
    });
  });

  describe('create', () => {
    it('should insert new record into database without file upload when no file is provided', async () => {
      const payload: NewMedia = {
        title: 'New Headline',
        type: 'article',
        category: 'Politics',
        description: 'Global politics.',
        contentUrl: 'https://example.com/new',
        embedUrl: '',
        author: 'Editor',
        imageUrl: 'https://example.com/default.jpg'
      };

      await service.create(payload);

      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      const calls = mockQueryBuilder.insert.mock.calls;
      const insertedItem = calls[0][0][0];
      
      expect(insertedItem.title).toBe('New Headline');
      expect(insertedItem.image_url).toBe('https://example.com/default.jpg');
      expect(insertedItem.published_at).toBeDefined();
    });

    it('should upload image file and insert record with new image URL when file is provided', async () => {
      const payload: NewMedia = {
        title: 'New Headline with image',
        type: 'article',
        category: 'Politics',
        description: 'Global politics.',
        contentUrl: 'https://example.com/new',
        embedUrl: '',
        author: 'Editor',
        imageUrl: ''
      };

      const mockFile = new File(['dummy content'], 'photo.jpg', { type: 'image/jpeg' });
      
      await service.create(payload, mockFile);

      expect(mockStorageBuilder.upload).toHaveBeenCalled();
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      
      const insertedItem = mockQueryBuilder.insert.mock.calls[0][0][0];
      expect(insertedItem.image_url).toContain('https://supabase.co/storage/v1/object/public/assets/editorial/');
    });
  });
});
