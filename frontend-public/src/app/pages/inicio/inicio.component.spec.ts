import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { BehaviorSubject, of } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

import { InicioComponent } from './inicio.component';
import { MediaService } from '../../services/media.service';
import { AuthService } from '../../services/auth.service';
import { InteractionService } from '../../services/interaction.service';
import { WorldCupService, WorldCupGame } from '../../services/world-cup.service';

describe('InicioComponent', () => {
  let component: InicioComponent;
  let fixture: ComponentFixture<InicioComponent>;
  let mediaServiceMock: any;
  let authServiceMock: any;
  let interactionServiceMock: any;
  let worldCupServiceMock: any;
  let currentUserSubject: BehaviorSubject<User | null>;

  const mockUser: any = {
    id: 'user-123',
    email: 'user@test.com',
    user_metadata: { full_name: 'Test User' }
  };

  const mockMedia = [
    {
      id: 'm1',
      title: 'Main Hero Article',
      type: 'article',
      category: 'Investigation',
      description: JSON.stringify([{ type: 'text', content: 'Hero content description.' }]),
      contentUrl: 'http://hero.com',
      embedUrl: '',
      author: 'Hero Author',
      imageUrl: JSON.stringify(['http://hero.com/img.jpg']),
      publishedAt: '12 JUN, 2026',
      clicks: 10
    },
    {
      id: 'm2',
      title: 'Headline 1',
      type: 'article',
      category: 'Cultura',
      description: 'Culture article.',
      imageUrl: '[]',
      publishedAt: '11 JUN, 2026',
      clicks: 5
    }
  ];

  const mockGames: WorldCupGame[] = [
    {
      _id: 'g0',
      id: '0',
      home_team_id: 't1',
      away_team_id: 't3',
      home_score: '1',
      away_score: '0',
      home_scorers: '{"Messi 20\'"}',
      away_scorers: 'null',
      group: 'A',
      matchday: '1',
      local_date: '06/23/2026 18:00',
      stadium_id: 'st1',
      finished: 'TRUE',
      time_elapsed: 'finished',
      type: 'group',
      home_team_name_en: 'Argentina',
      away_team_name_en: 'Saudi Arabia'
    },
    {
      _id: 'g1',
      id: '1',
      home_team_id: 't1',
      away_team_id: 't2',
      home_score: '2',
      away_score: '1',
      home_scorers: '{"Messi 10\'"}',
      away_scorers: '{"Chicharito 80\'"}',
      group: 'A',
      matchday: '1',
      local_date: '06/24/2026 18:00',
      stadium_id: 'st1',
      finished: 'TRUE',
      time_elapsed: 'finished',
      type: 'group',
      home_team_name_en: 'Argentina',
      away_team_name_en: 'Mexico'
    },
    {
      _id: 'g2',
      id: '2',
      home_team_id: 't2',
      away_team_id: 't3',
      home_score: '0',
      away_score: '0',
      home_scorers: 'null',
      away_scorers: 'null',
      group: 'A',
      matchday: '1',
      local_date: '06/25/2026 18:00',
      stadium_id: 'st1',
      finished: 'FALSE',
      time_elapsed: 'notstarted',
      type: 'group',
      home_team_name_en: 'Mexico',
      away_team_name_en: 'Saudi Arabia'
    }
  ];

  const mockGroups = [
    {
      _id: 'gr1',
      name: 'Group A',
      teams: [
        { team_id: 't1', mp: '1', w: '1', l: '0', d: '0', pts: '3', gf: '2', ga: '1', gd: '1', team_name: 'Argentina' }
      ]
    }
  ];

  beforeEach(async () => {
    currentUserSubject = new BehaviorSubject<User | null>(null);

    mediaServiceMock = {
      getLatest: vi.fn().mockResolvedValue(mockMedia)
    };

    authServiceMock = {
      currentUser$: currentUserSubject.asObservable(),
      getUserInitials: vi.fn().mockReturnValue('TU')
    };

    interactionServiceMock = {
      incrementClicks: vi.fn().mockResolvedValue(11),
      like: vi.fn().mockResolvedValue({}),
      getRatingStats: vi.fn().mockResolvedValue({ totalLikes: 11 }),
      getComments: vi.fn().mockResolvedValue([])
    };

    worldCupServiceMock = {
      getGames: vi.fn().mockResolvedValue(mockGames),
      getGroups: vi.fn().mockResolvedValue(mockGroups)
    };

    await TestBed.configureTestingModule({
      imports: [InicioComponent],
      providers: [
        provideRouter([]),
        { provide: MediaService, useValue: mediaServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: InteractionService, useValue: interactionServiceMock },
        { provide: WorldCupService, useValue: worldCupServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InicioComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load media and World Cup data on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    // Wait an extra tick for non-awaited async loadWorldCupData
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mediaServiceMock.getLatest).toHaveBeenCalledWith(6);
    expect(worldCupServiceMock.getGames).toHaveBeenCalled();
    expect(worldCupServiceMock.getGroups).toHaveBeenCalled();

    // Verify hero article assignment
    expect(component.heroArticle.id).toBe('m1');
    expect(component.heroArticle.title).toBe('Main Hero Article');
    expect(component.heroArticle.description).toBe('Hero content description.');

    // Verify World Cup data loading
    expect(component.worldCupGames.length).toBe(3);
    expect(component.worldCupGroups.length).toBe(1);
  });

  describe('Read actions', () => {
    it('should open auth modal if user is not logged in when trying to read hero article', () => {
      currentUserSubject.next(null);
      fixture.detectChanges();

      component.onReadHeroArticle();
      expect(component.authModalVisible).toBe(true);
      expect(component.articleModalVisible).toBe(false);
    });

    it('should open article modal immediately and increment clicks in background if logged in', async () => {
      currentUserSubject.next(mockUser);
      fixture.detectChanges();
      await fixture.whenStable();

      component.onReadHeroArticle();
      expect(component.articleModalVisible).toBe(true);
      expect(component.selectedArticulo).toBeDefined();
      expect(component.selectedArticulo.id).toBe('m1');

      // Check click increment call
      expect(interactionServiceMock.incrementClicks).toHaveBeenCalledWith('m1', 'media', 10);
    });
  });

  describe('Like actions', () => {
    it('should register a like once and prevent duplicate likes', async () => {
      currentUserSubject.next(mockUser);
      fixture.detectChanges();
      await fixture.whenStable();

      // Set selected article in component
      component.selectedArticulo = { id: 'm1', totalLikes: 10 };

      // Trigger like
      await component.modalLike();
      expect(component.likedArticles.has('m1')).toBe(true);
      expect(interactionServiceMock.like).toHaveBeenCalledWith('m1', 'media');
      expect(interactionServiceMock.getRatingStats).toHaveBeenCalledWith('m1');
      expect(component.selectedArticulo.totalLikes).toBe(11);

      // Reset mock to verify it is not called again
      interactionServiceMock.like.mockClear();
      interactionServiceMock.getRatingStats.mockClear();

      await component.modalLike();
      expect(interactionServiceMock.like).not.toHaveBeenCalled();
      expect(interactionServiceMock.getRatingStats).not.toHaveBeenCalled();
    });
  });

  describe('World Cup interactive widget', () => {
    it('should filter games by simulated date', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 0));

      component.worldCupSelectedDate = new Date('2026-06-24');
      const filtered = component.getFilteredWorldCupGames();
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should change date using changeWorldCupDate method', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 0));

      component.worldCupSelectedDate = new Date('2026-06-24');
      component.changeWorldCupDate(1);
      expect(component.worldCupSelectedDate.getDate()).toBe(25);

      component.changeWorldCupDate(-2);
      expect(component.worldCupSelectedDate.getDate()).toBe(23);
    });

    it('should open match details and generate mock statistics when clicking a match card in the DOM', async () => {
      component.loading = false;
      component.worldCupGames = mockGames;
      component.worldCupGroups = mockGroups;
      component.heroArticle = {
        id: 'm1',
        category: 'INVESTIGATION',
        author: 'HERO AUTHOR',
        date: '12 JUN, 2026',
        title: 'Main Hero Article',
        description: 'Hero content description.',
        imageUrl: 'http://hero.com/img.jpg',
        contentUrl: 'http://hero.com',
        embedUrl: '',
        clicks: 10,
        rawDescription: '[{"type":"text","content":"Hero content description."}]'
      };
      
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 0));
      fixture.detectChanges();

      // Find the first match card in the matches list container
      const matchCards = fixture.nativeElement.querySelectorAll('.space-y-3.max-h-72 .cursor-pointer');
      expect(matchCards.length).toBeGreaterThan(0);

      // Click the card
      matchCards[0].click();

      // Verify selectedMatch and matchStats are set correctly
      expect(component.selectedMatch).toBeDefined();
      expect(component.selectedMatch?.id).toBe(mockGames[1].id);
      expect(component.matchStats).toBeDefined();
      expect(component.matchStats.possession).toBeDefined();
    });
  });
});
