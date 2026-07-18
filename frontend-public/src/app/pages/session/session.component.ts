import { Component, OnInit, OnDestroy, ChangeDetectorRef, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SupabaseService } from '../../services/supabase.service';
import { InteractionService } from '../../services/interaction.service';
import { ServicesCatalogService } from '../../services/services-catalog.service';
import { User } from '@supabase/supabase-js';
import { Subscription } from 'rxjs';
import { AnunciosNuevoComponent } from '../anuncios-nuevo/anuncios-nuevo.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { PortfolioStateService, PortfolioBlock, PortfolioSection } from '../../services/portfolio-state.service';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

@Component({
  selector: 'app-session',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, AnunciosNuevoComponent, DragDropModule, SafeUrlPipe],
  templateUrl: './session.component.html',
  styleUrls: ['./session.component.css']
})
export class SessionComponent implements OnInit, OnDestroy {
  user: User | null = null;
  loading = true;
  editMode = false;
  profileForm!: FormGroup;
  editAdForm!: FormGroup;
  editingAd: any = null;
  errorMessage = '';
  successMessage = '';
  myAnuncios: any[] = [];
  loadingAnuncios = false;
  activeMobileTab = signal<'canvas' | 'settings'>('canvas');
  activeSectionLabel = signal<string>('');
  previewAd: any = null;
  showPreviewModal = false;
  showCompletionBanner = true;

  // Image upload in edit mode
  editSelectedFile: File | null = null;
  editImagePreviewUrl: string | null = null;

  // Keywords help modal
  keywordsModalVisible = false;
  
  // Portfolio properties
  portfolioForm!: FormGroup;
  portfolioAd: any = null;
  portfolioLoading = false;
  portfolioSubmitting = false;
  showLandingPreviewModal = false;
  portfolioHeroPreview: string | null = null;
  activePreviewTab = 'Inicio';
  currentSlideIndex = 0;
  portfolioEditorMobileTab: 'edit' | 'preview' = 'edit';

  isModalOpen(): boolean {
    return this.portfolioState.showVisualBuilder() || 
           this.showLandingPreviewModal || 
           this.showPreviewModal || 
           this.keywordsModalVisible;
  }

  get slides(): string[] {
    if (!this.portfolioForm) return [];
    const sections = this.portfolioForm.get('sections')?.value || [];
    return sections.map((s: any) => s.title || 'Sección');
  }
  
