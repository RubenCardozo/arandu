import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BuscarComponent } from './buscar';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { MediaService } from '../../services/media.service';
import { ServicesCatalogService } from '../../services/services-catalog.service';
import { JobsService } from '../../services/jobs.service';

describe('BuscarComponent', () => {
  let component: BuscarComponent;
  let fixture: ComponentFixture<BuscarComponent>;

  beforeEach(async () => {
    const routeMock = {
      queryParams: of({ q: 'test' })
    };

    const routerMock = {
      navigate: vi.fn()
    };

    const mediaServiceMock = {
      getAll: vi.fn().mockResolvedValue([])
    };

    const servicesCatalogServiceMock = {
      getAll: vi.fn().mockResolvedValue([])
    };

    const jobsServiceMock = {
      getAll: vi.fn().mockResolvedValue([])
    };

    await TestBed.configureTestingModule({
      imports: [BuscarComponent],
      providers: [
        { provide: ActivatedRoute, useValue: routeMock },
        { provide: Router, useValue: routerMock },
        { provide: MediaService, useValue: mediaServiceMock },
        { provide: ServicesCatalogService, useValue: servicesCatalogServiceMock },
        { provide: JobsService, useValue: jobsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BuscarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
