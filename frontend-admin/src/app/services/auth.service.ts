import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

/**
 * Service responsible for authentication operations.
 * Wraps Supabase Auth methods to decouple components from the Supabase SDK.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Signs in a user with email and password.
   * @param email    - The user's email address.
   * @param password - The user's password.
   * @returns An object with an optional error message string.
   */
  async signIn(email: string, password: string): Promise<{ error?: string }> {
    const { error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  }

  /**
   * Signs out the currently authenticated user.
   */
  async signOut(): Promise<void> {
    await this.supabase.client.auth.signOut();
  }

  /**
   * Retrieves the current authentication session.
   * @returns The session object if authenticated, or null.
   */
  async getSession(): Promise<any> {
    const { data: { session } } = await this.supabase.client.auth.getSession();
    return session;
  }
}
