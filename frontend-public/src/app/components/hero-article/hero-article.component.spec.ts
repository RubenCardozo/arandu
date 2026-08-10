import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeroArticleComponent } from './hero-article.component';
import { ArticleService } from '../../services/article.service';
import { signal } from '@angular/core';
import { ArticleViewModel } from '../../models/article.model';

describe('HeroArticleComponent', () => {
  let component: HeroArticleComponent;
  let fixture: ComponentFixture<HeroArticleComponent>;
  let mockArticleService: Partial<ArticleService>;

  const sampleArticle: ArticleViewModel = {
    id: '1',
    title: 'Test Hero Article Title',
    subtitle: 'Test hero article subtitle for testing.',
    author: 'Jane Doe',
    authorAvatar: 'https://example.com/avatar.jpg',
    sourceName: 'Arandu',
    sourceUrl: 'https://example.com',
    category: 'Technology',
    status: 'published',
    publishedAt: '2026-08-09T00:00:00Z',
    featured: true,
    orderPriority: 1,
    coverImage: 'https://example.com/cover.jpg',
    content: 'Full article text content...'
  };

  beforeEach(async () => {
    mockArticleService = {
      featuredArticle: signal<ArticleViewModel | null>(sampleArticle).asReadonly()
    };

    await TestBed.configureTestingModule({
      imports: [HeroArticleComponent],
      providers: [
        { provide: ArticleService, useValue: mockArticleService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HeroArticleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render cover image, title, subtitle, and author when featured article is present', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Test Hero Article Title');
    expect(compiled.querySelector('p')?.textContent).toContain('Test hero article subtitle for testing.');
    expect(compiled.textContent).toContain('Jane Doe');

    const img = compiled.querySelector('img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain('cover.jpg');
  });
});
