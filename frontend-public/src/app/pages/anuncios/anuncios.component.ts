import { Component, OnInit, OnDestroy, ChangeDetectorRef, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JobsService } from '../../services/jobs.service';
import { ServicesCatalogService } from '../../services/services-catalog.service';
import { InteractionService, CommentItem } from '../../services/interaction.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { SupabaseService } from '../../services/supabase.service';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

interface Anuncio {
  id: string;
  title: string;
  category: 'Empleo' | 'Servicios y Reparación' | 'Clases y Cursos' | 'Venta y Donación';
  description: string;
  contactPhone?: string;
  contactEmail?: string;
  imageUrl?: string;
  createdAt: string;
  entityType?: 'job' | 'service';
  avgStars?: number;
  totalLikes?: number;
  totalDislikes?: number;
  userVote?: 'like' | 'dislike' | null;
  isFavorite?: boolean;
  comments?: CommentItem[];
  commentCount?: number;
  viewCount?: number;
  showInteractions?: boolean;
  newAuthor?: string;
  newCommentText?: string;
  loadingComments?: boolean;
  company?: string;
  jobType?: string;
  salary?: string;
  requirements?: string;
  announcerName?: string;
  registeredSince?: string;
  cleanDescription?: string;
  clicks?: number;
  messageSenderName?: string;
  messageSubject?: string;
  messageText?: string;
  commentSentiment?: 'favor' | 'contra';
  contactName?: string;
  website?: string;
  galleryUrls?: string[];
  landingTemplate?: string;
  landingConfig?: any;
}

@Component({
  selector: 'app-anuncios',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SafeUrlPipe],
  templateUrl: './anuncios.component.html',
  styleUrls: ['./anuncios.component.css']
})
export class AnunciosComponent implements OnInit, OnDestroy {
  selectedCategory: string = 'Todo';
  selectedSubCategory: string = 'Todo';
  sortBy: 'date' | 'price' = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';
  categories: string[] = ['Todo', 'Sitios Comerciales', 'Empleo', 'Servicios y Reparación', 'Clases y Cursos', 'Venta y Donación'];
  anuncios: Anuncio[] = [];
  filteredAnuncios: Anuncio[] = [];
  loading = false;
  searchQuery: string = '';
  selectedAd: Anuncio | null = null;
  currentUser: any = null;
  showAdModal = false; // renamed from showModal
  showMoreActions = false;
  commentFocused = false;
  commentSortOrder: 'recent' | 'popular' = 'recent';
  activeCommentMenu: any = null;
  editingCommentId: string | null = null;
  editingCommentText: string = '';
  isLoggedIn = false;
  isProfileComplete = false;
  activeDetailTab = 'presentacion';
  activeAdTab: 'info' | 'mensaje' = 'info';

  // Emojis list
  suggestedEmojis = ['😀', '😂', '😍', '👍', '👏', '🔥', '🙌', '🌟', '💡', '📍'];

  // Public user profile modal properties
  showPublicProfileModal = false;
  publicProfileUser: any = null;
  publicUserAds: any[] = [];
  publicUserFavorites: any[] = [];
  publicActiveTab: 'publications' | 'favorites' = 'publications';

  // Modal navigation index
  currentAdIndex = 0;

  // Report Modal Properties
  showReportModal = false;
  reportEntityId = '';
  reportEntityType = '';
  reportReason = '';
  reportDescription = '';
  reportSuccessMessage = '';
  reportErrorMessage = '';
  copiedLinkStatus = false;
  private authSubscription!: Subscription;

  // Portfolio viewer properties
  selectedPortfolio: any = null;
  isScrolled = signal(false);
  autoplayTimer: any = null;
  activePreviewTab = 'presentacion';
  currentSlideIndex = 0;
  get slides(): string[] {
    if (!this.selectedPortfolio) return [];
    const config = this.selectedPortfolio.landingConfig || {};
    const sections = config.sections || [];
    return sections.map((s: any) => s.title || 'Sección');
  }

  // Session-based likes tracker
  likedAds: Set<string> = new Set();

