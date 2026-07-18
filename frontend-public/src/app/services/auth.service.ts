import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '@supabase/supabase-js';

/**
 * Service responsible for authentication operations via Supabase Auth.
 * Keeps auth logic out of components for clean separation of concerns.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null | undefined>(undefined);
  public currentUser$: Observable<User | null | undefined> = this.currentUserSubject.asObservable();

  constructor(private supabase: SupabaseService) {
    // Get initial session
    this.supabase.client.auth.getSession().then(({ data: { session } }) => {
      this.currentUserSubject.next(session?.user ?? null);
    });

    // Listen to auth state changes
    this.supabase.client.auth.onAuthStateChange((event, session) => {
      this.currentUserSubject.next(session?.user ?? null);
    });
  }

  /**
   * Registers a new user with Supabase Auth.
   * Stores the full name and phone in the user metadata.
   */
  async signUp(
    name: string,
    email: string,
    phone: string,
    password: string,
    subscribeNewsletter: boolean = false
  ): Promise<{ error?: string }> {
    try {
      const parts = name.trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      const { data, error } = await this.supabase.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            first_name: firstName,
            last_name: lastName,
            phone: phone || '',
            login_count: 1,
            subscribe_newsletter: subscribeNewsletter
          }
        }
      });

      if (error) {
        return { error: error.message };
      }

      // Check if user already exists (Supabase returns data.user with empty identities list)
      if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
        return { error: 'El correo electrónico ya está registrado.' };
      }

      return {};
    } catch (err: any) {
      return { error: err.message || 'An unexpected error occurred during sign-up.' };
    }
  }

  /**
   * Triggers the Google OAuth login flow.
   */
  async signInWithGoogle(): Promise<{ error?: string }> {
    try {
      const { error } = await this.supabase.client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) {
        return { error: error.message };
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'An unexpected error occurred during Google sign in.' };
    }
  }

  /**
   * Updates the authenticated user's profile metadata.
   */
  async updateProfile(profileData: {
    firstName: string;
    lastName: string;
    nickname?: string;
    phone: string;
    address: string;
    locality: string;
    subscribeNewsletter?: boolean;
  }): Promise<{ error?: string }> {
    try {
      const fullName = `${profileData.firstName.trim()} ${profileData.lastName.trim()}`;
      const { error } = await this.supabase.client.auth.updateUser({
        data: {
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          nickname: profileData.nickname || '',
          full_name: fullName,
          phone: profileData.phone,
          address: profileData.address,
          locality: profileData.locality,
          subscribe_newsletter: profileData.subscribeNewsletter ?? false
        }
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (err: any) {
      return { error: err.message || 'An unexpected error occurred during profile update.' };
    }
  }

  /**
   * Signs in a user with email and password.
   */
  async signIn(email: string, password: string): Promise<{ error?: string }> {
    try {
      const { data, error } = await this.supabase.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { error: error.message };
      }

      if (data && data.user) {
        const currentCount = data.user.user_metadata?.['login_count'] || 0;
        await this.supabase.client.auth.updateUser({
          data: { login_count: currentCount + 1 }
        });
      }

      return {};
    } catch (err: any) {
      return { error: err.message || 'An unexpected error occurred during sign-in.' };
    }
  }

  /**
   * Signs out the currently authenticated user.
   */
  async signOut(): Promise<{ error?: string }> {
    try {
      const { error } = await this.supabase.client.auth.signOut();

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (err: any) {
      return { error: err.message || 'An unexpected error occurred during sign-out.' };
    }
  }

  /**
   * Extracts user initials (max 2 characters) from name/metadata.
   */
  getUserInitials(user: User | null): string {
    if (!user) return '';
    const name = user.user_metadata?.['full_name'] || user.user_metadata?.['name'];
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].slice(0, Math.min(parts[0].length, 2)).toUpperCase();
    }
    if (user.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  }
}
