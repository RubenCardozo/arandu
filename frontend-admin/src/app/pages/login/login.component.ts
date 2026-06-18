import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    const { email, password } = this.loginForm.value;

    try {
      const result = await this.authService.signIn(email, password);

      if (result.error) {
        this.errorMessage = 'Credenciales inválidas. Por favor intente de nuevo.';
      } else {
        const session = await this.authService.getSession();
        if (session && session.user) {
          const user = session.user;
          const role = user.app_metadata?.role || user.user_metadata?.role;
          const userEmail = user.email || '';

          const isAdminRole = role === 'admin';
          const isAdminEmail = userEmail === 'admin@arandu.ch' || userEmail.endsWith('@arandu.ch');

          if (isAdminRole || isAdminEmail) {
            this.router.navigate(['/dashboard']);
          } else {
            await this.authService.signOut();
            this.errorMessage = 'Access denied. Administrator privileges required.';
          }
        } else {
          this.errorMessage = 'Ocurrió un error al obtener la sesión de usuario.';
        }
      }
    } catch (err: any) {
      this.errorMessage = err.message || 'Ocurrió un error inesperado al iniciar sesión.';
    } finally {
      this.loading = false;
    }
  }

  get emailInvalid() {
    const control = this.loginForm.get('email');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  get passwordInvalid() {
    const control = this.loginForm.get('password');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }
}
