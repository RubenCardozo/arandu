import { Injectable, signal, computed } from '@angular/core';
import { PortfolioSection, PortfolioBlock, PortfolioConfig } from '@arandu/types';
export type { PortfolioSection, PortfolioBlock, PortfolioConfig } from '@arandu/types';

@Injectable({
  providedIn: 'root'
})
export class PortfolioStateService {
  // Stepper State (backward compatibility wizard steps)
  currentStep = signal<number>(1);

  // Responsive Mode State ('desktop' | 'tablet' | 'mobile' | 'mobile-landscape')
  responsiveMode = signal<'desktop' | 'tablet' | 'mobile' | 'mobile-landscape'>('desktop');

  // Control visibility of full-screen builder modal
  showVisualBuilder = signal<boolean>(false);

  // Portfolio Fields Signals
  title = signal<string>('');
  description = signal<string>('');
  category = signal<string>('Servicios y Reparación');
  contactName = signal<string>('');
  email = signal<string>('');
  phone = signal<string>('');
  phoneFijo = signal<string>('');
  website = signal<string>('');
  landingTemplate = signal<string>('servicios');
  landingPalette = signal<string>('minimal');
  landingFont = signal<string>('serif');
  landingHeroImage = signal<string>('');
  bgOverlayOpacity = signal<number>(0.4);
  isDirty = signal<boolean>(false);
  isSaved = computed(() => !this.isDirty());
  previewMode = signal<boolean>(false);

  // Blocks List Signal (Visual Builder)
  blocks = signal<PortfolioBlock[]>([]);

  // Sections Signal (legacy, computed or synced fallback)
  sections = signal<PortfolioSection[]>([
    { title: 'Inicio', content: 'Presentación detallada de nuestro negocio...' },
    { title: 'Servicios', content: 'Servicios de alta calidad adaptados a tus necesidades.' },
    { title: 'Contacto', content: 'Información de horarios and contacto.' }
  ]);

  // Computed Preview Config (sent to templates)
  previewConfig = computed(() => {
    return {
      palette: this.landingPalette(),
      font: this.landingFont(),
      heroImage: this.landingHeroImage(),
      sections: this.sections(),
      blocks: this.blocks(),
      phoneFijo: this.phoneFijo(),
      bgOverlayOpacity: this.bgOverlayOpacity()
    };
  });

  // Computed Slides (legacy, fallback)
  slides = computed(() => {
    return this.sections().map((s, idx) => s.title || `Sección ${idx + 1}`);
  });

  // Helper method to bulk update state from the FormGroup value
  updateFromForm(val: any) {
    if (!val) return;
    
    if (val.title !== undefined) this.title.set(val.title);
    if (val.description !== undefined) this.description.set(val.description);
    if (val.category !== undefined) this.category.set(val.category);
    if (val.contactName !== undefined) this.contactName.set(val.contactName);
    if (val.email !== undefined) this.email.set(val.email);
    if (val.phone !== undefined) this.phone.set(val.phone);
    if (val.phoneFijo !== undefined) this.phoneFijo.set(val.phoneFijo);
    if (val.website !== undefined) this.website.set(val.website);
    if (val.landingTemplate !== undefined) this.landingTemplate.set(val.landingTemplate);
    if (val.landingPalette !== undefined) this.landingPalette.set(val.landingPalette);
    if (val.landingFont !== undefined) this.landingFont.set(val.landingFont);
    if (val.landingHeroImage !== undefined) this.landingHeroImage.set(val.landingHeroImage);
    if (val.bgOverlayOpacity !== undefined) this.bgOverlayOpacity.set(val.bgOverlayOpacity);
    
    if (val.sections !== undefined && Array.isArray(val.sections)) {
      this.sections.set(val.sections);
    }
  }

