// Database Models
export interface Restaurant {
  id: string;
  name: string;
  description: string;
  address: string;
  neighborhood: string;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  clicks: number;
  ownerId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  date: Date | string;
  endDate: Date | string | null;
  location: string;
  neighborhood: string | null;
  price: number;
  imageUrl: string | null;
  organizerName: string | null;
  clicks: number;
  ownerId: string | null;
  createdAt: Date | string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  requirements: string | null;
  salary: string;
  jobType: string;
  contactEmail: string;
  contactPhone: string | null;
  clicks: number;
  ownerId: string | null;
  createdAt: Date | string;
}

export interface Service {
  id: string;
  title: string;
  category: string;
  description: string;
  contactName: string | null;
  phone: string;
  email: string | null;
  website: string | null;
  imageUrl: string | null;
  clicks: number;
  ownerId: string | null;
  createdAt: Date | string;
}

export interface Media {
  id: string;
  title: string;
  type: string;
  category: string | null;
  description: string | null;
  contentUrl: string;
  embedUrl: string | null;
  author: string | null;
  imageUrl: string | null;
  publishedAt: Date | string;
  createdAt: Date | string;
}

export interface Comment {
  id: string;
  entityId: string;
  entityType: string;
  authorName: string;
  content: string;
  createdAt: Date | string;
}

export interface Rating {
  id: string;
  entityId: string;
  entityType: string;
  stars: number | null;
  isLike: boolean;
  isDislike: boolean;
  voterId: string | null;
  createdAt: Date | string;
}

export interface Favorite {
  id: string;
  userId: string;
  entityId: string;
  entityType: string;
  createdAt: Date | string;
}

export interface Report {
  id: string;
  reporterId: string | null;
  entityId: string;
  entityType: string;
  reason: string;
  description: string | null;
  createdAt: Date | string;
}

// Database Models (Insert - simplified for API/frontend clients)
export type RestaurantInsert = Partial<Restaurant>;
export type EventInsert = Partial<EventItem>;
export type JobInsert = Partial<Job>;
export type ServiceInsert = Partial<Service>;
export type MediaInsert = Partial<Media>;
export type CommentInsert = Partial<Comment>;
export type RatingInsert = Partial<Rating>;
export type FavoriteInsert = Partial<Favorite>;
export type ReportInsert = Partial<Report>;

// Visual Editor Portfolio Types
export interface PortfolioSection {
  title: string;
  content: string;
}

export interface PortfolioBlock {
  id: string;
  type: 'text' | 'video' | 'image' | 'layouts' | 'social' | 'menu' | 'slider' | 'columns';
  content?: string;
  fontSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  fontStyle?: 'normal' | 'italic';
  fontFamily?: 'serif' | 'sans' | 'mono' | 'geometric' | 'elegant';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textColor?: string;
  mediaUrl?: string; // YouTube/Vimeo URLs or image ObjectURLs/publicUrls
  mediaType?: 'youtube' | 'vimeo' | 'image';
  layoutCols?: number; // 2, 3, 4 columns
  columns?: {
    blocks: PortfolioBlock[];
  }[];
  menuLinks?: {
    label: string;
    anchor: string;
  }[];
  sliderSlides?: {
    url: string;
    text: string;
  }[];
  sliderAutoplayInterval?: number; // 0, 3, 6, 9
  socialLinks?: {
    whatsapp?: string;
    email?: string;
    website?: string;
    instagram?: string;
    linkedin?: string;
    facebook?: string;
    x?: string;
    youtube?: string;
  };
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
}

export interface PortfolioConfig {
  palette: string;
  font: string;
  heroImage: string;
  sections?: PortfolioSection[];
  blocks?: PortfolioBlock[];
  phoneFijo?: string;
  bgOverlayOpacity?: number;
}

export interface CommentItem {
  id: string;
  entityId: string;
  entityType: string;
  authorName: string;
  content: string;
  createdAt: string;
}
