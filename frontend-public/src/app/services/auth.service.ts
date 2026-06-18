import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

/**
 * Service responsible for authentication operations via Supabase Auth.
 * Keeps auth logic out of components for clean separation of concerns.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Registers a new user with Supabase Auth.
   * Stores the full name and phone in the user metadata.
   * @param name   User's full name.
   * @param email  User's email address.
   * @param phone  User's phone number.
   * @param password  User's chosen password.
   * @returns An object with an optional `error` message on failure.
   */
  async signUp(
    name: string,
    email: string,
    phone: string,
    password: string
  ): Promise<{ error?: string }> {
    try {
      const { error } = await this.supabase.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone
          }
        }
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (err: any) {
      return { error: err.message || 'An unexpected error occurred during sign-up.' };
    }
  }
}
