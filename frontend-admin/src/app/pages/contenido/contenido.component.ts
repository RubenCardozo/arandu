import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MediaService } from '../../services/media.service';
import { RestaurantsService } from '../../services/restaurants.service';
import { AuthService } from '../../services/auth.service';
import { NewRestaurant } from '../../models/restaurant.model';
import { NewMedia, MediaViewModel } from '../../models/media.model';

export interface EditorBlock {
  type: 'text' | 'subtitle' | 'image' | 'video';
  content: string;
  imageUrl?: string;
  file?: File;
  // Rich text formatting flags
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right' | 'justify';
}

@Component({
  selector: 'app-contenido',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './contenido.component.html',
  styleUrls: ['./contenido.component.css']
})
export class ContenidoComponent implements OnInit {
  activeSection: 'editorial' | 'directory' = 'editorial';
  
  contentForm!: FormGroup;
  editorialForm!: FormGroup;

  // Editor blocks list (Wix-style)
  blocks: EditorBlock[] = [
    { type: 'text', content: '' }
  ];

  // List of existing articles for edit/delete flow
  listaArticulos: MediaViewModel[] = [];
  editingArticleId: string | null = null;

  loading = false;
  successMessage = '';
  errorMessage = '';
  selectedFile: File | null = null; // Staged main image file for Directory/Restaurant

  // Admin details for sidebar
  adminName = 'Rubén Cardozo';
  logoFailed = false;

  // Categories allowed for editorial news/articles
  categories = [
    'Cultura',
    'Deportes',
    'Política',
    'Trámites (Estado de Genève)',
    'Economía',
    'Guía Local y Latinos'
  ];

