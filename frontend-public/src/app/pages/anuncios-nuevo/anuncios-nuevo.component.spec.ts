import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { ReactiveFormsModule } from '@angular/forms';

import { AnunciosNuevoComponent } from './anuncios-nuevo.component';
import { JobsService } from '../../services/jobs.service';
import { ServicesCatalogService } from '../../services/services-catalog.service';
import { AuthService } from '../../services/auth.service';

describe('AnunciosNuevoComponent - Live Portfolio Builder', () => {
  let component: AnunciosNuevoComponent;
  let fixture: ComponentFixture<AnunciosNuevoComponent>;
  let jobsServiceMock: any;
  let servicesCatalogServiceMock: any;
  let authServiceMock: any;
  let routerMock: any;
  let currentUserSubject: BehaviorSubject<User | null>;

  // Component reads first_name + last_name + phone + address + locality from metadata
  const mockUser: User = {
    id: 'u1',
    email: 'test@arandu.ch',
    user_metadata: {
      first_name: 'Ruben',
      last_name: 'Cardozo',
      phone: '789654',
      address: 'Rue du Rhone 1',
      locality: 'Geneve'
    }
  } as any;

  beforeEach(async () => {
    currentUserSubject = new BehaviorSubject<User | null>(mockUser);

    authServiceMock = {
      currentUser$: currentUserSubject.asObservable(),
      currentUser: mockUser
    };

    jobsServiceMock = {
      create: vi.fn().mockResolvedValue({})
    };

    servicesCatalogServiceMock = {
      create: vi.fn().mockResolvedValue({})
    };

    routerMock = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, AnunciosNuevoComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: JobsService, useValue: jobsServiceMock },
        { provide: ServicesCatalogService, useValue: servicesCatalogServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AnunciosNuevoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize the form and pre-fill contact data from complete user profile', () => {
    expect(component.adForm).toBeDefined();
    // Profile is complete → contactName pre-filled as "first_name last_name"
    expect(component.adForm.get('contactName')?.value).toBe('Ruben Cardozo');
    expect(component.adForm.get('phone')?.value).toBe('789654');
    expect(component.adForm.get('email')?.value).toBe('test@arandu.ch');
    expect(component.isProfileIncomplete).toBe(false);
  });

  it('should switch to landing mode and provide valid preview config', () => {
    component.adForm.patchValue({ type: 'landing' });

    expect(component.type).toBe('landing');

    const previewConfig = component.getPreviewConfig();
    expect(previewConfig.palette).toBe('crosby');
    expect(previewConfig.font).toBe('serif');
    expect(previewConfig.heroImage).toBeTruthy();
  });

  it('should return correct CSS variables for each color palette', () => {
    // Pass explicit config with no heroImage so the palette text override does NOT fire
    const baseConfig = (palette: string) => ({ palette, font: 'serif', heroImage: '' });

    // Crosby Dark — bg #1e2321
    let styles = component.getLandingStyles(baseConfig('crosby'));
    expect(styles['--landing-bg']).toBe('#1e2321');
    expect(styles['--landing-text']).toBe('#fdfbf7');
    expect(styles['--landing-accent']).toBe('#8ba495');

    // Sage Soft — light cream bg, dark green text
    styles = component.getLandingStyles(baseConfig('sage'));
    expect(styles['--landing-bg']).toBe('#fdfbf7');
    expect(styles['--landing-text']).toBe('#2d3a34');

    // Ocean Breeze — navy bg, sea-foam accent
    styles = component.getLandingStyles(baseConfig('ocean'));
    expect(styles['--landing-bg']).toBe('#1d3557');
    expect(styles['--landing-accent']).toBe('#a8dadc');

    // Minimal — pure white
    styles = component.getLandingStyles(baseConfig('minimal'));
    expect(styles['--landing-bg']).toBe('#ffffff');
    expect(styles['--landing-text']).toBe('#000000');
  });

  it('should return the correct default image for each metier/template when no custom image uploaded', () => {
    // Clear the form hero image so getPreviewConfig falls back to getDefaultImage()
    component.adForm.patchValue({ landingHeroImage: '', landingTemplate: 'restauracion' });
    let previewConfig = component.getPreviewConfig();
    expect(previewConfig.heroImage).toContain('photo-1504674900247-0877df9cc836');

    component.adForm.patchValue({ landingTemplate: 'venta' });
    previewConfig = component.getPreviewConfig();
    expect(previewConfig.heroImage).toContain('photo-1486006920555-c77dce18193b');

    component.adForm.patchValue({ landingTemplate: 'empleo' });
    previewConfig = component.getPreviewConfig();
    expect(previewConfig.heroImage).toContain('photo-1497215728101-856f4ea42174');
  });
});
