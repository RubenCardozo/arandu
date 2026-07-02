import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

import { AnunciosComponent } from './anuncios.component';
import { JobsService } from '../../services/jobs.service';
import { ServicesCatalogService } from '../../services/services-catalog.service';
import { InteractionService } from '../../services/interaction.service';
import { AuthService } from '../../services/auth.service';

describe('AnunciosComponent', () => {
  let component: AnunciosComponent;
  let fixture: ComponentFixture<AnunciosComponent>;
  let jobsServiceMock: any;
  let servicesCatalogServiceMock: any;
  let interactionServiceMock: any;
  let authServiceMock: any;
  let routerMock: any;
  let queryParamsSubject: BehaviorSubject<any>;
  let currentUserSubject: BehaviorSubject<User | null>;

  const mockJobs = [
    {
      id: 'j1',
      title: 'Desarrollador Web Angular',
      description: 'Trabajo remoto.',
      contactPhone: '12345',
      contactEmail: 'job@test.ch',
      company: 'TechCorp',
      jobType: 'Full-time',
      salary: '8000 CHF',
      requirements: 'Angular knowledge',
      createdAt: '22 JUN',
      clicks: 2
    }
  ];

  const mockServices = [
    {
      id: 's1',
      title: 'Pintura y Decoración',
      category: 'Servicios',
      description: 'Pintor profesional.',
      phone: '54321',
      email: 'service@test.ch',
      imageUrl: 'https://example.com/paint.jpg',
      createdAt: '21 JUN',
      clicks: 4
    }
  ];

  beforeEach(async () => {
    queryParamsSubject = new BehaviorSubject<any>({ q: '' });
    currentUserSubject = new BehaviorSubject<User | null>(null);

    jobsServiceMock = {
      getAll: vi.fn().mockResolvedValue(mockJobs),
      search: vi.fn().mockResolvedValue(mockJobs)
    };

    servicesCatalogServiceMock = {
      getAll: vi.fn().mockResolvedValue(mockServices),
      search: vi.fn().mockResolvedValue(mockServices)
    };

    interactionServiceMock = {
      getRatingStats: vi.fn().mockResolvedValue({ avgStars: 4.2, totalLikes: 8 }),
      incrementClicks: vi.fn().mockResolvedValue(5),
      getComments: vi.fn().mockResolvedValue([{ id: 'c1', author: 'Anon', content: 'Good service' }]),
      like: vi.fn().mockResolvedValue({}),
      rate: vi.fn().mockResolvedValue({}),
      addComment: vi.fn().mockResolvedValue({})
    };

    authServiceMock = {
      currentUser$: currentUserSubject.asObservable()
    };

    routerMock = {
      navigate: vi.fn().mockResolvedValue(true)
    };

    await TestBed.configureTestingModule({
      imports: [AnunciosComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParams: queryParamsSubject.asObservable() } },
        { provide: JobsService, useValue: jobsServiceMock },
        { provide: ServicesCatalogService, useValue: servicesCatalogServiceMock },
        { provide: InteractionService, useValue: interactionServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AnunciosComponent);
    component = fixture.componentInstance;
  });

  const waitForInit = async () => {
    fixture.detectChanges();
    while (component.loading) {
      await new Promise(resolve => setTimeout(resolve, 2));
    }
    // Additional tick for any unresolved promises
    await new Promise(resolve => setTimeout(resolve, 5));
  };

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load jobs and services and combine them on init', async () => {
    await waitForInit();

    expect(servicesCatalogServiceMock.getAll).toHaveBeenCalled();
    expect(jobsServiceMock.getAll).toHaveBeenCalled();

    // Ads should contain matched items plus mocked ones
    expect(component.anuncios.length).toBeGreaterThanOrEqual(2);
    const angularJob = component.anuncios.find(a => a.id === 'j1');
    expect(angularJob).toBeDefined();
    expect(angularJob!.totalLikes).toBe(0);
  });

  describe('Ad click and modal open action', () => {
    it('should open ad modal immediately and load comments/clicks in background', async () => {
      await waitForInit();

      const ad = component.anuncios.find(a => a.id === 's1')!;
      component.openAdModal(ad);

      expect(component.showModal).toBe(true);
      expect(component.selectedAd).toBeDefined();
      expect(component.selectedAd!.id).toBe('s1');
      expect(interactionServiceMock.incrementClicks).toHaveBeenCalledWith('s1', 'service', 4);

      // Verify comments loaded in background
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 5));
      expect(interactionServiceMock.getComments).toHaveBeenCalledWith('s1');
      expect(component.selectedAd!.comments!.length).toBe(1);
    });
  });

  describe('Ad like action', () => {
    it('should register a like only once per session', async () => {
      await waitForInit();

      const ad = component.anuncios.find(a => a.id === 'j1')!;
      component.selectedAd = ad;

      await component.likeAd(ad);
      expect(component.likedAds.has('j1')).toBe(true);
      expect(interactionServiceMock.like).toHaveBeenCalledWith('j1', 'job');

      // Reset mock
      interactionServiceMock.like.mockClear();

      // Trigger second like - should be ignored
      await component.likeAd(ad);
      expect(interactionServiceMock.like).not.toHaveBeenCalled();
    });
  });

  describe('Ad category filtering', () => {
    it('should filter anuncios by category when filterCategory is called', async () => {
      await waitForInit();

      component.filterCategory('Empleo');
      expect(component.selectedCategory).toBe('Empleo');

      // All filtered anuncios should be of category Empleo or entityType job
      component.filteredAnuncios.forEach(a => {
        expect(a.category === 'Empleo' || a.entityType === 'job').toBe(true);
      });
    });
  });
});