  // Mock classifieds matching the Stitch layout
  mockAnuncios: Anuncio[] = [
    {
      id: 'a1',
      title: 'Artisan Électricien - Dépannage Rapide',
      category: 'Servicios y Reparación',
      description: 'Especialista en renovación eléctrica y puesta en conformidad en Ginebra. Disponible 24/7 para urgencias. Presupuesto gratuito e intervención garantizada.',
      contactPhone: '+41 22 555 01 23',
      createdAt: '22 JUN',
      imageUrl: 'https://images.unsplash.com/photo-1621905252507-b354bc25edac?w=600&auto=format&fit=crop&q=60',
      entityType: 'service'
    },
    {
      id: 'a2',
      title: 'Chef de Rang - Brasserie Histórica',
      category: 'Empleo',
      description: 'Establecimiento de renombre busca colaborador apasionado para servicio en sala. Experiencia mínima de 3 años. Excelente presentación requerida.',
      contactPhone: 'POSTULAR EN LÍNEA',
      createdAt: '21 JUN',
      entityType: 'job'
    },
    {
      id: 'a3',
      title: 'Rénovation de Combles & Charpente',
      category: 'Servicios y Reparación',
      description: 'Equipo de carpinteros experimentados ofrece servicios para la transformación de sus espacios bajo el tejado. Aislamiento ecológico, ventanas Velux y acabados en madera maciza.',
      contactPhone: '+41 78 123 45 67',
      createdAt: '20 JUN',
      imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=60',
      entityType: 'service'
    },
    {
      id: 'a4',
      title: 'Studio Amoblado - Quartier des Bains',
      category: 'Servicios y Reparación',
      description: "Magnífico estudio de 35m2, luminoso, reformado a nuevo. Cerca de todos los servicios. Libre desde el 1 de Julio. 1'850 CHF/mes gastos incluidos.",
      contactPhone: 'DOSSIER REQUERIDO',
      createdAt: '19 JUN',
      entityType: 'service'
    },
    {
      id: 'a5',
      title: 'Clases de Francés e Inglés',
      category: 'Clases y Cursos',
      description: 'Profesora certificada ofrece clases particulares o en grupos pequeños. Preparación para exámenes oficiales (DELF, Cambridge). Horarios flexibles.',
      contactPhone: '+41 22 987 65 43',
      createdAt: '18 JUN',
      entityType: 'service'
    },
    {
      id: 'a6',
      title: 'Venta de Coche Eléctrico Tesla Model 3',
      category: 'Venta y Donación',
      description: 'En perfecto estado, 30,000 km, año 2023. Batería de larga duración. Vendo por mudanza. Precio: 29000 CHF.',
      contactPhone: '+41 79 321 65 98',
      createdAt: '17 JUN',
      entityType: 'service'
    },
    {
      id: 'a7',
      title: 'Nevera / Frigo a Donar Gratis',
      category: 'Venta y Donación',
      description: 'Funciona perfectamente. A recoger en Ginebra centro. Gratis / Donación a quien la necesite.',
      contactPhone: '+41 78 777 88 99',
      createdAt: '16 JUN',
      entityType: 'service'
    }
  ];

  constructor(
    private jobsService: JobsService,
    private servicesCatalogService: ServicesCatalogService,
    private interactionService: InteractionService,
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private supabase: SupabaseService
  ) {}

