import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { BehaviorSubject, of } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

import { EditorialComponent } from './editorial.component';
import { MediaService } from '../../services/media.service';
import { InteractionService } from '../../services/interaction.service';
import { AuthService } from '../../services/auth.service';

describe('EditorialComponent', () => {
  let component: EditorialComponent;
  let fixture: ComponentFixture<EditorialComponent>;
  let mediaServiceMock: any;
  let interactionServiceMock: any;
  let authServiceMock: any;
  let currentUserSubject: BehaviorSubject<User | null>;

  const mockUser: any = {
    id: 'user-123',
    email: 'user@test.com',
    user_metadata: { full_name: 'Test User' }
  };

  const mockMedia = [
    {
      id: 'art1',
      title: 'El Impacto Cultural del Cine Latino en Ginebra',
      type: 'article',
      category: 'Cultura',
      description: 'Cine Latino.',
      contentUrl: 'https://arandu.ch',
      author: 'Carlos Mendoza',
      imageUrl: 'https://example.com/img1.jpg',
      publishedAt: '12 JUN, 2026',
      clicks: 12
    }
  ];

  beforeEach(async () => {
    currentUserSubject = new BehaviorSubject<User | null>(null);

    mediaServiceMock = {
      getAll: vi.fn().mockResolvedValue(mockMedia),
      search: vi.fn().mockResolvedValue(mockMedia)
    };

    interactionServiceMock = {
      getRatingStats: vi.fn().mockResolvedValue({ avgStars: 4.5, totalLikes: 10 }),
      incrementClicks: vi.fn().mockResolvedValue(13),
      getComments: vi.fn().mockResolvedValue([{ id: 'c1', author: 'User', content: 'Nice!' }]),
      like: vi.fn().mockResolvedValue({}),
      rate: vi.fn().mockResolvedValue({}),
      addComment: vi.fn().mockResolvedValue({}),
      isFavorite: vi.fn().mockResolvedValue(false)
    };

    authServiceMock = {
      currentUser$: currentUserSubject.asObservable()
    };

    await TestBed.configureTestingModule({
      imports: [EditorialComponent],
      providers: [
        provideRouter([]),
        { provide: MediaService, useValue: mediaServiceMock },
        { provide: InteractionService, useValue: interactionServiceMock },
        { provide: AuthService, useValue: authServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditorialComponent);
    component = fixture.componentInstance;
  });

  const waitForInit = async () => {
    fixture.detectChanges();
    while (component.loading) {
      await new Promise(resolve => setTimeout(resolve, 2));
    }
  };

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load articles with rating stats on init', async () => {
    await waitForInit();

    expect(mediaServiceMock.getAll).toHaveBeenCalled();
    expect(interactionServiceMock.getRatingStats).toHaveBeenCalledWith('art1');
    expect(component.articulos.length).toBe(1);
    expect(component.articulos[0].totalLikes).toBe(10);
    expect(component.articulos[0].avgStars).toBe(4.5);
  });

  describe('Read article actions', () => {
    it('should open article modal immediately and fetch comments/ratings in background', async () => {
      await waitForInit();

      const art = component.articulos[0];
      component.onReadArticle(art);

      expect(component.modalVisible).toBe(true);
      expect(component.selectedArticulo).toBe(art);
      expect(interactionServiceMock.incrementClicks).toHaveBeenCalledWith('art1', 'media', 12);

      // Verify comments and stats fetched in background
      await fixture.whenStable();
      // wait a tiny bit for background promise resolution
      await new Promise(resolve => setTimeout(resolve, 5));
      expect(interactionServiceMock.getComments).toHaveBeenCalledWith('art1');
      expect(component.selectedArticulo!.comments!.length).toBe(1);
    });
  });

  describe('Like actions', () => {
    it('should register a like once and prevent duplicate likes', async () => {
      await waitForInit();

      const art = component.articulos[0];
      component.selectedArticulo = art;

      await component.modalLike();
      expect(component.likedArticles.has('art1')).toBe(true);
      expect(interactionServiceMock.like).toHaveBeenCalledWith('art1', 'media');

      // Reset mock
      interactionServiceMock.like.mockClear();

      await component.modalLike();
      expect(interactionServiceMock.like).not.toHaveBeenCalled();
    });
  });

  describe('Social sharing and Video Modals', () => {
    it('should toggle share modal and return correct share links', async () => {
      await waitForInit();
      const art = component.articulos[0];
      component.selectedArticulo = art;

      component.openShareModal();
      expect(component.shareModalVisible).toBe(true);

      const waLink = component.getShareLink('whatsapp');
      expect(waLink).toContain('whatsapp');

      component.closeShareModal();
      expect(component.shareModalVisible).toBe(false);
    });

    it('should open and close video modal with clean embed URL', async () => {
      await waitForInit();
      component.openVideoModal('https://www.youtube.com/watch?v=12345');
      expect(component.videoModalVisible).toBe(true);
      expect(component.activeVideoUrl).toBeDefined();

      component.closeVideoModal();
      expect(component.videoModalVisible).toBe(false);
      expect(component.activeVideoUrl).toBeNull();
    });
  });
});
