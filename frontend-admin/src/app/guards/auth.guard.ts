import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    const session = await this.authService.getSession();
    if (session && session.user) {
      const user = session.user;
      const role = user.app_metadata?.role || user.user_metadata?.role;
      const email = user.email || '';

      const isAdminRole = role === 'admin';
      const isAdminEmail = email === 'admin@arandu.ch' || email.endsWith('@arandu.ch');

      if (isAdminRole || isAdminEmail) {
        return true;
      }
    }
    
    // Sign out to clean the session if a non-admin somehow bypasses or had a generic session
    await this.authService.signOut();
    this.router.navigate(['/login']);
    return false;
  }
}