  private authSubscription!: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder,
    private supabase: SupabaseService,
    private interactionService: InteractionService,
    private servicesCatalogService: ServicesCatalogService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    public portfolioState: PortfolioStateService
  ) {}

  ngOnInit() {
    const visitKey = 'arandu_session_visits';
    const visits = localStorage.getItem(visitKey);
    const visitCount = visits ? parseInt(visits, 10) : 0;
    localStorage.setItem(visitKey, (visitCount + 1).toString());
    this.showCompletionBanner = visitCount === 0;

    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      nickname: ['', [Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-]{8,20}$/)]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      locality: ['', [Validators.required, Validators.minLength(2)]],
      subscribeNewsletter: [false]
    });

    this.editAdForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      category: ['Servicios y Reparación'],
      keywords: ['', [Validators.required, (control: any) => {
        if (!control.value) return { minKeywords: true };
        const parts = control.value.split(',')
          .map((p: string) => p.trim())
          .filter((p: string) => p.length > 0);
        return parts.length >= 3 ? null : { minKeywords: true };
      }]],
      contactName: [''],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-]{8,20}$/)]],
      website: [''],
      // Job specific
      company: [''],
      requirements: [''],
      salary: [''],
      jobType: [''],
      // Landing page fields
      landingTemplate: ['profesional'],
      landingHorario: [''],
      landingCobertura: [''],
      landingExperiencia: [''],
      // Médicos
      landingConsulta: ['Presencial'],
      landingSeguro: ['Sí'],
      landingEspecialidad: [''],
      // Restaurantes
      landingMenu: [''],
      landingServicios: [''],
      landingPresentacion: [''],
      // Comercios
      landingProductos: [''],
      landingPago: ['Efectivo, Tarjeta, Twint'],
      landingSobreNosotros: [''],
      
      galleryUrlsRaw: ['']
    });

    this.portfolioForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      category: ['Servicios y Reparación'],
      contactName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-]{8,20}$/)]],
      phoneFijo: ['', [Validators.pattern(/^\+?[0-9\s\-]{8,20}$/)]],
      website: [''],
      landingTemplate: ['servicios'],
      landingPalette: ['crosby'],
      landingFont: ['serif'],
      landingHeroImage: [''],
      sections: this.fb.array([
        this.fb.group({ title: ['Inicio', [Validators.required]], content: ['Presentación detallada de nuestro negocio...', [Validators.required, Validators.minLength(10)]] }),
        this.fb.group({ title: ['Servicios', [Validators.required]], content: ['Detalles sobre los servicios y experiencia de nuestro negocio...', [Validators.required, Validators.minLength(10)]] }),
        this.fb.group({ title: ['Contacto', [Validators.required]], content: ['Información de horarios y contacto...', [Validators.required, Validators.minLength(10)]] })
      ])
    });

    // Sync form values to state signals on change
    this.portfolioForm.valueChanges.subscribe(val => {
      this.portfolioState.updateFromForm(val);
    });

    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab) {
        if (tab === 'publish') {
          this.activeTab = 'publications';
          this.showPublishFormState = true;
        } else if (['profile', 'stats', 'portfolio', 'publications'].includes(tab)) {
          this.activeTab = tab as any;
          this.showPublishFormState = false;
          if (tab === 'portfolio') {
            this.loadOrCreatePortfolio();
          }
        }
        this.cdr.detectChanges();
      }
    });

    this.authSubscription = this.authService.currentUser$.subscribe(currentUser => {
      if (currentUser === undefined) {
        this.loading = true;
        return;
      }
      this.user = currentUser;
      
      if (currentUser) {
        this.profileForm.patchValue({
          firstName: currentUser.user_metadata?.['first_name'] || '',
          lastName: currentUser.user_metadata?.['last_name'] || '',
          nickname: currentUser.user_metadata?.['nickname'] || '',
          phone: currentUser.user_metadata?.['phone'] || '',
          address: currentUser.user_metadata?.['address'] || '',
          locality: currentUser.user_metadata?.['locality'] || '',
          subscribeNewsletter: currentUser.user_metadata?.['subscribe_newsletter'] || false
        });
        this.loadMyAnuncios();
        this.loadFavorites();
      }
      
      this.loading = false;
      this.cdr.detectChanges();
      
      // If no active session, redirect to registration/login page
      if (!this.loading && !this.user) {
        this.router.navigate(['/registro']);
      }
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  toggleEditMode(edit: boolean) {
    this.editMode = edit;
    this.errorMessage = '';
    this.successMessage = '';
    if (!edit && this.user) {
      // Reset form to current user values on cancel
      this.profileForm.patchValue({
        firstName: this.user.user_metadata?.['first_name'] || '',
        lastName: this.user.user_metadata?.['last_name'] || '',
        nickname: this.user.user_metadata?.['nickname'] || '',
        phone: this.user.user_metadata?.['phone'] || '',
        address: this.user.user_metadata?.['address'] || '',
        locality: this.user.user_metadata?.['locality'] || '',
        subscribeNewsletter: this.user.user_metadata?.['subscribe_newsletter'] || false
      });
    }
  }

  async onSaveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const result = await this.authService.updateProfile(this.profileForm.value);
      if (result.error) {
        this.errorMessage = result.error;
      } else {
        this.successMessage = '¡Ficha de inscripción guardada correctamente!';
        this.editMode = false;
      }
    } catch (err: any) {
      this.errorMessage = err.message || 'Error al actualizar el perfil.';
    } finally {
      this.loading = false;
    }
  }

  async onSignOut() {
    this.loading = true;
    try {
      localStorage.removeItem('arandu_session_visits');
      await this.authService.signOut();
      this.router.navigate(['/']);
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      this.loading = false;
    }
  }

  get userPhone(): string {
    return this.user?.user_metadata?.['phone'] || 'No especificado';
  }

  get userFullName(): string {
    return this.user?.user_metadata?.['full_name'] || this.user?.user_metadata?.['name'] || 'Usuario de Arandu';
  }

  get userAddress(): string {
    return this.user?.user_metadata?.['address'] || 'No especificado';
  }

  get userLocality(): string {
    return this.user?.user_metadata?.['locality'] || 'No especificado';
  }

  get isProfileIncomplete(): boolean {
    if (!this.user) return true;
    const metadata = this.user.user_metadata;
    return !metadata?.['first_name'] || !metadata?.['last_name'] || !metadata?.['phone'] || !metadata?.['address'] || !metadata?.['locality'];
  }

  // Field validation helper getters
  get fNameInvalid() {
    const control = this.profileForm.get('firstName');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  get lNameInvalid() {
    const control = this.profileForm.get('lastName');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  get phoneInvalid() {
    const control = this.profileForm.get('phone');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  get addressInvalid() {
    const control = this.profileForm.get('address');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  get localityInvalid() {
    const control = this.profileForm.get('locality');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  // Getters for ad editing validations
  get editTitleInvalid() {
    const ctrl = this.editAdForm.get('title');
    return ctrl ? ctrl.invalid && (ctrl.dirty || ctrl.touched) : false;
  }
  get editDescInvalid() {
    const ctrl = this.editAdForm.get('description');
    return ctrl ? ctrl.invalid && (ctrl.dirty || ctrl.touched) : false;
  }
  get editKeywordsInvalid() {
    const ctrl = this.editAdForm.get('keywords');
    return ctrl ? ctrl.invalid && (ctrl.dirty || ctrl.touched) : false;
  }
  get editContactInvalid() {
    const ctrl = this.editAdForm.get('contactName');
    return ctrl ? ctrl.invalid && (ctrl.dirty || ctrl.touched) : false;
  }
  get editEmailInvalid() {
    const ctrl = this.editAdForm.get('email');
    return ctrl ? ctrl.invalid && (ctrl.dirty || ctrl.touched) : false;
  }
  get editPhoneInvalid() {
    const ctrl = this.editAdForm.get('phone');
    return ctrl ? ctrl.invalid && (ctrl.dirty || ctrl.touched) : false;
  }
  get editCompanyInvalid() {
    const ctrl = this.editAdForm.get('company');
    return ctrl ? ctrl.invalid && (ctrl.dirty || ctrl.touched) : false;
  }
  get editType() {
    return this.editingAd?.type;
  }

  showPublishFormState = false;
  activeTab: 'profile' | 'publications' | 'stats' | 'portfolio' | 'favorites' = 'publications';

  totalViews = 0;
  mostVisitedAd: any = null;
  bestRatedAd: any = null;
  mostCommentedAd: any = null;
  mostSearchedGlobal: any[] = [];

  // Favorites properties
  favoriteItems: any[] = [];
  loadingFavorites = false;

  async loadFavorites() {
    if (!this.user) {
      this.favoriteItems = [];
      return;
    }
    this.loadingFavorites = true;
    try {
      this.favoriteItems = await this.interactionService.getFavorites();
    } catch (e) {
      console.error('Error loading favorites:', e);
    } finally {
      this.loadingFavorites = false;
      this.cdr.detectChanges();
    }
  }

  getFavoritesByType(type: 'media' | 'anuncio' | 'portfolio'): any[] {
    return this.favoriteItems.filter(item => item.type === type);
  }

  async removeFavorite(entityId: string) {
    try {
      const item = this.favoriteItems.find(f => f.id === entityId);
      if (!item) return;
      
      const entityType = item.entityType || (item.type === 'media' ? 'media' : 'service');
      await this.interactionService.toggleFavorite(entityId, entityType);
      
      this.favoriteItems = this.favoriteItems.filter(f => f.id !== entityId);
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Error removing favorite:', e);
    }
  }

  setTab(tab: 'profile' | 'publications' | 'stats' | 'portfolio' | 'favorites') {
    this.activeTab = tab;
    this.showPublishFormState = false;
    this.errorMessage = '';
    this.successMessage = '';
    if (tab === 'portfolio') {
      this.loadOrCreatePortfolio();
    } else if (tab === 'favorites') {
      this.loadFavorites();
    }
    this.cdr.detectChanges();
  }

  onAdPublished() {
    this.loadMyAnuncios();
    this.showPublishFormState = false;
    this.activeTab = 'publications';
    this.successMessage = '¡Anuncio publicado con éxito!';
    this.cdr.detectChanges();
  }

  runWithTimeout<T = any>(promise: Promise<T> | any, timeoutMs: number = 15000): Promise<T> {
    let timeoutId: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('El servidor de base de datos de Supabase no responde (posiblemente esté pausado).'));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
    }) as any;
  }

  calculateStats() {
    this.totalViews = this.myAnuncios.reduce((sum, item) => sum + (item.clicks || 0), 0);
    
    this.mostVisitedAd = this.myAnuncios.length > 0 
      ? [...this.myAnuncios].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))[0] 
      : null;
      
    this.bestRatedAd = this.myAnuncios.length > 0 
      ? [...this.myAnuncios].sort((a, b) => (b.avgStars || 0) - (a.avgStars || 0))[0] 
      : null;
      
    this.mostCommentedAd = this.myAnuncios.length > 0 
      ? [...this.myAnuncios].sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0))[0] 
      : null;

    this.mostSearchedGlobal = [
      { category: 'Servicios', term: 'Limpieza y Hogar', popularity: 'Alto (42% de búsquedas)' },
      { category: 'Electricidad', term: 'Urgencias 24h', popularity: 'Alto (28% de búsquedas)' },
      { category: 'Venta y Donaciones', term: 'Coches Eléctricos o electrodomésticos', popularity: 'Medio (18% de búsquedas)' },
      { category: 'Empleo', term: 'Ofertas y pedidos de empleo', popularity: 'Medio (12% de búsquedas)' }
    ];
  }

  async loadMyAnuncios() {
    if (!this.user) return;
    this.loadingAnuncios = true;
    this.errorMessage = '';
    
    try {
      const [servicesData, jobsData] = await this.runWithTimeout(
        Promise.all([
          this.supabase.client.from('services').select('*').eq('owner_id', this.user.id),
          this.supabase.client.from('jobs').select('*').eq('owner_id', this.user.id)
        ]),
        15000
      );

      const combined: any[] = [];
      if (servicesData.data && servicesData.data.length > 0) {
        const servicesMapped = await Promise.all(
          servicesData.data.map(async (item: any) => {
            let avgStars = 0;
            let totalLikes = 0;
            let totalDislikes = 0;
            let comments: any[] = [];
            try {
              const stats = await this.runWithTimeout(this.interactionService.getRatingStats(item.id), 2000);
              avgStars = stats.avgStars || 0;
              totalLikes = stats.totalLikes || 0;
              totalDislikes = stats.totalDislikes || 0;
            } catch (e) {
              console.warn('Failed to load stats for service', item.id, e);
            }
            try {
              comments = await this.runWithTimeout(this.interactionService.getComments(item.id), 2000);
            } catch (e) {
              console.warn('Failed to load comments for service', item.id, e);
            }
            return {
              id: item.id,
              title: item.title,
              category: item.category || 'Otros',
              type: 'service',
              clicks: item.clicks || 0,
              description: item.description || '',
              contactName: item.contact_name || '',
              phone: item.phone || '',
              email: item.email || '',
              website: item.website || '',
              imageUrl: item.image_url || '',
              createdAt: item.created_at,
              avgStars,
              totalLikes,
              totalDislikes,
              comments,
              showComments: false,
              landingTemplate: item.landing_template,
              landingConfig: item.landing_config || {}
            };
          })
        );
        combined.push(...servicesMapped);
      }

      if (jobsData.data && jobsData.data.length > 0) {
        const jobsMapped = await Promise.all(
          jobsData.data.map(async (item: any) => {
            let avgStars = 0;
            let totalLikes = 0;
            let totalDislikes = 0;
            let comments: any[] = [];
            try {
              const stats = await this.runWithTimeout(this.interactionService.getRatingStats(item.id), 2000);
              avgStars = stats.avgStars || 0;
              totalLikes = stats.totalLikes || 0;
              totalDislikes = stats.totalDislikes || 0;
            } catch (e) {
              console.warn('Failed to load stats for job', item.id, e);
            }
            try {
              comments = await this.runWithTimeout(this.interactionService.getComments(item.id), 2000);
            } catch (e) {
              console.warn('Failed to load comments for job', item.id, e);
            }
            return {
              id: item.id,
              title: item.title,
              category: 'Empleo',
              type: 'job',
              clicks: item.clicks || 0,
              description: item.description || '',
              company: item.company || '',
              jobType: item.job_type || '',
              salary: item.salary || '',
              requirements: item.requirements || '',
              contactEmail: item.contact_email || '',
              contactPhone: item.contact_phone || '',
              imageUrl: '',
              createdAt: item.created_at,
              avgStars,
              totalLikes,
              totalDislikes,
              comments,
              showComments: false
            };
          })
        );
        combined.push(...jobsMapped);
      }

      this.myAnuncios = combined;
      this.calculateStats();
    } catch (err: any) {
      console.error('Error loading my announcements:', err);
      this.errorMessage = err.message || 'Error al conectar con la base de datos para cargar tus publicaciones.';
    } finally {
      this.loadingAnuncios = false;
      this.cdr.detectChanges();
    }
  }

  async loadMyAnunciosBackground() {
    if (!this.user) return;
    try {
      const [servicesData, jobsData] = await this.runWithTimeout(
        Promise.all([
          this.supabase.client.from('services').select('*').eq('owner_id', this.user.id),
          this.supabase.client.from('jobs').select('*').eq('owner_id', this.user.id)
        ]),
        15000
      );

      const combined: any[] = [];
      if (servicesData.data && servicesData.data.length > 0) {
        const servicesMapped = await Promise.all(
          servicesData.data.map(async (item: any) => {
            let avgStars = 0;
            let totalLikes = 0;
            let totalDislikes = 0;
            let comments: any[] = [];
            try {
              const stats = await this.runWithTimeout(this.interactionService.getRatingStats(item.id), 2000);
              avgStars = stats.avgStars || 0;
              totalLikes = stats.totalLikes || 0;
              totalDislikes = stats.totalDislikes || 0;
            } catch (e) {
              console.warn('Failed to load stats for service', item.id, e);
            }
            try {
              comments = await this.runWithTimeout(this.interactionService.getComments(item.id), 2000);
            } catch (e) {
              console.warn('Failed to load comments for service', item.id, e);
            }
            return {
              id: item.id,
              title: item.title,
              category: item.category || 'Otros',
              type: 'service',
              clicks: item.clicks || 0,
              description: item.description || '',
              contactName: item.contact_name || '',
              phone: item.phone || '',
              email: item.email || '',
              website: item.website || '',
              imageUrl: item.image_url || '',
              createdAt: item.created_at,
              avgStars,
              totalLikes,
              totalDislikes,
              comments,
              showComments: false,
              landingTemplate: item.landing_template,
              landingConfig: item.landing_config || {}
            };
          })
        );
        combined.push(...servicesMapped);
      }

      if (jobsData.data && jobsData.data.length > 0) {
        const jobsMapped = await Promise.all(
          jobsData.data.map(async (item: any) => {
            let avgStars = 0;
            let totalLikes = 0;
            let totalDislikes = 0;
            let comments: any[] = [];
            try {
              const stats = await this.runWithTimeout(this.interactionService.getRatingStats(item.id), 2000);
              avgStars = stats.avgStars || 0;
              totalLikes = stats.totalLikes || 0;
              totalDislikes = stats.totalDislikes || 0;
            } catch (e) {
              console.warn('Failed to load stats for job', item.id, e);
            }
            try {
              comments = await this.runWithTimeout(this.interactionService.getComments(item.id), 2000);
            } catch (e) {
              console.warn('Failed to load comments for job', item.id, e);
            }
            return {
              id: item.id,
              title: item.title,
              category: 'Empleo',
              type: 'job',
              clicks: item.clicks || 0,
              description: item.description || '',
              company: item.company || '',
              jobType: item.job_type || '',
              salary: item.salary || '',
              requirements: item.requirements || '',
              contactEmail: item.contact_email || '',
              contactPhone: item.contact_phone || '',
              imageUrl: '',
              createdAt: item.created_at,
              avgStars,
              totalLikes,
              totalDislikes,
              comments,
              showComments: false
            };
          })
        );
        combined.push(...jobsMapped);
      }

      this.myAnuncios = combined;
      this.calculateStats();
    } catch (err) {
      console.error('Error syncing in background:', err);
    }
  }

  toggleAdComments(ad: any) {
    ad.showComments = !ad.showComments;
  }

  async deleteAd(ad: any) {
    if (!confirm('¿Estás seguro de que deseas eliminar este anuncio de forma permanente?')) return;
    
    const backupAnuncios = [...this.myAnuncios];
    this.myAnuncios = this.myAnuncios.filter(item => item.id !== ad.id);
    this.calculateStats();
    
    this.errorMessage = '';
    this.successMessage = '¡Anuncio eliminado con éxito!';
    this.loadingAnuncios = true;
    
    try {
      const table = ad.type === 'service' ? 'services' : 'jobs';
      const { error } = await this.runWithTimeout<any>(
        this.supabase.client.from(table).delete().eq('id', ad.id),
        10000
      );
      if (error) throw error;
    } catch (err: any) {
      console.error('Error deleting ad:', err);
      this.myAnuncios = backupAnuncios;
      this.calculateStats();
      this.errorMessage = err.message || 'Error al eliminar el anuncio.';
      this.successMessage = '';
    } finally {
      this.loadingAnuncios = false;
    }
  }

  startEditAd(ad: any) {
    this.editingAd = ad;
    this.errorMessage = '';
    this.successMessage = '';
    this.loadAdDetailsForEdit(ad.id, ad.type);
  }

  cancelEditAd() {
    this.editingAd = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.editSelectedFile = null;
    this.editImagePreviewUrl = null;
  }

  async loadAdDetailsForEdit(id: string, type: string) {
    this.loadingAnuncios = true;
    try {
      const table = type === 'service' ? 'services' : 'jobs';
      const { data, error } = await this.runWithTimeout<any>(
        this.supabase.client.from(table).select('*').eq('id', id).single(),
        10000
      );
      if (error) throw error;
      
      let description = data.description || '';
      let keywords = '';
      
      const lines = description.split('\n');
      const cleanLines: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('Anunciante:')) {
          // Skip
        } else if (trimmed.startsWith('Miembro desde:')) {
          // Skip
        } else if (trimmed.startsWith('Palabras clave:')) {
          keywords = trimmed.replace('Palabras clave:', '').trim();
        } else {
          cleanLines.push(line);
        }
      }
      description = cleanLines.join('\n').trim();
      
      if (type === 'service') {
        this.editImagePreviewUrl = data.image_url || '';
        this.editSelectedFile = null;
        const config = data.landing_config || {};
        this.editAdForm.patchValue({
          title: data.title,
          category: data.category,
          description: description,
          keywords: keywords,
          contactName: data.contact_name || '',
          email: data.email || '',
          phone: data.phone || '',
          website: data.website || '',
          company: '',
          requirements: '',
          salary: '',
          jobType: '',
          landingTemplate: data.landing_template || 'servicios',
          landingPalette: config.palette || 'crosby',
          landingFont: config.font || 'serif',
          landingHeroImage: config.heroImage || '',
          landingOfertaTitulo: config.ofertaTitulo || '',
          landingOfertaDesc: config.ofertaDesc || '',
          landingOfertaPrecio: config.ofertaPrecio || '',
          landingHorario: config.horario || '',
          landingCobertura: config.cobertura || '',
          landingExperiencia: config.experiencia || '',
          landingConsulta: config.consulta || 'Presencial',
          landingSeguro: config.seguro || 'Sí',
          landingEspecialidad: config.especialidad || '',
          landingMenu: config.menu || '',
          landingServicios: config.servicios || '',
          landingPresentacion: config.presentacion || '',
          landingProductos: config.productos || '',
          landingPago: config.pago || 'Efectivo, Tarjeta, Twint',
          landingSobreNosotros: config.sobreNosotros || '',
          galleryUrlsRaw: (data.gallery_urls || []).join(', ')
        });
      } else {
        this.editImagePreviewUrl = null;
        this.editSelectedFile = null;
        this.editAdForm.patchValue({
          title: data.title,
          category: 'Empleo',
          description: description,
          keywords: keywords,
          contactName: '',
          email: data.contact_email || '',
          phone: data.contact_phone || '',
          website: '',
          company: data.company || '',
          requirements: data.requirements || '',
          salary: data.salary || 'A convenir',
          jobType: data.job_type || 'Full-time'
        });
      }
    } catch (err: any) {
      console.error('Error fetching ad details for edit:', err);
      this.errorMessage = 'No se pudieron cargar los detalles del anuncio para editar.';
      this.editingAd = null;
    } finally {
      this.loadingAnuncios = false;
    }
  }

  async saveEditAd() {
    if (this.editAdForm.invalid) {
      this.editAdForm.markAllAsTouched();
      return;
    }
    
    this.errorMessage = '';
    this.successMessage = '¡Anuncio actualizado con éxito!';
    
    const formValues = this.editAdForm.value;
    const announcerName = formValues.contactName || `${this.user?.user_metadata?.['first_name'] || ''} ${this.user?.user_metadata?.['last_name'] || ''}`.trim();
    const registeredSince = this.user?.created_at 
      ? new Date(this.user.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
      
    const cleanKeywords = formValues.keywords
      ? formValues.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0)
      : [];
      
    let descriptionWithKeywords = formValues.description;
    descriptionWithKeywords += `\n\nAnunciante: ${announcerName}`;
    if (registeredSince) {
      descriptionWithKeywords += `\nMiembro desde: ${registeredSince}`;
    }
    if (cleanKeywords.length > 0) {
      descriptionWithKeywords += `\nPalabras clave: ${cleanKeywords.join(', ')}`;
    }
      
    const updatedDate = new Date().toISOString();
    const adToEdit = { ...this.editingAd };
    
    const backupAnuncios = [...this.myAnuncios];
    this.myAnuncios = this.myAnuncios.map(item => {
      if (item.id === adToEdit.id) {
        return {
          ...item,
          title: formValues.title,
          category: adToEdit.type === 'service' ? formValues.category : 'Empleo',
          createdAt: 'Recién editado',
          imageUrl: adToEdit.type === 'service' ? (this.editImagePreviewUrl || '') : ''
        };
      }
      return item;
    });
    this.calculateStats();
    this.editingAd = null;
    this.loadingAnuncios = true;

    try {
      const table = adToEdit.type === 'service' ? 'services' : 'jobs';
      let payload: any = {};
      
      if (adToEdit.type === 'service') {
        let imageUrl = adToEdit.imageUrl || '';
        if (this.editSelectedFile) {
          const ext = this.editSelectedFile.name.split('.').pop();
          const path = `services/${Math.random()}.${ext}`;
          imageUrl = await this.runWithTimeout<any>(
            this.servicesCatalogService.uploadFile('assets', path, this.editSelectedFile),
            15000
          );
        } else if (this.editImagePreviewUrl === null) {
          imageUrl = '';
        }

        const galleryUrls = formValues.galleryUrlsRaw
          ? formValues.galleryUrlsRaw.split(',').map((url: string) => url.trim()).filter((url: string) => url.length > 0)
          : [];

        let config: any = {};
        if (formValues.landingTemplate) {
          config = {
            palette: formValues.landingPalette || 'crosby',
            font: formValues.landingFont || 'serif',
            heroImage: formValues.landingHeroImage || '',
            ofertaTitulo: formValues.landingOfertaTitulo || '',
            ofertaDesc: formValues.landingOfertaDesc || '',
            ofertaPrecio: formValues.landingOfertaPrecio || ''
          };

          if (formValues.landingTemplate === 'servicios') {
            config.horario = formValues.landingHorario || '';
            config.cobertura = formValues.landingCobertura || '';
            config.experiencia = formValues.landingExperiencia || '';
          } else if (formValues.landingTemplate === 'particulares') {
            config.consulta = formValues.landingConsulta || 'Presencial';
            config.seguro = formValues.landingSeguro || 'Sí';
            config.especialidad = formValues.landingEspecialidad || '';
          } else if (formValues.landingTemplate === 'restauracion') {
            config.menu = formValues.landingMenu || '';
            config.servicios = formValues.landingServicios || '';
            config.presentacion = formValues.landingPresentacion || '';
          } else if (formValues.landingTemplate === 'venta') {
            config.productos = formValues.landingProductos || '';
            config.pago = formValues.landingPago || '';
            config.sobreNosotros = formValues.landingSobreNosotros || '';
          } else if (formValues.landingTemplate === 'empleo') {
            config.salary = formValues.salary || 'A convenir';
            config.jobType = formValues.jobType || 'Full-time';
            config.requirements = formValues.requirements || '';
          }
        }

        payload = {
          title: formValues.title,
          category: formValues.category,
          description: descriptionWithKeywords,
          contact_name: formValues.contactName,
          phone: formValues.phone,
          email: formValues.email,
          website: formValues.website,
          image_url: imageUrl,
          created_at: updatedDate,
          gallery_urls: galleryUrls,
          landing_template: formValues.landingTemplate,
          landing_config: config
        };
      } else {
        payload = {
          title: formValues.title,
          company: formValues.company,
          description: descriptionWithKeywords,
          requirements: formValues.requirements,
          salary: formValues.salary,
          job_type: formValues.jobType,
          contact_email: formValues.email,
          contact_phone: formValues.phone,
          created_at: updatedDate
        };
      }
      
      const { error } = await this.runWithTimeout<any>(
        this.supabase.client.from(table).update(payload).eq('id', adToEdit.id),
        10000
      );
      if (error) throw error;
      
      this.loadMyAnunciosBackground();
    } catch (err: any) {
      console.error('Error updating ad:', err);
      this.myAnuncios = backupAnuncios;
      this.calculateStats();
      this.errorMessage = err.message || 'Error al actualizar el anuncio.';
      this.successMessage = '';
    } finally {
      this.loadingAnuncios = false;
    }
  }

  async onEditFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Por favor, selecciona un archivo de imagen válido.';
      return;
    }

    this.errorMessage = '';
    this.loadingAnuncios = true;

    try {
      const compressedFile = await this.compressImage(file);
      this.editSelectedFile = compressedFile;
      this.editImagePreviewUrl = URL.createObjectURL(compressedFile);
    } catch (err: any) {
      console.error('Error compressing image:', err);
      this.errorMessage = 'No se pudo procesar la imagen seleccionada.';
    } finally {
      this.loadingAnuncios = false;
    }
  }

  removeEditFile() {
    this.editSelectedFile = null;
    this.editImagePreviewUrl = null;
  }

  private compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDimension = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context could not be created'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Blob conversion failed'));
                return;
              }
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + '.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            0.75
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }

  openKeywordsModal() {
    this.keywordsModalVisible = true;
  }

  closeKeywordsModal() {
    this.keywordsModalVisible = false;
  }

  openPreviewModal(ad: any) {
    let cleanDescription = ad.description || '';
    let announcerName = '';
    let registeredSince = '';
    
    if (ad.description) {
      const lines = ad.description.split('\n');
      const cleanLines: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('Anunciante:')) {
          announcerName = trimmed.replace('Anunciante:', '').trim();
        } else if (trimmed.startsWith('Miembro desde:')) {
          registeredSince = trimmed.replace('Miembro desde:', '').trim();
        } else if (trimmed.startsWith('Palabras clave:')) {
          // Skip keywords
        } else {
          cleanLines.push(line);
        }
      }
      cleanDescription = cleanLines.join('\n').trim();
    }

    let formattedDate = '';
    const dateSource = ad.createdAt || ad.created_at;
    if (dateSource && dateSource !== 'Recién editado') {
      try {
        formattedDate = new Date(dateSource)
          .toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
          .toUpperCase();
      } catch (e) {
        formattedDate = 'RECIÉN EDITADO';
      }
    } else {
      formattedDate = 'RECIÉN EDITADO';
    }

    this.previewAd = {
      ...ad,
      createdAt: formattedDate,
      cleanDescription,
      announcerName: announcerName || `${this.user?.user_metadata?.['first_name'] || ''} ${this.user?.user_metadata?.['last_name'] || ''}`.trim(),
      registeredSince: registeredSince || (this.user?.created_at ? new Date(this.user.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : ''),
      commentSentiment: 'favor',
      messageSenderName: '',
      messageSubject: '',
      messageText: ''
    };

    // Load comments in background
    this.interactionService.getComments(ad.id)
      .then(comments => {
        if (this.previewAd && this.previewAd.id === ad.id) {
          this.previewAd.comments = comments;
        }
      });

    // Load rating stats
    this.interactionService.getRatingStats(ad.id)
      .then(stats => {
        if (this.previewAd && this.previewAd.id === ad.id) {
          this.previewAd.totalLikes = stats.totalLikes;
          this.previewAd.totalDislikes = stats.totalDislikes;
          this.previewAd.userVote = stats.userVote;
          this.previewAd.avgStars = stats.avgStars;
        }
      });

    if (ad.type) {
      this.interactionService.incrementClicks(ad.id, ad.type, ad.clicks || 0).then(nextClicks => {
        ad.clicks = nextClicks;
        if (this.previewAd && this.previewAd.id === ad.id) {
          this.previewAd.clicks = nextClicks;
        }
        this.calculateStats();
      }).catch(err => console.error('Error incrementing preview clicks:', err));
    }

    this.showPreviewModal = true;
  }

  closePreviewModal() {
    this.previewAd = null;
    this.showPreviewModal = false;
  }

  async likeAd(ad: any) {
    const prevVote = ad.userVote;
    const isUndo = prevVote === 'like';
    const newVote = isUndo ? null : 'like';

    // Optimistic UI update
    ad.userVote = newVote;
    if (isUndo) {
      ad.totalLikes = Math.max(0, (ad.totalLikes || 0) - 1);
    } else {
      ad.totalLikes = (ad.totalLikes || 0) + 1;
      if (prevVote === 'dislike') {
        ad.totalDislikes = Math.max(0, (ad.totalDislikes || 0) - 1);
      }
    }

    try {
      await this.interactionService.vote(ad.id, ad.type || 'service', newVote);
      const stats = await this.interactionService.getRatingStats(ad.id);
      ad.totalLikes = stats.totalLikes;
      ad.totalDislikes = stats.totalDislikes;
      ad.userVote = stats.userVote;
      const found = this.myAnuncios.find(x => x.id === ad.id);
      if (found) {
        found.totalLikes = stats.totalLikes;
        found.totalDislikes = stats.totalDislikes;
        found.userVote = stats.userVote;
      }
      this.calculateStats();
    } catch (e) {
      ad.userVote = prevVote;
      this.refreshAdRatingStats(ad.id);
    }
  }

  async dislikeAd(ad: any) {
    const prevVote = ad.userVote;
    const isUndo = prevVote === 'dislike';
    const newVote = isUndo ? null : 'dislike';

    // Optimistic UI update
    ad.userVote = newVote;
    if (isUndo) {
      ad.totalDislikes = Math.max(0, (ad.totalDislikes || 0) - 1);
    } else {
      ad.totalDislikes = (ad.totalDislikes || 0) + 1;
      if (prevVote === 'like') {
        ad.totalLikes = Math.max(0, (ad.totalLikes || 0) - 1);
      }
    }

    try {
      await this.interactionService.vote(ad.id, ad.type || 'service', newVote);
      const stats = await this.interactionService.getRatingStats(ad.id);
      ad.totalLikes = stats.totalLikes;
      ad.totalDislikes = stats.totalDislikes;
      ad.userVote = stats.userVote;
      const found = this.myAnuncios.find(x => x.id === ad.id);
      if (found) {
        found.totalLikes = stats.totalLikes;
        found.totalDislikes = stats.totalDislikes;
        found.userVote = stats.userVote;
      }
      this.calculateStats();
    } catch (e) {
      ad.userVote = prevVote;
      this.refreshAdRatingStats(ad.id);
    }
  }

  private refreshAdRatingStats(entityId: string) {
    this.interactionService.getRatingStats(entityId).then(stats => {
      const found = this.myAnuncios.find(x => x.id === entityId);
      if (found) {
        found.totalLikes = stats.totalLikes;
        found.totalDislikes = stats.totalDislikes;
        found.userVote = stats.userVote;
      }
      if (this.previewAd && this.previewAd.id === entityId) {
        this.previewAd.totalLikes = stats.totalLikes;
        this.previewAd.totalDislikes = stats.totalDislikes;
        this.previewAd.userVote = stats.userVote;
      }
      this.calculateStats();
    });
  }

  async rateAd(ad: any, stars: number) {
    try {
      await this.interactionService.rate(ad.id, ad.type || 'service', stars);
      const stats = await this.interactionService.getRatingStats(ad.id);
      ad.totalLikes = stats.totalLikes;
      ad.totalDislikes = stats.totalDislikes;
      ad.userVote = stats.userVote;
      const found = this.myAnuncios.find(x => x.id === ad.id);
      if (found) {
        found.totalLikes = stats.totalLikes;
        found.totalDislikes = stats.totalDislikes;
        found.userVote = stats.userVote;
      }
      this.calculateStats();
    } catch (err) {
      console.error('rateAd - error:', err);
    }
  }

  sendMessage(ad: any) {
    if (!ad.messageSubject?.trim() || !ad.messageText?.trim()) {
      alert('Por favor, completa el asunto y el mensaje.');
      return;
    }
    const email = ad.email || ad.contactEmail || '';
    if (!email) {
      alert('El anunciador no tiene un correo electrónico configurado.');
      return;
    }

    // Datos del demandante (remitente logueado)
    const reqUser = this.user;
    const reqName = `${reqUser?.user_metadata?.['first_name'] || ''} ${reqUser?.user_metadata?.['last_name'] || ''}`.trim() || reqUser?.email || 'Usuario';
    const reqEmail = reqUser?.email || 'No proporcionado';
    const reqPhone = reqUser?.user_metadata?.['phone'] || 'No proporcionado';

    const subject = encodeURIComponent(ad.messageSubject.trim());
    const bodyText = `Hola,\n\nHas recibido una consulta sobre tu anuncio "${ad.title}".\n\n` +
                     `Detalles del mensaje:\n------------------\n${ad.messageText.trim()}\n\n` +
                     `Datos del demandante (remitente):\n------------------\n` +
                     `Nombre: ${reqName}\n` +
                     `Email: ${reqEmail}\n` +
                     `Teléfono: ${reqPhone}\n\n` +
                     `Por favor, responde directamente a este correo para ponerte en contacto.`;
    const body = encodeURIComponent(bodyText);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;

    // Clear fields
    ad.messageSubject = '';
    ad.messageText = '';
  }

  addEmoji(ad: any, emoji: string) {
    ad.newCommentText = (ad.newCommentText || '') + emoji;
  }

  getCleanCommentContent(content: string): string {
    if (!content) return '';
    return content
      .replace('👍 [A FAVOR] ', '')
      .replace('👎 [EN CONTRA] ', '')
      .replace('👍 [A FAVOR]', '')
      .replace('👎 [EN CONTRA]', '');
  }

  async postChatComment(ad: any) {
    if (!ad.newCommentText?.trim()) return;

    const authorName = `${this.user?.user_metadata?.['first_name'] || ''} ${this.user?.user_metadata?.['last_name'] || ''}`.trim() || this.user?.email || 'Vecino';
    const content = ad.newCommentText.trim();

    try {
      await this.interactionService.addComment(ad.id, ad.type, authorName, content);
      ad.newCommentText = '';
      ad.comments = await this.interactionService.getComments(ad.id);
      const found = this.myAnuncios.find(x => x.id === ad.id);
      if (found) {
        found.comments = ad.comments;
      }
      this.calculateStats();
    } catch (err) {
      console.error('postChatComment - error:', err);
    }
  }

  async postComment(ad: any) {
    await this.postChatComment(ad);
  }

  getAdImage(ad: any): string {
    if (ad.imageUrl) return ad.imageUrl;
    switch (ad.category) {
      case 'Electricidad':
        return 'https://images.unsplash.com/photo-1621905252507-b354bc25edac?w=600&auto=format&fit=crop&q=60';
      case 'Servicios':
        return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=60';
      case 'Empleo':
        return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=60';
      case 'Cursos':
        return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=60';
      case 'Venta y Donaciones':
        return 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&auto=format&fit=crop&q=60';
      default:
        return 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=60';
    }
  }

  onImageError(event: any, category: string) {
    event.target.src = this.getAdImage({ category });
  }

  getCategoryEmoji(category: string): string {
    return '';
  }

  getCategoryBgClass(category: string): string {
    switch (category) {
      case 'Electricidad':
        return 'bg-amber-500/10 text-amber-800';
      case 'Servicios':
        return 'bg-brand-sage/10 text-brand-sage';
      case 'Empleo':
        return 'bg-blue-500/10 text-blue-800';
      case 'Cursos':
        return 'bg-purple-500/10 text-purple-800';
      case 'Venta y Donaciones':
        return 'bg-orange-500/10 text-orange-800';
      default:
        return 'bg-brand-charcoal/5 text-brand-charcoal/80';
    }
  }

  get sections(): FormArray {
    return this.portfolioForm?.get('sections') as FormArray;
  }

  createSectionGroup(title: string = '', content: string = ''): FormGroup {
    return this.fb.group({
      title: [title, [Validators.required]],
      content: [content, [Validators.required, Validators.minLength(10)]]
    });
  }

  addSection(title: string = '', content: string = '') {
    if (this.sections && this.sections.length < 5) {
      this.sections.push(this.createSectionGroup(title, content));
      this.cdr.detectChanges();
    }
  }

  removeSection(index: number) {
    if (this.sections && this.sections.length > 3) {
      this.sections.removeAt(index);
      this.cdr.detectChanges();
    }
  }

  // Portfolio discovery & load logic
  async loadOrCreatePortfolio() {
    if (!this.user) return;
    this.portfolioLoading = true;
    this.cdr.detectChanges();
    this.errorMessage = '';
    this.successMessage = '';

    const userId = this.user.id;

    try {
      const { data, error } = await this.runWithTimeout<any>(
        (async () => {
          return await this.supabase.client
            .from('services')
            .select('*')
            .eq('owner_id', userId);
        })()
      );

      if (error) throw error;

      const portfolio = data && data.length > 0 ? data.find((item: any) => item.landing_template !== null && item.landing_template !== undefined) : null;

      if (portfolio) {
        this.portfolioAd = portfolio;
        const config = this.portfolioAd.landing_config || {};

        // Clear sections FormArray
        while (this.sections.length !== 0) {
          this.sections.removeAt(0);
        }

        // Fill sections from database or use defaults
        const dbSections = config.sections || [];
        if (dbSections.length >= 3) {
          dbSections.forEach((s: any) => this.addSection(s.title, s.content));
        } else {
          // Default 3 sections
          this.addSection('Inicio', this.portfolioAd.description || 'Presentación de nuestro negocio...');
          this.addSection('Servicios', 'Detalles sobre los servicios y experiencia de nuestro negocio...');
          this.addSection('Contacto', 'Puedes contactar con nosotros a través de nuestro teléfono o correo.');
        }

        this.portfolioForm.patchValue({
          title: this.portfolioAd.title || '',
          description: this.portfolioAd.description || '',
          category: this.portfolioAd.category || 'Servicios y Reparación',
          contactName: this.portfolioAd.contact_name || '',
          email: this.portfolioAd.email || '',
          phone: this.portfolioAd.phone || '',
          website: this.portfolioAd.website || '',
          landingTemplate: this.portfolioAd.landing_template || 'servicios',
          landingPalette: config.palette || 'minimal',
          landingFont: config.font || 'serif',
          landingHeroImage: config.heroImage || '',
          phoneFijo: config.phoneFijo || ''
        });
      } else {
        // Pre-fill user contact info
        const metadata = this.user.user_metadata;

        // Clear and add 3 defaults
        while (this.sections.length !== 0) {
          this.sections.removeAt(0);
        }
        this.addSection('Inicio', 'Presentación detallada de nuestro negocio...');
        this.addSection('Servicios', 'Servicios de alta calidad adaptados a tus necesidades.');
        this.addSection('Contacto', 'Información de horarios y contacto.');

        this.portfolioForm.patchValue({
          title: '',
          description: '',
          category: 'Servicios y Reparación',
          contactName: `${metadata?.['first_name'] || ''} ${metadata?.['last_name'] || ''}`.trim(),
          email: this.user.email || '',
          phone: metadata?.['phone'] || '',
          phoneFijo: '',
          landingTemplate: 'servicios',
          landingPalette: 'minimal',
          landingFont: 'serif',
          landingHeroImage: this.getDefaultImage('servicios')
        });
        this.portfolioAd = null;
      }

      // Sync loaded form state to signals
      this.portfolioState.updateFromForm(this.portfolioForm.value);
    } catch (err: any) {
      console.error('Error loading portfolio:', err);
      this.errorMessage = 'No se pudo cargar la información de tu Sitio Comercial.';
      this.cdr.detectChanges();
    } finally {
      this.portfolioLoading = false;
      this.cdr.detectChanges();
    }
  }

  setLandingTemplate(template: string) {
    const currentHero = this.portfolioForm.get('landingHeroImage')?.value;
    const isDefault = !currentHero || 
      currentHero === this.getDefaultImage('servicios') ||
      currentHero === this.getDefaultImage('restauracion') ||
      currentHero === this.getDefaultImage('venta') ||
      currentHero === this.getDefaultImage('empleo') ||
      currentHero === this.getDefaultImage('particulares') ||
      currentHero === this.getDefaultImage('educacion') ||
      currentHero === this.getDefaultImage('belleza') ||
      currentHero === this.getDefaultImage('limpieza') ||
      currentHero === this.getDefaultImage('creativo') ||
      currentHero === this.getDefaultImage('mascotas') ||
      currentHero.startsWith('https://images.unsplash.com/');

    this.portfolioForm.patchValue({
      landingTemplate: template,
      ...(isDefault ? { landingHeroImage: this.getDefaultImage(template) } : {})
    });
  }

  getDefaultImage(template: string): string {
    switch (template) {
      case 'restauracion':
        return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80';
      case 'venta':
        return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80';
      case 'empleo':
        return 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&auto=format&fit=crop&q=80';
      case 'particulares':
        return 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&auto=format&fit=crop&q=80';
      case 'educacion':
        return 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=80';
      case 'belleza':
        return 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80';
      case 'limpieza':
        return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80';
      case 'creativo':
        return 'https://images.unsplash.com/photo-1588702547919-26089e690eca?w=800&auto=format&fit=crop&q=80';
      case 'mascotas':
        return 'https://images.unsplash.com/photo-1535268647977-a403b69fc756?w=800&auto=format&fit=crop&q=80';
      case 'servicios':
      default:
        return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80';
    }
  }

  async onLandingHeroSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Por favor, selecciona un archivo de imagen válido.';
      return;
    }

    try {
      const compressed = await this.compressImageToDataUrl(file);
      this.portfolioForm.patchValue({ landingHeroImage: compressed });
    } catch (err) {
      console.error('Error compressing landing cover:', err);
      this.errorMessage = 'No se pudo procesar la imagen de portada.';
    }
  }



  private compressImageToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDimension = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }

  getPreviewConfig(): any {
    if (!this.portfolioForm) return {};
    const val = this.portfolioForm.value;
    return {
      palette: val.landingPalette || 'crosby',
      font: val.landingFont || 'serif',
      heroImage: val.landingHeroImage || this.getDefaultImage(val.landingTemplate),
      sections: val.sections || []
    };
  }

  getLandingStyles(config: any): any {
    if (!config) return {};
    const palette = config.palette || 'minimal';
    
    let bg = '#1e2321';
    let text = '#fdfbf7';
    let accent = '#8ba495';
    let cardBg = 'rgba(255, 255, 255, 0.07)';
    let cardBorder = 'rgba(255, 255, 255, 0.15)';

    switch (palette) {
      case 'emmeline':
        bg = '#fcf8f2';
        text = '#2e2522';
        accent = '#8b3d2b';
        cardBg = '#ffffff';
        cardBorder = '#f1eae0';
        break;
      case 'sage':
        bg = '#f4f6f4';
        text = '#242a27';
        accent = '#2d3a34';
        cardBg = '#ffffff';
        cardBorder = '#e6eae6';
        break;
      case 'minimal':
        bg = '#ffffff';
        text = '#111111';
        accent = '#333333';
        cardBg = '#fafafa';
        cardBorder = '#eeeeee';
        break;
      case 'slate':
        bg = '#f0f3f5';
        text = '#1e293b';
        accent = '#3b82f6';
        cardBg = '#ffffff';
        cardBorder = '#e2e8f0';
        break;
      case 'clay':
        bg = '#faf6f5';
        text = '#3c2f2f';
        accent = '#b27c66';
        cardBg = '#ffffff';
        cardBorder = '#f0e5e1';
        break;
      case 'gold':
        bg = '#111111';
        text = '#f9f9f9';
        accent = '#d4af37';
        cardBg = '#1c1c1c';
        cardBorder = '#2a2a2a';
        break;
      case 'ocean':
        bg = '#f2f5f8';
        text = '#122b40';
        accent = '#0f4c81';
        cardBg = '#ffffff';
        cardBorder = '#e1e6eb';
        break;
      case 'mist':
        bg = '#fafbfa';
        text = '#1b2d20';
        accent = '#385a42';
        cardBg = '#f0f4f1';
        cardBorder = '#e2ebd5';
        break;
      case 'amber':
        bg = '#fffbf4';
        text = '#4a3728';
        accent = '#d97706';
        cardBg = '#ffffff';
        cardBorder = '#fef3c7';
        break;
    }

    const font = config.font || 'serif';
    let fontFamily = 'Georgia, serif';
    switch (font) {
      case 'sans':
        fontFamily = 'var(--font-sans, "Outfit", sans-serif)';
        break;
      case 'monospace':
        fontFamily = 'monospace';
        break;
      case 'geometric':
        fontFamily = '"Cabin", "Futura", sans-serif';
        break;
      case 'elegant':
        fontFamily = '"Great Vibes", "Playball", cursive';
        break;
    }

    const styles: any = {
      '--landing-bg': bg,
      '--landing-text': text,
      '--landing-accent': accent,
      '--landing-card-bg': cardBg,
      '--landing-card-border': cardBorder,
      'font-family': fontFamily,
      'background-color': 'var(--landing-bg)',
      'color': 'var(--landing-text)',
      'padding': '1.75rem',
      'border-radius': '0.75rem',
      'border': '1px solid var(--landing-card-border)',
      'margin-bottom': '1.5rem',
      'transition': 'all 0.3s ease'
    };

    if (config.heroImage && (palette === 'crosby' || palette === 'gold')) {
      styles['color'] = '#fdfbf7';
      styles['--landing-text'] = '#fdfbf7';
      styles['--landing-card-bg'] = 'rgba(255, 255, 255, 0.1)';
      styles['--landing-card-border'] = 'rgba(255, 255, 255, 0.2)';
    }

    return styles;
  }

  // Carrusel & touch swipe logic
  prevSlide() {
    this.currentSlideIndex = (this.currentSlideIndex - 1 + this.slides.length) % this.slides.length;
    this.activePreviewTab = this.slides[this.currentSlideIndex];
    this.scrollToActiveSlide();
  }

  nextSlide() {
    this.currentSlideIndex = (this.currentSlideIndex + 1) % this.slides.length;
    this.activePreviewTab = this.slides[this.currentSlideIndex];
    this.scrollToActiveSlide();
  }

  selectPreviewTab(tab: string) {
    this.activePreviewTab = tab;
    this.currentSlideIndex = this.slides.indexOf(tab);
    this.scrollToActiveSlide();
  }

  scrollToActiveSlide() {
    const container = document.querySelector('.slides-container');
    if (container) {
      const slideElements = container.querySelectorAll('.slide-item');
      const targetElement = slideElements[this.currentSlideIndex];
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      }
    }
  }

  onSlideScroll(event: any) {
    const container = event.target;
    const scrollLeft = container.scrollLeft;
    const width = container.clientWidth;
    if (width > 0) {
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== this.currentSlideIndex && newIndex >= 0 && newIndex < this.slides.length) {
        this.currentSlideIndex = newIndex;
        this.activePreviewTab = this.slides[this.currentSlideIndex];
      }
    }
  }

  // Save changes conditional logic
  async onSavePortfolio() {
    if (this.portfolioForm.invalid) {
      this.portfolioForm.markAllAsTouched();
      return;
    }

    if (!this.user) return;

    this.portfolioSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValues = this.portfolioForm.value;
    const config: any = {
      palette: formValues.landingPalette || 'crosby',
      font: formValues.landingFont || 'serif',
      heroImage: formValues.landingHeroImage || '',
      sections: formValues.sections || [],
      phoneFijo: formValues.phoneFijo || ''
    };

    const payload = {
      title: formValues.title,
      category: formValues.category,
      description: formValues.description,
      contact_name: formValues.contactName,
      phone: formValues.phone,
      email: formValues.email,
      website: formValues.website,
      image_url: formValues.landingHeroImage || this.getDefaultImage(formValues.landingTemplate),
      owner_id: this.user.id,
      gallery_urls: [],
      landing_template: formValues.landingTemplate,
      landing_config: config
    };

    try {
      if (this.portfolioAd) {
        const { error } = await this.supabase.client
          .from('services')
          .update(payload)
          .eq('id', this.portfolioAd.id);
        if (error) throw error;
        this.successMessage = '¡Sitio Comercial actualizado con éxito!';
      } else {
        const { error } = await this.supabase.client
          .from('services')
          .insert([payload]);
        if (error) throw error;
        this.successMessage = '¡Sitio Comercial creado con éxito!';
      }
      this.loadOrCreatePortfolio();
    } catch (err: any) {
      console.error('Error saving portfolio:', err);
      this.errorMessage = err.message || 'Error al guardar el Sitio Comercial.';
    } finally {
      this.portfolioSubmitting = false;
    }
  }

  openLandingPreviewModal() {
    this.showLandingPreviewModal = true;
  }

  closeLandingPreviewModal() {
    this.showLandingPreviewModal = false;
  }

  // ── Visual Builder Focus Mode ───────────────────────────────────

  pendingImages = new Map<string, File>();
  sliderIndices = new Map<string, number>();
  socialEditKeys = new Map<string, string>();
  showExitConfirmDialog = false;

  toolboxBlocks = [
    { type: 'text', name: 'Texto' },
    { type: 'image', name: 'Imagen' },
    { type: 'video', name: 'Video' },
    { type: 'columns', name: 'Columnas' },
    { type: 'slider', name: 'Carrusel' }
  ];

  showPalettePopover = false;
  showSocialPopover = false;
  activeSocialKeyToAdd = 'whatsapp';
  newSocialUrl = '';
  showColorPickerIdx: number | null = null;
  activeTextEditIdx: number | null = null;

  onTextClick(idx: number, event: MouseEvent) {
    if (this.portfolioState.previewMode()) return;
    event.stopPropagation();
    this.activeTextEditIdx = idx;
  }

  toggleFontWeight(idx: number) {
    const block = this.portfolioState.blocks()[idx];
    if (!block) return;
    const nextWeight = block.fontWeight === 'bold' ? 'medium' : 'bold';
    this.updateBlockProp(idx, 'fontWeight', nextWeight);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.block-toolbar') && !target.closest('[contenteditable="true"]')) {
      this.activeTextEditIdx = null;
    }
  }

  togglePalettePopover() {
    this.showPalettePopover = !this.showPalettePopover;
  }

  toggleSocialPopover() {
    this.showSocialPopover = !this.showSocialPopover;
    if (this.showSocialPopover) {
      this.newSocialUrl = '';
    }
  }

  getSocialLinkFromBlock(block: any, key: string): string {
    if (!block || !block.socialLinks) return '';
    return (block.socialLinks as any)[key] || '';
  }

  updateSocialLinkValue(key: string, value: string) {
    const blocks = [...this.portfolioState.blocks()];
    const socialBlock = blocks.find(b => b.type === 'social');
    if (socialBlock) {
      if (!socialBlock.socialLinks) socialBlock.socialLinks = {};
      (socialBlock.socialLinks as any)[key] = value;
      this.portfolioState.blocks.set(blocks);
      this.portfolioState.isDirty.set(true);
      this.cdr.detectChanges();
    }
  }

  addSocialLink(key: string, url: string) {
    this.updateSocialLinkValue(key, url);
    this.newSocialUrl = '';
    this.showSocialPopover = false;
  }

  removeSocialLink(key: string) {
    this.updateSocialLinkValue(key, '');
  }

  activeToolboxCategory = 'text';

  noReturnPredicate = () => false;

  openVisualBuilder() {
    if (!this.portfolioForm) return;
    
    // Reset helper states
    this.pendingImages.clear();
    this.sliderIndices.clear();
    this.socialEditKeys.clear();
    this.showExitConfirmDialog = false;
    this.portfolioState.previewMode.set(false);
    this.portfolioState.isDirty.set(false);
    
    // Sync latest form data to signals
    this.portfolioState.updateFromForm(this.portfolioForm.value);
    
    // Inject user profile metadata if empty
    if (this.user) {
      const metadata = this.user.user_metadata || {};
      const firstName = metadata['first_name'] || '';
      const lastName = metadata['last_name'] || '';
      const phone = metadata['phone'] || '';
      const email = this.user.email || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      if (!this.portfolioState.title()) {
        this.portfolioState.title.set(fullName || 'Mi Negocio');
      }
      if (!this.portfolioState.contactName()) {
        this.portfolioState.contactName.set(fullName);
      }
      if (!this.portfolioState.email()) {
        this.portfolioState.email.set(email);
      }
      if (!this.portfolioState.phone()) {
        this.portfolioState.phone.set(phone);
      }
    }
    
    // Load blocks
    const config = this.portfolioAd?.landing_config || {};
    this.portfolioState.loadBlocksFromConfig(config);
    
    // Check and load draft if it exists
    if (config.draft) {
      this.portfolioState.title.set(config.draft.title || this.portfolioState.title());
      this.portfolioState.description.set(config.draft.description || this.portfolioState.description());
      this.portfolioState.landingPalette.set(config.draft.palette || this.portfolioState.landingPalette());
      this.portfolioState.landingFont.set(config.draft.font || this.portfolioState.landingFont());
      this.portfolioState.landingHeroImage.set(config.draft.heroImage || this.portfolioState.landingHeroImage());
      this.portfolioState.bgOverlayOpacity.set(config.draft.bgOverlayOpacity ?? this.portfolioState.bgOverlayOpacity());
      if (config.draft.blocks) {
        this.portfolioState.blocks.set(config.draft.blocks);
      }
    }
    
    const menuBlock = this.portfolioState.blocks().find(b => b.type === 'menu');
    if (menuBlock && menuBlock.menuLinks && menuBlock.menuLinks.length > 0) {
      this.activeSectionLabel.set(menuBlock.menuLinks[0].label);
    } else {
      this.activeSectionLabel.set('Inicio');
    }
    this.activeMobileTab.set('canvas');

    this.portfolioState.showVisualBuilder.set(true);
    this.cdr.detectChanges();
  }

  closeVisualBuilder() {
    if (this.portfolioState.isDirty()) {
      this.showExitConfirmDialog = true;
      this.cdr.detectChanges();
    } else {
      this.closeVisualBuilderConfirm();
    }
  }

  closeVisualBuilderConfirm() {
    this.showExitConfirmDialog = false;
    this.portfolioState.showVisualBuilder.set(false);
    this.portfolioState.isDirty.set(false);
    this.cdr.detectChanges();
  }

  createBlockInstance(blockType: string): PortfolioBlock {
    const newBlock: any = {
      id: `block_${blockType}_${Date.now()}`,
      type: blockType
    };
    if (blockType === 'text') {
      newBlock.content = 'Haz clic para editar este texto';
      newBlock.fontSize = 'base';
      newBlock.fontWeight = 'normal';
      newBlock.fontFamily = 'sans';
    } else if (blockType === 'social') {
      newBlock.socialLinks = {
        whatsapp: this.portfolioState.phone() || '',
        email: this.portfolioState.email() || '',
        website: this.portfolioState.website() || '',
        instagram: '',
        linkedin: '',
        facebook: '',
        x: '',
        youtube: ''
      };
    } else if (blockType === 'columns') {
      newBlock.layoutCols = 2;
      newBlock.columns = [
        { blocks: [] },
        { blocks: [] }
      ];
    } else if (blockType === 'menu') {
      newBlock.menuLinks = [
        { label: 'Sección 1', anchor: '#seccion-1' },
        { label: 'Sección 2', anchor: '#seccion-2' },
        { label: 'Sección 3', anchor: '#seccion-3' }
      ];
    } else if (blockType === 'slider') {
      newBlock.sliderSlides = [
        { url: '', text: 'Slide 1' },
        { url: '', text: 'Slide 2' },
        { url: '', text: 'Slide 3' }
      ];
    }
    return newBlock;
  }

  getConnectedLists(): string[] {
    const listIds = ['canvas-blocks-list'];
    for (const b of this.portfolioState.blocks()) {
      if (b.type === 'columns' && b.columns) {
        for (let i = 0; i < (b.layoutCols || 2); i++) {
          listIds.push(`col-drop-${b.id}-${i}`);
        }
      }
    }
    return listIds;
  }

  onBlockDropped(event: any) {
    const blocksList = [...this.portfolioState.blocks()];
    if (event.previousContainer.id === 'canvas-blocks-list' && event.container.id === 'canvas-blocks-list') {
      // Reorder inside main canvas
      const [movedItem] = blocksList.splice(event.previousIndex, 1);
      blocksList.splice(event.currentIndex, 0, movedItem);
      this.portfolioState.blocks.set(blocksList);
    } else if (event.previousContainer.id === 'toolbox-list' && event.container.id === 'canvas-blocks-list') {
      // Dragging from toolbox into main canvas
      const blockType = event.previousContainer.data[event.previousIndex].type;
      const newBlock = this.createBlockInstance(blockType);
      blocksList.splice(event.currentIndex, 0, newBlock);
      this.portfolioState.blocks.set(blocksList);
    }
    this.portfolioState.isDirty.set(true);
    this.cdr.detectChanges();
  }

  onNestedBlockDropped(event: any, parentBlockId: string, colIdx: number) {
    const blocksList = [...this.portfolioState.blocks()];
    const parentBlock = blocksList.find(b => b.id === parentBlockId);
    if (!parentBlock || !parentBlock.columns) return;
    
    const colBlocks = [...parentBlock.columns[colIdx].blocks];
    
    if (event.previousContainer === event.container) {
      // Reorder inside the same column
      const [movedItem] = colBlocks.splice(event.previousIndex, 1);
      colBlocks.splice(event.currentIndex, 0, movedItem);
      parentBlock.columns[colIdx].blocks = colBlocks;
    } else {
      // Dragging from another container
      let draggedBlock: PortfolioBlock;
      
      if (event.previousContainer.id === 'toolbox-list') {
        // Dragging from toolbox
        const blockType = event.previousContainer.data[event.previousIndex].type;
        // Don't allow nested layout containers inside columns
        if (['columns', 'menu', 'slider'].includes(blockType)) {
          this.errorMessage = 'No se permiten layouts anidados en las columnas.';
          this.cdr.detectChanges();
          return;
        }
        draggedBlock = this.createBlockInstance(blockType);
      } else {
        // Dragging from main canvas or another column
        draggedBlock = event.item.data;
        // Remove from its previous location
        this.removeBlockFromCanvas(draggedBlock.id);
      }
      
      colBlocks.splice(event.currentIndex, 0, draggedBlock);
      parentBlock.columns[colIdx].blocks = colBlocks;
    }
    
    this.portfolioState.blocks.set(blocksList);
    this.portfolioState.isDirty.set(true);
    this.cdr.detectChanges();
  }

  removeBlockFromCanvas(blockId: string) {
    const blocksList = [...this.portfolioState.blocks()];
    // Check if it's in the main list
    const mainIdx = blocksList.findIndex(b => b.id === blockId);
    if (mainIdx > -1) {
      blocksList.splice(mainIdx, 1);
      this.portfolioState.blocks.set(blocksList);
      return;
    }
    // Check inside columns
    for (const b of blocksList) {
      if (b.type === 'columns' && b.columns) {
        for (const col of b.columns) {
          const childIdx = col.blocks.findIndex(c => c.id === blockId);
          if (childIdx > -1) {
            col.blocks.splice(childIdx, 1);
            this.portfolioState.blocks.set(blocksList);
            return;
          }
        }
      }
    }
  }

  removeBlock(idx: number) {
    const list = [...this.portfolioState.blocks()];
    list.splice(idx, 1);
    this.portfolioState.blocks.set(list);
    this.portfolioState.isDirty.set(true);
    this.cdr.detectChanges();
  }

  updateBlockProp(idx: number, prop: string, value: any) {
    const list = [...this.portfolioState.blocks()];
    if (list[idx]) {
      list[idx] = { ...list[idx], [prop]: value };
      this.portfolioState.blocks.set(list);
      this.portfolioForm.markAsDirty();
    }
  }

  updateSocialLink(idx: number, platform: string, value: string) {
    const list = [...this.portfolioState.blocks()];
    if (list[idx] && list[idx].type === 'social') {
      const socialLinks = { ...list[idx].socialLinks, [platform]: value };
      list[idx] = { ...list[idx], socialLinks };
      this.portfolioState.blocks.set(list);
      this.portfolioForm.markAsDirty();
    }
  }

  getFontSizeClass(size?: string): string {
    switch (size) {
      case 'sm': return '0.75rem';
      case 'base': return '0.95rem';
      case 'lg': return '1.15rem';
      case 'xl': return '1.4rem';
      case '2xl': return '1.75rem';
      case '3xl': return '2.25rem';
      case '4xl': return '3rem';
      default: return '0.95rem';
    }
  }

  getFontFamilyStyle(font?: string): string {
    switch (font) {
      case 'serif': return 'Georgia, serif';
      case 'sans': return 'var(--font-sans, "Outfit", sans-serif)';
      case 'mono': return 'monospace';
      case 'geometric': return '"Cabin", "Futura", sans-serif';
      case 'elegant': return '"Great Vibes", "Playball", cursive';
      default: return 'var(--font-sans, "Outfit", sans-serif)';
    }
  }

  getColIndexes(cols?: string): number[] {
    const num = parseInt(cols || '2', 10);
    return Array.from({ length: num }, (_, i) => i);
  }

  getLayoutColContent(block: any, colIdx: number): string {
    const parts = (block.content || '').split('|');
    return parts[colIdx] || `Columna ${colIdx + 1}`;
  }

  onLayoutColBlur(blockIdx: number, colIdx: number, event: FocusEvent) {
    const el = event.target as HTMLElement;
    const newVal = el.innerText.trim();
    const list = [...this.portfolioState.blocks()];
    if (list[blockIdx]) {
      const parts = (list[blockIdx].content || '').split('|');
      while (parts.length < (parseInt(String(list[blockIdx].layoutCols || '2'), 10))) {
        parts.push('');
      }
      parts[colIdx] = newVal;
      list[blockIdx] = { ...list[blockIdx], content: parts.join('|') };
      this.portfolioState.blocks.set(list);
      this.portfolioForm.markAsDirty();
    }
  }

  onCanvasTitleBlur(event: FocusEvent) {
    const el = event.target as HTMLElement;
    const newTitle = el.innerText.trim();
    if (newTitle) {
      this.portfolioState.title.set(newTitle);
      this.portfolioForm.patchValue({ title: newTitle }, { emitEvent: false });
    }
  }

  onCanvasBlockBlur(idx: number, event: FocusEvent) {
    const el = event.target as HTMLElement;
    const newVal = el.innerText.trim();
    this.updateBlockProp(idx, 'content', newVal);
  }

  async handleBlockImageUpload(event: Event, idx: number) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage = 'La imagen excede el límite de 2MB.';
      this.cdr.detectChanges();
      return;
    }
    try {
      const dataUrl = await this.compressImageToDataUrl(file);
      this.updateBlockProp(idx, 'mediaUrl', dataUrl);
      this.updateBlockProp(idx, 'mediaType', 'image');
    } catch (err) {
      console.error('Error uploading block image:', err);
    }
  }

  parseVideoUrl(url: string): string {
    if (!url) return '';
    let videoId = '';
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1]?.split('&')[0] || '';
      return `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
      return `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('vimeo.com/')) {
      videoId = url.split('vimeo.com/')[1]?.split('?')[0] || '';
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  }

  setBackgroundPreset(imageUrl: string) {
    this.portfolioState.landingHeroImage.set(imageUrl);
    this.portfolioForm.patchValue({ landingHeroImage: imageUrl });
    this.portfolioForm.markAsDirty();
  }

  async saveDraft(publish: boolean) {
    if (!this.user) return;
    this.portfolioSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    const blocks = this.portfolioState.blocks();
    
    try {
      // Defer Supabase image uploads until save is explicitly clicked
      await this.uploadPendingImages(blocks);
    } catch (uploadErr: any) {
      console.error('Error uploading pending images:', uploadErr);
      this.errorMessage = 'Error al subir las imágenes al servidor.';
      this.portfolioSubmitting = false;
      this.cdr.detectChanges();
      return;
    }

    const config = this.portfolioAd?.landing_config || {};

    const draftState = {
      title: this.portfolioState.title(),
      description: this.portfolioState.description(),
      palette: this.portfolioState.landingPalette(),
      font: this.portfolioState.landingFont(),
      heroImage: this.portfolioState.landingHeroImage(),
      bgOverlayOpacity: this.portfolioState.bgOverlayOpacity(),
      blocks: blocks
    };

    let payload: any = {};
    if (publish) {
      const mainConfig = {
        palette: draftState.palette,
        font: draftState.font,
        heroImage: draftState.heroImage,
        blocks: draftState.blocks,
        bgOverlayOpacity: draftState.bgOverlayOpacity,
        sections: this.mapBlocksToSections(blocks)
      };

      payload = {
        title: draftState.title,
        category: this.portfolioState.category(),
        description: draftState.description,
        contact_name: this.portfolioState.contactName(),
        phone: this.portfolioState.phone(),
        email: this.portfolioState.email(),
        website: this.portfolioState.website(),
        image_url: draftState.heroImage || this.getDefaultImage(this.portfolioState.landingTemplate()),
        owner_id: this.user.id,
        landing_template: this.portfolioState.landingTemplate(),
        landing_config: {
          ...config,
          ...mainConfig,
          draft: null
        }
      };
    } else {
      payload = {
        landing_config: {
          ...config,
          draft: draftState
        }
      };
    }

    try {
      if (this.portfolioAd) {
        const { error } = await this.supabase.client
          .from('services')
          .update(payload)
          .eq('id', this.portfolioAd.id);
        if (error) throw error;
        this.successMessage = publish 
          ? '¡Sitio Comercial publicado con éxito!' 
          : 'Progreso guardado como borrador.';
      } else {
        const insertPayload = {
          ...payload,
          owner_id: this.user.id,
          title: payload.title || draftState.title || 'Mi Sitio Comercial',
          category: this.portfolioState.category(),
          description: payload.description || draftState.description || 'Presentación comercial.',
          contact_name: this.portfolioState.contactName() || this.user.user_metadata?.['first_name'] || '',
          phone: this.portfolioState.phone() || 'No especificado',
          email: this.portfolioState.email() || this.user.email,
          landing_template: publish ? this.portfolioState.landingTemplate() : null
        };
        const { error } = await this.supabase.client
          .from('services')
          .insert([insertPayload]);
        if (error) throw error;
        this.successMessage = '¡Sitio Comercial creado con éxito!';
      }
      
      this.portfolioState.isDirty.set(false); // Reset dirty flag after successful save
      await this.loadOrCreatePortfolio();
      
      if (publish) {
        this.closeVisualBuilderConfirm(); // Exit builder on publish
      }
    } catch (err: any) {
      console.error('Error in saveDraft:', err);
      this.errorMessage = err.message || 'Error al guardar el portafolio.';
    } finally {
      this.portfolioSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  async uploadPendingImages(blocks: PortfolioBlock[]): Promise<void> {
    if (!this.user) return;
    for (const block of blocks) {
      // 1. Check standard image block
      if (block.type === 'image' && block.mediaUrl && block.mediaUrl.startsWith('blob:') && this.pendingImages.has(block.id)) {
        const file = this.pendingImages.get(block.id)!;
        const fileExt = file.name.split('.').pop();
        const fileName = `${this.user.id}_block_${block.id}_${Date.now()}.${fileExt}`;
        const path = `portfolios/${fileName}`;
        const publicUrl = await this.servicesCatalogService.uploadFile('assets', path, file);
        block.mediaUrl = publicUrl;
        this.pendingImages.delete(block.id);
      }
      
      // 2. Check slider slides
      if (block.type === 'slider' && block.sliderSlides) {
        for (let i = 0; i < block.sliderSlides.length; i++) {
          const slide = block.sliderSlides[i];
          const slideKey = `${block.id}-slide-${i}`;
          if (slide.url && slide.url.startsWith('blob:') && this.pendingImages.has(slideKey)) {
            const file = this.pendingImages.get(slideKey)!;
            const fileExt = file.name.split('.').pop();
            const fileName = `${this.user.id}_slide_${block.id}_${i}_${Date.now()}.${fileExt}`;
            const path = `portfolios/${fileName}`;
            const publicUrl = await this.servicesCatalogService.uploadFile('assets', path, file);
            slide.url = publicUrl;
            this.pendingImages.delete(slideKey);
          }
        }
      }

      // 3. Check nested column blocks
      if (block.type === 'columns' && block.columns) {
        for (let colIdx = 0; colIdx < block.columns.length; colIdx++) {
          const col = block.columns[colIdx];
          if (col.blocks) {
            for (const child of col.blocks) {
              const childKey = `${block.id}-col-${colIdx}-${child.id}`;
              if (child.type === 'image' && child.mediaUrl && child.mediaUrl.startsWith('blob:') && this.pendingImages.has(childKey)) {
                const file = this.pendingImages.get(childKey)!;
                const fileExt = file.name.split('.').pop();
                const fileName = `${this.user.id}_col_${child.id}_${Date.now()}.${fileExt}`;
                const path = `portfolios/${fileName}`;
                const publicUrl = await this.servicesCatalogService.uploadFile('assets', path, file);
                child.mediaUrl = publicUrl;
                this.pendingImages.delete(childKey);
              }
            }
          }
        }
      }
    }
  }

  addMenuLink(block: PortfolioBlock) {
    if (!block.menuLinks) block.menuLinks = [];
    if (block.menuLinks.length < 5) {
      const nextNum = block.menuLinks.length + 1;
      block.menuLinks.push({ label: `Sección ${nextNum}`, anchor: `#seccion-${nextNum}` });
      this.portfolioState.isDirty.set(true);
      this.cdr.detectChanges();
    }
  }
  
  removeMenuLink(block: PortfolioBlock, idx: number) {
    if (block.menuLinks && block.menuLinks.length > 3) {
      block.menuLinks.splice(idx, 1);
      this.portfolioState.isDirty.set(true);
      this.cdr.detectChanges();
    }
  }

  mobileMenuOpen = new Map<string, boolean>();

  isMobileMenuOpen(blockId: string): boolean {
    return this.mobileMenuOpen.get(blockId) || false;
  }

  toggleMobileMenu(blockId: string) {
    this.mobileMenuOpen.set(blockId, !this.isMobileMenuOpen(blockId));
    this.cdr.detectChanges();
  }

  getBlockSectionId(block: PortfolioBlock): string {
    if (block.type === 'menu') return '';
    const menuBlock = this.portfolioState.blocks().find(b => b.type === 'menu');
    if (!menuBlock || !menuBlock.menuLinks) return '';
    
    const nonMenuBlocks = this.portfolioState.blocks().filter(b => b.type !== 'menu');
    const index = nonMenuBlocks.indexOf(block);
    
    if (index >= 0 && index < menuBlock.menuLinks.length) {
      const anchor = menuBlock.menuLinks[index].anchor;
      return anchor ? anchor.replace('#', '') : '';
    }
    return '';
  }

  scrollToSection(anchor: string, event: Event) {
    event.preventDefault();
    if (!anchor) return;
    const id = anchor.startsWith('#') ? anchor.substring(1) : anchor;
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      const label = (event.target as HTMLElement)?.innerText;
      if (label) {
        this.activeSectionLabel.set(label);
      }
    }
  }

  onCanvasScroll(event: Event) {
    const container = event.target as HTMLElement;
    if (!container) return;
    
    const nonMenuBlocks = this.portfolioState.blocks().filter(b => b.type !== 'menu');
    if (nonMenuBlocks.length === 0) return;
    
    const scrollLeft = container.scrollLeft;
    const width = container.clientWidth;
    if (width <= 0) return;
    
    const activeIdx = Math.round(scrollLeft / width);
    const menuBlock = this.portfolioState.blocks().find(b => b.type === 'menu');
    if (menuBlock && menuBlock.menuLinks && activeIdx >= 0 && activeIdx < menuBlock.menuLinks.length) {
      this.activeSectionLabel.set(menuBlock.menuLinks[activeIdx].label);
    } else {
      this.activeSectionLabel.set(`Sección ${activeIdx + 1}`);
    }
  }

  getSocialBlock(): PortfolioBlock | undefined {
    return this.portfolioState.blocks().find(b => b.type === 'social');
  }

  updateSocialLinkFromSidebar(key: string, value: string) {
    const blocks = [...this.portfolioState.blocks()];
    const socialBlock = blocks.find(b => b.type === 'social');
    if (socialBlock) {
      if (!socialBlock.socialLinks) socialBlock.socialLinks = {};
      (socialBlock.socialLinks as any)[key] = value;
      this.portfolioState.blocks.set(blocks);
      this.portfolioState.isDirty.set(true);
      this.cdr.detectChanges();
    }
  }

  getBlockTextContent(block: PortfolioBlock): string {
    if (block.id === 'block_header_title') {
      return this.portfolioState.title() || block.content || '';
    }
    if (block.id === 'block_header_desc') {
      return this.portfolioState.description() || block.content || '';
    }
    return block.content || '';
  }

  updateBlockContent(block: PortfolioBlock, event: any) {
    const text = event.target.innerText;
    block.content = text;
    if (block.id === 'block_header_title') {
      this.portfolioState.title.set(text);
      if (this.portfolioForm) {
        this.portfolioForm.patchValue({ title: text });
      }
    } else if (block.id === 'block_header_desc') {
      this.portfolioState.description.set(text);
      if (this.portfolioForm) {
        this.portfolioForm.patchValue({ description: text });
      }
    }
    this.portfolioState.isDirty.set(true);
  }

  getActiveSlideIdx(blockId: string): number {
    return this.sliderIndices.get(blockId) || 0;
  }
  
  setActiveSlideIdx(blockId: string, idx: number) {
    this.sliderIndices.set(blockId, idx);
    this.cdr.detectChanges();
  }
  
  getSlideUrl(block: PortfolioBlock, idx: number): string {
    return block.sliderSlides?.[idx]?.url || '';
  }
  
  getSlideText(block: PortfolioBlock, idx: number): string {
    return block.sliderSlides?.[idx]?.text || '';
  }
  
  setSlideText(block: PortfolioBlock, idx: number, val: string) {
    if (block.sliderSlides?.[idx]) {
      block.sliderSlides[idx].text = val;
      this.portfolioState.isDirty.set(true);
    }
  }
  
  handleSlideImageUpload(event: Event, block: PortfolioBlock, slideIdx: number) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage = 'La imagen excede el límite de 2MB.';
      this.cdr.detectChanges();
      return;
    }
    
    const previewUrl = URL.createObjectURL(file);
    const slideKey = `${block.id}-slide-${slideIdx}`;
    this.pendingImages.set(slideKey, file);
    
    if (block.sliderSlides?.[slideIdx]) {
      block.sliderSlides[slideIdx].url = previewUrl;
      this.portfolioState.isDirty.set(true);
      this.cdr.detectChanges();
    }
  }

  getSocialEditKey(blockId: string): string {
    return this.socialEditKeys.get(blockId) || 'whatsapp';
  }
  
  setSocialEditKey(blockId: string, key: string) {
    this.socialEditKeys.set(blockId, key);
    this.cdr.detectChanges();
  }

  hasAnySocialLink(block: PortfolioBlock): boolean {
    if (!block.socialLinks) return false;
    return !!(
      block.socialLinks.whatsapp ||
      block.socialLinks.linkedin ||
      block.socialLinks.instagram ||
      block.socialLinks.facebook ||
      block.socialLinks.x ||
      block.socialLinks.youtube ||
      block.socialLinks.website ||
      block.socialLinks.email
    );
  }

  setColumnsLayout(block: PortfolioBlock, cols: number) {
    if (!block.columns) block.columns = [];
    const currentLen = block.columns.length;
    if (currentLen < cols) {
      for (let i = currentLen; i < cols; i++) {
        block.columns.push({ blocks: [] });
      }
    } else if (currentLen > cols) {
      block.columns.splice(cols);
    }
    block.layoutCols = cols;
    this.portfolioState.isDirty.set(true);
    this.cdr.detectChanges();
  }
  
  removeNestedBlock(parentBlockId: string, colIdx: number, childIdx: number) {
    const blocksList = [...this.portfolioState.blocks()];
    const parentBlock = blocksList.find(b => b.id === parentBlockId);
    if (parentBlock && parentBlock.columns?.[colIdx]?.blocks) {
      parentBlock.columns[colIdx].blocks.splice(childIdx, 1);
      this.portfolioState.blocks.set(blocksList);
      this.portfolioState.isDirty.set(true);
      this.cdr.detectChanges();
    }
  }

  onNestedBlockBlur(parentBlockId: string, colIdx: number, childIdx: number, event: FocusEvent) {
    const el = event.target as HTMLElement;
    const newVal = el.innerText.trim();
    const blocksList = [...this.portfolioState.blocks()];
    const parentBlock = blocksList.find(b => b.id === parentBlockId);
    if (parentBlock && parentBlock.columns?.[colIdx]?.blocks?.[childIdx]) {
      parentBlock.columns[colIdx].blocks[childIdx].content = newVal;
      this.portfolioState.blocks.set(blocksList);
      this.portfolioState.isDirty.set(true);
    }
  }

  handleNestedImageUpload(event: Event, parentBlockId: string, colIdx: number, childId: string) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage = 'La imagen excede el límite de 2MB.';
      this.cdr.detectChanges();
      return;
    }
    
    const previewUrl = URL.createObjectURL(file);
    const childKey = `${parentBlockId}-col-${colIdx}-${childId}`;
    this.pendingImages.set(childKey, file);
    
    const blocksList = [...this.portfolioState.blocks()];
    const parentBlock = blocksList.find(b => b.id === parentBlockId);
    if (parentBlock && parentBlock.columns?.[colIdx]?.blocks) {
      const child = parentBlock.columns[colIdx].blocks.find(c => c.id === childId);
      if (child) {
        child.mediaUrl = previewUrl;
        child.mediaType = 'image';
        this.portfolioState.blocks.set(blocksList);
        this.portfolioState.isDirty.set(true);
        this.cdr.detectChanges();
      }
    }
  }

  updateNestedBlockProp(parentBlockId: string, colIdx: number, childId: string, prop: string, val: any) {
    const blocksList = [...this.portfolioState.blocks()];
    const parentBlock = blocksList.find(b => b.id === parentBlockId);
    if (parentBlock && parentBlock.columns?.[colIdx]?.blocks) {
      const child = parentBlock.columns[colIdx].blocks.find(c => c.id === childId) as any;
      if (child) {
        child[prop] = val;
        this.portfolioState.blocks.set(blocksList);
        this.portfolioState.isDirty.set(true);
        this.cdr.detectChanges();
      }
    }
  }

  mapBlocksToSections(blocks: PortfolioBlock[]): PortfolioSection[] {
    const sections: PortfolioSection[] = [];
    let currentSection: PortfolioSection | null = null;

    blocks.forEach(b => {
      if (b.type === 'text') {
        const isHeader = b.fontSize === 'lg' || b.fontSize === 'xl' || b.fontSize === '2xl' || b.fontSize === '3xl' || b.fontSize === '4xl' || b.fontWeight === 'bold' || b.fontWeight === 'semibold';
        if (isHeader) {
          if (currentSection) {
            sections.push(currentSection);
          }
          currentSection = { title: b.content || 'Sección', content: '' };
        } else {
          if (!currentSection) {
            currentSection = { title: 'Inicio', content: '' };
          }
          currentSection.content += (currentSection.content ? '\n' : '') + (b.content || '');
        }
      }
    });

    if (currentSection) {
      sections.push(currentSection);
    }

    while (sections.length < 3) {
      sections.push({ title: 'Más info', content: 'Detalles adicionales sobre nuestro negocio.' });
    }

    return sections;
  }
}
