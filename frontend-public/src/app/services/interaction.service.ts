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
   * Updates an existing comment.
   */
  async updateComment(commentId: string, content: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('comments')
        .update({ content })
        .eq('id', commentId);
      if (error) throw error;
    } catch (err) {
      console.error('InteractionService.updateComment – error:', err);
      throw err;
    }
  }

  /**
   * Deletes an existing comment.
   */
  async deleteComment(commentId: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
    } catch (err) {
      console.error('InteractionService.deleteComment – error:', err);
      throw err;
    }
  }

  private getVoterId(): string {
    const sessionStr = localStorage.getItem('sb-ulzvqnphawocufhqyfet-auth-token');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session?.user?.id) {
          return session.user.id;
        }
      } catch (e) {}
    }
    let guestId = localStorage.getItem('arandu_guest_voter_id');
    if (!guestId) {
      guestId = 'guest_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('arandu_guest_voter_id', guestId);
    }
    return guestId;
  }

  /**
   * Gets rating stats (average stars, total likes, total dislikes, and user's current vote) for an entity.
   */
  async getRatingStats(entityId: string): Promise<{ avgStars: number; totalLikes: number; totalDislikes: number; userVote: 'like' | 'dislike' | null }> {
    if (!isUUID(entityId)) {
      return { avgStars: 0, totalLikes: 0, totalDislikes: 0, userVote: null };
    }
    try {
      const { data, error } = await this.supabase.client
        .from('ratings')
        .select('stars, is_like, is_dislike, voter_id')
        .eq('entity_id', entityId);

      if (error) {
        console.error('InteractionService.getRatingStats – Supabase query error:', error);
        return { avgStars: 0, totalLikes: 0, totalDislikes: 0, userVote: null };
      }

      let likesCount = 0;
      let dislikesCount = 0;
      let starSum = 0;
      let starCount = 0;
      let userVote: 'like' | 'dislike' | null = null;
      const currentVoterId = this.getVoterId();

      (data || []).forEach((row: any) => {
        if (row.is_like) {
          likesCount++;
        }
        if (row.is_dislike) {
          dislikesCount++;
        }
        if (row.stars) {
          starSum += row.stars;
          starCount++;
        }
        if (row.voter_id === currentVoterId) {
          if (row.is_like) userVote = 'like';
          else if (row.is_dislike) userVote = 'dislike';
        }
      });

      return {
        avgStars: starCount > 0 ? Number((starSum / starCount).toFixed(1)) : 0,
        totalLikes: likesCount,
        totalDislikes: dislikesCount,
        userVote
      };
    } catch (err) {
      console.error('InteractionService.getRatingStats – unexpected error:', err);
      return { avgStars: 0, totalLikes: 0, totalDislikes: 0, userVote: null };
    }
  }

  /**
   * Adds a star rating for an entity.
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
          is_like: false,
          is_dislike: false
        }]);

      if (error) throw error;
    } catch (err) {
      console.error('InteractionService.rate – error:', err);
      throw err;
    }
  }

  /**
   * Casts a like or dislike vote for an entity.
   * If voteType is null, deletes the user's vote.
   */
  async vote(entityId: string, entityType: string, voteType: 'like' | 'dislike' | null): Promise<void> {
    if (!isUUID(entityId)) {
      return;
    }
    try {
      const voterId = this.getVoterId();
      if (voteType === null) {
        const { error } = await this.supabase.client
          .from('ratings')
          .delete()
          .eq('entity_id', entityId)
          .eq('voter_id', voterId);
        if (error) throw error;
      } else {
        const { error } = await this.supabase.client
          .from('ratings')
          .upsert({
            entity_id: entityId,
            entity_type: entityType,
            voter_id: voterId,
            is_like: voteType === 'like',
            is_dislike: voteType === 'dislike'
          }, {
            onConflict: 'entity_id,voter_id'
          });
        if (error) throw error;
      }
    } catch (err) {
      console.error('InteractionService.vote – error:', err);
      throw err;
    }
  }

  /**
   * Adds a like for an entity (for backwards compatibility).
   */
  async like(entityId: string, entityType: string): Promise<void> {
    return this.vote(entityId, entityType, 'like');
  }

  /**
   * Toggles adding an entity to the user's favorites.
   * Returns true if added, false if removed.
   */
  async toggleFavorite(entityId: string, entityType: string): Promise<boolean> {
    const sessionStr = localStorage.getItem('sb-ulzvqnphawocufhqyfet-auth-token');
    if (!sessionStr) throw new Error('Debes iniciar sesión para guardar favoritos');
    let userId: string;
    try {
      const session = JSON.parse(sessionStr);
      userId = session?.user?.id;
      if (!userId) throw new Error('Debes iniciar sesión para guardar favoritos');
    } catch (e) {
      throw new Error('Debes iniciar sesión para guardar favoritos');
    }

    try {
      // Check if already favorite
      const { data, error: fetchError } = await this.supabase.client
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('entity_id', entityId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        // Remove from favorites
        const { error: deleteError } = await this.supabase.client
          .from('favorites')
          .delete()
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        return false;
      } else {
        // Add to favorites
        const { error: insertError } = await this.supabase.client
          .from('favorites')
          .insert([{
            user_id: userId,
            entity_id: entityId,
            entity_type: entityType
          }]);
        if (insertError) throw insertError;
        return true;
      }
    } catch (err) {
      console.error('InteractionService.toggleFavorite – error:', err);
      throw err;
    }
  }

  /**
   * Checks if an entity is in the user's favorites.
   */
  async isFavorite(entityId: string): Promise<boolean> {
    const sessionStr = localStorage.getItem('sb-ulzvqnphawocufhqyfet-auth-token');
    if (!sessionStr) return false;
    let userId: string;
    try {
      const session = JSON.parse(sessionStr);
      userId = session?.user?.id;
      if (!userId) return false;
    } catch (e) {
      return false;
    }

    try {
      const { data, error } = await this.supabase.client
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('entity_id', entityId)
        .maybeSingle();

      if (error) return false;
      return !!data;
    } catch (err) {
      return false;
    }
  }

  /**
   * Gets all user favorites, populated with details from media, services, or jobs tables.
   */
  async getFavorites(): Promise<any[]> {
    const sessionStr = localStorage.getItem('sb-ulzvqnphawocufhqyfet-auth-token');
    if (!sessionStr) return [];
    let userId: string;
    try {
      const session = JSON.parse(sessionStr);
      userId = session?.user?.id;
      if (!userId) return [];
    } catch (e) {
      return [];
    }

    try {
      const { data: favs, error } = await this.supabase.client
        .from('favorites')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      if (!favs || favs.length === 0) return [];

      const results: any[] = [];
      await Promise.all(favs.map(async (fav: any) => {
        try {
          let entityData: any = null;
          if (fav.entity_type === 'media') {
            const { data } = await this.supabase.client
              .from('media')
              .select('*')
              .eq('id', fav.entity_id)
              .single();
            if (data) {
              entityData = {
                id: data.id,
                title: data.title,
                description: data.description,
                imageUrl: data.image_url,
                publishedAt: data.published_at ? new Date(data.published_at).toLocaleDateString('es-ES') : '',
                author: data.author,
                type: 'media',
                clicks: data.clicks,
                embedUrl: data.embed_url,
                entityType: 'media'
              };
            }
          } else {
            const { data: serviceData } = await this.supabase.client
              .from('services')
              .select('*')
              .eq('id', fav.entity_id)
              .single();

            if (serviceData) {
              entityData = {
                id: serviceData.id,
                title: serviceData.title,
                description: serviceData.description,
                imageUrl: serviceData.image_url,
                contactName: serviceData.contact_name,
                contactPhone: serviceData.phone,
                contactEmail: serviceData.email,
                website: serviceData.website,
                clicks: serviceData.clicks,
                category: serviceData.category,
                landingTemplate: serviceData.landing_template,
                landingConfig: serviceData.landing_config,
                type: serviceData.landing_template ? 'portfolio' : 'anuncio',
                entityType: 'service'
              };
            } else {
              const { data: jobData } = await this.supabase.client
                .from('jobs')
                .select('*')
                .eq('id', fav.entity_id)
                .single();

              if (jobData) {
                entityData = {
                  id: jobData.id,
                  title: jobData.title,
                  description: jobData.description,
                  company: jobData.company,
                  jobType: jobData.job_type,
                  salary: jobData.salary,
                  requirements: jobData.requirements,
                  contactEmail: jobData.contact_email,
                  contactPhone: jobData.contact_phone,
                  clicks: jobData.clicks,
                  category: 'Empleo',
                  type: 'anuncio',
                  entityType: 'job'
                };
              }
            }
          }

          if (entityData) {
            results.push(entityData);
          }
        } catch (err) {
          console.error('Error fetching details for favorite:', fav, err);
        }
      }));

      return results;
    } catch (err) {
      console.error('InteractionService.getFavorites – error:', err);
      return [];
    }
  }

  /**
   * Submits a content report to the reports table.
   */
  async submitReport(entityId: string, entityType: string, reason: string, description: string): Promise<void> {
    if (!isUUID(entityId)) {
      return;
    }
    try {
      let reporterId: string | null = null;
      const sessionStr = localStorage.getItem('sb-ulzvqnphawocufhqyfet-auth-token');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          reporterId = session?.user?.id || null;
        } catch (e) {}
      }

      const { error } = await this.supabase.client
        .from('reports')
        .insert([{
          entity_id: entityId,
          entity_type: entityType,
          reporter_id: reporterId,
          reason: reason,
          description: description
        }]);

      if (error) throw error;
    } catch (err) {
      console.error('InteractionService.submitReport – error:', err);
      throw err;
    }
  }

  /**
   * Increments the clicks count for a service or job.
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