  // Set the blocks from landing_config, fallback to sections mapping
  loadBlocksFromConfig(config: PortfolioConfig) {
    let loadedBlocks = config.blocks || [];
    
    if (loadedBlocks.length > 0) {
      // Ensure there is a menu block
      const hasMenu = loadedBlocks.some(b => b.type === 'menu');
      if (!hasMenu) {
        const defaultMenu: PortfolioBlock = {
          id: `block_menu_${Date.now()}`,
          type: 'menu',
          menuLinks: [
            { label: 'Sección 1', anchor: '#seccion-1' },
            { label: 'Sección 2', anchor: '#seccion-2' },
            { label: 'Sección 3', anchor: '#seccion-3' }
          ]
        };
        loadedBlocks = [defaultMenu, ...loadedBlocks];
      }
      
      // Ensure there is a social block
      const hasSocial = loadedBlocks.some(b => b.type === 'social');
      if (!hasSocial) {
        const defaultSocial: PortfolioBlock = {
          id: `block_social_${Date.now()}`,
          type: 'social',
          socialLinks: {
            whatsapp: this.phone() || '',
            x: '',
            facebook: '',
            instagram: '',
            youtube: '',
            website: this.website() || '',
            linkedin: '',
            email: this.email() || ''
          }
        };
        loadedBlocks = [...loadedBlocks, defaultSocial];
      }
      
      this.blocks.set(loadedBlocks);
    } else {
      // Compatibility fallback: map sections or description to blocks
      const fallbackBlocks: PortfolioBlock[] = [];
      
      // Inject Menu of Navigation at the very top by default
      fallbackBlocks.push({
        id: `block_menu_${Date.now()}`,
        type: 'menu',
        menuLinks: [
          { label: 'Inicio', anchor: '#seccion-1' },
          { label: 'Servicios', anchor: '#seccion-2' },
          { label: 'Contacto', anchor: '#seccion-3' }
        ]
      });

      // Business Header Text block (Section 1: Inicio)
      fallbackBlocks.push({
        id: 'block_header_title',
        type: 'text',
        content: this.title() || 'Mi Sitio Comercial',
        fontSize: '3xl',
        fontWeight: 'bold',
        fontFamily: 'serif'
      });

      // Description Text block (Section 2: Servicio)
      fallbackBlocks.push({
        id: 'block_header_desc',
        type: 'text',
        content: this.description() || 'Breve descripción de mis servicios.',
        fontSize: 'base',
        fontWeight: 'normal',
        fontFamily: 'sans'
      });

      // Default Social contact block (Section 3: Contacto)
      fallbackBlocks.push({
        id: 'block_default_social',
        type: 'social',
        socialLinks: {
          whatsapp: this.phone() || '',
          x: '',
          facebook: '',
          instagram: '',
          youtube: '',
          website: this.website() || '',
          linkedin: '',
          email: this.email() || ''
        }
      });

      this.blocks.set(fallbackBlocks);
    }

    if (config.bgOverlayOpacity !== undefined) {
      this.bgOverlayOpacity.set(config.bgOverlayOpacity);
    }
  }

  setStep(step: number) {
    this.currentStep.set(step);
  }

  setResponsiveMode(mode: 'desktop' | 'tablet' | 'mobile' | 'mobile-landscape') {
    this.responsiveMode.set(mode);
  }

  markDirty() {
    this.isDirty.set(true);
  }

  markSaved() {
    this.isDirty.set(false);
  }

  // Reorder sections (used for legacy components)
  reorderSections(prevIndex: number, currentIndex: number) {
    const currentSections = [...this.sections()];
    const [movedItem] = currentSections.splice(prevIndex, 1);
    currentSections.splice(currentIndex, 0, movedItem);
    this.sections.set(currentSections);
    return currentSections;
  }

  clearBlocks() {
    this.blocks.set([]);
    this.isDirty.set(true);
  }

  clearAllState() {
    this.blocks.set([]);
    this.sections.set([]);
    this.title.set('');
    this.description.set('');
    this.contactName.set('');
    this.email.set('');
    this.phone.set('');
    this.phoneFijo.set('');
    this.website.set('');
    this.landingHeroImage.set('');
    this.isDirty.set(false);

    try {
      localStorage.removeItem('arandu_portfolio_draft');
      localStorage.removeItem('arandu_session_visits');
      localStorage.removeItem('arandu_canvas_draft');
    } catch (e) {}
  }
}
