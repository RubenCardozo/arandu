import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MediaService } from '../../services/media.service';
import { MediaViewModel } from '../../models/media.model';
import { InteractionService, CommentItem } from '../../services/interaction.service';
import { AuthService } from '../../services/auth.service';
import { User } from '@supabase/supabase-js';

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
  clicks?: number;
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
  visibleLimit = 3;

  // Modal properties
  selectedArticulo: Articulo | null = null;
  modalVisible = false;
  activeCarouselIndex = 0;
  commentContent = '';
  currentUser: User | null = null;
  copiedLinkStatus = false;

  // Session-based likes tracker
  likedArticles: Set<string> = new Set();

  // Secondary share & video modals
  shareModalVisible = false;
  videoModalVisible = false;
  activeVideoUrl: SafeResourceUrl | null = null;

  // Mock editorial articles matching the Stitch design
  mockArticulos: Articulo[] = [
    {
      id: 'art1',
      title: 'La Transformación Urbana de Ginebra: Un Análisis Satelital y Social',
      type: 'article',
      category: 'Investigación',
      description: 'Nuevos datos demuestran cómo la gentrificación ha modificado el paisaje comercial en barrios claves de Ginebra.',
      contentUrl: 'https://www.ge.ch',
      author: 'ELISA VALDEZ',
      imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop&q=60',
      publishedAt: '12 JUN, 2026',
      clicks: 142,
      avgStars: 4.8,
      totalLikes: 35
    },
    {
      id: 'art2',
      title: 'El Crecimiento de las Cooperativas en Ginebra',
      type: 'article',
      category: 'Economía',
      description: 'Cómo las pequeñas cooperativas de trabajo impulsadas por inmigrantes están redefiniendo el autoempleo en el cantón.',
      contentUrl: 'https://arandu.ch',
      author: 'Luis Gómez',
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=60',
      publishedAt: '08 JUN, 2026',
      clicks: 8
    }
  ];

  constructor(
    private mediaService: MediaService,
    private interactionService: InteractionService,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user ?? null;
    });
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

  showMore() {
    this.visibleLimit += 3;
    if (this.visibleLimit > 9) {
      this.visibleLimit = 9; // Maximum 9 initially for grid, search will have 20.
    }
  }

  showLess() {
    this.visibleLimit = 3;
  }

  // --- READ ARTICLE ACTIONS ---
  onReadArticle(art: Articulo) {
    // 1. Increment clicks count in Supabase asynchronously
    this.interactionService.incrementClicks(art.id, 'media', art.clicks || 0)
      .then(nextClicks => {
        art.clicks = nextClicks;
        if (this.selectedArticulo && this.selectedArticulo.id === art.id) {
          this.selectedArticulo.clicks = nextClicks;
        }
      })
      .catch(err => {
        console.warn('Failed to increment clicks:', err);
        art.clicks = (art.clicks || 0) + 1;
      });

    // 2. Display the interactive modal immediately
    this.openArticleModal(art);
  }

  openArticleModal(art: Articulo) {
    this.selectedArticulo = art;
    this.modalVisible = true;
    this.activeCarouselIndex = 0;
    this.copiedLinkStatus = false;
    this.commentContent = '';
    this.shareModalVisible = false;
    
    // Fetch latest ratings and comments for this article in background
    art.loadingComments = true;
    this.interactionService.getComments(art.id)
      .then(comments => {
        if (this.selectedArticulo && this.selectedArticulo.id === art.id) {
          this.selectedArticulo.comments = comments;
        }
      })
      .catch(err => console.error('Error fetching comments for modal:', err))
      .finally(() => {
        art.loadingComments = false;
      });

    this.interactionService.getRatingStats(art.id)
      .then(stats => {
        if (this.selectedArticulo && this.selectedArticulo.id === art.id) {
          this.selectedArticulo.totalLikes = stats.totalLikes;
          this.selectedArticulo.avgStars = stats.avgStars;
        }
      })
      .catch(err => console.error('Error fetching stats for modal:', err));
  }

  closeModal() {
    this.modalVisible = false;
    this.selectedArticulo = null;
    this.shareModalVisible = false;
  }

  // Consecutive Navigation
  nextArticle() {
    if (!this.selectedArticulo || this.articulos.length <= 1) return;
    const idx = this.articulos.findIndex(a => a.id === this.selectedArticulo!.id);
    const nextIdx = (idx + 1) % this.articulos.length;
    this.openArticleModal(this.articulos[nextIdx]);
  }

  // --- MODAL UTILITIES ---
  getBlocks(description: string): any[] {
    if (!description) return [];
    try {
      const parsed = JSON.parse(description);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type) {
        return parsed.map(block => {
          if (block.type === 'text' && typeof block.content === 'string') {
            return { ...block, content: block.content.replace(/\\n/g, '\n') };
          }
          return block;
        });
      }
    } catch (e) {}
    return [{ type: 'text', content: description.replace(/\\n/g, '\n') }];
  }

  getImages(imageUrl?: string): string[] {
    if (!imageUrl) return [];
    try {
      const parsed = JSON.parse(imageUrl);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {}
    return [imageUrl];
  }

  getSafeVideoUrl(url?: string): SafeResourceUrl | null {
    if (!url) return null;
    let embedUrl = url;
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  // Carousel controls
  setCarouselIndex(index: number) {
    this.activeCarouselIndex = index;
  }

  prevCarousel(imagesCount: number) {
    this.activeCarouselIndex = (this.activeCarouselIndex - 1 + imagesCount) % imagesCount;
  }

  nextCarousel(imagesCount: number) {
    this.activeCarouselIndex = (this.activeCarouselIndex + 1) % imagesCount;
  }

  // --- INTERACTION IN MODAL ---
  async modalLike() {
    if (!this.selectedArticulo) return;
    const art = this.selectedArticulo;
    if (this.likedArticles.has(art.id)) return;
    try {
      await this.interactionService.like(art.id, 'media');
      const stats = await this.interactionService.getRatingStats(art.id);
      art.totalLikes = stats.totalLikes;
      this.likedArticles.add(art.id);
    } catch (err) {
      console.error('Error liking article:', err);
    }
  }

  async modalRate(stars: number) {
    if (!this.selectedArticulo) return;
    const art = this.selectedArticulo;
    try {
      await this.interactionService.rate(art.id, 'media', stars);
      const stats = await this.interactionService.getRatingStats(art.id);
      art.avgStars = stats.avgStars;
    } catch (err) {
      console.error('Error rating article:', err);
    }
  }

  async modalComment() {
    if (!this.selectedArticulo || !this.commentContent.trim()) return;
    const art = this.selectedArticulo;
    const authorName = this.currentUser?.user_metadata?.['full_name'] || this.currentUser?.email || 'Usuario';
    
    try {
      await this.interactionService.addComment(art.id, 'media', authorName, this.commentContent.trim());
      this.commentContent = '';
      art.comments = await this.interactionService.getComments(art.id);
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  }

  // --- SOCIAL SHARING LINKS ---
  openShareModal() {
    this.shareModalVisible = true;
  }

  closeShareModal() {
    this.shareModalVisible = false;
  }

  getShareLink(platform: string): string {
    if (!this.selectedArticulo) return '#';
    const art = this.selectedArticulo;
    const currentUrl = window.location.href;
    const shareText = `Lee este artículo interesante en Arandu: "${art.title}" \nLink: ${currentUrl}`;
    
    switch (platform) {
      case 'whatsapp':
        return `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
      case 'email':
        return `mailto:?subject=${encodeURIComponent(art.title)}&body=${encodeURIComponent(shareText)}`;
      default:
        return '#';
    }
  }

  copyLinkToClipboard() {
    if (!this.selectedArticulo) return;
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

  // Video modal control
  openVideoModal(url?: string) {
    if (!url) return;
    this.activeVideoUrl = this.getSafeVideoUrl(url);
    this.videoModalVisible = true;
  }

  closeVideoModal() {
    this.videoModalVisible = false;
    this.activeVideoUrl = null;
  }

  getVideoThumbnail(url?: string): string {
    if (!url) return 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop&q=60';
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    return 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop&q=60';
  }
}