  constructor(
    private fb: FormBuilder,
    private mediaService: MediaService,
    private restaurantsService: RestaurantsService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    // Get Admin session details for sidebar display
    const session = await this.authService.getSession();
    if (session && session.user) {
      const metadata = session.user.user_metadata;
      if (metadata && (metadata['first_name'] || metadata['last_name'])) {
        this.adminName = `${metadata['first_name'] || ''} ${metadata['last_name'] || ''}`.trim();
      }
    }

    // Initialize Directory / Commerce Form
    this.contentForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required]],
      address: ['', [Validators.required]],
      neighborhood: ['Plainpalais', [Validators.required]],
      phone: [''],
      website: [''],
      instagram: ['']
    });

    // Initialize Editorial Form
    this.editorialForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      category: ['Cultura', [Validators.required]],
      contentUrl: ['https://arandu.ch', [Validators.required]],
      author: [this.adminName, [Validators.required]],
      publishLocation: ['primera_plana', [Validators.required]]
    });

    await this.loadArticles();
  }

  async loadArticles() {
    try {
      this.listaArticulos = await this.mediaService.getAll();
    } catch (err: any) {
      console.error('Error loading articles:', err);
    }
  }

  setSection(section: 'editorial' | 'directory') {
    this.activeSection = section;
    this.successMessage = '';
    this.errorMessage = '';
    this.selectedFile = null;
    this.cancelEdit();
  }

  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
    }
  }

  // --- WIX-STYLE BLOCK EDITOR METHODS ---
  addBlock(type: 'text' | 'subtitle' | 'image' | 'video') {
    if (type === 'image' && this.getImageBlocksCount() >= 3) {
      this.errorMessage = 'Máximo 3 imágenes permitidas por artículo.';
      return;
    }
    this.blocks.push({ type, content: '', bold: false, italic: false, align: 'left' });
  }

  /** Toggle bold / italic / alignment on a text block */
  toggleFormat(index: number, format: 'bold' | 'italic') {
    const block = this.blocks[index];
    if (block) {
      block[format] = !block[format];
    }
  }

  setAlign(index: number, align: 'left' | 'center' | 'right' | 'justify') {
    const block = this.blocks[index];
    if (block) {
      block.align = align;
    }
  }

  /** Returns CSS classes for textarea based on block formatting */
  getBlockTextClass(block: EditorBlock): string {
    const classes: string[] = [];
    if (block.bold) classes.push('font-bold');
    if (block.italic) classes.push('italic');
    switch (block.align) {
      case 'center': classes.push('text-center'); break;
      case 'right':  classes.push('text-right');  break;
      case 'justify': classes.push('text-justify'); break;
      default: classes.push('text-left');
    }
    return classes.join(' ');
  }

  /** Parses 'Cultura|primera_plana' -> 'Cultura' */
  getCategoryLabel(category: string): string {
    return (category || '').split('|')[0] || category || '';
  }

  /** Parses 'Cultura|primera_plana' -> 'primera_plana', or '' if no location */
  getLocationKey(category: string): string {
    const parts = (category || '').split('|');
    return parts.length > 1 ? parts[1] : '';
  }

  /** Returns human-readable location label */
  getLocationLabel(category: string): string {
    switch (this.getLocationKey(category)) {
      case 'primera_plana':    return '🗞 1ª Plana';
      case 'ultimos_informes': return '📋 Últ. Informes';
      case 'titulares':        return '🔖 Titulares';
      case 'archivo':          return '🗄 Archivo';
      default:                 return '— Sin asignar';
    }
  }

  /** Returns Tailwind classes for the location badge */
  getLocationBadgeClass(category: string): string {
    switch (this.getLocationKey(category)) {
      case 'primera_plana':    return 'border-brand-charcoal bg-brand-charcoal text-brand-paper';
      case 'ultimos_informes': return 'border-brand-sage bg-brand-sage/20 text-brand-charcoal';
      case 'titulares':        return 'border-brand-red bg-brand-red/10 text-brand-red';
      case 'archivo':          return 'border-brand-charcoal/30 text-brand-charcoal/60';
      default:                 return 'border-brand-charcoal/20 text-brand-charcoal/40';
    }
  }

  removeBlock(index: number) {
    this.blocks.splice(index, 1);
    if (this.blocks.length === 0) {
      this.blocks.push({ type: 'text', content: '' });
    }
  }

  moveBlock(index: number, direction: 'up' | 'down') {
    if (direction === 'up' && index > 0) {
      const temp = this.blocks[index];
      this.blocks[index] = this.blocks[index - 1];
      this.blocks[index - 1] = temp;
    } else if (direction === 'down' && index < this.blocks.length - 1) {
      const temp = this.blocks[index];
      this.blocks[index] = this.blocks[index + 1];
      this.blocks[index + 1] = temp;
    }
  }

  getImageBlocksCount(): number {
    return this.blocks.filter(b => b.type === 'image').length;
  }

  onBlockFileSelected(event: any, index: number) {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      this.blocks[index].file = file;
      this.blocks[index].content = file.name;
    }
  }

  // --- EDITING / MODIFICATION FLOW ---
  editArticle(art: MediaViewModel) {
    this.editingArticleId = art.id;
    this.successMessage = '';
    this.errorMessage = '';

    // Parse category|publishLocation from stored category field
    const categoryParts = (art.category || 'Cultura').split('|');
    const cleanCategory = categoryParts[0] || 'Cultura';
    const publishLocation = categoryParts[1] || 'primera_plana';

    // Populate the Form
    this.editorialForm.patchValue({
      title: art.title,
      category: cleanCategory,
      contentUrl: art.contentUrl || 'https://arandu.ch',
      author: art.author,
      publishLocation: publishLocation
    });

    // Parse blocks from description
    try {
      const parsed = JSON.parse(art.description);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type) {
        this.blocks = parsed.map(b => ({
          type: b.type,
          content: b.type === 'image' ? '' : b.content,
          imageUrl: b.type === 'image' ? b.content : undefined
        }));
      } else {
        this.blocks = [{ type: 'text', content: art.description }];
      }
    } catch (e) {
      this.blocks = [{ type: 'text', content: art.description }];
    }
    
    // Smooth scroll to top of editor form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.editingArticleId = null;
    this.editorialForm.reset({
      title: '',
      category: 'Cultura',
      contentUrl: 'https://arandu.ch',
      author: this.adminName,
      publishLocation: 'primera_plana'
    });
    this.blocks = [{ type: 'text', content: '', bold: false, italic: false, align: 'left' }];
  }

  async deleteArticle(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar este artículo permanentemente?')) {
      return;
    }

    try {
      this.loading = true;
      await this.mediaService.delete(id);
      this.successMessage = 'Artículo eliminado con éxito.';
      await this.loadArticles();
    } catch (err: any) {
      this.errorMessage = err.message || 'Error al eliminar el artículo.';
    } finally {
      this.loading = false;
    }
  }

  // --- SUBMIT HANDLER ---
  async onSubmit() {
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    try {
      // A. DIRECTORY SUBMISSION
      if (this.activeSection === 'directory') {
        if (this.contentForm.invalid) {
          this.contentForm.markAllAsTouched();
          throw new Error('Por favor, rellena todos los campos obligatorios del Directorio.');
        }

        const restaurantPayload: NewRestaurant = {
          ...this.contentForm.value,
          logoUrl: ''
        };

        await this.restaurantsService.create(restaurantPayload, this.selectedFile || undefined);
        this.contentForm.reset({ neighborhood: 'Plainpalais' });
        this.selectedFile = null;
        this.successMessage = '¡Comercio publicado con éxito!';

      // B. EDITORIAL SUBMISSION
      } else if (this.activeSection === 'editorial') {
        if (this.editorialForm.invalid) {
          this.editorialForm.markAllAsTouched();
          throw new Error('Por favor, ingresa el título del artículo.');
        }

        // 1. Upload files for block images if any
        for (let i = 0; i < this.blocks.length; i++) {
          const block = this.blocks[i];
          if (block.type === 'image' && block.file) {
            const ext = block.file.name.split('.').pop();
            const path = `editorial/${Math.random()}.${ext}`;
            block.imageUrl = await this.mediaService.uploadFile('assets', path, block.file);
          }
        }

        // 2. Gather image URLs and map block contents
        const imageUrls = this.blocks
          .filter(b => b.type === 'image')
          .map(b => b.imageUrl || b.content)
          .filter(url => url && url.startsWith('http'));

        // Serialize block contents as description (with formatting metadata)
        const blocksPayload = this.blocks.map(b => ({
          type: b.type,
          content: b.type === 'image' ? (b.imageUrl || b.content) : b.content,
          bold: b.bold || false,
          italic: b.italic || false,
          align: b.align || 'left'
        }));
        const descriptionStr = JSON.stringify(blocksPayload);

        // Find primary video embed URL
        const videoBlock = this.blocks.find(b => b.type === 'video');
        const embedUrl = videoBlock ? videoBlock.content : '';

        // Publish location — store it inside the category field with a pipe separator
        // e.g. 'Cultura|primera_plana' so the public frontend can route it correctly
        const publishLocation = this.editorialForm.value.publishLocation || 'primera_plana';
        const categoryWithLocation = `${this.editorialForm.value.category}|${publishLocation}`;

        const mediaPayload: NewMedia = {
          title: this.editorialForm.value.title,
          type: 'article',  // always 'article' so public frontend recognizes it
          category: categoryWithLocation,
          description: descriptionStr,
          contentUrl: this.editorialForm.value.contentUrl || 'https://arandu.ch',
          embedUrl: embedUrl,
          author: this.editorialForm.value.author,
          imageUrl: JSON.stringify(imageUrls)
        };

        if (this.editingArticleId) {
          await this.mediaService.update(this.editingArticleId, mediaPayload);
          this.successMessage = '¡Artículo modificado y actualizado con éxito!';
          this.cancelEdit();
        } else {
          await this.mediaService.create(mediaPayload);
          this.successMessage = '¡Artículo publicado con éxito!';
          this.editorialForm.reset({
            title: '',
            category: 'Cultura',
            contentUrl: 'https://arandu.ch',
            author: this.adminName,
            publishLocation: 'primera_plana'
          });
          this.blocks = [{ type: 'text', content: '', bold: false, italic: false, align: 'left' }];
        }

        await this.loadArticles();
      }
    } catch (err: any) {
      this.errorMessage = err.message || 'Error al guardar el contenido.';
    } finally {
      this.loading = false;
    }
  }

  async logout() {
    await this.authService.signOut();
  }
}
