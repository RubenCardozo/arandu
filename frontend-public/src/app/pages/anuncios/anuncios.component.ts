import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JobsService } from '../../services/jobs.service';
import { ServicesCatalogService } from '../../services/services-catalog.service';
import { InteractionService, CommentItem } from '../../services/interaction.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

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
  comments?: CommentItem[];
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
}

@Component({
  selector: 'app-anuncios',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './anuncios.component.html',
  styleUrls: ['./anuncios.component.css']
})
export class AnunciosComponent implements OnInit, OnDestroy {
  selectedCategory: string = 'Todo';
  selectedSubCategory: string = 'Todo';
  sortBy: 'date' | 'price' = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';
  categories: string[] = ['Todo', 'Empleo', 'Servicios y Reparación', 'Clases y Cursos', 'Venta y Donación'];
  anuncios: Anuncio[] = [];
  filteredAnuncios: Anuncio[] = [];
  loading = false;
  searchQuery: string = '';
  selectedAd: Anuncio | null = null;
  currentUser: any = null;
  showModal = false;
  isLoggedIn = false;
  isProfileComplete = false;
  private authSubscription!: Subscription;

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

  copiedLinkStatus = false;

  constructor(
    private jobsService: JobsService,
    private servicesCatalogService: ServicesCatalogService,
    private interactionService: InteractionService,
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
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
            clicks: item.clicks || 0
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

  async likeAd(ad: Anuncio) {
    if (!ad.entityType) return;
    if (this.likedAds.has(ad.id)) return;
    try {
      await this.interactionService.like(ad.id, ad.entityType);
      const stats = await this.interactionService.getRatingStats(ad.id);
      ad.totalLikes = stats.totalLikes;
      ad.avgStars = stats.avgStars;
      this.likedAds.add(ad.id);
    } catch (err) {
      console.error('likeAd - error:', err);
    }
  }

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
    
    const authorName = `${this.currentUser?.user_metadata?.['first_name'] || ''} ${this.currentUser?.user_metadata?.['last_name'] || ''}`.trim() || this.currentUser?.email || 'Vecino';
    const content = ad.newCommentText.trim();

    try {
      await this.interactionService.addComment(ad.id, ad.entityType, authorName, content);
      ad.newCommentText = '';
      ad.comments = await this.interactionService.getComments(ad.id);
    } catch (err) {
      console.error('postChatComment - error:', err);
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
    
    this.showModal = true;
    this.selectedAd.loadingComments = true;
    
    // Load comments in background (no await)
    this.interactionService.getComments(ad.id)
      .then(comments => {
        if (this.selectedAd && this.selectedAd.id === ad.id) {
          this.selectedAd.comments = comments;
        }
      })
      .catch(err => console.error('Error loading comments for modal:', err))
      .finally(() => {
        if (this.selectedAd) {
          this.selectedAd.loadingComments = false;
        }
      });
  }

  closeAdModal() {
    this.selectedAd = null;
    this.showModal = false;
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
    switch (category) {
      case 'Servicios y Reparación':
        return '🛠️';
      case 'Empleo':
        return '💼';
      case 'Clases y Cursos':
        return '🎓';
      case 'Venta y Donación':
        return '🛍️';
      default:
        return '🛠️';
    }
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
}

