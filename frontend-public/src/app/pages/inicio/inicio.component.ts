import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MediaService } from '../../services/media.service';
import { MediaViewModel } from '../../models/media.model';

interface Headline {
  id: string;
  category: string;
  title: string;
  description: string;
  readTime: string;
  colorClass: string;
}

interface Report {
  id: string;
  category: string;
  reportId: string;
  title: string;
  description: string;
  imageUrl: string;
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent implements OnInit {
  loading = true;

  // Main Hero article (defaults to static mock data, updated dynamically from Supabase)
  heroArticle = {
    category: 'INVESTIGACIÓN',
    author: 'ELISA VALDEZ',
    date: '12 JUN, 2026',
    title: 'La Transformación Urbana de Ginebra: Un Análisis Satelital y Social',
    description: 'Nuevos datos demuestran cómo la gentrificación ha modificado el paisaje comercial en barrios claves. Arandu analiza la evolución espacial de Plainpalais.',
    imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop&q=60'
  };

  // Fallback mock headlines matching Stitch design
  headlines: Headline[] = [
    {
      id: 'h1',
      category: 'Cultura',
      title: 'La Resurgencia del Folklore Latino en Ginebra',
      description: 'Cómo las asociaciones locales de Plainpalais mantienen vivas las tradiciones de danza y música a través de talleres comunitarios interactivos.',
      readTime: '8 min de lectura',
      colorClass: 'text-ink-blue'
    },
    {
      id: 'h2',
      category: 'Economía Local',
      title: 'Restaurantes Latinos ante los Nuevos Retos',
      description: 'Análisis detallado de la adaptación de los emprendedores gastronómicos al ecosistema post-industrial ginebrino.',
      readTime: '12 min de lectura',
      colorClass: 'text-sage-green'
    },
    {
      id: 'h3',
      category: 'Historia',
      title: 'El Archivo de la Inmigración de 1974',
      description: 'Un esfuerzo masivo de transcripción comunitaria recupera las voces de la primera gran ola de trabajadores latinoamericanos en Suiza.',
      readTime: 'Acceso a Archivos',
      colorClass: 'text-vintage-red'
    }
  ];

  // Fallback mock reports matching Stitch design
  reports: Report[] = [
    {
      id: 'r1',
      category: 'Medio Ambiente',
      reportId: 'REPORTE #842',
      title: 'Espacios Verdes y Planificación Urbana en Plainpalais',
      description: 'Monitoreo de calidad de vida y acceso a parques en las zonas de alta densidad residencial en Ginebra.',
      imageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&auto=format&fit=crop&q=60'
    },
    {
      id: 'r2',
      category: 'Sociedad',
      reportId: 'REPORTE #839',
      title: 'La Brecha Digital en los Trámites de Integración',
      description: 'Análisis de la digitalización de los servicios de migración and su impacto en la comunidad de habla hispana.',
      imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=60'
    }
  ];

  dataStories = [
    { title: 'La espiral de alquileres: 40 años de datos de vivienda en Plainpalais.' },
    { title: 'Mapeando el flujo de tránsito y conectividad en el centro de Ginebra.' },
    { title: 'El consumo de energías renovables en comercios independientes.' }
  ];

  archiveItems = [
    { year: "74'", title: 'El Plan de Integración Escolar (Borrador)', desc: 'La visión archivística de la educación bilingüe en Ginebra.' },
    { year: "92'", title: 'Registros de Cooperación Comunitaria', desc: 'Primeras actas digitalizadas del colectivo Arandu.' }
  ];

  constructor(private mediaService: MediaService) {}

  async ngOnInit() {
    await this.loadLatestMedia();
  }

  /**
   * Fetches latest media publications from Supabase via MediaService and dynamically overrides the hero and lists.
   */
  async loadLatestMedia() {
    try {
      const data = await this.mediaService.getLatest(6);

      if (!data || data.length === 0) {
        console.warn('MediaService returned 0 records or is null');
        return;
      }

      console.log('Successfully fetched media via MediaService:', data);

      // 1. Assign the most recent article to the main Hero Banner
      const latest = data[0];
      this.heroArticle = {
        category: latest.category ? latest.category.toUpperCase() : 'EDITORIAL',
        author: latest.author ? latest.author.toUpperCase() : 'ARANDU',
        date: latest.publishedAt,
        title: latest.title,
        description: latest.description || '',
        imageUrl: latest.imageUrl || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop&q=60'
      };

      // 2. Map remaining articles to secondary grids (headlines & reports)
      const dbHeadlines: Headline[] = [];
      const dbReports: Report[] = [];
      const colorClasses = ['text-ink-blue', 'text-sage-green', 'text-vintage-red'];

      data.slice(1).forEach((item: MediaViewModel, idx: number) => {
        if (idx < 3) {
          dbHeadlines.push({
            id: item.id,
            category: item.category || 'Editorial',
            title: item.title,
            description: item.description ? item.description.substring(0, 150) + '...' : '',
            readTime: item.type === 'video' ? '📺 Video' : item.type === 'podcast' ? '🎙️ Podcast' : '📖 Artículo',
            colorClass: colorClasses[idx % colorClasses.length]
          });
        } else if (idx < 5) {
          dbReports.push({
            id: item.id,
            category: item.category || 'Reporte',
            reportId: `INFORME #${idx + 100}`,
            title: item.title,
            description: item.description ? item.description.substring(0, 120) + '...' : '',
            imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop&q=60'
          });
        }
      });

      // Overlay database results onto default mock structures
      if (dbHeadlines.length > 0) {
        this.headlines = [...dbHeadlines, ...this.headlines.slice(dbHeadlines.length)];
      }
      if (dbReports.length > 0) {
        this.reports = [...dbReports, ...this.reports.slice(dbReports.length)];
      }

    } catch (err) {
      console.error('Error loading home page media via MediaService:', err);
    } finally {
      this.loading = false;
    }
  }
}
