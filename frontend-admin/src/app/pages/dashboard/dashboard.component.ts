import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MediaService } from '../../services/media.service';
import { JobsService } from '../../services/jobs.service';
import { ServicesCatalogService } from '../../services/services-catalog.service';
import { RestaurantsService } from '../../services/restaurants.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  // Real stats from Supabase
  totalArticulos = 0;
  totalEmpleos = 0;
  totalServicios = 0;
  totalRestaurantes = 0;

  // Last published article info
  ultimoArticulo: { title: string; category: string; date: string } | null = null;

  // Recent activity feed (built from DB data)
  activities: { time: string; user: string; text: string; alert: boolean }[] = [];

  loading = true;

  constructor(
    private mediaService: MediaService,
    private jobsService: JobsService,
    private servicesCatalogService: ServicesCatalogService,
    private restaurantsService: RestaurantsService,
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadStats();
  }

  async loadStats() {
    try {
      // Fetch counts and items in parallel using services
      const [mediaData, jobsData, servicesData, restaurantsData] = await Promise.all([
        this.mediaService.getAll(),
        this.jobsService.getAll(),
        this.servicesCatalogService.getAll(),
        this.restaurantsService.getAll()
      ]);

      this.totalArticulos = mediaData.length;
      this.totalEmpleos = jobsData.length;
      this.totalServicios = servicesData.length;
      this.totalRestaurantes = restaurantsData.length;

      // Build activity feed
      const feed: any[] = [];

      mediaData.forEach((item) => {
        feed.push({
          time: item.publishedAt ? this.formatTime(item.publishedAt) : '-',
          user: item.author || 'Redacción',
          text: `Publicó el artículo "${item.title}"`,
          alert: false,
          ts: item.publishedAt ? new Date(item.publishedAt).getTime() : 0
        });
      });

      jobsData.forEach((item) => {
        feed.push({
          time: item.createdAt ? this.formatTime(item.createdAt) : '-',
          user: item.company || 'Empresa',
          text: `Agregó la oferta laboral "${item.title}"`,
          alert: true,
          ts: item.createdAt ? new Date(item.createdAt).getTime() : 0
        });
      });

      servicesData.forEach((item) => {
        feed.push({
          time: item.createdAt ? this.formatTime(item.createdAt) : '-',
          user: 'Catálogo',
          text: `Nuevo servicio registrado: "${item.title}" en ${item.category}`,
          alert: false,
          ts: item.createdAt ? new Date(item.createdAt).getTime() : 0
        });
      });

      restaurantsData.forEach((item) => {
        feed.push({
          time: item.createdAt ? this.formatTime(item.createdAt) : '-',
          user: 'Guía Comercial',
          text: `Registró el comercio/restaurante "${item.name}" en el directorio.`,
          alert: false,
          ts: item.createdAt ? new Date(item.createdAt).getTime() : 0
        });
      });

      // Sort by most recent first
      feed.sort((a, b) => b.ts - a.ts);
      this.activities = feed.length > 0
        ? feed.slice(0, 6)
        : [{ time: '-', user: 'Sistema', text: 'No hay actividad reciente registrada.', alert: false }];

      if (mediaData.length > 0) {
        const latest = mediaData[0];
        this.ultimoArticulo = {
          title: latest.title,
          category: latest.category || 'Editorial',
          date: latest.publishedAt ? new Date(latest.publishedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
        };
      }

      this.loading = false;
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      this.loading = false;
    }
  }

  formatTime(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  async logout() {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
