import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArticleService } from '../../services/article.service';
import { ArticleViewModel } from '../../models/article.model';

/**
 * Standalone hero article component.
 * Displays the primary featured article with a modern, responsive hero layout using TailwindCSS.
 */
@Component({
  selector: 'app-hero-article',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero-article.component.html',
  styleUrls: ['./hero-article.component.css']
})
export class HeroArticleComponent implements OnInit {
  /**
   * Injected ArticleService instance using Angular's `inject()` function.
   */
  public readonly articleService: ArticleService = inject(ArticleService);

  ngOnInit(): void {
    this.articleService.loadFeatured();
  }

  /**
   * Accessor getter exposing the featuredArticle signal from the ArticleService.
   */
  public get featuredArticle() {
    return this.articleService.featuredArticle;
  }
}