  ngOnInit() {
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isLoggedIn = !!user;
      this.isProfileComplete = !!user && 
        !!user.user_metadata?.['first_name'] && 
        !!user.user_metadata?.['last_name'] && 
        !!user.user_metadata?.['phone'] && 
        !!user.user_metadata?.['address'] && 
        !!user.user_metadata?.['locality'];
      this.cdr.detectChanges();
    });

    // Failsafe timer to force loading to false and refresh view
    setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.cdr.detectChanges();
      }
    }, 1500);

    // Show mock ads initially so page loads instantly
    this.anuncios = this.mockAnuncios.map(ad => ({
      ...ad,
      imageUrl: ad.imageUrl || this.getDefaultAdImage(ad.category),
      avgStars: 0,
      totalLikes: 0,
      comments: [],
      showInteractions: false,
      newAuthor: '',
      newCommentText: '',
      loadingComments: false
    }));
    this.filteredAnuncios = this.anuncios;

    this.route.queryParams.subscribe(params => {
      this.searchQuery = params['q'] || '';
      this.loadAnuncios();
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  redirectToLogin() {
    this.router.navigate(['/registro']);
  }

  onAdImgError(ad: Anuncio) {
    ad.imageUrl = undefined;
    this.cdr.detectChanges();
  }

  redirectToProfile() {
    this.router.navigate(['/session']);
  }

  copyLinkToClipboard() {
    if (!this.selectedAd) return;
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      this.copiedLinkStatus = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.copiedLinkStatus = false;
        this.cdr.detectChanges();
      }, 2500);
    }).catch(() => {
      this.copiedLinkStatus = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.copiedLinkStatus = false;
        this.cdr.detectChanges();
      }, 2500);
    });
  }

  async loadAnuncios() {
    await this.onSearch();
  }

  async onSearch() {
    try {
      let servicesResult: any[] = [];
      let jobsResult: any[] = [];

      if (this.searchQuery.trim()) {
        const query = this.searchQuery.trim();
        [servicesResult, jobsResult] = await this.runWithTimeout(
          Promise.all([
            this.servicesCatalogService.search(query),
            this.jobsService.search(query)
          ]),
          5000
        );
      } else {
        [servicesResult, jobsResult] = await this.runWithTimeout(
          Promise.all([
            this.servicesCatalogService.getAll(),
            this.jobsService.getAll()
          ]),
          5000
        );
      }

      const combined: Anuncio[] = [];

      // Map services
      if (servicesResult && servicesResult.length > 0) {
        servicesResult.forEach((item) => {
          const category = this.mapDatabaseCategory(item.category);
          combined.push({
            id: item.id,
            title: item.title,
            category: category,
            description: item.description || '',
            contactPhone: item.phone,
            contactEmail: item.email,
            createdAt: item.createdAt,
            imageUrl: item.imageUrl || this.getDefaultAdImage(category),
            entityType: 'service',
            clicks: item.clicks || 0,
            galleryUrls: item.galleryUrls || [],
            landingTemplate: item.landingTemplate,
            landingConfig: item.landingConfig || {},
            contactName: item.contactName || '',
            website: item.website || ''
          });
        });
      }

      // Map jobs
      if (jobsResult && jobsResult.length > 0) {
        jobsResult.forEach((item) => {
          combined.push({
            id: item.id,
            title: item.title,
            category: 'Empleo',
            description: item.description || '',
            contactPhone: item.contactPhone,
            contactEmail: item.contactEmail,
            createdAt: item.createdAt,
            imageUrl: this.getDefaultAdImage('Empleo'),
            entityType: 'job',
            company: item.company,
            jobType: item.jobType,
            salary: item.salary,
            requirements: item.requirements,
            clicks: item.clicks || 0
          });
        });
      }

      // Merge database listings with mock listings (filtering out duplicates by title)
      const rawList = this.searchQuery.trim() 
        ? combined 
        : [...combined, ...this.mockAnuncios.filter(mock => !combined.some(c => c.title.toLowerCase() === mock.title.toLowerCase()))];
      
      this.anuncios = rawList.map(ad => ({
        ...ad,
        avgStars: ad.avgStars || 0,
        totalLikes: ad.totalLikes || 0,
        comments: [],
        showInteractions: false,
        newAuthor: '',
        newCommentText: '',
        loadingComments: false
      }));

      this.loading = false;
      this.filterCategory(this.selectedCategory);
      this.cdr.detectChanges();
    } catch (err) {
      console.error('AnunciosComponent.onSearch – error:', err);
      // Fallback to mock data with empty stats
      const rawList = this.searchQuery.trim() ? [] : this.mockAnuncios;
      this.anuncios = rawList.map(ad => ({
        ...ad,
        avgStars: 0,
        totalLikes: 0,
        comments: [],
        showInteractions: false,
        newAuthor: '',
        newCommentText: '',
        loadingComments: false
      }));
      this.loading = false;
      this.filterCategory(this.selectedCategory);
      this.cdr.detectChanges();
    }
  }

  mapDatabaseCategory(cat: string): 'Empleo' | 'Servicios y Reparación' | 'Clases y Cursos' | 'Venta y Donación' {
    if (!cat) return 'Servicios y Reparación';
    const lower = cat.toLowerCase();
    if (lower.includes('empleo') || lower.includes('emploi') || lower.includes('job') || lower.includes('trabaj')) {
      return 'Empleo';
    }
    if (lower.includes('curs') || lower.includes('cours') || lower.includes('formac') || lower.includes('clas')) {
      return 'Clases y Cursos';
    }
    if (lower.includes('vent') || lower.includes('donac') || lower.includes('compr')) {
      return 'Venta y Donación';
    }
    return 'Servicios y Reparación';
  }

  filterCategory(cat: string) {
    this.selectedCategory = cat;
    this.selectedSubCategory = 'Todo';
    this.applyFilters();
  }

  filterSubCategory(subCat: string) {
    this.selectedSubCategory = subCat;
    this.applyFilters();
  }

  setSortBy(sort: 'date' | 'price') {
    if (this.sortBy === sort) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sort;
      this.sortDirection = sort === 'price' ? 'asc' : 'desc';
    }
    this.applyFilters();
  }

  applyFilters() {
    let list = [...this.anuncios];

    // 1. Filter by Search Query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.description.toLowerCase().includes(q)
      );
    }

    // 2. Filter by Primary Category
    if (this.selectedCategory !== 'Todo') {
      list = list.filter(a => {
        const titleDesc = (a.title + ' ' + a.description).toLowerCase();
        
        if (this.selectedCategory === 'Sitios Comerciales') {
          return !!a.landingTemplate;
        }
        if (this.selectedCategory === 'Servicios y Reparación') {
          return a.category === 'Servicios y Reparación';
        }
        if (this.selectedCategory === 'Empleo') {
          return a.category === 'Empleo' || a.entityType === 'job';
        }
        if (this.selectedCategory === 'Clases y Cursos') {
          return a.category === 'Clases y Cursos' || 
                 titleDesc.includes('curso') || titleDesc.includes('clase') || 
                 titleDesc.includes('cours') || titleDesc.includes('lección') || 
                 titleDesc.includes('enseñanza');
        }
        if (this.selectedCategory === 'Venta y Donación') {
          return a.category === 'Venta y Donación' || 
                 titleDesc.includes('vendo') || titleDesc.includes('venta') || 
                 titleDesc.includes('coche') || titleDesc.includes('auto') || 
                 titleDesc.includes('electrodoméstico') || titleDesc.includes('regalo') || 
                 titleDesc.includes('gratis') || titleDesc.includes('donar') || 
                 titleDesc.includes('gratuit') || titleDesc.includes('dono');
        }
        return false;
      });
    }

    // 3. Filter by Secondary Sub-Category
    if (this.selectedSubCategory !== 'Todo') {
      list = list.filter(a => {
        const titleDesc = (a.title + ' ' + a.description).toLowerCase();
        
        if (this.selectedCategory === 'Empleo') {
          if (this.selectedSubCategory === 'Ofertas de empleo') {
            return a.entityType === 'job' || titleDesc.includes('busca') || titleDesc.includes('ofrezco empleo') || titleDesc.includes('contrata');
          }
          if (this.selectedSubCategory === 'Pedidos de empleo') {
            return a.entityType !== 'job' && (titleDesc.includes('busco trabajo') || titleDesc.includes('ofrezco mis servicios') || titleDesc.includes('disponible para trabajar') || titleDesc.includes('demanda'));
          }
        }
        
        if (this.selectedCategory === 'Venta y Donaciones') {
          if (this.selectedSubCategory === 'Coches') {
            return titleDesc.includes('coche') || titleDesc.includes('auto') || titleDesc.includes('voiture') || titleDesc.includes('moto');
          }
          if (this.selectedSubCategory === 'Electrodomésticos') {
            return titleDesc.includes('electrodoméstico') || titleDesc.includes('nevera') || titleDesc.includes('frigo') || titleDesc.includes('lavadora') || titleDesc.includes('tv') || titleDesc.includes('televisor') || titleDesc.includes('lavavajillas');
          }
          if (this.selectedSubCategory === 'Donar / Gratis') {
            return titleDesc.includes('regalo') || titleDesc.includes('gratis') || titleDesc.includes('donar') || titleDesc.includes('dono') || titleDesc.includes('donación') || titleDesc.includes('gratuit') || titleDesc.includes('gratuito');
          }
        }
        return true;
      });
    }

    // 4. Sorting
    if (this.sortBy === 'price') {
      const getPrice = (ad: any) => {
        const text = (ad.title + ' ' + ad.description + ' ' + (ad.salary || '')).toLowerCase();
        const priceRegex = /(\d+[\d\s\.]*)\s*(chf|usd|eur|\$|€|gastos)/;
        const match = text.match(priceRegex);
        if (match) {
          const val = parseFloat(match[1].replace(/\s/g, '').replace(/\./g, ''));
          return isNaN(val) ? Infinity : val;
        }
        return Infinity;
      };
      list.sort((a, b) => {
        const pA = getPrice(a);
        const pB = getPrice(b);
        return this.sortDirection === 'asc' ? pA - pB : pB - pA;
      });
    } else {
      const getDateMs = (ad: Anuncio) => {
        if (!ad.createdAt) return 0;
        const parsed = Date.parse(ad.createdAt);
        if (!isNaN(parsed)) return parsed;
        const months: { [key: string]: number } = { 
          'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5, 'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11,
          'jan': 0, 'apr': 3, 'aug': 7, 'dec': 11 
        };
        const parts = ad.createdAt.split(' ');
        if (parts.length === 2) {
          const day = parseInt(parts[0]);
          const monthStr = parts[1].toLowerCase().substring(0, 3);
          const month = months[monthStr] !== undefined ? months[monthStr] : 5;
          return new Date(2026, month, day).getTime();
        }
        return 0;
      };
      list.sort((a, b) => {
        const dA = getDateMs(a);
        const dB = getDateMs(b);
        if (dA !== dB) {
          return this.sortDirection === 'desc' ? dB - dA : dA - dB;
        }
        return this.sortDirection === 'desc' ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id);
      });
    }

    this.filteredAnuncios = list;
  }

  async toggleInteractions(ad: Anuncio) {
    ad.showInteractions = !ad.showInteractions;
    if (ad.showInteractions) {
      ad.loadingComments = true;
      try {
        ad.comments = await this.interactionService.getComments(ad.id);
      } catch (err) {
        console.error('toggleInteractions - error:', err);
      } finally {
        ad.loadingComments = false;
      }
    }
  }


  // New fully-featured likeAd is implemented below.

  async rateAd(ad: Anuncio, stars: number) {
    if (!ad.entityType) return;
    try {
      await this.interactionService.rate(ad.id, ad.entityType, stars);
      const stats = await this.interactionService.getRatingStats(ad.id);
      ad.totalLikes = stats.totalLikes;
      ad.avgStars = stats.avgStars;
    } catch (err) {
      console.error('rateAd - error:', err);
    }
  }

  sendMessage(ad: Anuncio) {
    if (!ad.messageSubject?.trim() || !ad.messageText?.trim()) {
      alert('Por favor, completa el asunto y el mensaje.');
      return;
    }
    const email = ad.contactEmail || '';
    if (!email) {
      alert('El anunciador no tiene un correo electrónico configurado.');
      return;
    }

    // Datos del demandante
    const reqUser = this.currentUser;
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

  addEmoji(ad: Anuncio, emoji: string) {
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

  async postChatComment(ad: Anuncio) {
    if (!ad.entityType || !ad.newCommentText?.trim()) return;
    
    const metadata = this.currentUser?.user_metadata;
    const authorName = metadata?.['nickname'] || `${metadata?.['first_name'] || ''} ${metadata?.['last_name'] || ''}`.trim() || this.currentUser?.email || 'Vecino';
    const content = ad.newCommentText.trim();

    try {
      await this.interactionService.addComment(ad.id, ad.entityType, authorName, content);
      ad.newCommentText = '';
      ad.comments = await this.interactionService.getComments(ad.id);
    } catch (err) {
      console.error('postChatComment - error:', err);
    }
  }

  getSortedComments(comments: any[]): any[] {
    if (!comments) return [];
    const copy = [...comments];
    if (this.commentSortOrder === 'recent') {
      return copy.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
    return copy.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  }

  isMyComment(comment: any): boolean {
    if (!this.currentUser || !comment) return false;
    const metadata = this.currentUser.user_metadata;
    const currentName = metadata?.['nickname'] || `${metadata?.['first_name'] || ''} ${metadata?.['last_name'] || ''}`.trim() || this.currentUser.email || 'Vecino';
    return comment.authorName === currentName;
  }

  openCommentMenu(comment: any, event: Event) {
    event.stopPropagation();
    this.activeCommentMenu = comment;
  }

  closeCommentMenu() {
    this.activeCommentMenu = null;
  }

  startEditComment(comment: any) {
    this.editingCommentId = comment.id;
    this.editingCommentText = comment.content;
    this.closeCommentMenu();
  }

  async saveEditComment(comment: any) {
    if (!this.editingCommentText.trim()) return;
    try {
      await this.interactionService.updateComment(comment.id, this.editingCommentText.trim());
      comment.content = this.editingCommentText.trim();
      this.editingCommentId = null;
      this.editingCommentText = '';
    } catch (err) {
      console.error('Error saving edited comment:', err);
    }
  }

  cancelEditComment() {
    this.editingCommentId = null;
    this.editingCommentText = '';
  }

  async deleteComment(comment: any) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta opinión?')) return;
    try {
      await this.interactionService.deleteComment(comment.id);
      if (this.selectedAd && this.selectedAd.comments) {
        this.selectedAd.comments = this.selectedAd.comments.filter((c: any) => c.id !== comment.id);
      }
      this.closeCommentMenu();
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  }

  shareComment(comment: any) {
    const textToCopy = `"${comment.content}" — por ${comment.authorName} en Arandu`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      alert('¡Comentario copiado al portapapeles!');
    }).catch(err => {
      console.error('Error copying text: ', err);
    });
    this.closeCommentMenu();
  }

  reportComment(comment: any) {
    alert('Comentario reportado. Gracias por ayudarnos a mantener la comunidad segura.');
    this.closeCommentMenu();
  }

  replyToComment(authorName: string) {
    this.commentFocused = true;
    if (this.selectedAd) {
      this.selectedAd.newCommentText = `@${authorName} ` + (this.selectedAd.newCommentText || '');
    }
  }

  async postComment(ad: Anuncio) {
    await this.postChatComment(ad);
  }

  getDefaultAdImage(category: string): string {
    switch (category) {
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
    if (event && event.target) {
      event.target.style.display = 'none';
      if (event.target.parentElement) {
        event.target.parentElement.classList.add('bg-brand-sage/10');
      }
    }
  }

  runWithTimeout<T>(promise: Promise<T>, timeoutMs: number = 15000): Promise<T> {
    let timeoutId: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('El servidor de base de datos de Supabase no responde (posiblemente esté pausado).'));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
    });
  }

  async openAdModal(ad: Anuncio) {
    if (ad.landingTemplate) {
      this.openPortfolio(ad);
      return;
    }
    
    // Find index of current ad in filtered list
    this.currentAdIndex = this.filteredAnuncios.findIndex(item => item.id === ad.id);
    if (this.currentAdIndex === -1) {
      this.currentAdIndex = 0;
    }

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
          // Skip keywords line in visual description modal
        } else {
          cleanLines.push(line);
        }
      }
      cleanDescription = cleanLines.join('\n').trim();
    }

    this.activeDetailTab = 'presentacion';
    this.activeAdTab = 'info';
    this.selectedAd = {
      ...ad,
      cleanDescription,
      announcerName,
      registeredSince,
      commentSentiment: 'favor',
      messageSenderName: '',
      messageSubject: '',
      messageText: ''
    };

    if (ad.entityType) {
      this.interactionService.incrementClicks(ad.id, ad.entityType, ad.clicks || 0).then(nextClicks => {
        ad.clicks = nextClicks;
        if (this.selectedAd && this.selectedAd.id === ad.id) {
          this.selectedAd.clicks = nextClicks;
        }
      }).catch(err => console.error('Error incrementing clicks:', err));
    }
    
    this.showAdModal = true;
    this.selectedAd.loadingComments = true;
    this.cdr.detectChanges();
    
    // Load comments in background (no await)
    this.interactionService.getComments(ad.id)
      .then(comments => {
        if (this.selectedAd && this.selectedAd.id === ad.id) {
          this.selectedAd.comments = comments;
          this.cdr.detectChanges();
        }
      })
      .catch(err => console.error('Error loading comments for modal:', err))
      .finally(() => {
        if (this.selectedAd) {
          this.selectedAd.loadingComments = false;
          this.cdr.detectChanges();
        }
      });

    // Load rating stats
    this.interactionService.getRatingStats(ad.id)
      .then(stats => {
        if (this.selectedAd && this.selectedAd.id === ad.id) {
          this.selectedAd.totalLikes = stats.totalLikes;
          this.selectedAd.totalDislikes = stats.totalDislikes;
          this.selectedAd.userVote = stats.userVote;
          this.selectedAd.avgStars = stats.avgStars;
          this.cdr.detectChanges();
        }
      })
      .catch(err => console.error('Error loading rating stats:', err));

    // Load favorite status
    this.interactionService.isFavorite(ad.id)
      .then(isFav => {
        if (this.selectedAd && this.selectedAd.id === ad.id) {
          this.selectedAd.isFavorite = isFav;
          this.cdr.detectChanges();
        }
      });
  }

  navigateAd(direction: number) {
    const nextIndex = this.currentAdIndex + direction;
    if (nextIndex >= 0 && nextIndex < this.filteredAnuncios.length) {
      this.openAdModal(this.filteredAnuncios[nextIndex]);
    }
  }

  setAdTab(tab: 'info' | 'mensaje') {
    this.activeAdTab = tab;
    this.cdr.detectChanges();
  }

  addEmojiToAd(emoji: string) {
    if (this.selectedAd) {
      this.selectedAd.newCommentText = (this.selectedAd.newCommentText || '') + emoji;
      this.cdr.detectChanges();
    }
  }

  openPublicProfile(authorName: string) {
    if (!authorName) return;
    const nameNorm = authorName.toLowerCase().trim();
    
    // Find ads created by this author
    this.publicUserAds = this.anuncios.filter(item => 
      ((item.contactName && item.contactName.toLowerCase().includes(nameNorm)) ||
       (item.announcerName && item.announcerName.toLowerCase().includes(nameNorm)) ||
       (item.title && item.title.toLowerCase().includes(nameNorm)))
    );

    // Mock favorites
    this.publicUserFavorites = this.anuncios
      .filter(item => item.totalLikes && item.totalLikes > 0)
      .slice(0, 3);

    this.publicProfileUser = {
      name: authorName,
      initials: authorName.substring(0, 2).toUpperCase(),
      email: this.publicUserAds.length > 0 ? this.publicUserAds[0].contactEmail : 'soporte@arandu.ch'
    };
    
    this.publicActiveTab = 'publications';
    this.showPublicProfileModal = true;
    this.cdr.detectChanges();
  }

  closePublicProfile() {
    this.showPublicProfileModal = false;
    this.publicProfileUser = null;
    this.cdr.detectChanges();
  }

  sendPublicMessage() {
    if (!this.publicProfileUser) return;
    const email = this.publicProfileUser.email || 'soporte@arandu.ch';
    const subject = encodeURIComponent(`Contacto desde tu perfil público en Arandu`);
    const body = encodeURIComponent(`Hola ${this.publicProfileUser.name},\n\nTe contacto desde la plataforma Arandu.\n\nPor favor, responde a este correo para ponernos en contacto.\n\nSaludos.`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }

  closeAdModal() {
    this.selectedAd = null;
    this.showAdModal = false;
  }

  // --- YOUTUBE ACTIONS ---
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
      await this.interactionService.vote(ad.id, ad.entityType || 'service', newVote);
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
      await this.interactionService.vote(ad.id, ad.entityType || 'service', newVote);
    } catch (e) {
      ad.userVote = prevVote;
      this.refreshAdRatingStats(ad.id);
    }
  }

  private refreshAdRatingStats(entityId: string) {
    this.interactionService.getRatingStats(entityId).then(stats => {
      if (this.selectedAd && this.selectedAd.id === entityId) {
        this.selectedAd.totalLikes = stats.totalLikes;
        this.selectedAd.totalDislikes = stats.totalDislikes;
        this.selectedAd.userVote = stats.userVote;
      }
    });
  }

  shareAd(ad: any) {
    const url = window.location.origin + '/anuncios?id=' + ad.id;
    navigator.clipboard.writeText(url).then(() => {
      this.copiedLinkStatus = true;
      setTimeout(() => this.copiedLinkStatus = false, 2500);
    });
  }

  async toggleFavoriteAd(ad: any) {
    if (!this.currentUser) {
      this.router.navigate(['/registro']);
      return;
    }
    try {
      const isFav = await this.interactionService.toggleFavorite(ad.id, ad.entityType || 'service');
      ad.isFavorite = isFav;
      this.cdr.detectChanges();
    } catch (e) {
      console.error(e);
    }
  }

  // --- REPORT MODAL ---
  openReportModal(entityId: string, entityType: string) {
    this.reportEntityId = entityId;
    this.reportEntityType = entityType;
    this.reportReason = '';
    this.reportDescription = '';
    this.reportSuccessMessage = '';
    this.reportErrorMessage = '';
    this.showReportModal = true;
  }

  closeReportModal() {
    this.showReportModal = false;
  }

  async submitReport() {
    if (!this.reportReason) return;
    try {
      await this.interactionService.submitReport(
        this.reportEntityId,
        this.reportEntityType,
        this.reportReason,
        this.reportDescription
      );
      this.reportSuccessMessage = '¡Gracias! Tu reporte ha sido enviado con éxito.';
      this.reportErrorMessage = '';
      setTimeout(() => {
        this.closeReportModal();
      }, 2000);
    } catch (e) {
      this.reportErrorMessage = 'Ocurrió un error al enviar el reporte. Por favor intenta de nuevo.';
      this.reportSuccessMessage = '';
    }
  }

  openPortfolio(portfolio: any) {
    this.selectedPortfolio = portfolio;
    const config = portfolio.landingConfig || {};
    const firstSection = config.sections && config.sections.length > 0 ? config.sections[0].title : 'Inicio';
    this.activePreviewTab = firstSection;
    this.currentSlideIndex = 0;
    this.startAutoplayTimer();
    this.cdr.detectChanges();
  }

  closePortfolio() {
    this.selectedPortfolio = null;
    this.stopAutoplayTimer();
    this.cdr.detectChanges();
  }

  getLandingStyles(config: any): any {
    if (!config) return {};
    const palette = config.palette || 'crosby';
    
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

  getPreviewConfig(portfolio: any): any {
    if (!portfolio) return {};
    const config = portfolio.landingConfig || {};
    return {
      palette: config.palette || 'crosby',
      font: config.font || 'serif',
      heroImage: portfolio.imageUrl || this.getDefaultImage(portfolio.landingTemplate)
    };
  }

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

  getAdImage(ad: Anuncio): string {
    if (ad.imageUrl) return ad.imageUrl;
    switch (ad.category) {
      case 'Servicios y Reparación':
        return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=60';
      case 'Empleo':
        return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=60';
      case 'Clases y Cursos':
        return 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&auto=format&fit=crop&q=60';
      case 'Venta y Donación':
        return 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&auto=format&fit=crop&q=60';
      default:
        return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=60';
    }
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

  selectDetailTab(tab: string) {
    this.activeDetailTab = tab;
  }

  sliderIndices = new Map<string, number>();
  mobileMenuOpenStates = new Map<string, boolean>();

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

  getBlockTextContent(block: any): string {
    if (block.id === 'block_header_title') {
      return this.selectedPortfolio?.title || block.content || '';
    }
    if (block.id === 'block_header_desc') {
      return this.selectedPortfolio?.description || block.content || '';
    }
    return block.content || '';
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

  getActiveSlideIdx(blockId: string): number {
    return this.sliderIndices.get(blockId) || 0;
  }

  setActiveSlideIdx(blockId: string, idx: number) {
    this.sliderIndices.set(blockId, idx);
    this.cdr.detectChanges();
  }

  getSlideUrl(block: any, idx: number): string {
    return block.sliderSlides?.[idx]?.url || '';
  }

  getSlideText(block: any, idx: number): string {
    return block.sliderSlides?.[idx]?.text || '';
  }

  toggleMobileMenu(blockId: string) {
    const current = this.mobileMenuOpenStates.get(blockId) || false;
    this.mobileMenuOpenStates.set(blockId, !current);
    this.cdr.detectChanges();
  }

  isMobileMenuOpen(blockId: string): boolean {
    return this.mobileMenuOpenStates.get(blockId) || false;
  }

  scrollToSection(anchor: string, event: Event) {
    event.preventDefault();
    if (!anchor) return;
    const cleanAnchor = anchor.replace('#', '');
    const element = document.getElementById(cleanAnchor);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  getBlockSectionId(block: any): string {
    if (block.type === 'menu' || block.type === 'social') return '';
    const config = this.selectedPortfolio?.landingConfig || {};
    const blocks = config.blocks || [];
    const menuBlock = blocks.find((b: any) => b.type === 'menu');
    if (!menuBlock || !menuBlock.menuLinks) return '';
    
    const nonMenuBlocks = blocks.filter((b: any) => b.type !== 'menu' && b.type !== 'social');
    const index = nonMenuBlocks.indexOf(block);
    
    if (index >= 0 && index < menuBlock.menuLinks.length) {
      const anchor = menuBlock.menuLinks[index].anchor;
      return anchor ? anchor.replace('#', '') : '';
    }
    return '';
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollOffset = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.isScrolled.set(scrollOffset > 50);
  }

  onPortfolioScroll(event: Event) {
    const target = event.target as HTMLElement;
    if (target) {
      this.isScrolled.set(target.scrollTop > 50);
    }
  }

  startAutoplayTimer() {
    this.stopAutoplayTimer();
    if (!this.selectedPortfolio) return;
    const config = this.selectedPortfolio.landingConfig || {};
    const blocks = config.blocks || [];
    const sliderBlock = blocks.find((b: any) => b.type === 'slider');
    if (sliderBlock && sliderBlock.sliderAutoplayInterval && sliderBlock.sliderAutoplayInterval > 0) {
      this.autoplayTimer = setInterval(() => {
        const slideCount = sliderBlock.sliderSlides?.length || 3;
        const currentIdx = this.getActiveSlideIdx(sliderBlock.id);
        const nextIdx = (currentIdx + 1) % slideCount;
        this.setActiveSlideIdx(sliderBlock.id, nextIdx);
      }, sliderBlock.sliderAutoplayInterval * 1000);
    }
  }

  stopAutoplayTimer() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }
}
