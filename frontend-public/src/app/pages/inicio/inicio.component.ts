import { Component, OnInit, OnDestroy, ChangeDetectorRef, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MediaService } from '../../services/media.service';
import { MediaViewModel } from '../../models/media.model';
import { AuthService } from '../../services/auth.service';
import { InteractionService, CommentItem } from '../../services/interaction.service';
import { User } from '@supabase/supabase-js';
import { WorldCupService, WorldCupGame, WorldCupGroup } from '../../services/world-cup.service';
import { SupabaseService } from '../../services/supabase.service';
import { ServicesCatalogService } from '../../services/services-catalog.service';
import { JobsService } from '../../services/jobs.service';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';
import { HeroArticleComponent } from '../../components/hero-article/hero-article.component';

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
  // Interaction stats
  totalLikes?: number;
  totalDislikes?: number;
  commentCount?: number;
  viewCount?: number;
  userVote?: string | null;
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
  // Interaction stats
  totalLikes?: number;
  totalDislikes?: number;
  commentCount?: number;
  viewCount?: number;
  userVote?: string | null;
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SafeUrlPipe, HeroArticleComponent],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent implements OnInit, OnDestroy {
  // Interactive Slider State
  isTraditionalMode = false;
  isMouseInsideCarousel = false;
  isSnappingEnabled = true;
  carouselTargetSpeed = 0;
  carouselCurrentSpeed = 0;
  carouselAnimationId: any = null;
  loading = true;
  currentUser: User | null = null;
  showMoreActions = false;

  // Emojis list
  suggestedEmojis = ['😀', '😂', '😍', '👍', '👏', '🔥', '🙌', '🌟', '💡', '📍'];

  // Public user profile modal properties
  showPublicProfileModal = false;
  publicProfileUser: any = null;
  publicUserAds: any[] = [];
  publicUserFavorites: any[] = [];
  publicActiveTab: 'publications' | 'favorites' = 'publications';

  // Report Modal Properties
  showReportModal = false;
  reportEntityId = '';
  reportEntityType = '';
  reportReason = '';
  reportDescription = '';
  reportSuccessMessage = '';
  reportErrorMessage = '';

  // Main Hero article (defaults to static mock data, updated dynamically from Supabase)
  heroArticle: {
    id: string; category: string; author: string; date: string;
    title: string; description: string; imageUrl: string;
    contentUrl: string; embedUrl: string; clicks: number; rawDescription: string;
    totalLikes?: number; totalDislikes?: number; commentCount?: number;
    viewCount?: number; userVote?: string | null;
  } = {
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
  commentsPanelOpen = false;
  selectedArticulo: any = null;
  activeCarouselIndex = 0;
  commentContent = '';
  copiedLinkStatus = false;
  commentFocused = false;
  commentSortOrder: 'recent' | 'popular' = 'recent';
  activeCommentMenu: any = null;
  editingCommentId: string | null = null;
  editingCommentText: string = '';

  // Control lists for session likes
  likedArticles: Set<string> = new Set();

  // General News properties
  generalArticles: any[] = [];
  selectedGeneralCategory: string = 'Todo';
  selectedGeneralSortKey: 'RECIENTES' | 'VALORADAS' | 'VISTAS' | 'COMENTADAS' = 'RECIENTES';
  generalNewsPage: number = 0;
  generalPageSize: number = 4;

  fallbackGeneralArticles: any[] = [
    {
      id: 'gen-dep-1',
      category: 'Deportes',
      title: 'Neuquén recibe el torneo regional de Básquet',
      description: 'Más de 20 equipos de toda la Patagonia se reunirán este fin de semana en el Ruca Che para disputar la copa regional.',
      imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80',
      publishedAt: 'Hace 15 min',
      author: 'Carlos Ruiz',
      clicks: 42,
      rawDescription: JSON.stringify([
        { type: 'subtitle', content: 'Copa Patagónica de Básquetbol 2026' },
        { type: 'text', content: 'Este fin de semana, el emblemático estadio Ruca Che se vestirá de fiesta para recibir el Torneo Regional de Básquetbol, un evento que reúne a más de 20 delegaciones de toda la Patagonia.\n\nLos equipos competirán en categorías masculinas y femeninas, buscando clasificar para la etapa nacional. Los organizadores estiman una concurrencia masiva de familias y aficionados al deporte.' },
        { type: 'subtitle', content: 'Cronograma de Partidos' },
        { type: 'text', content: 'La competencia iniciará el viernes a las 14:00 horas con los partidos de fase de grupos. Las finales de ambas categorías se disputarán el domingo a partir de las 18:00, seguidas por la ceremonia de premiación. La entrada general será gratuita para incentivar el deporte comunitario.' }
      ])
    },
    {
      id: 'gen-dep-2',
      category: 'Deportes',
      title: 'Inscripciones abiertas para la Maratón Aniversario',
      description: 'Ya se encuentran habilitados los registros para participar de la carrera más importante de la ciudad por los festejos locales.',
      imageUrl: 'https://images.unsplash.com/photo-1502224562085-639556652f33?w=600&auto=format&fit=crop&q=80',
      publishedAt: 'Ayer',
      author: 'María Luz',
      clicks: 85,
      rawDescription: JSON.stringify([
        { type: 'subtitle', content: 'Corre por tu Ciudad' },
        { type: 'text', content: 'En el marco de los festejos por el aniversario de la ciudad, se ha lanzado oficialmente la convocatoria para la gran Maratón Aniversario.\n\nLa carrera contará con tres modalidades: participativa (3K), competitiva (10K) y profesional (21K), permitiendo la integración de corredores de todos los niveles y edades.' },
        { type: 'subtitle', content: 'Inscripción y Kits' },
        { type: 'text', content: 'Las inscripciones se realizan de manera online en el portal municipal. Los primeros 500 registrados recibirán la remera oficial de la maratón y el chip de cronometraje oficial. Todo lo recaudado será destinado a equipar los centros deportivos de los barrios periféricos.' }
      ])
    },
    {
      id: 'gen-age-1',
      category: 'Agenda',
      title: 'Feria de Artesanos en la Avenida Argentina',
      description: 'Vuelve la tradicional feria del fin de semana con stands de artesanías locales, productos regionales y espectáculos en vivo.',
      imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&auto=format&fit=crop&q=80',
      publishedAt: 'Hoy',
      author: 'Ana Laura',
      clicks: 120,
      rawDescription: JSON.stringify([
        { type: 'subtitle', content: 'Encuentro con la Cultura Local' },
        { type: 'text', content: 'La Avenida Argentina volverá a transformarse en un corredor peatonal este sábado y domingo para albergar a más de 150 artesanos y productores locales.\n\nLos visitantes podrán recorrer stands de marroquinería, cerámica, tejidos artesanales, platería y degustar productos regionales tradicionales como quesos y dulces.' },
        { type: 'subtitle', content: 'Escenario Artístico' },
        { type: 'text', content: 'Durante las dos jornadas, a partir de las 18:00, se habilitará un escenario central donde se presentarán bandas de folclore local, elencos de danza contemporánea y espectáculos de títeres para los más pequeños.' }
      ])
    },
    {
      id: 'gen-age-2',
      category: 'Agenda',
      title: 'Muestra fotográfica en el Museo de Bellas Artes',
      description: 'Artistas locales exponen sus visiones sobre el paisaje del Limay y el Neuquén en una exhibición gratuita abierta a todo público.',
      imageUrl: 'https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?w=600&auto=format&fit=crop&q=80',
      publishedAt: 'Hace 2 h',
      author: 'Esteban Solis',
      clicks: 64,
      rawDescription: JSON.stringify([
        { type: 'subtitle', content: 'Visiones del Agua y la Tierra' },
        { type: 'text', content: 'El Museo Nacional de Bellas Artes presenta la muestra temporal "Visiones de la Confluencia", una serie de 40 fotografías en blanco y negro capturadas por fotógrafos de la región.\n\nLa exhibición busca plasmar el contraste geográfico, la fauna autóctona y la vida cotidiana en las orillas de los ríos Limay y Neuquén.' },
        { type: 'subtitle', content: 'Horarios de Visita' },
        { type: 'text', content: 'La muestra estará abierta de martes a sábados de 10:00 a 20:00, y domingos de 16:00 a 20:00. Las visitas guiadas gratuitas se realizan los sábados a las 18:00 horas.' }
      ])
    },
    {
      id: 'gen-edu-1',
      category: 'Educación',
      title: 'Talleres comunitarios de informática y tecnología',
      description: 'Clases gratuitas orientadas a adultos mayores y familias para reducir la brecha digital en el acceso a servicios públicos cantonales.',
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
      publishedAt: 'Ayer',
      author: 'Sofía Martínez',
      clicks: 53,
      rawDescription: JSON.stringify([
        { type: 'subtitle', content: 'Integración Digital en la Comunidad' },
        { type: 'text', content: 'Con el objetivo de facilitar el acceso a la tecnología, se dictarán talleres de herramientas digitales en la biblioteca municipal.\n\nLas temáticas abarcan el uso de correo electrónico, seguridad digital, trámites online de la administración pública y uso básico de redes sociales.' },
        { type: 'subtitle', content: 'Inscripciones Abiertas' },
        { type: 'text', content: 'Los talleres se dictan los martes y jueves en dos turnos (mañana y tarde). Las vacantes son limitadas para garantizar computadoras individuales a todos los participantes.' }
      ])
    },
    {
      id: 'gen-tra-1',
      category: 'Trámites',
      title: 'Nuevos plazos para la declaración simplificada de impuestos',
      description: 'La administración cantonal amplía el calendario fiscal para la presentación de deducciones extraordinarias. Conoce los requisitos aquí.',
      imageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
      publishedAt: 'Hace 3 d',
      author: 'Pedro Gómez',
      clicks: 210,
      rawDescription: JSON.stringify([
        { type: 'subtitle', content: 'Modificaciones en el Calendario Fiscal 2026' },
        { type: 'text', content: 'La oficina de finanzas ha anunciado una prórroga extraordinaria de 30 días para completar el formulario de deducciones en la fuente.\n\nEsta medida busca aliviar el proceso administrativo y facilitar que los contribuyentes declaren correctamente gastos en transporte, alimentación y salud.' },
        { type: 'subtitle', content: 'Cómo Presentar el Trámite' },
        { type: 'text', content: 'El trámite se realiza exclusivamente en línea mediante la firma electrónica autorizada. Es obligatorio adjuntar los comprobantes de gastos debidamente escaneados.' }
      ])
    },
    {
      id: 'gen-sal-1',
      category: 'Salud',
      title: 'Campaña de vacunación en los barrios',
      description: 'Unidades móviles de salud visitarán distintos puntos de la ciudad esta semana para completar esquemas de vacunación obligatoria.',
      imageUrl: 'https://images.unsplash.com/photo-1584515906247-4b4c4078a87a?w=600&auto=format&fit=crop&q=80',
      publishedAt: 'Ayer',
      author: 'Dr. Lucas S.',
      clicks: 95,
      rawDescription: JSON.stringify([
        { type: 'subtitle', content: 'Vacunación Pública y Preventiva' },
        { type: 'text', content: 'El Ministerio de Salud ha desplegado unidades móviles destinadas a vacunar contra la gripe estacional y completar el calendario obligatorio infantil.\n\nLas unidades móviles se ubicarán en plazas públicas y centros comunitarios periféricos para facilitar el acceso sin turno previo.' },
        { type: 'subtitle', content: 'Requisitos y Horarios' },
        { type: 'text', content: 'Las personas deben concurrir con su DNI y libreta de vacunación. El horario de atención será de 09:00 a 14:00 horas.' }
      ])
    },
    {
      id: 'gen-sal-2',
      category: 'Salud',
      title: 'Charla sobre alimentación saludable en el invierno',
      description: 'Nutricionistas locales dictarán un taller práctico sobre cómo balancear la dieta incorporando más vegetales y frutas de estación.',
      imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=80',
      publishedAt: 'Hace 4 d',
      author: 'Lic. Clara Vega',
      clicks: 112,
      rawDescription: JSON.stringify([
        { type: 'subtitle', content: 'Alimentación Nutritiva e Invernal' },
        { type: 'text', content: 'Se brindará una conferencia sobre la importancia de la nutrición durante las bajas temperaturas cantonales.\n\nSe compartirán recetas de sopas ricas en nutrientes, batidos con vitamina C y consejos prácticos para evitar el consumo de grasas saturadas.' },
        { type: 'subtitle', content: 'Participación Libre' },
        { type: 'text', content: 'El taller se realizará en el salón de usos múltiples de Plainpalais el jueves a las 19:30. Es abierto y no requiere inscripción previa.' }
      ])
    }
  ];

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
  worldCupModalVisible = false;
  showMatchMoreActions = false;
  matchCommentFocused = false;
  activeMatchTab: 'stats' | 'cards' | 'threat' | 'lineups' = 'stats';

  // Portfolios properties
  portfolios: any[] = [];
  selectedPortfolio: any = null;
  isScrolled = signal(false);
  autoplayTimer: any = null;
  activePreviewTab = 'presentacion';
  currentSlideIndex = 0;
  get slides(): string[] {
    if (!this.selectedPortfolio) return [];
    const config = this.selectedPortfolio.landing_config || {};
    const sections = config.sections || [];
    return sections.map((s: any) => s.title || 'Sección');
  }

  // Lapa Ninja Carousel properties
  featuredAds: any[] = [];
  headlinesScrollLeft = 0;
  headlinesScrollProgress = 25;
  adsScrollLeft = 0;
  adsScrollProgress = 25;
  portfoliosScrollLeft = 0;
  portfoliosScrollProgress = 25;

  constructor(
    private mediaService: MediaService,
    private authService: AuthService,
    private interactionService: InteractionService,
    private sanitizer: DomSanitizer,
    private worldCupService: WorldCupService,
    private cdr: ChangeDetectorRef,
    private supabase: SupabaseService,
    private router: Router,
    private servicesCatalogService: ServicesCatalogService,
    private jobsService: JobsService
  ) {}

  ngOnDestroy() {
    if (this.carouselAnimationId) {
      cancelAnimationFrame(this.carouselAnimationId);
      this.carouselAnimationId = null;
    }
  }

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
    this.loadPortfolios();
    this.loadFeaturedAds();
  }

  // Cross-browser helper to parse "MM/DD/YYYY HH:mm" safely to local Date
  parseLocalDate(dateStr: string, stadiumId?: string): Date {
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

        // Determine offset from local stadium time to UTC
        let localOffsetHours = 0;
        if (stadiumId) {
          const sId = String(stadiumId);
          if (sId === '1' || sId === '2' || sId === '3') {
            localOffsetHours = -6; // Mexico (CST)
          } else if (sId === '4' || sId === '5' || sId === '6') {
            localOffsetHours = -5; // US Central (CDT)
          } else if (sId === '7' || sId === '8' || sId === '9' || sId === '10' || sId === '11' || sId === '12') {
            localOffsetHours = -4; // US Eastern / Toronto (EDT)
          } else if (sId === '13' || sId === '14' || sId === '15' || sId === '16') {
            localOffsetHours = -7; // US Pacific / Vancouver (PDT)
          }
        } else {
          localOffsetHours = -4; // Default EDT
        }

        // Convert stadium time to UTC
        const utcMs = Date.UTC(year, month, day, hour, minute) - (localOffsetHours * 60 * 60 * 1000);
        const parsed = new Date(utcMs);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return new Date();
  }

  getMatchTimeInSwiss(dateStr: string, stadiumId?: string): string {
    if (!dateStr) return '';
    const d = this.parseLocalDate(dateStr, stadiumId);
    return d.toLocaleTimeString('es-ES', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hour12: false });
  }

  getMatchDateInSwiss(dateStr: string, stadiumId?: string): string {
    if (!dateStr) return '';
    const d = this.parseLocalDate(dateStr, stadiumId);
    return d.toLocaleDateString('es-ES', { timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  async loadWorldCupData() {
    this.worldCupLoading = true;
    try {
      const games = await this.worldCupService.getGames();
      this.worldCupGames = games;
      this.worldCupGroups = await this.worldCupService.getGroups();

      // Set default date to the date of the latest finished game
      const finishedGames = games.filter(g => g.finished === 'TRUE');
      if (finishedGames.length > 0) {
        let maxDate = this.parseLocalDate(finishedGames[0].local_date, finishedGames[0].stadium_id);
        finishedGames.forEach(g => {
          const d = this.parseLocalDate(g.local_date, g.stadium_id);
          if (d > maxDate) {
            maxDate = d;
          }
        });
        const swissDateStr = maxDate.toLocaleDateString('en-US', { timeZone: 'Europe/Zurich' }); // "MM/DD/YYYY"
        const [m, day, y] = swissDateStr.split('/');
        this.worldCupSelectedDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(day, 10));
      } else if (games.length > 0) {
        const sortedGames = [...games].sort((a, b) => this.parseLocalDate(a.local_date, a.stadium_id).getTime() - this.parseLocalDate(b.local_date, b.stadium_id).getTime());
        const d = this.parseLocalDate(sortedGames[0].local_date, sortedGames[0].stadium_id);
        const swissDateStr = d.toLocaleDateString('en-US', { timeZone: 'Europe/Zurich' }); // "MM/DD/YYYY"
        const [m, day, y] = swissDateStr.split('/');
        this.worldCupSelectedDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(day, 10));
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
      const d = this.parseLocalDate(g.local_date, g.stadium_id);
      const swissDateStr = d.toLocaleDateString('en-US', { timeZone: 'Europe/Zurich' }); // "MM/DD/YYYY"
      const [m, day, y] = swissDateStr.split('/');
      const normalizedDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(day, 10));
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
      const swissDateStr = d.toLocaleDateString('en-US', { timeZone: 'Europe/Zurich' }); // "MM/DD/YYYY"
      const [m, day, y] = swissDateStr.split('/');
      return parseInt(y, 10) === selYear && (parseInt(m, 10) - 1) === selMonth && parseInt(day, 10) === selDay;
    });
  }

  getMatchUuid(gameId: string): string {
    const str = 'match-' + gameId;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `${hex}-0000-5000-a000-${hex.padStart(12, '0')}`;
  }

  getMatchYoutubeSummaryUrl(game: WorldCupGame): string {
    const home = game.home_team_name_en || '';
    const away = game.away_team_name_en || '';
    const query = encodeURIComponent(`FIFA World Cup 2026 ${home} vs ${away} resumen goles highlights`);
    return `https://www.youtube.com/results?search_query=${query}`;
  }

  getMatchYoutubeEmbedUrl(game: WorldCupGame): SafeResourceUrl {
    const home = (game.home_team_name_en || '').trim();
    const away = (game.away_team_name_en || '').trim();
    
    // Map specific matches to classic real highlights video IDs
    let videoId = '2_Y_w7gP33c'; // Default: World Cup highlights/promo
    
    if ((home === 'Argentina' && away === 'Switzerland') || (home === 'Switzerland' && away === 'Argentina')) {
      videoId = '5F46z4SgG3c'; // Argentina vs Switzerland 2014
    } else if ((home === 'England' && away === 'Croatia') || (home === 'Croatia' && away === 'England')) {
      videoId = 'Pj12WpGk0oA'; // England vs Croatia 2018
    } else if ((home === 'France' && away === 'Spain') || (home === 'Spain' && away === 'France')) {
      videoId = 'Z521mUe7f3o'; // Spain vs France Euro
    } else if ((home === 'Germany' && away === 'Argentina') || (home === 'Argentina' && away === 'Germany')) {
      videoId = 'vH4S7LpxsSw'; // Germany vs Argentina 2014
    } else if ((home === 'Brazil' && away === 'Germany') || (home === 'Germany' && away === 'Brazil')) {
      videoId = 'P-M9H2Bf22s'; // Brazil vs Germany 2014
    } else if ((home === 'Spain' && away === 'Germany') || (home === 'Germany' && away === 'Spain')) {
      videoId = '1qX2z3xR2-w'; // Spain vs Germany 2010
    } else if ((home === 'Norway' && away === 'England') || (home === 'England' && away === 'Norway')) {
      videoId = 'QWqZ2T2_E4A'; // England vs Norway highlights
    }
    
    const url = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  openMatchDetail(game: WorldCupGame) {
    this.selectedMatch = game;
    this.activeMatchTab = 'stats';
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

    // Run change detection synchronously so the modal updates instantly on click!
    this.cdr.detectChanges();

    const uuid = this.getMatchUuid(game.id);

    // Increment clicks count asynchronously
    this.interactionService.incrementClicks(uuid, 'media', game.clicks || 0)
      .then(nextClicks => {
        if (this.selectedMatch && this.selectedMatch.id === game.id) {
          this.selectedMatch.clicks = nextClicks;
          this.cdr.detectChanges();
        }
      })
      .catch(err => console.warn('Failed to increment match clicks:', err));

    // Load match comments in background
    const match = this.selectedMatch as any;
    match.loadingComments = true;
    match.comments = [];
    this.interactionService.getComments(uuid)
      .then(comments => {
        if (this.selectedMatch && this.selectedMatch.id === game.id) {
          this.selectedMatch.comments = comments;
        }
      })
      .catch(err => console.error('Error loading match comments:', err))
      .finally(() => {
        if (this.selectedMatch && this.selectedMatch.id === game.id) {
          this.selectedMatch.loadingComments = false;
        }
        this.cdr.detectChanges();
      });

    // Load match rating stats
    this.interactionService.getRatingStats(uuid)
      .then(stats => {
        if (this.selectedMatch && this.selectedMatch.id === game.id) {
          this.selectedMatch.totalLikes = stats.totalLikes;
          this.selectedMatch.totalDislikes = stats.totalDislikes;
          this.selectedMatch.userVote = stats.userVote as any;
          this.cdr.detectChanges();
        }
      });
  }

  closeMatchDetail() {
    this.selectedMatch = null;
    this.matchStats = null;
    this.matchCommentFocused = false;
  }

  hasPrevMatch(): boolean {
    if (!this.selectedMatch) return false;
    const games = this.getFilteredWorldCupGames();
    const idx = games.findIndex(g => g.id === this.selectedMatch?.id);
    return idx > 0;
  }

  hasNextMatch(): boolean {
    if (!this.selectedMatch) return false;
    const games = this.getFilteredWorldCupGames();
    const idx = games.findIndex(g => g.id === this.selectedMatch?.id);
    return idx !== -1 && idx < games.length - 1;
  }

  navigateMatch(direction: number, event?: Event) {
    if (event) event.stopPropagation();
    if (!this.selectedMatch) return;
    const games = this.getFilteredWorldCupGames();
    const idx = games.findIndex(g => g.id === this.selectedMatch?.id);
    if (idx === -1) return;
    const targetIdx = idx + direction;
    if (targetIdx >= 0 && targetIdx < games.length) {
      this.openMatchDetail(games[targetIdx]);
    }
  }

  async likeMatch(match: any) {
    const prevVote = match.userVote;
    const isUndo = prevVote === 'like';
    const newVote = isUndo ? null : 'like';

    match.userVote = newVote;
    if (isUndo) {
      match.totalLikes = Math.max(0, (match.totalLikes || 0) - 1);
    } else {
      match.totalLikes = (match.totalLikes || 0) + 1;
      if (prevVote === 'dislike') {
        match.totalDislikes = Math.max(0, (match.totalDislikes || 0) - 1);
      }
    }

    try {
      await this.interactionService.vote(this.getMatchUuid(match.id), 'media', newVote);
      this.cdr.detectChanges();
    } catch (e) {
      match.userVote = prevVote;
      this.refreshMatchRatingStats(match);
    }
  }

  async dislikeMatch(match: any) {
    const prevVote = match.userVote;
    const isUndo = prevVote === 'dislike';
    const newVote = isUndo ? null : 'dislike';

    match.userVote = newVote;
    if (isUndo) {
      match.totalDislikes = Math.max(0, (match.totalDislikes || 0) - 1);
    } else {
      match.totalDislikes = (match.totalDislikes || 0) + 1;
      if (prevVote === 'like') {
        match.totalLikes = Math.max(0, (match.totalLikes || 0) - 1);
      }
    }

    try {
      await this.interactionService.vote(this.getMatchUuid(match.id), 'media', newVote);
      this.cdr.detectChanges();
    } catch (e) {
      match.userVote = prevVote;
      this.refreshMatchRatingStats(match);
    }
  }

  private refreshMatchRatingStats(match: any) {
    this.interactionService.getRatingStats(this.getMatchUuid(match.id)).then(stats => {
      if (this.selectedMatch && this.selectedMatch.id === match.id) {
        this.selectedMatch.totalLikes = stats.totalLikes;
        this.selectedMatch.totalDislikes = stats.totalDislikes;
        this.selectedMatch.userVote = stats.userVote as any;
        this.cdr.detectChanges();
      }
    });
  }

  copyMatchLinkToClipboard() {
    const url = window.location.origin + '/inicio?match=' + this.selectedMatch?.id;
    navigator.clipboard.writeText(url).then(() => {
      alert('¡Enlace del partido copiado al portapapeles!');
    });
  }

  getLineupForTeam(teamName: string, prefix: string): { number: number, name: string, pos: string }[] {
    const playerDb: { [key: string]: { name: string, pos: string }[] } = {
      'Norway': [
        { name: 'O. Nyland (GK)', pos: 'POR' },
        { name: 'J. Ryerson', pos: 'DEF' },
        { name: 'K. Ajer', pos: 'DEF' },
        { name: 'L. Østigård', pos: 'DEF' },
        { name: 'A. Hanche-Olsen', pos: 'DEF' },
        { name: 'M. Ødegaard (C)', pos: 'MED' },
        { name: 'P. Berg', pos: 'MED' },
        { name: 'S. Berge', pos: 'MED' },
        { name: 'A. Sørloth', pos: 'DEL' },
        { name: 'E. Haaland', pos: 'DEL' },
        { name: 'A. Nusa', pos: 'DEL' }
      ],
      'England': [
        { name: 'J. Pickford (GK)', pos: 'POR' },
        { name: 'K. Walker', pos: 'DEF' },
        { name: 'J. Stones', pos: 'DEF' },
        { name: 'M. Guehi', pos: 'DEF' },
        { name: 'K. Trippier', pos: 'DEF' },
        { name: 'D. Rice', pos: 'MED' },
        { name: 'J. Bellingham', pos: 'MED' },
        { name: 'P. Foden', pos: 'MED' },
        { name: 'B. Saka', pos: 'DEL' },
        { name: 'H. Kane (C)', pos: 'DEL' },
        { name: 'C. Palmer', pos: 'DEL' }
      ],
      'Argentina': [
        { name: 'E. Martinez (GK)', pos: 'POR' },
        { name: 'N. Molina', pos: 'DEF' },
        { name: 'C. Romero', pos: 'DEF' },
        { name: 'N. Otamendi', pos: 'DEF' },
        { name: 'N. Tagliafico', pos: 'DEF' },
        { name: 'R. De Paul', pos: 'MED' },
        { name: 'E. Fernandez', pos: 'MED' },
        { name: 'A. Mac Allister', pos: 'MED' },
        { name: 'L. Messi (C)', pos: 'DEL' },
        { name: 'J. Alvarez', pos: 'DEL' },
        { name: 'A. Di Maria', pos: 'DEL' }
      ],
      'Switzerland': [
        { name: 'Y. Sommer (GK)', pos: 'POR' },
        { name: 'F. Schär', pos: 'DEF' },
        { name: 'M. Akanji', pos: 'DEF' },
        { name: 'R. Rodriguez', pos: 'DEF' },
        { name: 'S. Widmer', pos: 'DEF' },
        { name: 'G. Xhaka (C)', pos: 'MED' },
        { name: 'R. Freuler', pos: 'MED' },
        { name: 'M. Aebischer', pos: 'MED' },
        { name: 'D. Ndoye', pos: 'DEL' },
        { name: 'B. Embolo', pos: 'DEL' },
        { name: 'R. Vargas', pos: 'DEL' }
      ],
      'France': [
        { name: 'M. Maignan (GK)', pos: 'POR' },
        { name: 'J. Kounde', pos: 'DEF' },
        { name: 'D. Upamecano', pos: 'DEF' },
        { name: 'W. Saliba', pos: 'DEF' },
        { name: 'T. Hernandez', pos: 'DEF' },
        { name: 'N. Kante', pos: 'MED' },
        { name: 'A. Tchouameni', pos: 'MED' },
        { name: 'A. Rabiot', pos: 'MED' },
        { name: 'O. Dembele', pos: 'DEL' },
        { name: 'M. Thuram', pos: 'DEL' },
        { name: 'K. Mbappe (C)', pos: 'DEL' }
      ],
      'Spain': [
        { name: 'Unai Simon (GK)', pos: 'POR' },
        { name: 'Dani Carvajal', pos: 'DEF' },
        { name: 'Robin Le Normand', pos: 'DEF' },
        { name: 'Aymeric Laporte', pos: 'DEF' },
        { name: 'Marc Cucurella', pos: 'DEF' },
        { name: 'Rodri (C)', pos: 'MED' },
        { name: 'Pedri', pos: 'MED' },
        { name: 'Fabian Ruiz', pos: 'MED' },
        { name: 'Lamine Yamal', pos: 'DEL' },
        { name: 'Alvaro Morata', pos: 'DEL' },
        { name: 'Nico Williams', pos: 'DEL' }
      ],
      'Germany': [
        { name: 'Manuel Neuer (GK)', pos: 'POR' },
        { name: 'Joshua Kimmich', pos: 'DEF' },
        { name: 'Antonio Rüdiger', pos: 'DEF' },
        { name: 'Jonathan Tah', pos: 'DEF' },
        { name: 'David Raum', pos: 'DEF' },
        { name: 'Robert Andrich', pos: 'MED' },
        { name: 'Toni Kroos', pos: 'MED' },
        { name: 'Ilkay Gündogan (C)', pos: 'MED' },
        { name: 'Jamal Musiala', pos: 'DEL' },
        { name: 'Kai Havertz', pos: 'DEL' },
        { name: 'Florian Wirtz', pos: 'DEL' }
      ],
      'Brazil': [
        { name: 'Alisson (GK)', pos: 'POR' },
        { name: 'Danilo', pos: 'DEF' },
        { name: 'Marquinhos', pos: 'DEF' },
        { name: 'Gabriel Magalhaes', pos: 'DEF' },
        { name: 'Wendell', pos: 'DEF' },
        { name: 'Bruno Guimaraes', pos: 'MED' },
        { name: 'Joao Gomes', pos: 'MED' },
        { name: 'Lucas Paqueta', pos: 'MED' },
        { name: 'Raphinha', pos: 'DEL' },
        { name: 'Rodrygo (C)', pos: 'DEL' },
        { name: 'Vinicius Jr.', pos: 'DEL' }
      ]
    };

    const cleanName = (teamName || '').trim();
    if (playerDb[cleanName]) {
      return playerDb[cleanName].map((p, idx) => ({ number: idx + 1 === 1 ? 1 : (idx + 2), name: p.name, pos: p.pos }));
    }
    // Fallback generator
    return [
      { number: 1, name: `P. ${prefix}1 (GK)`, pos: 'POR' },
      { number: 2, name: `D. ${prefix}2`, pos: 'DEF' },
      { number: 3, name: `J. ${prefix}3`, pos: 'DEF' },
      { number: 4, name: `M. ${prefix}4`, pos: 'DEF' },
      { number: 5, name: `T. ${prefix}5`, pos: 'DEF' },
      { number: 6, name: `A. ${prefix}6`, pos: 'MED' },
      { number: 7, name: `L. ${prefix}7`, pos: 'MED' },
      { number: 8, name: `R. ${prefix}8`, pos: 'MED' },
      { number: 9, name: `K. ${prefix}9`, pos: 'DEL' },
      { number: 10, name: `V. ${prefix}10 (C)`, pos: 'DEL' },
      { number: 11, name: `S. ${prefix}11`, pos: 'DEL' }
    ];
  }

  generateMatchStats(game: WorldCupGame): any {
    const idNum = parseInt(game.id) || 1;
    const hScore = parseInt(game.home_score) || 0;
    const aScore = parseInt(game.away_score) || 0;
    const isNotStarted = game.time_elapsed === 'notstarted';

    const homeName = game.home_team_name_en || 'Local';
    const awayName = game.away_team_name_en || 'Visitante';
    const homeLineup = this.getLineupForTeam(homeName, 'H');
    const awayLineup = this.getLineupForTeam(awayName, 'A');

    // If the game has not started, return empty/zero statistics
    if (isNotStarted) {
      return {
        possession: { home: 0, away: 0 },
        shots: { home: 0, away: 0 },
        shotsOnTarget: { home: 0, away: 0 },
        passes: { home: 0, away: 0 },
        fouls: { home: 0, away: 0 },
        corners: { home: 0, away: 0 },
        cards: { homeYellow: 0, awayYellow: 0, homeRed: 0, awayRed: 0, details: [] },
        danger: { homeAttacks: 0, awayAttacks: 0, homeRating: 0, awayRating: 0 },
        lineups: {
          homeFormation: '4-3-3',
          awayFormation: '4-3-3',
          homePlayers: homeLineup,
          awayPlayers: awayLineup
        }
      };
    }

    // Deterministic seed based on game ID
    const seed = (idNum * 23) % 100;

    // 1. Possession
    let hPoss = 50;
    const diff = hScore - aScore;
    if (diff > 0) {
      hPoss = 50 + Math.min(diff * 3 + (seed % 5), 18);
    } else if (diff < 0) {
      hPoss = 50 - Math.min(Math.abs(diff) * 3 + (seed % 5), 18);
    } else {
      hPoss = 48 + (seed % 5);
    }
    const aPoss = 100 - hPoss;

    // 2. Shots & Shots on Target (Logical alignment with goals scored)
    const hOnTarget = hScore + 1 + (seed % 4);
    const aOnTarget = aScore + 1 + ((seed + 7) % 4);

    const hShots = hOnTarget + 3 + (seed % 6);
    const aShots = aOnTarget + 3 + ((seed + 13) % 6);

    // 3. Passes (directly proportional to possession)
    const hPasses = Math.round(hPoss * 7.5 + (seed % 30));
    const aPasses = Math.round(aPoss * 7.5 + ((seed + 9) % 30));

    // 4. Fouls & Corners
    const hFouls = 8 + (seed % 7);
    const aFouls = 8 + ((seed + 4) % 7);

    const hCorners = 2 + (seed % 5) + Math.round(hPoss / 15);
    const aCorners = 2 + ((seed + 3) % 5) + Math.round(aPoss / 15);

    // 5. Attacks & Danger Rating
    const hAttacks = Math.round(hPoss * 1.1 + (seed % 10));
    const aAttacks = Math.round(aPoss * 1.1 + ((seed + 12) % 10));
    const hPeligro = Math.min(Math.round((hOnTarget * 1.6) + (hAttacks * 0.2)), 95);
    const aPeligro = Math.min(Math.round((aOnTarget * 1.6) + (aAttacks * 0.2)), 95);

    // 6. Formations
    const formations = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '5-3-2'];
    const hFormation = formations[seed % formations.length];
    const aFormation = formations[(seed + 3) % formations.length];

    // 7. Cards
    const hYellows = (seed % 3) + (aScore > hScore ? 1 : 0);
    const aYellows = ((seed + 2) % 3) + (hScore > aScore ? 1 : 0);
    const hReds = (seed % 19 === 0) ? 1 : 0;
    const aReds = ((seed + 5) % 19 === 0) ? 1 : 0;

    const cardDetails: any[] = [];
    // Generate card details with minutes and player names
    for (let i = 0; i < hYellows; i++) {
      const pIdx = (5 + i * 2) % homeLineup.length;
      const min = Math.round(15 + (i * 20) + (seed % 15));
      cardDetails.push({ team: 'home', player: homeLineup[pIdx].name, type: 'yellow', min: `${min}'` });
    }
    for (let i = 0; i < aYellows; i++) {
      const pIdx = (4 + i * 2) % awayLineup.length;
      const min = Math.round(20 + (i * 20) + ((seed + 3) % 15));
      cardDetails.push({ team: 'away', player: awayLineup[pIdx].name, type: 'yellow', min: `${min}'` });
    }
    if (hReds > 0) {
      const pIdx = 3 % homeLineup.length;
      const min = Math.round(60 + (seed % 25));
      cardDetails.push({ team: 'home', player: homeLineup[pIdx].name, type: 'red', min: `${min}'` });
    }
    if (aReds > 0) {
      const pIdx = 2 % awayLineup.length;
      const min = Math.round(65 + ((seed + 4) % 25));
      cardDetails.push({ team: 'away', player: awayLineup[pIdx].name, type: 'red', min: `${min}'` });
    }

    // Sort cards by minute
    cardDetails.sort((a, b) => parseInt(a.min) - parseInt(b.min));

    return {
      possession: { home: hPoss, away: aPoss },
      shots: { home: hShots, away: aShots },
      shotsOnTarget: { home: hOnTarget, away: aOnTarget },
      passes: { home: hPasses, away: aPasses },
      fouls: { home: hFouls, away: aFouls },
      corners: { home: hCorners, away: aCorners },
      cards: {
        homeYellow: hYellows,
        awayYellow: aYellows,
        homeRed: hReds,
        awayRed: aReds,
        details: cardDetails
      },
      danger: {
        homeAttacks: hAttacks,
        awayAttacks: aAttacks,
        homeRating: hPeligro,
        awayRating: aPeligro
      },
      lineups: {
        homeFormation: hFormation,
        awayFormation: aFormation,
        homePlayers: homeLineup,
        awayPlayers: awayLineup
      }
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
      const data = await this.mediaService.getLatest(10);

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

      // Fetch stats for hero article
      try {
        const stats = await this.interactionService.getRatingStats(this.heroArticle.id);
        this.heroArticle.totalLikes = stats.totalLikes;
      } catch (e) {}
      try {
        const comments = await this.interactionService.getComments(this.heroArticle.id);
        this.heroArticle.commentCount = comments.length;
      } catch (e) {}

      // 2. Map remaining articles to headlines desfilantes
      const dbHeadlines: Headline[] = [];
      const colorClasses = ['text-ink-blue', 'text-sage-green', 'text-vintage-red'];

      // Add the two archive articles
      dbHeadlines.push({
        id: 'arch-integracion-1974',
        category: 'Archivo 1974',
        title: 'El Plan de Integración Escolar (Borrador)',
        description: 'La visión archivística de la educación bilingüe en Ginebra.',
        readTime: 'Año 1974',
        colorClass: 'text-vintage-red',
        clicks: 74,
        author: 'Archivo Arandu',
        imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=60',
        publishedAt: '1974-10-12',
        rawDescription: JSON.stringify([
          {type: 'text', content: 'El Plan de Integración Escolar (Borrador) de 1974 constituye uno de los testimonios históricos más valiosos sobre los esfuerzos por establecer la educación bilingüe y multicultural en el cantón de Ginebra. Este documento, redactado por educadores y activistas locales, sentó las bases para el reconocimiento del derecho de los hijos de inmigrantes hispanohablantes a conservar su lengua de origen.'},
          {type: 'subtitle', content: 'La Educación Bilingüe en Ginebra'},
          {type: 'text', content: 'A principios de la década de 1970, la llegada masiva de familias hispanohablantes a Ginebra demandó una adaptación pedagógica por parte de las instituciones escolares locales. El borrador proponía un currículo compartido para facilitar la transición lingüística y cultural de los alumnos, promoviendo el plurilingüismo como un recurso de alto valor pedagógico e institucional.'},
          {type: 'text', content: 'Hoy en día, este borrador archivado representa una pieza fundamental para comprender la evolución de las políticas educativas y de integración en Ginebra.'}
        ])
      });

      dbHeadlines.push({
        id: 'arch-cooperacion-1992',
        category: 'Archivo 1992',
        title: 'Registros de Cooperación Comunitaria',
        description: 'Primeras actas digitalizadas del colectivo Arandu.',
        readTime: 'Año 1992',
        colorClass: 'text-ink-blue',
        clicks: 92,
        author: 'Archivo Arandu',
        imageUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600&auto=format&fit=crop&q=60',
        publishedAt: '1992-05-18',
        rawDescription: JSON.stringify([
          {type: 'text', content: 'Los Registros de Cooperación Comunitaria de 1992 documentan las primeras reuniones, acuerdos y actas fundacionales del colectivo Arandu en Ginebra. Estas actas digitalizadas revelan el espíritu de ayuda mutua, integración y defensa cultural que dio origen al colectivo.'},
          {type: 'subtitle', content: 'Orígenes del Colectivo Arandu'},
          {type: 'text', content: 'Fundado como un espacio de encuentro solidario para la comunidad, Arandu facilitó los primeros servicios de traducción, orientación legal para trámites de residencia, asesoramiento de empleo y actividades de intercambio lingüístico y cultural en Plainpalais y zonas circundantes.'},
          {type: 'text', content: 'La digitalización de estos documentos históricos permite conservar la memoria social de la cooperación comunitaria de Ginebra y ponerla a disposición de las futuras generaciones.'}
        ])
      });

      data.slice(1).forEach((item: MediaViewModel, idx: number) => {
        const itemImages = this.getImages(item.imageUrl);
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
      });

      // Insert World Cup card as a harmonious headline card
      dbHeadlines.push({
        id: 'headline-worldcup-2026',
        category: 'Mundial 2026',
        title: 'Copa Mundial de la FIFA 2026',
        description: 'Sigue en directo los partidos de la Copa Mundial 2026, clasificaciones, resultados y estadísticas completas de los grupos.',
        readTime: '📺 EN VIVO',
        colorClass: 'text-sage-green',
        clicks: 2026,
        author: 'FIFA / ARANDU',
        imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
        publishedAt: new Date().toISOString(),
        rawDescription: ''
      });

      // Load stats for headlines in parallel
      await Promise.all(
        dbHeadlines.map(async h => {
          try {
            const stats = await this.interactionService.getRatingStats(h.id);
            h.totalLikes = stats.totalLikes;
          } catch (e) {}
          try {
            const comments = await this.interactionService.getComments(h.id);
            h.commentCount = comments.length;
          } catch (e) {}
        })
      );

      this.headlines = dbHeadlines;

      // Map all loaded database articles to our general articles list
      const dbGeneralArticles = data.map((item: MediaViewModel) => {
        const itemImages = this.getImages(item.imageUrl);
        const matchedHeadline = dbHeadlines.find(h => h.id === item.id);
        return {
          id: item.id,
          category: this.getCategoryGroup(item.category || 'Agenda'),
          title: item.title,
          description: this.getCleanDescription(item.description || ''),
          imageUrl: itemImages.length > 0 ? itemImages[0] : 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=60',
          publishedAt: item.publishedAt ? this.formatPublishedTime(item.publishedAt) : 'Reciente',
          author: item.author || 'Redacción',
          clicks: item.clicks || 0,
          totalLikes: matchedHeadline ? (matchedHeadline.totalLikes || 0) : 0,
          commentCount: matchedHeadline ? (matchedHeadline.commentCount || 0) : 0,
          rawDescription: item.description || ''
        };
      });

      // Merge database articles with mock general articles, making sure we don't duplicate by ID
      const mergedList = [...dbGeneralArticles];
      this.fallbackGeneralArticles.forEach(mock => {
        if (!mergedList.some(item => item.id === mock.id)) {
          mergedList.push(mock);
        }
      });
      this.generalArticles = mergedList;

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
    if (art.id === 'headline-worldcup-2026') {
      this.openWorldCupModal();
      return;
    }

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
    this.commentsPanelOpen = false;
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
          this.selectedArticulo.totalDislikes = stats.totalDislikes;
          this.selectedArticulo.userVote = stats.userVote;
          this.selectedArticulo.avgStars = stats.avgStars;
        }
      })
      .catch(err => console.error('Error loading stats for modal:', err));

    this.interactionService.isFavorite(art.id)
      .then(isFav => {
        if (this.selectedArticulo && this.selectedArticulo.id === art.id) {
          this.selectedArticulo.isFavorite = isFav;
        }
      });
  }

  closeArticleModal() {
    this.articleModalVisible = false;
    this.selectedArticulo = null;
    this.shareModalVisible = false;
  }

  toggleCommentsPanel() {
    this.commentsPanelOpen = !this.commentsPanelOpen;
  }

  openWorldCupModal() {
    this.worldCupModalVisible = true;
    this.loadWorldCupData();
    this.cdr.detectChanges();
  }

  closeWorldCupModal() {
    this.worldCupModalVisible = false;
    this.cdr.detectChanges();
  }

  scrollCarousel(carouselId: string, direction: 'left' | 'right') {
    const el = document.getElementById(carouselId);
    if (el) {
      const scrollAmt = direction === 'left' ? -320 : 320;
      el.scrollBy({ left: scrollAmt, behavior: 'smooth' });
    }
  }

  addEmojiToComment(emoji: string) {
    this.commentContent = (this.commentContent || '') + emoji;
    this.cdr.detectChanges();
  }

  openPublicProfile(authorName: string) {
    if (!authorName) return;
    const nameNorm = authorName.toLowerCase().trim();
    
    // Find ads created by this author from mock or featured lists
    this.publicUserAds = this.featuredAds.filter(item => 
      ((item.contactName && item.contactName.toLowerCase().includes(nameNorm)) ||
       (item.announcerName && item.announcerName.toLowerCase().includes(nameNorm)) ||
       (item.title && item.title.toLowerCase().includes(nameNorm)))
    );

    // Mock favorites
    this.publicUserFavorites = this.featuredAds
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

  closeAuthModal() {
    this.authModalVisible = false;
  }

  // --- YOUTUBE ACTIONS ---
  async likeArticle(art: any) {
    const prevVote = art.userVote;
    const isUndo = prevVote === 'like';
    const newVote = isUndo ? null : 'like';

    // Optimistic UI update
    art.userVote = newVote;
    if (isUndo) {
      art.totalLikes = Math.max(0, (art.totalLikes || 0) - 1);
    } else {
      art.totalLikes = (art.totalLikes || 0) + 1;
      if (prevVote === 'dislike') {
        art.totalDislikes = Math.max(0, (art.totalDislikes || 0) - 1);
      }
    }

    try {
      await this.interactionService.vote(art.id, 'media', newVote);
    } catch (e) {
      // Revert if error
      art.userVote = prevVote;
      this.refreshRatingStats(art.id);
    }
  }

  async dislikeArticle(art: any) {
    const prevVote = art.userVote;
    const isUndo = prevVote === 'dislike';
    const newVote = isUndo ? null : 'dislike';

    // Optimistic UI update
    art.userVote = newVote;
    if (isUndo) {
      art.totalDislikes = Math.max(0, (art.totalDislikes || 0) - 1);
    } else {
      art.totalDislikes = (art.totalDislikes || 0) + 1;
      if (prevVote === 'like') {
        art.totalLikes = Math.max(0, (art.totalLikes || 0) - 1);
      }
    }

    try {
      await this.interactionService.vote(art.id, 'media', newVote);
    } catch (e) {
      // Revert if error
      art.userVote = prevVote;
      this.refreshRatingStats(art.id);
    }
  }

  private refreshRatingStats(entityId: string) {
    this.interactionService.getRatingStats(entityId).then(stats => {
      if (this.selectedArticulo && this.selectedArticulo.id === entityId) {
        this.selectedArticulo.totalLikes = stats.totalLikes;
        this.selectedArticulo.totalDislikes = stats.totalDislikes;
        this.selectedArticulo.userVote = stats.userVote;
      }
    });
  }

  shareArticle(art: any) {
    const url = window.location.origin + '/editorial?article=' + art.id;
    navigator.clipboard.writeText(url).then(() => {
      this.copiedLinkStatus = true;
      setTimeout(() => this.copiedLinkStatus = false, 2500);
    });
  }

  async toggleFavoriteArticle(art: any) {
    if (!this.currentUser) {
      this.router.navigate(['/registro']);
      return;
    }
    try {
      const isFav = await this.interactionService.toggleFavorite(art.id, 'media');
      art.isFavorite = isFav;
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

  getArticleBajada(description: string): string {
    if (!description) return '';
    const blocks = this.getBlocks(description);
    const firstTextBlock = blocks.find(b => b.type === 'text');
    if (firstTextBlock && typeof firstTextBlock.content === 'string') {
      const paragraphs = firstTextBlock.content.split('\n\n');
      return paragraphs[0] || '';
    }
    return '';
  }

  getArticleRemainingContent(description: string): any[] {
    if (!description) return [];
    const blocks = this.getBlocks(description);
    
    const firstTextIdx = blocks.findIndex(b => b.type === 'text');
    if (firstTextIdx === -1) return blocks;
    
    const firstTextBlock = blocks[firstTextIdx];
    const paragraphs = firstTextBlock.content.split('\n\n');
    
    const remainingBlocks = [];
    for (let i = 0; i < firstTextIdx; i++) {
      remainingBlocks.push(blocks[i]);
    }
    
    if (paragraphs.length > 1) {
      remainingBlocks.push({
        ...firstTextBlock,
        content: paragraphs.slice(1).join('\n\n')
      });
    }
    
    for (let i = firstTextIdx + 1; i < blocks.length; i++) {
      remainingBlocks.push(blocks[i]);
    }
    
    return remainingBlocks;
  }

  isMyComment(comment: any): boolean {
    if (!this.currentUser || !comment) return false;
    const metadata = this.currentUser.user_metadata;
    const currentName = metadata?.['nickname'] || metadata?.['full_name'] || this.currentUser.email || '';
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
    if (!confirm('¿Estás seguro de que deseas eliminar este comentario?')) return;
    try {
      await this.interactionService.deleteComment(comment.id);
      if (this.selectedArticulo) {
        this.selectedArticulo.comments = this.selectedArticulo.comments.filter((c: any) => c.id !== comment.id);
      }
      if (this.selectedMatch) {
        const match = this.selectedMatch as any;
        if (match.comments) {
          match.comments = match.comments.filter((c: any) => c.id !== comment.id);
        }
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
    this.commentContent = `@${authorName} ` + (this.commentContent || '');
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
    const metadata = this.currentUser?.user_metadata;
    const authorName = metadata?.['nickname'] || metadata?.['full_name'] || this.currentUser?.email || 'Usuario';
    
    try {
      await this.interactionService.addComment(art.id, 'media', authorName, this.commentContent.trim());
      this.commentContent = '';
      art.comments = await this.interactionService.getComments(art.id);
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  }

  async modalMatchComment() {
    if (!this.selectedMatch || !this.commentContent.trim()) return;
    const match = this.selectedMatch as any;
    const metadata = this.currentUser?.user_metadata;
    const authorName = metadata?.['nickname'] || metadata?.['full_name'] || this.currentUser?.email || 'Usuario';
    const uuid = this.getMatchUuid(match.id);
    
    try {
      await this.interactionService.addComment(uuid, 'media', authorName, this.commentContent.trim());
      this.commentContent = '';
      match.comments = await this.interactionService.getComments(uuid);
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error adding match comment:', err);
    }
  }

  getSortedComments(comments: any[]): any[] {
    if (!comments) return [];
    const copy = [...comments];
    if (this.commentSortOrder === 'recent') {
      // Recent: newer first (sort by createdAt or id descending)
      return copy.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
    // Popular: sort by likes or stars (just mock likes count sorting here)
    return copy.sort((a, b) => (b.likes || 0) - (a.likes || 0));
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

  async loadPortfolios() {
    try {
      const { data, error } = await this.supabase.client
        .from('services')
        .select('*')
        .not('landing_template', 'is', null);

      if (error) throw error;
      const rawPortfolios = data || [];
      
      // Load stats in parallel
      await Promise.all(
        rawPortfolios.map(async p => {
          try {
            const stats = await this.interactionService.getRatingStats(p.id);
            p.totalLikes = stats.totalLikes;
            p.avgStars = stats.avgStars;
          } catch (e) {}

          try {
            const comments = await this.interactionService.getComments(p.id);
            p.commentCount = comments.length;
          } catch (e) {}
        })
      );

      this.portfolios = rawPortfolios;
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error loading portfolios in home:', err);
    }
  }

  openPortfolio(portfolio: any) {
    this.selectedPortfolio = portfolio;
    const config = portfolio.landing_config || {};
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
    const config = portfolio.landing_config || {};
    return {
      palette: config.palette || 'crosby',
      font: config.font || 'serif',
      heroImage: portfolio.image_url || this.getDefaultImage(portfolio.landing_template)
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

  async loadFeaturedAds() {
    try {
      const [servicesData, jobsData] = await Promise.all([
        this.servicesCatalogService.getAll().catch(() => []),
        this.jobsService.getAll().catch(() => [])
      ]);
      
      const combined = [
        ...(servicesData || []).map((s: any) => ({ ...s, type: 'service' })),
        ...(jobsData || []).map((j: any) => ({ ...j, type: 'job' }))
      ];
      
      // Keep only advertisements (where landingTemplate is null or empty)
      const classifiedAds = combined.filter(ad => ad.type === 'job' || !ad.landingTemplate);

      const withImages = classifiedAds.filter(ad => ad.imageUrl || ad.image_url);
      const withoutImages = classifiedAds.filter(ad => !ad.imageUrl && !ad.image_url);
      const sorted = [...withImages, ...withoutImages].slice(0, 10);

      // Load stats in parallel
      await Promise.all(
        sorted.map(async ad => {
          try {
            const stats = await this.interactionService.getRatingStats(ad.id);
            ad.totalLikes = stats.totalLikes;
          } catch (e) {}

          try {
            const comments = await this.interactionService.getComments(ad.id);
            ad.commentCount = comments.length;
          } catch (e) {}
        })
      );

      this.featuredAds = sorted;
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Error loading featured ads:', e);
    }
  }

  onHeadlinesScroll(event: any) {
    const el = event.target;
    const scrollPercent = el.scrollLeft / (el.scrollWidth - el.clientWidth || 1);
    this.headlinesScrollLeft = scrollPercent * (100 - this.headlinesScrollProgress);
    this.cdr.detectChanges();
  }

  onAdsScroll(event: any) {
    const el = event.target;
    const scrollPercent = el.scrollLeft / (el.scrollWidth - el.clientWidth || 1);
    this.adsScrollLeft = scrollPercent * (100 - this.adsScrollProgress);
    this.cdr.detectChanges();
  }

  onPortfoliosScroll(event: any) {
    const el = event.target;
    const scrollPercent = el.scrollLeft / (el.scrollWidth - el.clientWidth || 1);
    this.portfoliosScrollLeft = scrollPercent * (100 - this.portfoliosScrollProgress);
    this.cdr.detectChanges();
  }

  onReadAd(ad: any) {
    this.router.navigate(['/anuncios'], { queryParams: { id: ad.id } });
  }

  // --- HEADLINES INTERACTIVE CAROUSEL ---
  onCarouselMouseEnter(event: MouseEvent) {
    if (this.isTraditionalMode) return;
    this.isMouseInsideCarousel = true;
    this.isSnappingEnabled = false;
    this.cdr.detectChanges();
    this.runCarouselAnimationLoop();
  }

  onCarouselMouseMove(event: MouseEvent) {
    if (this.isTraditionalMode) return;
    const carousel = document.getElementById('headlinesCarousel');
    if (!carousel) return;
    
    const rect = carousel.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const percentage = mouseX / rect.width;
    
    // Slow, comfortable speed profile: max speed of 4.0 pixels per frame
    const maxSpeed = 4.0; 
    
    if (percentage < 0.35) {
      // Scale speed factor from 0 (at 0.35) to 1 (at 0.0)
      const factor = (0.35 - percentage) / 0.35;
      this.carouselTargetSpeed = -maxSpeed * factor;
    } else if (percentage > 0.65) {
      // Scale speed factor from 0 (at 0.65) to 1 (at 1.0)
      const factor = (percentage - 0.65) / 0.35;
      this.carouselTargetSpeed = maxSpeed * factor;
    } else {
      // Dead zone (35% to 65%): stops completely to read comfortably
      this.carouselTargetSpeed = 0;
    }
  }

  onCarouselMouseLeave(event: MouseEvent) {
    if (this.isTraditionalMode) return;
    this.isMouseInsideCarousel = false;
    this.carouselTargetSpeed = 0; // Decelerates to 0 smoothly
  }

  private runCarouselAnimationLoop() {
    const loop = () => {
      if (this.isTraditionalMode) {
        this.carouselAnimationId = null;
        return;
      }
      
      // Easing / Inertia physics
      this.carouselCurrentSpeed = this.carouselCurrentSpeed + (this.carouselTargetSpeed - this.carouselCurrentSpeed) * 0.08;
      
      // Stop looping and reset snap class when animation stops and mouse is outside
      if (!this.isMouseInsideCarousel && Math.abs(this.carouselCurrentSpeed) < 0.05) {
        this.carouselCurrentSpeed = 0;
        this.carouselAnimationId = null;
        this.isSnappingEnabled = true;
        this.cdr.detectChanges();
        return;
      }
      
      const carousel = document.getElementById('headlinesCarousel');
      if (carousel && Math.abs(this.carouselCurrentSpeed) > 0.01) {
        carousel.scrollLeft += this.carouselCurrentSpeed;
        
        // Infinite scroll wrap around
        if (this.carouselCurrentSpeed > 0) {
          if (carousel.scrollLeft >= (carousel.scrollWidth - carousel.clientWidth - 5)) {
            carousel.scrollLeft = 0;
          }
        } else if (this.carouselCurrentSpeed < 0) {
          if (carousel.scrollLeft <= 5) {
            carousel.scrollLeft = carousel.scrollWidth - carousel.clientWidth;
          }
        }
      }
      
      this.carouselAnimationId = requestAnimationFrame(loop);
    };
    
    if (!this.carouselAnimationId) {
      this.carouselAnimationId = requestAnimationFrame(loop);
    }
  }

  onHeadlineArrowClick(direction: 'left' | 'right', event: Event) {
    event.stopPropagation();
    
    // Permanently turn off hover tracking / interactive mode
    if (!this.isTraditionalMode) {
      this.isTraditionalMode = true;
      this.carouselTargetSpeed = 0;
      this.carouselCurrentSpeed = 0;
      if (this.carouselAnimationId) {
        cancelAnimationFrame(this.carouselAnimationId);
        this.carouselAnimationId = null;
      }
      this.isSnappingEnabled = true;
      this.cdr.detectChanges();
    }
    
    const carousel = document.getElementById('headlinesCarousel');
    if (carousel) {
      const scrollAmount = 344; // Card width (320px) + gap (24px)
      if (direction === 'right') {
        carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      } else {
        carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      }
    }
  }

  // --- MODAL NAVIGATION PREV/NEXT ARTICLES ---
  getAllArticles(): any[] {
    const list = [];
    if (this.heroArticle) {
      list.push(this.heroArticle);
    }
    if (this.headlines) {
      list.push(...this.headlines);
    }
    return list;
  }

  navigateModalArticle(direction: number, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    const list = this.getAllArticles();
    if (list.length <= 1) return;
    const idx = list.findIndex(h => h.id === this.selectedArticulo.id);
    if (idx === -1) return;
    
    let nextIdx = idx + direction;
    if (nextIdx < 0) nextIdx = list.length - 1;
    if (nextIdx >= list.length) nextIdx = 0;
    
    const art = list[nextIdx];
    
    // We increment clicks count when navigating inside the modal
    this.interactionService.incrementClicks(art.id, 'media', art.clicks || 0)
      .then(nextClicks => {
        art.clicks = nextClicks;
        if (this.selectedArticulo && this.selectedArticulo.id === art.id) {
          this.selectedArticulo.clicks = nextClicks;
        }
      })
      .catch(err => console.warn('Failed to increment clicks:', err));

    const mappedArt = {
      id: art.id,
      title: art.title,
      category: art.category,
      description: art.rawDescription || art.description,
      contentUrl: art.contentUrl || '#',
      embedUrl: art.embedUrl || '',
      author: art.author || 'Arandu',
      imageUrl: JSON.stringify(this.getImages(art.imageUrl)),
      publishedAt: art.publishedAt || art.date,
      clicks: art.clicks
    };
    
    this.openArticleModal(mappedArt);
  }

  // --- GENERAL NEWS HELPERS ---
  getCategoryGroup(category: string): string {
    if (!category) return 'Todo';
    const cat = category.toLowerCase();
    if (cat.includes('deportes') || cat.includes('mundial') || cat.includes('maratón') || cat.includes('básquet')) {
      return 'Deportes';
    }
    if (cat.includes('agenda') || cat.includes('cultura') || cat.includes('libros') || cat.includes('folklore') || cat.includes('historia') || cat.includes('tendencias') || cat.includes('cooperativas')) {
      return 'Agenda';
    }
    if (cat.includes('educación') || cat.includes('colegio') || cat.includes('cursos') || cat.includes('francés')) {
      return 'Educación';
    }
    if (cat.includes('trámites') || cat.includes('permisos') || cat.includes('impuestos') || cat.includes('guía local')) {
      return 'Trámites';
    }
    if (cat.includes('salud') || cat.includes('clima') || cat.includes('alimentación') || cat.includes('vacunación') || cat.includes('calor')) {
      return 'Salud';
    }
    return 'Agenda'; // fallback
  }

  formatPublishedTime(dateStr?: string): string {
    if (!dateStr) return 'Reciente';
    try {
      const pubDate = new Date(dateStr);
      if (isNaN(pubDate.getTime())) return 'Reciente';
      const now = new Date();
      const diffMs = now.getTime() - pubDate.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMs / 3600000);
      const diffDay = Math.floor(diffMs / 86400000);

      if (diffMin < 60 && diffMin >= 0) {
        return `Hace ${diffMin} min`;
      } else if (diffHr < 24 && diffHr >= 0) {
        return `Hace ${diffHr} h`;
      } else if (diffDay < 7 && diffDay >= 0) {
        return diffDay === 1 ? 'Ayer' : `Hace ${diffDay} días`;
      } else {
        return pubDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      }
    } catch (e) {
      return 'Reciente';
    }
  }

  getFilteredGeneralNews(): any[] {
    let list = this.generalArticles || [];
    if (this.selectedGeneralCategory !== 'Todo') {
      list = list.filter(item => item.category === this.selectedGeneralCategory);
    }

    // Clone to avoid mutating original source array
    const sorted = [...list];

    // Apply sorting based on key
    switch (this.selectedGeneralSortKey) {
      case 'VALORADAS':
        sorted.sort((a, b) => (b.totalLikes || 0) - (a.totalLikes || 0));
        break;
      case 'VISTAS':
        sorted.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
        break;
      case 'COMENTADAS':
        sorted.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
        break;
      case 'RECIENTES':
      default:
        // Sort by simulated or parsed date
        sorted.sort((a, b) => {
          const timeA = a.id.startsWith('gen-') ? 0 : new Date(a.publishedAt).getTime();
          const timeB = b.id.startsWith('gen-') ? 0 : new Date(b.publishedAt).getTime();
          return timeB - timeA;
        });
        break;
    }

    return sorted;
  }

  selectGeneralSort(sortKey: string) {
    this.selectedGeneralSortKey = sortKey as any;
    this.generalNewsPage = 0;
    this.cdr.detectChanges();
  }

  getSourceName(author?: string): string {
    if (!author) return 'ARANDU';
    const name = author.toUpperCase();
    if (name.includes('CARDOZO') || name.includes('RUBEN') || name.includes('ARANDU')) {
      return 'ARANDU';
    }
    return name;
  }

  getPaginatedGeneralNews(): any[] {
    const filtered = this.getFilteredGeneralNews();
    const startIndex = this.generalNewsPage * this.generalPageSize;
    return filtered.slice(startIndex, startIndex + this.generalPageSize);
  }

  getGeneralNewsPageCount(): number {
    const filtered = this.getFilteredGeneralNews();
    return Math.max(1, Math.ceil(filtered.length / this.generalPageSize));
  }

  nextGeneralNewsPage() {
    if (this.generalNewsPage < this.getGeneralNewsPageCount() - 1) {
      this.generalNewsPage++;
      this.cdr.detectChanges();
    }
  }

  prevGeneralNewsPage() {
    if (this.generalNewsPage > 0) {
      this.generalNewsPage--;
      this.cdr.detectChanges();
    }
  }

  selectGeneralCategory(category: string) {
    this.selectedGeneralCategory = category;
    this.generalNewsPage = 0;
    this.cdr.detectChanges();
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
    const config = this.selectedPortfolio?.landing_config || {};
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
    const config = this.selectedPortfolio.landing_config || {};
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
