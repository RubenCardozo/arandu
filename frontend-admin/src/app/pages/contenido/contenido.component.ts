import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MediaService } from '../../services/media.service';
import { JobsService } from '../../services/jobs.service';
import { ServicesCatalogService } from '../../services/services-catalog.service';
import { RestaurantsService } from '../../services/restaurants.service';
import { NewRestaurant } from '../../models/restaurant.model';
import { NewMedia } from '../../models/media.model';
import { NewServiceItem } from '../../models/service-item.model';

/**
 * ContenidoComponent handles administration tasks for creating and modifying portal items.
 * Supports Directories (Restaurants/Shops), Editorial (Media), Jobs, and Local Services.
 */
@Component({
  selector: 'app-contenido',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './contenido.component.html',
  styleUrls: ['./contenido.component.css']
})
export class ContenidoComponent implements OnInit {
  // Navigation state indicating the currently selected form category tab
  activeSection: 'directory' | 'editorial' | 'jobs' | 'services' = 'directory';
  
  // Independent forms mapped to database schema tables
  contentForm!: FormGroup;
  editorialForm!: FormGroup;
  jobsForm!: FormGroup;
  servicesForm!: FormGroup;

  // Visual feedback and processing state properties
  loading = false;
  successMessage = '';
  errorMessage = '';
  selectedFile: File | null = null; // Currently staged file for Supabase Storage uploads

  constructor(
    private fb: FormBuilder,
    private mediaService: MediaService,
    private jobsService: JobsService,
    private servicesCatalogService: ServicesCatalogService,
    private restaurantsService: RestaurantsService
  ) {}

  ngOnInit() {
    // 1. Directory Form Initialization (Maps to 'restaurants' table)
    this.contentForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required]],
      address: ['', [Validators.required]],
      neighborhood: ['Plainpalais', [Validators.required]],
      phone: [''],
      website: [''],
      instagram: ['']
    });

    // 2. Editorial Form Initialization (Maps to 'media' table for articles, videos, podcasts)
    this.editorialForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      type: ['article', [Validators.required]],
      category: ['Cultura', [Validators.required]],
      description: ['', [Validators.required]],
      contentUrl: ['', [Validators.required]],
      embedUrl: [''],
      author: ['', [Validators.required]]
    });

    // 3. Classifieds Jobs Form Initialization (Maps to 'jobs' table)
    this.jobsForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      company: ['', [Validators.required]],
      description: ['', [Validators.required]],
      requirements: [''],
      salary: ['A convenir'],
      jobType: ['Full-time', [Validators.required]],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhone: ['']
    });

    // 4. Classifieds Services Form Initialization (Maps to 'services' table for plumbers, electricians, etc.)
    this.servicesForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      category: ['Reparaciones', [Validators.required]],
      description: ['', [Validators.required]],
      contactName: [''],
      phone: ['', [Validators.required]],
      email: ['', [Validators.email]],
      website: ['']
    });
  }

  /**
   * Switches the active form section tab and resets status messages and file stages.
   */
  setSection(section: 'directory' | 'editorial' | 'jobs' | 'services') {
    this.activeSection = section;
    this.successMessage = '';
    this.errorMessage = '';
    this.selectedFile = null;
  }

  /**
   * Captures file selections from native file inputs.
   */
  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
    }
  }

  /**
   * Form submission handler. Coordinates uploads and DB insertions dynamically based on the active tab.
   */
  async onSubmit() {
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    try {
      // A. Directory Submission Logic
      if (this.activeSection === 'directory') {
        if (this.contentForm.invalid) {
          this.contentForm.markAllAsTouched();
          throw new Error('Please fill in all required fields in the Directory form.');
        }

        const restaurantPayload: NewRestaurant = {
          ...this.contentForm.value,
          logoUrl: ''
        };

        await this.restaurantsService.create(restaurantPayload, this.selectedFile || undefined);
        this.contentForm.reset({ neighborhood: 'Plainpalais' });

      // B. Editorial Submission Logic
      } else if (this.activeSection === 'editorial') {
        if (this.editorialForm.invalid) {
          this.editorialForm.markAllAsTouched();
          throw new Error('Please fill in all required fields in the Editorial form.');
        }

        const mediaPayload: NewMedia = {
          ...this.editorialForm.value,
          imageUrl: ''
        };

        await this.mediaService.create(mediaPayload, this.selectedFile || undefined);
        this.editorialForm.reset({ type: 'article', category: 'Cultura' });

      // C. Jobs Submission Logic
      } else if (this.activeSection === 'jobs') {
        if (this.jobsForm.invalid) {
          this.jobsForm.markAllAsTouched();
          throw new Error('Please fill in all required fields in the Jobs form.');
        }

        await this.jobsService.create(this.jobsForm.value);
        this.jobsForm.reset({ salary: 'A convenir', jobType: 'Full-time' });

      // D. Services Submission Logic
      } else if (this.activeSection === 'services') {
        if (this.servicesForm.invalid) {
          this.servicesForm.markAllAsTouched();
          throw new Error('Please fill in all required fields in the Services form.');
        }

        const servicePayload: NewServiceItem = {
          ...this.servicesForm.value,
          imageUrl: ''
        };

        await this.servicesCatalogService.create(servicePayload, this.selectedFile || undefined);
        this.servicesForm.reset({ category: 'Reparaciones' });
      }

      this.successMessage = 'Content successfully saved and published live!';
      this.selectedFile = null;
    } catch (err: any) {
      this.errorMessage = err.message || 'Error occurred while saving the content.';
    } finally {
      this.loading = false;
    }
  }
}
