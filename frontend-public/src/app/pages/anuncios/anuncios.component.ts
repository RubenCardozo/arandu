import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JobsService } from '../../services/jobs.service';
import { ServicesCatalogService } from '../../services/services-catalog.service';
import { InteractionService, CommentItem } from '../../services/interaction.service';

interface Anuncio {
  id: string;
  title: string;
  category: 'Electricidad' | 'Trabajos Casa' | 'Empleo' | 'Otros';
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
}

@Component({
  selector: 'app-anuncios',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './anuncios.component.html',
  styleUrls: ['./anuncios.component.css']
})
export class AnunciosComponent implements OnInit {
  selectedCategory: string = 'Todo';
  categories: string[] = ['Todo', 'Electricidad', 'Trabajos Casa', 'Empleo', 'Otros'];
  anuncios: Anuncio[] = [];
  filteredAnuncios: Anuncio[] = [];
  loading = true;
  searchQuery: string = '';

  // Mock classifieds matching the Stitch layout
  mockAnuncios: Anuncio[] = [
    {
      id: 'a1',
      title: 'Artisan Électricien - Dépannage Rapide',
      category: 'Electricidad',
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
      category: 'Trabajos Casa',
      description: 'Equipo de carpinteros experimentados ofrece servicios para la transformación de sus espacios bajo el tejado. Aislamiento ecológico, ventanas Velux y acabados en madera maciza.',
      contactPhone: '+41 78 123 45 67',
      createdAt: '20 JUN',
      imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=60',
      entityType: 'service'
    },
    {
      id: 'a4',
      title: 'Studio Amoblado - Quartier des Bains',
      category: 'Otros',
      description: "Magnífico estudio de 35m2, luminoso, reformado a nuevo. Cerca de todos los servicios. Libre desde el 1 de Julio. 1'850 CHF/mes gastos incluidos.",
      contactPhone: 'DOSSIER REQUERIDO',
      createdAt: '19 JUN',
      entityType: 'service'
    },
    {
      id: 'a5',
      title: 'Clases de Francés e Inglés',
      category: 'Otros',
      description: 'Profesora certificada ofrece clases particulares o en grupos pequeños. Preparación para exámenes oficiales (DELF, Cambridge). Horarios flexibles.',
      contactPhone: '+41 22 987 65 43',
      createdAt: '18 JUN',
      entityType: 'service'
    }
  ];

  constructor(
    private jobsService: JobsService,
    private servicesCatalogService: ServicesCatalogService,
    private interactionService: InteractionService
  ) {}

  async ngOnInit() {
    await this.loadAnuncios();
  }

  async loadAnuncios() {
    await this.onSearch();
  }

  async onSearch() {
    this.loading = true;
    try {
      let servicesResult: any[] = [];
      let jobsResult: any[] = [];

      if (this.searchQuery.trim()) {
        const query = this.searchQuery.trim();
        [servicesResult, jobsResult] = await Promise.all([
          this.servicesCatalogService.search(query),
          this.jobsService.search(query)
        ]);
      } else {
        [servicesResult, jobsResult] = await Promise.all([
          this.servicesCatalogService.getAll(),
          this.jobsService.getAll()
        ]);
      }

      const combined: Anuncio[] = [];

      // Map services
      if (servicesResult && servicesResult.length > 0) {
        servicesResult.forEach((item) => {
          combined.push({
            id: item.id,
            title: item.title,
            category: this.mapDatabaseCategory(item.category),
            description: item.description || '',
            contactPhone: item.phone,
            contactEmail: item.email,
            createdAt: item.createdAt,
            imageUrl: item.imageUrl,
            entityType: 'service'
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
            entityType: 'job'
          });
        });
      }

      const rawList = combined.length > 0 ? combined : (this.searchQuery.trim() ? [] : this.mockAnuncios);
      
      this.anuncios = await Promise.all(rawList.map(async (ad) => {
        const stats = await this.interactionService.getRatingStats(ad.id);
        return {
          ...ad,
          avgStars: stats.avgStars,
          totalLikes: stats.totalLikes,
          comments: [],
          showInteractions: false,
          newAuthor: '',
          newCommentText: '',
          loadingComments: false
        };
      }));

      this.loading = false;
      this.filterCategory(this.selectedCategory);
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
    }
  }

  mapDatabaseCategory(cat: string): 'Electricidad' | 'Trabajos Casa' | 'Empleo' | 'Otros' {
    if (!cat) return 'Otros';
    switch (cat.toLowerCase()) {
      case 'electricidad':
      case 'electricité':
        return 'Electricidad';
      case 'trabajos casa':
      case 'reparaciones':
      case 'limpieza':
      case 'travaux maison':
        return 'Trabajos Casa';
      case 'empleo':
      case 'emploi':
        return 'Empleo';
      default:
        return 'Otros';
    }
  }

  filterCategory(cat: string) {
    this.selectedCategory = cat;
    if (cat === 'Todo') {
      this.filteredAnuncios = this.anuncios;
    } else {
      this.filteredAnuncios = this.anuncios.filter(a => a.category === cat);
    }
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
    try {
      await this.interactionService.like(ad.id, ad.entityType);
      const stats = await this.interactionService.getRatingStats(ad.id);
      ad.totalLikes = stats.totalLikes;
      ad.avgStars = stats.avgStars;
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

  async postComment(ad: Anuncio) {
    if (!ad.entityType || !ad.newAuthor?.trim() || !ad.newCommentText?.trim()) return;
    try {
      await this.interactionService.addComment(ad.id, ad.entityType, ad.newAuthor.trim(), ad.newCommentText.trim());
      ad.newCommentText = '';
      ad.comments = await this.interactionService.getComments(ad.id);
    } catch (err) {
      console.error('postComment - error:', err);
    }
  }
}
