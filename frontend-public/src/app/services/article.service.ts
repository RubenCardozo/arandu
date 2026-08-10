import { Injectable, signal, computed, WritableSignal, Signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { ArticleRow, ArticleViewModel } from '../models/article.model';

/**
 * Standalone Angular 18 service responsible for managing article state and interacting with Supabase.
 * Uses native Angular Signals for reactive state management.
 */
@Injectable({ providedIn: 'root' })
export class ArticleService {
  /**
   * Supabase client instance initialized from environment configuration.
   */
  private readonly supabaseClient: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseKey
  );

  /**
   * Internal writable signal holding the list of all loaded articles.
   */
  private readonly articlesSignal: WritableSignal<ArticleViewModel[]> = signal<ArticleViewModel[]>([]);

  /**
   * Internal writable signal holding the single hero featured article.
   */
  private readonly featuredSignal: WritableSignal<ArticleViewModel | null> = signal<ArticleViewModel | null>(null);

  /**
   * Internal writable signal tracking asynchronous loading status.
   */
  private readonly loadingSignal: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Internal writable signal tracking error messages.
   */
  private readonly errorSignal: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Public read-only signal exposing all loaded published articles.
   */
  public readonly articles: Signal<ArticleViewModel[]> = this.articlesSignal.asReadonly();

  /**
   * Public read-only signal exposing the main featured hero article.
   */
  public readonly featuredArticle: Signal<ArticleViewModel | null> = this.featuredSignal.asReadonly();

  /**
   * Public read-only signal tracking loading state.
   */
  public readonly loading: Signal<boolean> = this.loadingSignal.asReadonly();

  /**
   * Public read-only signal tracking error state.
   */
  public readonly error: Signal<string | null> = this.errorSignal.asReadonly();

  /**
   * Computed signal that filters featured articles from the cached state.
   * Articles are sorted by orderPriority descending and publishedAt descending.
   */
  public readonly featuredArticles: Signal<ArticleViewModel[]> = computed(() => {
    return this.articlesSignal()
      .filter((article) => article.featured && article.status === 'published')
      .sort((a, b) => {
        if (b.orderPriority !== a.orderPriority) {
          return b.orderPriority - a.orderPriority;
        }
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
  });

  constructor() {}

  /**
   * Getter for accessing the underlying SupabaseClient instance.
   */
  public get client(): SupabaseClient {
    return this.supabaseClient;
  }

  /**
   * Fetches all published articles from Supabase sorted by published_at date descending.
   * Updates articles, loading, and error signals accordingly.
   *
   * @returns Promise resolving to the list of published ArticleViewModel items.
   */
  public async loadArticles(): Promise<ArticleViewModel[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const { data, error } = await this.supabaseClient
        .from('articles')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('ArticleService.loadArticles - Supabase error:', error.message);
        this.errorSignal.set(error.message);
        this.loadingSignal.set(false);
        return [];
      }

      const viewModels = (data as ArticleRow[] | null)?.map((row) => this.toViewModel(row)) ?? [];
      this.articlesSignal.set(viewModels);
      this.loadingSignal.set(false);
      return viewModels;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while loading articles.';
      console.error('ArticleService.loadArticles - unexpected error:', err);
      this.errorSignal.set(errorMessage);
      this.loadingSignal.set(false);
      return [];
    }
  }

  /**
   * Fetches all published articles from Supabase articles table (alias for loadArticles for backward compatibility).
   *
   * @returns Promise resolving to the fetched array of ArticleViewModel items.
   */
  public async fetchArticles(): Promise<ArticleViewModel[]> {
    return this.loadArticles();
  }

  /**
   * Isolates and loads the single main article marked as featured: true with the highest order_priority
   * for the landing page hero view. Updates the featuredSignal and returns the article.
   *
   * @returns Promise resolving to the single main featured ArticleViewModel or null if none found.
   */
  public async loadFeatured(): Promise<ArticleViewModel | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const { data, error } = await this.supabaseClient
        .from('articles')
        .select('*')
        .eq('status', 'published')
        .eq('featured', true)
        .order('order_priority', { ascending: false, nullsFirst: false })
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(1);

      if (error) {
        console.error('ArticleService.loadFeatured - Supabase error:', error.message);
        this.errorSignal.set(error.message);
        this.loadingSignal.set(false);
        return null;
      }

      const row = data && data.length > 0 ? (data[0] as ArticleRow) : null;
      const viewModel = row ? this.toViewModel(row) : null;
      this.featuredSignal.set(viewModel);
      this.loadingSignal.set(false);
      return viewModel;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while loading the featured article.';
      console.error('ArticleService.loadFeatured - unexpected error:', err);
      this.errorSignal.set(errorMessage);
      this.loadingSignal.set(false);
      return null;
    }
  }

  /**
   * Filters and returns featured articles for the home page hero section.
   * Triggers an initial load if no articles have been loaded yet.
   *
   * @param limit Optional limit on the number of hero featured articles returned (default 3).
   * @returns Promise resolving to filtered featured ArticleViewModel items.
   */
  public async getFeaturedArticles(limit: number = 3): Promise<ArticleViewModel[]> {
    if (this.articlesSignal().length === 0 && !this.loadingSignal()) {
      await this.loadArticles();
    }
    return this.featuredArticles().slice(0, limit);
  }

  /**
   * Retrieves a single article by its unique ID.
   * Checks the cached signal state first, or fetches from Supabase if not found.
   *
   * @param id Unique identifier of the article.
   * @returns Promise resolving to ArticleViewModel or null if not found.
   */
  public async getArticleById(id: string): Promise<ArticleViewModel | null> {
    const existing = this.articlesSignal().find((item) => item.id === id);
    if (existing) {
      return existing;
    }

    try {
      const { data, error } = await this.supabaseClient
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      return this.toViewModel(data as ArticleRow);
    } catch {
      return null;
    }
  }

  /**
   * Filters loaded articles by category name.
   *
   * @param category Target category name string.
   * @returns Array of matching ArticleViewModel items.
   */
  public filterByCategory(category: string): ArticleViewModel[] {
    return this.articlesSignal().filter(
      (item) => item.category.toLowerCase() === category.toLowerCase(),
    );
  }

  /**
   * Transforms a raw database ArticleRow into a strongly-typed ArticleViewModel.
   * Provides clean formatting and fallback default values.
   *
   * @param row Raw database row record.
   * @returns Formatted ArticleViewModel object.
   */
  private toViewModel(row: ArticleRow): ArticleViewModel {
    return {
      id: row.id,
      title: row.title,
      subtitle: row.subtitle ?? '',
      author: row.author ?? 'Redacción Arandu',
      authorAvatar: row.author_avatar ?? '',
      sourceName: row.source_name ?? 'Arandu',
      sourceUrl: row.source_url ?? '#',
      category: row.category ?? 'General',
      status: row.status ?? 'published',
      publishedAt: row.published_at
        ? new Date(row.published_at).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : '',
      featured: Boolean(row.featured),
      orderPriority: row.order_priority ?? 0,
      coverImage: row.cover_image ?? '',
      content: row.content ?? '',
      createdAt: row.created_at ?? undefined,
      updatedAt: row.updated_at ?? undefined,
    };
  }
}

