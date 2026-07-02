import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MediaService } from '../../services/media.service';
import { ServicesCatalogService } from '../../services/services-catalog.service';
import { JobsService } from '../../services/jobs.service';

interface UnifiedItem {
  id: string;
  type: 'articulo' | 'anuncio';
  title: string;
  description: string;
  category: string;
  date: Date;
  imageUrl?: string;
  link: string;
}

@Component({
  selector: 'app-buscar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './buscar.html'
})
export class BuscarComponent implements OnInit {
  searchQuery: string = '';
  activeFilter: 'TODO' | 'ARTÍCULOS' | 'ANUNCIOS' = 'TODO';
  activeCategory: string | null = null;
  
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mediaService: MediaService,
    private directoryService: ServicesCatalogService,
    private jobsService: JobsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.cdr.detectChanges();
      }
    }, 1500);

    this.route.queryParams.subscribe(params => {
      this.searchQuery = params['q'] || '';
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
        type: 'anuncio',
        title: d.title,
        description: d.description || '',
        category: d.category || 'SERVICIOS',
        date: new Date(),
        imageUrl: d.imageUrl,
        link: '/anuncios'
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

  setFilter(filter: 'TODO' | 'ARTÍCULOS' | 'ANUNCIOS') {
    this.activeFilter = filter;
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
    }

    if (this.activeCategory) {
      const normCat = this.normalizeStr(this.activeCategory);
      result = result.filter(item => {
        const itemCat = this.normalizeStr(item.category);
        return itemCat.includes(normCat) || normCat.includes(itemCat);
      });
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
}
