import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MediaService } from '../../services/media.service';
import { ServicesCatalogService } from '../../services/services-catalog.service';
import { JobsService } from '../../services/jobs.service';
import { InteractionService, CommentItem } from '../../services/interaction.service';
import { AuthService } from '../../services/auth.service';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

interface UnifiedItem {
  id: string;
  type: 'articulo' | 'anuncio' | 'portfolio';
  title: string;
  description: string;
  category: string;
  date: Date;
  imageUrl?: string;
  link: string;
  landingTemplate?: string;
  landingConfig?: any;
  contactPhone?: string;
  contactEmail?: string;
  contactName?: string;
  website?: string;
  galleryUrls?: string[];
  // Interaction stats (loaded dynamically)
  totalLikes?: number;
  totalDislikes?: number;
  commentCount?: number;
  viewCount?: number;
  userVote?: string | null;
  isFavorite?: boolean;
}

@Component({
  selector: 'app-buscar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SafeUrlPipe],
  templateUrl: './buscar.html'
})
export class BuscarComponent implements OnInit {
  searchQuery: string = '';
  activeFilter: 'TODO' | 'ARTÍCULOS' | 'ANUNCIOS' | 'PORTFOLIOS' = 'TODO';
  activeCategory: string | null = null;
  activeTemplate: string | null = null;
  activeSort: 'RELEVANCIA' | 'RECIENTES' | 'VALORADAS' | 'VISTAS' | 'COMENTADAS' | 'FAVORITAS' = 'RELEVANCIA';

  oficios = [
    { key: 'servicios', label: 'Servicios' },
    { key: 'restauracion', label: 'Comida' },
    { key: 'venta', label: 'Tienda' },
    { key: 'particulares', label: 'Tecnología' },
    { key: 'educacion', label: 'Profesor' },
    { key: 'belleza', label: 'Estética' },
    { key: 'limpieza', label: 'Limpieza' },
    { key: 'creativo', label: 'Reparación' },
    { key: 'mascotas', label: 'Mascotas' },
    { key: 'empleo', label: 'Varios' }
  ];

  // Portfolio viewer properties
  selectedPortfolio: any = null;
  activePreviewTab = 'presentacion';
  currentSlideIndex = 0;
  get slides(): string[] {
    if (!this.selectedPortfolio) return [];
    const config = this.selectedPortfolio.landingConfig || {};
    const sections = config.sections || [];
    return sections.map((s: any) => s.title || 'Sección');
  }
  
  topCategories = ['EMPLEO', 'INMOBILIARIA', 'SERVICIOS', 'RESTAURANTES', 'TRÁMITES', 'CLIMA', 'TRÁFICO', 'ANIMALES', 'CULTURA', 'EVENTOS'];

  allItems: UnifiedItem[] = [];
  filteredItems: UnifiedItem[] = [];
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  loading = true;

  // Mock ads fallback to ensure complete coverage
  mockAds: UnifiedItem[] = [
    {
      id: 'a1',
      type: 'anuncio',
      title: 'Artisan Électricien - Dépannage Rapide',
      category: 'Electricidad',
      description: 'Especialista en renovación eléctrica y puesta en conformidad en Ginebra. Disponible 24/7 para urgencias.',
      date: new Date(),
      imageUrl: 'https://images.unsplash.com/photo-1621905252507-b354bc25edac?w=600&auto=format&fit=crop&q=60',
      link: '/anuncios'
    },
    {
      id: 'a2',
      type: 'anuncio',
      title: 'Chef de Rang - Brasserie Histórica',
      category: 'Empleo',
      description: 'Establecimiento de renombre busca colaborador apasionado para servicio en sala. Experiencia de 3 años.',
      date: new Date(),
      link: '/anuncios'
    },
    {
      id: 'a3',
      type: 'anuncio',
      title: 'Rénovation de Combles & Charpente',
      category: 'Servicios',
      description: 'Equipo de carpinteros experimentados ofrece servicios para transformación de espacios bajo el tejado.',
      date: new Date(),
      imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=60',
      link: '/anuncios'
    },
    {
      id: 'a4',
      type: 'anuncio',
      title: 'Studio Amoblado - Quartier des Bains',
      category: 'Otros',
      description: 'Magnífico estudio de 35m2, luminoso, reformado a nuevo. Cerca de todos los servicios. 1850 CHF/mes.',
      date: new Date(),
      link: '/anuncios'
    },
    {
      id: 'a5',
      type: 'anuncio',
      title: 'Clases de Francés e Inglés',
      category: 'Cursos',
      description: 'Profesora certificada ofrece clases particulares o en grupos pequeños. Preparación DELF/Cambridge.',
      date: new Date(),
      link: '/anuncios'
    }
  ];

