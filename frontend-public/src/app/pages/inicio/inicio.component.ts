import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MediaService } from '../../services/media.service';
import { MediaViewModel } from '../../models/media.model';
import { AuthService } from '../../services/auth.service';
import { InteractionService, CommentItem } from '../../services/interaction.service';
import { User } from '@supabase/supabase-js';
import { WorldCupService, WorldCupGame, WorldCupGroup } from '../../services/world-cup.service';

interface Headline {
  id: string;
  category: string;
  title: string;
  description: string;
  readTime: string;
  colorClass: string;
  clicks?: number;
  contentUrl?: string;
  embedUrl?: string;
  author?: string;
  imageUrl?: string;
  publishedAt?: string;
  rawDescription?: string;
}

interface Report {
  id: string;
  category: string;
  reportId: string;
  title: string;
  description: string;
  imageUrl: string;
  clicks?: number;
  contentUrl?: string;
  embedUrl?: string;
  author?: string;
  publishedAt?: string;
  rawDescription?: string;
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent implements OnInit {
  loading = true;
  currentUser: User | null = null;

  // Main Hero article (defaults to static mock data, updated dynamically from Supabase)
  heroArticle = {
    id: '',
    category: 'INVESTIGACIÓN',
    author: 'ELISA VALDEZ',
    date: '12 JUN, 2026',
    title: 'La Transformación Urbana de Ginebra: Un Análisis Satelital y Social',
    description: 'Nuevos datos demuestran cómo la gentrificación ha modificado el paisaje comercial en barrios claves. Arandu analiza la evolución espacial de Plainpalais.',
    imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop&q=60',
    contentUrl: '#',
    embedUrl: '',
    clicks: 0,
    rawDescription: ''
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

  // Modal visual states
  authModalVisible = false;
  articleModalVisible = false;
  selectedArticulo: any = null;
  activeCarouselIndex = 0;
  commentContent = '';
  copiedLinkStatus = false;

  // Control lists for session likes
  likedArticles: Set<string> = new Set();
  
  // Secondary modal/popover states
  shareModalVisible = false;
  videoModalVisible = false;
  activeVideoUrl: SafeResourceUrl | null = null;

  // World Cup 2026 widget properties
  worldCupGames: WorldCupGame[] = [];
  worldCupGroups: WorldCupGroup[] = [];
  worldCupSelectedDate: Date = new Date(2026, 5, 24); // June 24th, 2026 (local midnight, months are 0-indexed)
  worldCupActiveTab: 'games' | 'standings' = 'games';
  selectedMatch: WorldCupGame | null = null;
  matchStats: any = null;
  worldCupLoading = false;

  constructor(
    private mediaService: MediaService,
    private authService: AuthService,
    private interactionService: InteractionService,
    private sanitizer: DomSanitizer,
    private worldCupService: WorldCupService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user ?? null;
      this.cdr.detectChanges();
    });

    // Failsafe timer to guarantee loading screen disappears even if external APIs stall
    setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.cdr.detectChanges();
      }
    }, 1500);

    await this.loadLatestMedia();
    this.loadWorldCupData();
  }

  // Cross-browser helper to parse "MM/DD/YYYY HH:mm" safely to local Date
  parseLocalDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    try {
      const parts = dateStr.trim().split(/\s+/);
      const dateParts = parts[0].split('/');
      if (dateParts.length === 3) {
        const month = parseInt(dateParts[0], 10) - 1; // 0-indexed
        const day = parseInt(dateParts[1], 10);
        const year = parseInt(dateParts[2], 10);
        
        let hour = 0;
        let minute = 0;
        if (parts[1]) {
          const timeParts = parts[1].split(':');
          hour = parseInt(timeParts[0], 10) || 0;
          minute = parseInt(timeParts[1], 10) || 0;
        }
        const parsed = new Date(year, month, day, hour, minute);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error parsing local date:', dateStr, e);
    }
    const fallback = new Date(dateStr);
    if (!isNaN(fallback.getTime())) {
      return fallback;
    }
    return new Date(2026, 5, 24); // default fallback
  }

  async loadWorldCupData() {
    this.worldCupLoading = true;
    try {
      const [games, groups] = await Promise.all([
        this.worldCupService.getGames(),
        this.worldCupService.getGroups()
      ]);
      this.worldCupGames = games;
      this.worldCupGroups = groups;

      // Set default date to the date of the latest finished game
      const finishedGames = games.filter(g => g.finished === 'TRUE');
      if (finishedGames.length > 0) {
        let maxDate = this.parseLocalDate(finishedGames[0].local_date);
        finishedGames.forEach(g => {
          const d = this.parseLocalDate(g.local_date);
          if (d > maxDate) {
            maxDate = d;
          }
        });
        this.worldCupSelectedDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
      } else if (games.length > 0) {
        // Fallback to the first match date
        const sortedGames = [...games].sort((a, b) => this.parseLocalDate(a.local_date).getTime() - this.parseLocalDate(b.local_date).getTime());
        const d = this.parseLocalDate(sortedGames[0].local_date);
        this.worldCupSelectedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      }
    } catch (e) {
      console.error('Failed to load World Cup 2026 data:', e);
    } finally {
      this.worldCupLoading = false;
      this.cdr.detectChanges();
    }
  }

  // World Cup navigation & utilities
  getUniqueGameDates(): Date[] {
    if (!this.worldCupGames || this.worldCupGames.length === 0) return [];
    const datesMap = new Map<string, Date>();
    this.worldCupGames.forEach(g => {
      if (!g.local_date) return;
      const d = this.parseLocalDate(g.local_date);
      const normalizedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const key = `${normalizedDate.getFullYear()}-${String(normalizedDate.getMonth() + 1).padStart(2, '0')}-${String(normalizedDate.getDate()).padStart(2, '0')}`;
      datesMap.set(key, normalizedDate);
    });
    return Array.from(datesMap.values()).sort((a, b) => a.getTime() - b.getTime());
  }

  changeWorldCupDate(offset: number) {
    const uniqueDates = this.getUniqueGameDates();
    if (uniqueDates.length === 0) return;

    const currentNormalized = new Date(
      this.worldCupSelectedDate.getFullYear(),
      this.worldCupSelectedDate.getMonth(),
      this.worldCupSelectedDate.getDate()
    ).getTime();

    let currentIndex = uniqueDates.findIndex(d => d.getTime() === currentNormalized);

    if (currentIndex === -1) {
      // Find the closest date
      let minDiff = Infinity;
      let closestIdx = 0;
      uniqueDates.forEach((d, idx) => {
        const diff = Math.abs(d.getTime() - currentNormalized);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      currentIndex = closestIdx;
    }

    const targetIndex = currentIndex + offset;
    if (targetIndex >= 0 && targetIndex < uniqueDates.length) {
      this.worldCupSelectedDate = uniqueDates[targetIndex];
    }
  }

  getFilteredWorldCupGames(): WorldCupGame[] {
    if (!this.worldCupGames || this.worldCupGames.length === 0) return [];
    const selYear = this.worldCupSelectedDate.getFullYear();
    const selMonth = this.worldCupSelectedDate.getMonth();
    const selDay = this.worldCupSelectedDate.getDate();
    
    return this.worldCupGames.filter(g => {
      if (!g.local_date) return false;
      const d = this.parseLocalDate(g.local_date);
      return d.getFullYear() === selYear && d.getMonth() === selMonth && d.getDate() === selDay;
    });
  }

  openMatchDetail(game: WorldCupGame) {
    this.selectedMatch = game;
    this.matchStats = this.generateMatchStats(game);
    if (this.matchStats && game) {
      const homePoss = this.matchStats.possession.home;
      const awayPoss = this.matchStats.possession.away;
      const homeName = game.home_team_name_en || 'Local';
      const awayName = game.away_team_name_en || 'Visitante';
      if (homePoss > awayPoss) {
        this.matchStats.dominantPossessionText = `${homeName} tuvo más el balón (${homePoss}%)`;
      } else if (awayPoss > homePoss) {
        this.matchStats.dominantPossessionText = `${awayName} tuvo más el balón (${awayPoss}%)`;
      } else {
        this.matchStats.dominantPossessionText = `Posesión compartida por igual (50% - 50%)`;
      }
    }
  }

  closeMatchDetail() {
    this.selectedMatch = null;
    this.matchStats = null;
  }

  generateMatchStats(game: WorldCupGame): any {
    const idNum = parseInt(game.id) || 1;
    const seed = (idNum * 17) % 100;
    const hScore = parseInt(game.home_score) || 0;
    const aScore = parseInt(game.away_score) || 0;
    
    let hPoss = 45 + (seed % 11);
    if (hScore > aScore) hPoss += 3;
    if (aScore > hScore) hPoss -= 3;
    hPoss = Math.min(Math.max(hPoss, 30), 70);
    const aPoss = 100 - hPoss;
    
    const hShots = 8 + (seed % 9) + (hScore * 2);
    const aShots = 7 + ((seed + 5) % 9) + (aScore * 2);
    const hOnTarget = hScore + Math.floor((hShots - hScore) * 0.3);
    const aOnTarget = aScore + Math.floor((aShots - aScore) * 0.3);
    
    const hFouls = 10 + (seed % 8);
    const aFouls = 9 + ((seed + 3) % 8);
    const hCorners = 3 + (seed % 6);
    const aCorners = 2 + ((seed + 2) % 6);
    
    return {
      possession: { home: hPoss, away: aPoss },
      shots: { home: hShots, away: aShots },
      shotsOnTarget: { home: hOnTarget, away: aOnTarget },
      fouls: { home: hFouls, away: aFouls },
      corners: { home: hCorners, away: aCorners }
    };
  }

  parseScorers(scorersStr?: string): string[] {
    if (!scorersStr || scorersStr === 'null') return [];
    try {
      if (scorersStr.startsWith('{') && scorersStr.endsWith('}')) {
        const cleaned = scorersStr.substring(1, scorersStr.length - 1);
        const parts = cleaned.split(/\",\s*\"|\",\"/);
        return parts.map(p => p.replace(/^\"|\"$/g, '').trim());
      }
      const parsed = JSON.parse(scorersStr);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      if (scorersStr.includes(',') || scorersStr.includes('"')) {
        return scorersStr.replace(/[\{\}\"]/g, '').split(',').map(s => s.trim());
      }
    }
    return [scorersStr];
  }

  /**
   * Parses the first text or subtitle block from a serialized JSON block string description.
   * Fallback to the raw description string if not JSON.
   */
  getCleanDescription(description: string): string {
    if (!description) return '';
    try {
      const parsed = JSON.parse(description);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const textBlock = parsed.find(b => b.type === 'text' || b.type === 'subtitle');
        if (textBlock) return textBlock.content;
      }
    } catch (e) {}
    return description;
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
      const imagesList = this.getImages(latest.imageUrl);
      this.heroArticle = {
        id: latest.id,
        category: latest.category ? latest.category.toUpperCase() : 'EDITORIAL',
        author: latest.author ? latest.author.toUpperCase() : 'ARANDU',
        date: latest.publishedAt,
        title: latest.title,
        description: this.getCleanDescription(latest.description || ''),
        imageUrl: imagesList.length > 0 ? imagesList[0] : 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop&q=60',
        contentUrl: latest.contentUrl || '#',
        embedUrl: latest.embedUrl || '',
        clicks: latest.clicks || 0,
        rawDescription: latest.description || ''
      };

      // 2. Map remaining articles to secondary grids (headlines & reports)
      const dbHeadlines: Headline[] = [];
      const dbReports: Report[] = [];
      const colorClasses = ['text-ink-blue', 'text-sage-green', 'text-vintage-red'];

      data.slice(1).forEach((item: MediaViewModel, idx: number) => {
        const itemImages = this.getImages(item.imageUrl);
        if (idx < 3) {
          dbHeadlines.push({
            id: item.id,
            category: item.category || 'Editorial',
            title: item.title,
            description: this.getCleanDescription(item.description || ''),
            readTime: item.type === 'video' ? '📺 Video' : item.type === 'podcast' ? '🎙️ Podcast' : '📖 Artículo',
            colorClass: colorClasses[idx % colorClasses.length],
            clicks: item.clicks || 0,
            contentUrl: item.contentUrl || '#',
            embedUrl: item.embedUrl || '',
            author: item.author || 'Redacción',
            imageUrl: itemImages.length > 0 ? itemImages[0] : '',
            publishedAt: item.publishedAt,
            rawDescription: item.description || ''
          });
        } else if (idx < 5) {
          dbReports.push({
            id: item.id,
            category: item.category || 'Reporte',
            reportId: `INFORME #${idx + 100}`,
            title: item.title,
            description: this.getCleanDescription(item.description || ''),
            imageUrl: itemImages.length > 0 ? itemImages[0] : 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop&q=60',
            clicks: item.clicks || 0,
            contentUrl: item.contentUrl || '#',
            embedUrl: item.embedUrl || '',
            author: item.author || 'Redacción',
            publishedAt: item.publishedAt,
            rawDescription: item.description || ''
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
      this.cdr.detectChanges();
    }
  }

  // --- READ ACTIONS ---
  onReadHeroArticle() {
    if (!this.currentUser) {
      this.authModalVisible = true;
      return;
    }

    const art = this.heroArticle;
    // 1. Increment clicks count asynchronously
    this.interactionService.incrementClicks(art.id, 'media', art.clicks || 0)
      .then(nextClicks => {
        art.clicks = nextClicks;
        if (this.selectedArticulo && this.selectedArticulo.id === art.id) {
          this.selectedArticulo.clicks = nextClicks;
        }
      })
      .catch(err => console.warn('Failed to increment clicks:', err));

    // 2. Open reading modal immediately (no wait)
    const mappedArt = {
      id: art.id,
      title: art.title,
      category: art.category,
      description: art.rawDescription || art.description,
      contentUrl: art.contentUrl,
      embedUrl: art.embedUrl,
      author: art.author,
      imageUrl: JSON.stringify(this.getImages(art.imageUrl)),
      publishedAt: art.date,
      clicks: art.clicks
    };
    this.openArticleModal(mappedArt);
  }

  onReadArticle(art: any) {
    if (!this.currentUser) {
      this.authModalVisible = true;
      return;
    }

    // 1. Increment clicks count asynchronously
    this.interactionService.incrementClicks(art.id, 'media', art.clicks || 0)
      .then(nextClicks => {
        art.clicks = nextClicks;
        if (this.selectedArticulo && this.selectedArticulo.id === art.id) {
          this.selectedArticulo.clicks = nextClicks;
        }
      })
      .catch(err => console.warn('Failed to increment clicks:', err));

    // 2. Open reading modal immediately (no wait)
    const mappedArt = {
      id: art.id,
      title: art.title,
      category: art.category,
      description: art.rawDescription || art.description,
      contentUrl: art.contentUrl,
      embedUrl: art.embedUrl,
      author: art.author,
      imageUrl: JSON.stringify(this.getImages(art.imageUrl)),
      publishedAt: art.publishedAt || art.date,
      clicks: art.clicks
    };
    this.openArticleModal(mappedArt);
  }

  openArticleModal(art: any) {
    this.selectedArticulo = art;
    this.articleModalVisible = true;
    this.activeCarouselIndex = 0;
    this.copiedLinkStatus = false;
    this.commentContent = '';
    this.shareModalVisible = false;
    
    // Fetch stats and comments in background
    art.loadingComments = true;
    this.interactionService.getComments(art.id)
      .then(comments => {
        if (this.selectedArticulo && this.selectedArticulo.id === art.id) {
          this.selectedArticulo.comments = comments;
        }
      })
      .catch(err => console.error('Error loading comments for modal:', err))
      .finally(() => {
        if (this.selectedArticulo && this.selectedArticulo.id === art.id) {
          this.selectedArticulo.loadingComments = false;
        }
      });

    this.interactionService.getRatingStats(art.id)
      .then(stats => {
        if (this.selectedArticulo && this.selectedArticulo.id === art.id) {
          this.selectedArticulo.totalLikes = stats.totalLikes;
          this.selectedArticulo.avgStars = stats.avgStars;
        }
      })
      .catch(err => console.error('Error loading stats for modal:', err));
  }

  closeArticleModal() {
    this.articleModalVisible = false;
    this.selectedArticulo = null;
    this.shareModalVisible = false;
  }

  closeAuthModal() {
    this.authModalVisible = false;
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
