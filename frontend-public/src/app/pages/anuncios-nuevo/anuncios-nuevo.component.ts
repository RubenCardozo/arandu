import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { JobsService } from '../../services/jobs.service';
import { ServicesCatalogService } from '../../services/services-catalog.service';
import { User } from '@supabase/supabase-js';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-anuncios-nuevo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './anuncios-nuevo.component.html',
  styleUrls: ['./anuncios-nuevo.component.css']
})
export class AnunciosNuevoComponent implements OnInit, OnDestroy {
  @Input() isEmbedded = false;
  @Output() adPublished = new EventEmitter<void>();

  user: User | null = null;
  loading = false;
  submitting = false;
  isProfileIncomplete = false;
  
  isComercialModalOpen = false;
  
  adForm!: FormGroup;
  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;
  
  errorMessage = '';
  successMessage = '';
  
  showPreviewModal = false;
  previewAd: any = null;
  
  keywordsModalVisible = false;
  
  private authSubscription!: Subscription;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private jobsService: JobsService,
    private servicesService: ServicesCatalogService,
    private router: Router
  ) {}


  ngOnInit() {
    this.adForm = this.fb.group({
      type: ['service', [Validators.required]],
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
      contactName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-]{8,20}$/)]],
      website: [''],
      // Job specific fields
      company: [''],
      requirements: [''],
      salary: ['A convenir'],
      jobType: ['Full-time'],
      // Landing page settings
      hasLanding: [false],
      landingTemplate: ['servicios'],
      landingPalette: ['crosby'],
      landingFont: ['serif'],
      landingHeroImage: ['https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80'],
      // Special Offers
      landingOfertaTitulo: ['Balayage + Hidratación Orgánica'],
      landingOfertaDesc: ['Tratamiento de nutrición profunda con productos bio-botánicos, corte y peinado.'],
      landingOfertaPrecio: ['120 CHF'],
      // Specific template fields
      landingHorario: ['Martes a Sábado 09:00 - 19:00 (Cita previa)'],
      landingCobertura: ['Ginebra Centro (Rive Gauche)'],
      landingExperiencia: ['Estilistas formados en colorimetría de autor. Especialistas en cortes modernos, peinados premium y cuidado capilar sin tóxicos.'],
      // Médicos/Particulares
      landingConsulta: ['Presencial'],
      landingSeguro: ['No'],
      landingEspecialidad: ['Peluquería orgánica, manicura vegana, peinados de novia.'],
      // Restauración
      landingMenu: [''],
      landingServicios: [''],
      landingPresentacion: [''],
      // Venta
      landingProductos: [''],
      landingPago: ['Efectivo, Tarjeta, Twint'],
      landingSobreNosotros: [''],
      
      galleryUrlsRaw: ['']
    });

    // Listen to category type switch
    this.adForm.get('type')?.valueChanges.subscribe(type => {
      this.updateValidators(type);
    });

    this.authSubscription = this.authService.currentUser$.subscribe(currentUser => {
      if (currentUser === undefined) {
        this.loading = true;
        return;
      }
      this.user = currentUser;
      if (!this.user) {
        this.router.navigate(['/registro']);
        return;
      }

      // Check if profile is complete
      const metadata = this.user.user_metadata;
      const firstName = metadata?.['first_name'] || '';
      const lastName = metadata?.['last_name'] || '';
      const phone = metadata?.['phone'] || '';
      const address = metadata?.['address'] || '';
      const locality = metadata?.['locality'] || '';

      if (!firstName || !lastName || !phone || !address || !locality) {
        this.isProfileIncomplete = true;
      } else {
        this.isProfileIncomplete = false;
        // Pre-fill contact info
        this.adForm.patchValue({
          contactName: `${firstName} ${lastName}`,
          email: this.user.email || '',
          phone: phone
        });
      }
      this.loading = false;
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  openKeywordsModal() {
    this.keywordsModalVisible = true;
  }

  closeKeywordsModal() {
    this.keywordsModalVisible = false;
  }

  private updateValidators(type: 'service' | 'job' | 'landing') {
    const companyControl = this.adForm.get('company');
    if (type === 'job') {
      companyControl?.setValidators([Validators.required]);
    } else {
      companyControl?.clearValidators();
    }
    companyControl?.updateValueAndValidity();
  }

  /**
   * Handle image selection and client-side image compression
   */
  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Por favor, selecciona un archivo de imagen válido.';
      return;
    }

    this.errorMessage = '';
    this.loading = true;

    try {
      const compressedFile = await this.compressImage(file);
      this.selectedFile = compressedFile;
      this.imagePreviewUrl = URL.createObjectURL(compressedFile);
    } catch (err: any) {
      console.error('Error compressing image:', err);
      this.errorMessage = 'No se pudo procesar la imagen seleccionada.';
    } finally {
      this.loading = false;
    }
  }

  removeFile() {
    this.selectedFile = null;
    this.imagePreviewUrl = null;
  }

  /**
   * Compress image using canvas on client side
   */
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

          // Scale dimensions proportionally
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

          // Convert to blob (JPEG at 75% quality)
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

  async onSubmit() {
    if (this.adForm.invalid) {
      this.adForm.markAllAsTouched();
      return;
    }

    if (!this.user) return;

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValues = this.adForm.value;
    const announcerName = formValues.contactName || `${this.user.user_metadata?.['first_name'] || ''} ${this.user.user_metadata?.['last_name'] || ''}`.trim();
    const registeredSince = this.user.created_at 
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

    try {
      if (formValues.type === 'service' || formValues.type === 'landing') {
        const isLanding = formValues.type === 'landing';
        const galleryUrls = isLanding && formValues.galleryUrlsRaw
          ? formValues.galleryUrlsRaw.split(',').map((url: string) => url.trim()).filter((url: string) => url.length > 0)
          : [];

        let config: any = {};
        if (isLanding) {
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

        const servicePayload = {
          title: formValues.title,
          category: formValues.category,
          description: descriptionWithKeywords,
          contactName: formValues.contactName,
          phone: formValues.phone,
          email: formValues.email,
          website: formValues.website,
          ownerId: this.user.id,
          galleryUrls: galleryUrls,
          landingTemplate: isLanding ? formValues.landingTemplate : null,
          landingConfig: isLanding ? config : null
        };

        await this.servicesService.create(servicePayload, this.selectedFile || undefined);
      } else {
        const jobPayload = {
          title: formValues.title,
          company: formValues.company,
          description: descriptionWithKeywords,
          requirements: formValues.requirements,
          salary: formValues.salary,
          jobType: formValues.jobType,
          contactEmail: formValues.email,
          contactPhone: formValues.phone,
          ownerId: this.user.id
        };

        await this.jobsService.create(jobPayload);
      }

      this.successMessage = '¡Anuncio publicado con éxito!';
      this.adPublished.emit();
      if (!this.isEmbedded) {
        setTimeout(() => {
          this.router.navigate(['/anuncios']);
        }, 1500);
      } else {
        setTimeout(() => {
          this.adForm.reset({
            type: 'service',
            category: 'Electricidad',
            salary: 'A convenir',
            jobType: 'Full-time'
          });
          this.selectedFile = null;
          this.imagePreviewUrl = null;
          this.successMessage = '';
        }, 2000);
      }
    } catch (err: any) {
      this.errorMessage = err.message || 'Error inesperado al publicar tu anuncio.';
    } finally {
      this.submitting = false;
    }
  }

  // Getters for validations
  get type() { return this.adForm.get('type')?.value; }
  
  get titleInvalid() {
    const ctrl = this.adForm.get('title');
    return ctrl ? ctrl.invalid && (ctrl.dirty || ctrl.touched) : false;
  }
  
  get descInvalid() {
    const ctrl = this.adForm.get('description');
    return ctrl ? ctrl.invalid && (ctrl.dirty || ctrl.touched) : false;
  }
  
  get contactInvalid() {
    const ctrl = this.adForm.get('contactName');
    return ctrl ? ctrl.invalid && (ctrl.dirty || ctrl.touched) : false;
  }
  
  get emailInvalid() {
    const ctrl = this.adForm.get('email');
    return ctrl ? ctrl.invalid && (ctrl.dirty || ctrl.touched) : false;
  }
  
  get phoneInvalid() {
    const ctrl = this.adForm.get('phone');
    return ctrl ? ctrl.invalid && (ctrl.dirty || ctrl.touched) : false;
  }
  
  get companyInvalid() {
    const ctrl = this.adForm.get('company');
    return ctrl ? ctrl.invalid && (ctrl.dirty || ctrl.touched) : false;
  }

  get keywordsInvalid() {
    const ctrl = this.adForm.get('keywords');
    return ctrl ? ctrl.invalid && (ctrl.dirty || ctrl.touched) : false;
  }

  openPreview() {
    if (this.adForm.invalid) {
      this.adForm.markAllAsTouched();
      return;
    }
    const formValues = this.adForm.value;
    const cleanKeywords = formValues.keywords
      ? formValues.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0)
      : [];
      
    this.previewAd = {
      id: 'preview',
      title: formValues.title,
      category: formValues.type === 'job' ? 'Empleo' : formValues.category,
      description: formValues.description,
      cleanDescription: formValues.description,
      contactPhone: formValues.phone,
      contactEmail: formValues.email,
      imageUrl: this.imagePreviewUrl || undefined,
      createdAt: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).toUpperCase(),
      entityType: formValues.type,
      company: formValues.company,
      jobType: formValues.jobType,
      salary: formValues.salary,
      requirements: formValues.requirements,
      announcerName: formValues.contactName || `${this.user?.user_metadata?.['first_name'] || ''} ${this.user?.user_metadata?.['last_name'] || ''}`.trim(),
      registeredSince: this.user?.created_at 
        ? new Date(this.user.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
        : '',
      avgStars: 0,
      totalLikes: 0,
      comments: []
    };
    
    this.showPreviewModal = true;
  }

  closePreview() {
    this.showPreviewModal = false;
    this.previewAd = null;
  }

  getCategoryEmoji(category: string): string {
    switch (category) {
      case 'Electricidad':
        return '⚡';
      case 'Trabajos Casa':
      case 'Servicios':
        return '🏠';
      case 'Empleo':
        return '💼';
      case 'Cursos':
        return '📚';
      case 'Venta y Donaciones':
        return '🛍️';
      default:
        return '📣';
    }
  }

  getCategoryBgClass(category: string): string {
    switch (category) {
      case 'Electricidad':
        return 'bg-amber-500/10 text-amber-800';
      case 'Trabajos Casa':
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

  activePreviewTab = 'presentacion';

  openComercialModal() {
    this.isComercialModalOpen = true;
  }

  closeComercialModal() {
    this.isComercialModalOpen = false;
  }

  selectPreviewTab(tab: string) {
    this.activePreviewTab = tab;
  }

  getDefaultImage(template: string): string {
    switch (template) {
      case 'restauracion':
        return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80';
      case 'venta':
        return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80';
      case 'empleo':
        return 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80';
      case 'particulares':
        return 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80';
      case 'servicios':
      default:
        return 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80';
    }
  }

  async onLandingHeroSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Por favor, selecciona un archivo de imagen válido.';
      return;
    }

    this.loading = true;
    try {
      const compressed = await this.compressImageToDataUrl(file);
      this.adForm.patchValue({ landingHeroImage: compressed });
    } catch (err) {
      console.error('Error compressing landing cover:', err);
      this.errorMessage = 'No se pudo procesar la imagen de portada.';
    } finally {
      this.loading = false;
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
          const maxDimension = 800; // optimized size
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

          // high compression, very light file
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }

  getPreviewConfig(): any {
    const template = this.adForm.get('landingTemplate')?.value || 'servicios';
    return {
      palette: this.adForm.get('landingPalette')?.value || 'crosby',
      font: this.adForm.get('landingFont')?.value || 'serif',
      heroImage: this.adForm.get('landingHeroImage')?.value || this.getDefaultImage(template),
      ofertaTitulo: this.adForm.get('landingOfertaTitulo')?.value || '',
      ofertaDesc: this.adForm.get('landingOfertaDesc')?.value || '',
      ofertaPrecio: this.adForm.get('landingOfertaPrecio')?.value || ''
    };
  }

  getLandingStyles(config: any): any {
    if (!config) return {};
    const palette = config.palette || 'crosby';
    
    // Default Crosby
    let bg = '#1e2321';
    let text = '#fdfbf7';
    let accent = '#8ba495';
    let cardBg = 'rgba(255, 255, 255, 0.07)';
    let cardBorder = 'rgba(255, 255, 255, 0.15)';

    if (palette === 'emmeline') {
      bg = '#8b3d2b';
      text = '#fdfbf7';
      accent = '#e8a342';
      cardBg = 'rgba(255, 255, 255, 0.08)';
      cardBorder = 'rgba(255, 255, 255, 0.15)';
    } else if (palette === 'sage') {
      bg = '#fdfbf7';
      text = '#2d3a34';
      accent = '#8ba495';
      cardBg = 'rgba(45, 58, 52, 0.05)';
      cardBorder = 'rgba(45, 58, 52, 0.12)';
    } else if (palette === 'minimal') {
      bg = '#ffffff';
      text = '#000000';
      accent = '#333333';
      cardBg = 'rgba(0, 0, 0, 0.03)';
      cardBorder = 'rgba(0, 0, 0, 0.1)';
    } else if (palette === 'mustard') {
      bg = '#f7f4eb';
      text = '#4a3e21';
      accent = '#d4a373';
      cardBg = 'rgba(74, 62, 33, 0.05)';
      cardBorder = 'rgba(74, 62, 33, 0.12)';
    } else if (palette === 'clay') {
      bg = '#faf0e6';
      text = '#5c4033';
      accent = '#cd853f';
      cardBg = 'rgba(92, 64, 51, 0.06)';
      cardBorder = 'rgba(92, 64, 51, 0.12)';
    } else if (palette === 'ocean') {
      bg = '#1d3557';
      text = '#f1faee';
      accent = '#a8dadc';
      cardBg = 'rgba(241, 250, 238, 0.08)';
      cardBorder = 'rgba(241, 250, 238, 0.15)';
    }

    const font = config.font || 'serif';
    let fontFamily = 'Georgia, serif';
    if (font === 'sans') {
      fontFamily = 'var(--font-sans, "Outfit", sans-serif)';
    } else if (font === 'monospace') {
      fontFamily = 'monospace';
    } else if (font === 'elegant') {
      fontFamily = '"Didot", "Bodoni MT", serif';
    } else if (font === 'geometric') {
      fontFamily = '"Futura", "Trebuchet MS", sans-serif';
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

    if (config.heroImage) {
      styles['background-image'] = `linear-gradient(rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.65)), url(${config.heroImage})`;
      styles['background-size'] = 'cover';
      styles['background-position'] = 'center';
      styles['color'] = '#fdfbf7';
      styles['--landing-text'] = '#fdfbf7';
      styles['--landing-card-bg'] = 'rgba(255, 255, 255, 0.1)';
      styles['--landing-card-border'] = 'rgba(255, 255, 255, 0.2)';
    }

    return styles;
  }
}
