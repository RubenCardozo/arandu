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
    component.isEmbedded = true;
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

});