  currentUser: any = null;
  copiedLinkStatus = false;

  // Report Modal Properties
  showReportModal = false;
  reportEntityId = '';
  reportEntityType = '';
  reportReason = '';
  reportDescription = '';
  reportSuccessMessage = '';
  reportErrorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mediaService: MediaService,
    private directoryService: ServicesCatalogService,
    private jobsService: JobsService,
    private cdr: ChangeDetectorRef,
    private interactionService: InteractionService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user ?? null;
      this.cdr.detectChanges();
    });

    setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.cdr.detectChanges();
      }
    }, 1500);

    this.route.queryParams.subscribe(params => {
      this.searchQuery = params['q'] || '';
      const filterParam = params['filter'];
      if (filterParam === 'PORTFOLIOS' || filterParam === 'ANUNCIOS' || filterParam === 'ARTÍCULOS') {
        this.activeFilter = filterParam;
      }
      this.loadData();
    });
  }

  async loadData() {
    this.loading = true;
    try {
      const [mediaData, dirData, jobsData] = await Promise.all([
        this.mediaService.getAll().catch(() => []),
        this.directoryService.getAll().catch(() => []),
        this.jobsService.getAll().catch(() => [])
      ]);

      const articles: UnifiedItem[] = (mediaData || []).map((m: any) => ({
        id: m.id,
        type: 'articulo',
        title: m.title,
        description: m.description || '', 
        category: m.category || 'NOTICIA',
        date: new Date(m.publishedAt || m.createdAt || Date.now()),
        imageUrl: m.imageUrl ? (m.imageUrl.includes('[') ? this.getFirstImage(m.imageUrl) : m.imageUrl) : undefined,
        link: '/editorial'
      }));

      const servicesAds: UnifiedItem[] = (dirData || []).map((d: any) => ({
        id: d.id,
        type: d.landingTemplate ? 'portfolio' : 'anuncio',
        title: d.title,
        description: d.description || '',
        category: d.landingTemplate ? 'PORTFOLIO' : (d.category || 'SERVICIOS'),
        date: new Date(),
        imageUrl: d.imageUrl,
        link: '/anuncios',
        landingTemplate: d.landingTemplate,
        landingConfig: d.landingConfig || {},
        contactPhone: d.phone,
        contactEmail: d.email,
        contactName: d.contactName || '',
        website: d.website || '',
        galleryUrls: d.galleryUrls || []
      }));

      const jobsAds: UnifiedItem[] = (jobsData || []).map((j: any) => ({
        id: j.id,
        type: 'anuncio',
        title: j.title,
        description: j.description || '',
        category: 'EMPLEO',
        date: new Date(),
        link: '/anuncios'
      }));

      const allFetched = [...articles, ...servicesAds, ...jobsAds];
      
      // Combine fetched results with mock ads for complete coverage
      const mergedAds = [...allFetched, ...this.mockAds.filter(m => !allFetched.some(f => f.title.toLowerCase() === m.title.toLowerCase()))];

      this.allItems = mergedAds.sort((a, b) => b.date.getTime() - a.date.getTime());
      this.applyFilters();
    } catch (e) {
      console.error('BuscarComponent.loadData error:', e);
      this.allItems = this.mockAds;
      this.applyFilters();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  getFirstImage(imgStr: string): string | undefined {
    try {
      const arr = JSON.parse(imgStr);
      return arr.length > 0 ? arr[0] : undefined;
    } catch {
      return imgStr;
    }
  }

  normalizeStr(str: string): string {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  getCategoryKey(item: UnifiedItem): string {
    if (!item) return 'otros';
    if (item.type === 'articulo') return 'articulo';
    const cat = this.normalizeStr(item.category);
    if (cat.includes('electr')) return 'electricidad';
    if (cat.includes('empleo') || cat.includes('trabaj') || cat.includes('job')) return 'empleo';
    if (cat.includes('servic') || cat.includes('repar') || cat.includes('limpiez')) return 'servicios';
    if (cat.includes('curs') || cat.includes('idiom') || cat.includes('clase')) return 'cursos';
    if (cat.includes('vent') || cat.includes('donac') || cat.includes('compr')) return 'venta';
    return 'otros';
  }

  onImgError(item: UnifiedItem) {
    item.imageUrl = undefined;
    this.cdr.detectChanges();
  }

  onSearchInput() {
    this.currentPage = 1;
    this.applyFilters();
  }

  onSearch() {
    this.currentPage = 1;
    this.applyFilters();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: this.searchQuery || null },
      queryParamsHandling: 'merge'
    });
  }

  setFilter(filter: 'TODO' | 'ARTÍCULOS' | 'ANUNCIOS' | 'PORTFOLIOS') {
    this.activeFilter = filter;
    this.activeTemplate = null;
    this.activeCategory = null;
    this.currentPage = 1;
    this.applyFilters();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { filter: filter },
      queryParamsHandling: 'merge'
    });
  }

  setTemplateFilter(templateKey: string | null) {
    if (this.activeTemplate === templateKey) {
      this.activeTemplate = null;
    } else {
      this.activeTemplate = templateKey;
    }
    this.currentPage = 1;
    this.applyFilters();
  }

  setCategory(category: string | null) {
    if (this.activeCategory === category) {
      this.activeCategory = null;
    } else {
      this.activeCategory = category;
    }
    this.currentPage = 1;
    this.applyFilters();
  }

  setSort(sort: string) {
    this.activeSort = sort as any;
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters() {
    let result = [...this.allItems];

    if (this.searchQuery && this.searchQuery.trim()) {
      const normQuery = this.normalizeStr(this.searchQuery);
      const queryWords = normQuery.split(/\s+/).filter(w => w.length > 0);

      result = result.filter(item => {
        const normTitle = this.normalizeStr(item.title);
        const normDesc = this.normalizeStr(item.description);
        const normCat = this.normalizeStr(item.category);
        const combinedText = `${normTitle} ${normDesc} ${normCat}`;

        return queryWords.every(word => {
          if (combinedText.includes(word)) return true;
          if (word.length >= 5) {
            const stem = word.substring(0, 5);
            if (combinedText.includes(stem)) return true;
          }
          return false;
        });
      });
    }

    if (this.activeFilter === 'ARTÍCULOS') {
      result = result.filter(item => item.type === 'articulo');
    } else if (this.activeFilter === 'ANUNCIOS') {
      result = result.filter(item => item.type === 'anuncio');
    } else if (this.activeFilter === 'PORTFOLIOS') {
      result = result.filter(item => item.type === 'portfolio');
      if (this.activeTemplate) {
        result = result.filter(item => item.landingTemplate === this.activeTemplate);
      }
    }

    if (this.activeCategory) {
      const normCat = this.normalizeStr(this.activeCategory);
      result = result.filter(item => {
        const itemCat = this.normalizeStr(item.category);
        return itemCat.includes(normCat) || normCat.includes(itemCat);
      });
    }

    // Apply sorting
    switch (this.activeSort) {
      case 'RECIENTES':
        result.sort((a, b) => b.date.getTime() - a.date.getTime());
        break;
      case 'VALORADAS':
        result.sort((a, b) => (b.totalLikes || 0) - (a.totalLikes || 0));
        break;
      case 'VISTAS':
        result.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
        break;
      case 'COMENTADAS':
        result.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
        break;
      case 'FAVORITAS':
        result.sort((a, b) => ((b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)) || (b.totalLikes || 0) - (a.totalLikes || 0));
        break;
      case 'RELEVANCIA':
      default:
        // Keep the existing ordering from loadData (by date for now)
        break;
    }

    this.filteredItems = result;
    this.cdr.detectChanges();
  }

  get paginatedItems(): UnifiedItem[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredItems.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredItems.length / this.itemsPerPage);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getBlocksText(description: string): string {
    if (!description) return '';
    try {
      const parsed = JSON.parse(description);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const firstText = parsed.find(b => b.type === 'text');
        return firstText ? firstText.content : '';
      }
    } catch (e) {}
    return description;
  }

  // Portfolio comments
  portfolioComments: CommentItem[] = [];
  newCommentAuthor = '';
  newCommentText = '';

  // Emojis list
  suggestedEmojis = ['😀', '😂', '😍', '👍', '👏', '🔥', '🙌', '🌟', '💡', '📍'];

  // Public user profile modal properties
  showPublicProfileModal = false;
  publicProfileUser: any = null;
  publicUserAds: any[] = [];
  publicUserFavorites: any[] = [];
  publicActiveTab: 'publications' | 'favorites' = 'publications';

  addEmojiToComment(emoji: string) {
    this.newCommentText = (this.newCommentText || '') + emoji;
    this.cdr.detectChanges();
  }

  openPublicProfile(authorName: string) {
    if (!authorName) return;
    const nameNorm = authorName.toLowerCase().trim();
    
    // Find ads created by this author
    this.publicUserAds = this.allItems.filter(item => 
      item.type === 'anuncio' && 
      ((item.contactName && item.contactName.toLowerCase().includes(nameNorm)) ||
       (item.contactEmail && item.contactEmail.toLowerCase().includes(nameNorm)) ||
       (item.title && item.title.toLowerCase().includes(nameNorm)))
    );

    // Mock favorites for richer UI representation (Instagram style)
    this.publicUserFavorites = this.allItems
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

  async openPortfolio(portfolio: any) {
    this.selectedPortfolio = portfolio;
    const config = portfolio.landingConfig || {};
    const firstSection = config.sections && config.sections.length > 0 ? config.sections[0].title : 'Inicio';
    this.activePreviewTab = firstSection;
    this.currentSlideIndex = 0;
    this.portfolioComments = [];
    this.newCommentText = '';

    // Load stats
    this.interactionService.getRatingStats(portfolio.id)
      .then(stats => {
        if (this.selectedPortfolio && this.selectedPortfolio.id === portfolio.id) {
          this.selectedPortfolio.totalLikes = stats.totalLikes;
          this.selectedPortfolio.totalDislikes = stats.totalDislikes;
          this.selectedPortfolio.userVote = stats.userVote;
        }
      })
      .catch(err => console.error('Error loading portfolio stats:', err));

    // Load favorite status
    this.interactionService.isFavorite(portfolio.id)
      .then(isFav => {
        if (this.selectedPortfolio && this.selectedPortfolio.id === portfolio.id) {
          this.selectedPortfolio.isFavorite = isFav;
        }
      });

    // Load comments
    this.interactionService.getComments(portfolio.id)
      .then(comments => {
        if (this.selectedPortfolio && this.selectedPortfolio.id === portfolio.id) {
          this.portfolioComments = comments;
          this.cdr.detectChanges();
        }
      })
      .catch(err => console.error('Error loading portfolio comments:', err));

    this.cdr.detectChanges();
  }

  async addPortfolioComment() {
    if (!this.selectedPortfolio || !this.newCommentText.trim()) return;
    const author = this.newCommentAuthor.trim() || 'Lector Anónimo';
    const content = this.newCommentText.trim();
    
    try {
      await this.interactionService.addComment(this.selectedPortfolio.id, 'service', author, content);
      this.newCommentText = '';
      
      // Reload comments
      const comments = await this.interactionService.getComments(this.selectedPortfolio.id);
      this.portfolioComments = comments;
      
      // Update commentCount on the item itself
      const matchedItem = this.allItems.find(item => item.id === this.selectedPortfolio.id);
      if (matchedItem) {
        matchedItem.commentCount = comments.length;
      }
      if (this.selectedPortfolio) {
        this.selectedPortfolio.commentCount = comments.length;
      }
      
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Error adding comment to portfolio:', e);
    }
  }

  closePortfolio() {
    this.selectedPortfolio = null;
    this.cdr.detectChanges();
  }

  // --- YOUTUBE ACTIONS ---
  async likePortfolio(portfolio: any) {
    const prevVote = portfolio.userVote;
    const isUndo = prevVote === 'like';
    const newVote = isUndo ? null : 'like';

    // Optimistic UI update
    portfolio.userVote = newVote;
    if (isUndo) {
      portfolio.totalLikes = Math.max(0, (portfolio.totalLikes || 0) - 1);
    } else {
      portfolio.totalLikes = (portfolio.totalLikes || 0) + 1;
      if (prevVote === 'dislike') {
        portfolio.totalDislikes = Math.max(0, (portfolio.totalDislikes || 0) - 1);
      }
    }

    try {
      await this.interactionService.vote(portfolio.id, 'service', newVote);
    } catch (e) {
      portfolio.userVote = prevVote;
      this.refreshPortfolioRatingStats(portfolio.id);
    }
  }

  async dislikePortfolio(portfolio: any) {
    const prevVote = portfolio.userVote;
    const isUndo = prevVote === 'dislike';
    const newVote = isUndo ? null : 'dislike';

    // Optimistic UI update
    portfolio.userVote = newVote;
    if (isUndo) {
      portfolio.totalDislikes = Math.max(0, (portfolio.totalDislikes || 0) - 1);
    } else {
      portfolio.totalDislikes = (portfolio.totalDislikes || 0) + 1;
      if (prevVote === 'like') {
        portfolio.totalLikes = Math.max(0, (portfolio.totalLikes || 0) - 1);
      }
    }

    try {
      await this.interactionService.vote(portfolio.id, 'service', newVote);
    } catch (e) {
      portfolio.userVote = prevVote;
      this.refreshPortfolioRatingStats(portfolio.id);
    }
  }

  private refreshPortfolioRatingStats(entityId: string) {
    this.interactionService.getRatingStats(entityId).then(stats => {
      if (this.selectedPortfolio && this.selectedPortfolio.id === entityId) {
        this.selectedPortfolio.totalLikes = stats.totalLikes;
        this.selectedPortfolio.totalDislikes = stats.totalDislikes;
        this.selectedPortfolio.userVote = stats.userVote;
      }
    });
  }

  sharePortfolio(portfolio: any) {
    const url = window.location.origin + '/buscar?id=' + portfolio.id;
    navigator.clipboard.writeText(url).then(() => {
      this.copiedLinkStatus = true;
      setTimeout(() => this.copiedLinkStatus = false, 2500);
    });
  }

  async toggleFavoritePortfolio(portfolio: any) {
    if (!this.currentUser) {
      this.router.navigate(['/registro']);
      return;
    }
    try {
      const isFav = await this.interactionService.toggleFavorite(portfolio.id, 'service');
      portfolio.isFavorite = isFav;
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

  onItemClick(item: UnifiedItem) {
    if (item.type === 'portfolio') {
      this.openPortfolio(item);
    } else {
      this.router.navigate([item.link]);
    }
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
}
