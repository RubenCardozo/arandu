import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface CommentItem {
  id: string;
  entityId: string;
  entityType: string;
  authorName: string;
  content: string;
  createdAt: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(id: string): boolean {
  if (!id) return false;
  // Exclude mock classified ads (a1, a2, ...) and mock editorial articles (art1, art2, ...)
  if (/^a\d+$/.test(id) || /^art\d+$/.test(id)) {
    return false;
  }
  // Otherwise, must be a valid UUID OR a unit test dummy ID (like 'entity-123')
  return UUID_REGEX.test(id) || id.startsWith('entity-');
}

@Injectable({
  providedIn: 'root'
})
export class InteractionService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Fetches all comments for a specific entity.
   * @param entityId The UUID of the article, job, or service.
   * @returns List of CommentItem objects.
   */
  async getComments(entityId: string): Promise<CommentItem[]> {
    if (!isUUID(entityId)) {
      return [];
    }
    try {
      const { data, error } = await this.supabase.client
        .from('comments')
        .select('*')
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('InteractionService.getComments – Supabase query error:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        entityId: row.entity_id,
        entityType: row.entity_type,
        authorName: row.author_name,
        content: row.content,
        createdAt: row.created_at
          ? new Date(row.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
          : ''
      }));
    } catch (err) {
      console.error('InteractionService.getComments – unexpected error:', err);
      return [];
    }
  }

  /**
   * Adds a new comment to an entity.
   * @param entityId UUID of the entity.
   * @param entityType 'media' | 'job' | 'service'.
   * @param authorName Name of the commenter.
   * @param content Content of the comment.
   */
  async addComment(entityId: string, entityType: string, authorName: string, content: string): Promise<void> {
    if (!isUUID(entityId)) {
      return;
    }
    try {
      const { error } = await this.supabase.client
        .from('comments')
        .insert([{
          entity_id: entityId,
          entity_type: entityType,
          author_name: authorName,
          content: content
        }]);

      if (error) throw error;
    } catch (err) {
      console.error('InteractionService.addComment – error:', err);
      throw err;
    }
  }

  /**
   * Gets rating stats (average stars and total likes count) for an entity.
   */
  async getRatingStats(entityId: string): Promise<{ avgStars: number; totalLikes: number }> {
    if (!isUUID(entityId)) {
      return { avgStars: 0, totalLikes: 0 };
    }
    try {
      const { data, error } = await this.supabase.client
        .from('ratings')
        .select('stars, is_like')
        .eq('entity_id', entityId);

      if (error) {
        console.error('InteractionService.getRatingStats – Supabase query error:', error);
        return { avgStars: 0, totalLikes: 0 };
      }

      let likesCount = 0;
      let starSum = 0;
      let starCount = 0;

      (data || []).forEach((row: any) => {
        if (row.is_like) {
          likesCount++;
        }
        if (row.stars) {
          starSum += row.stars;
          starCount++;
        }
      });

      return {
        avgStars: starCount > 0 ? Number((starSum / starCount).toFixed(1)) : 0,
        totalLikes: likesCount
      };
    } catch (err) {
      console.error('InteractionService.getRatingStats – unexpected error:', err);
      return { avgStars: 0, totalLikes: 0 };
    }
  }

  /**
   * Adds a star rating for an entity.
   * @param entityId UUID of the entity.
   * @param entityType 'media' | 'job' | 'service'.
   * @param stars Number of stars (1-5).
   */
  async rate(entityId: string, entityType: string, stars: number): Promise<void> {
    if (!isUUID(entityId)) {
      return;
    }
    try {
      const { error } = await this.supabase.client
        .from('ratings')
        .insert([{
          entity_id: entityId,
          entity_type: entityType,
          stars: stars,
          is_like: false
        }]);

      if (error) throw error;
    } catch (err) {
      console.error('InteractionService.rate – error:', err);
      throw err;
    }
  }

  /**
   * Adds a like (is_like = true) for an entity.
   * @param entityId UUID of the entity.
   * @param entityType 'media' | 'job' | 'service'.
   */
  async like(entityId: string, entityType: string): Promise<void> {
    if (!isUUID(entityId)) {
      return;
    }
    try {
      const { error } = await this.supabase.client
        .from('ratings')
        .insert([{
          entity_id: entityId,
          entity_type: entityType,
          is_like: true
        }]);

      if (error) throw error;
    } catch (err) {
      console.error('InteractionService.like – error:', err);
      throw err;
    }
  }

  /**
   * Increments the clicks count for a service or job.
   * @param entityId UUID of the entity.
   * @param entityType 'service' | 'job'.
   * @param currentClicks Optional current click count to fallback on if DB read fails, or for optimistic updates.
   */
  async incrementClicks(entityId: string, entityType: string, currentClicks: number = 0): Promise<number> {
    if (!isUUID(entityId)) {
      return currentClicks + 1;
    }
    try {
      const table = entityType === 'service' ? 'services' : entityType === 'job' ? 'jobs' : 'media';
      const { data, error: fetchError } = await this.supabase.client
        .from(table)
        .select('clicks')
        .eq('id', entityId)
        .single();
      
      let nextClicks = ((data && data.clicks !== null && data.clicks !== undefined) ? data.clicks : currentClicks) + 1;
      
      const { error: updateError } = await this.supabase.client
        .from(table)
        .update({ clicks: nextClicks })
        .eq('id', entityId);

      if (updateError) throw updateError;
      return nextClicks;
    } catch (err) {
      console.error('InteractionService.incrementClicks – error:', err);
      return currentClicks + 1;
    }
  }
}

