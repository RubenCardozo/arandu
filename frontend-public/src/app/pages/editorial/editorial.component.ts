import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MediaService } from '../../services/media.service';
import { MediaViewModel } from '../../models/media.model';
import { InteractionService, CommentItem } from '../../services/interaction.service';

interface Articulo {
  id: string;
  title: string;
  type: 'article' | 'video' | 'podcast';
  category: string;
  description: string;
  contentUrl: string;
  embedUrl?: string;
  author: string;
  imageUrl?: string;
  publishedAt: string;
  avgStars?: number;
  totalLikes?: number;
  comments?: CommentItem[];
  showInteractions?: boolean;
  newAuthor?: string;
  newCommentText?: string;
  loadingComments?: boolean;
}

@Component({
  selector: 'app-editorial',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './editorial.component.html',
  styleUrls: ['./editorial.component.css']
})
export class EditorialComponent implements OnInit {
  articulos: Articulo[] = [];
  loading = true;
  searchQuery: string = '';

  // Mock editorial articles matching the Stitch design
  mockArticulos: Articulo[] = [
    {
      id: 'art1',
      title: 'El Impacto Cultural del Cine Latino en Ginebra',
      type: 'article',
      category: 'Cultura',
      description: 'Un análisis histórico sobre la proyección y distribución de películas hispanoamericanas en las salas del Quartier des Bains.',
      contentUrl: '#',
      author: 'Carlos Mendoza',
      imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=60',
      publishedAt: '12 JUN, 2026'
    },
    {
      id: 'art2',
      title: 'El Crecimiento de las Cooperativas en Ginebra',
      type: 'article',
      category: 'Economía',
      description: 'Cómo las pequeñas cooperativas de trabajo impulsadas por inmigrantes están redefiniendo el autoempleo en el cantón.',
      contentUrl: '#',
      author: 'Luis Gómez',
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=60',
      publishedAt: '08 JUN, 2026'
    }
  ];

  constructor(
    private mediaService: MediaService,
    private interactionService: InteractionService
  ) {}

  async ngOnInit() {
    await this.loadArticulos();
  }

  async loadArticulos() {
    try {
      const data = await this.mediaService.getAll();
      const rawList = (!data || data.length === 0) ? this.mockArticulos : data;
      this.articulos = await Promise.all(rawList.map(async (art) => {
        const stats = await this.interactionService.getRatingStats(art.id);
        return {
          ...art,
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
    } catch (err) {
      this.articulos = this.mockArticulos.map(art => ({
        ...art,
        avgStars: 0,
        totalLikes: 0,
        comments: [],
        showInteractions: false,
        newAuthor: '',
        newCommentText: '',
        loadingComments: false
      }));
      this.loading = false;
    }
  }

  async onSearch() {
    this.loading = true;
    try {
      let data: MediaViewModel[];
      if (this.searchQuery.trim()) {
        data = await this.mediaService.search(this.searchQuery);
      } else {
        data = await this.mediaService.getAll();
      }
      
      const rawList = (!data || data.length === 0) ? (this.searchQuery.trim() ? [] : this.mockArticulos) : data;
      this.articulos = await Promise.all(rawList.map(async (art) => {
        const stats = await this.interactionService.getRatingStats(art.id);
        return {
          ...art,
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
    } catch (err) {
      console.error('EditorialComponent.onSearch - error:', err);
      this.loading = false;
    }
  }

  async toggleInteractions(art: Articulo) {
    art.showInteractions = !art.showInteractions;
    if (art.showInteractions) {
      art.loadingComments = true;
      try {
        art.comments = await this.interactionService.getComments(art.id);
      } catch (err) {
        console.error('toggleInteractions - error:', err);
      } finally {
        art.loadingComments = false;
      }
    }
  }

  async likeArticle(art: Articulo) {
    try {
      await this.interactionService.like(art.id, 'media');
      const stats = await this.interactionService.getRatingStats(art.id);
      art.totalLikes = stats.totalLikes;
      art.avgStars = stats.avgStars;
    } catch (err) {
      console.error('likeArticle - error:', err);
    }
  }

  async rateArticle(art: Articulo, stars: number) {
    try {
      await this.interactionService.rate(art.id, 'media', stars);
      const stats = await this.interactionService.getRatingStats(art.id);
      art.totalLikes = stats.totalLikes;
      art.avgStars = stats.avgStars;
    } catch (err) {
      console.error('rateArticle - error:', err);
    }
  }

  async postComment(art: Articulo) {
    if (!art.newAuthor?.trim() || !art.newCommentText?.trim()) return;
    try {
      await this.interactionService.addComment(art.id, 'media', art.newAuthor.trim(), art.newCommentText.trim());
      art.newCommentText = '';
      art.comments = await this.interactionService.getComments(art.id);
    } catch (err) {
      console.error('postComment - error:', err);
    }
  }
}
