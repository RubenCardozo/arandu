import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css']
})
export class RegistroComponent implements OnInit {
  registroForm!: FormGroup;
  loginForm!: FormGroup;
  isLoginMode = false;
  loading = false;
  successMessage = '';
  errorMessage = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.registroForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-]{8,20}$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      terms: [false, [Validators.requiredTrue]],
      subscribeNewsletter: [false]
    });

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleMode(loginMode: boolean) {
    this.isLoginMode = loginMode;
    this.successMessage = '';
    this.errorMessage = '';
  }

  async onSubmit() {
    if (this.isLoginMode) {
      if (this.loginForm.invalid) {
        this.loginForm.markAllAsTouched();
        return;
      }

      this.loading = true;
      this.successMessage = '';
      this.errorMessage = '';

      const { email, password } = this.loginForm.value;

      try {
        const result = await this.authService.signIn(email, password);

        if (result.error) {
          this.errorMessage = result.error;
        } else {
          this.successMessage = '¡Inicio de sesión exitoso! Redirigiendo a tu cuenta...';
          setTimeout(() => {
            this.router.navigate(['/session']);
          }, 1500);
        }
      } catch (err: any) {
        this.errorMessage = err.message || 'Ocurrió un error inesperado al iniciar sesión.';
      } finally {
        this.loading = false;
      }
    } else {
      if (this.registroForm.invalid) {
        this.registroForm.markAllAsTouched();
        return;
      }

      this.loading = true;
      this.successMessage = '';
      this.errorMessage = '';

      const { name, email, phone, password, subscribeNewsletter } = this.registroForm.value;

      try {
        const result = await this.authService.signUp(name, email, phone, password, subscribeNewsletter);

        if (result.error) {
          this.errorMessage = result.error;
        } else {
          this.successMessage = '¡Registro completado con éxito! Entrando en tu cuenta...';
          setTimeout(() => {
            this.router.navigate(['/session']);
          }, 1500);
        }
      } catch (err: any) {
        this.errorMessage = err.message || 'Ocurrió un error inesperado durante el registro.';
      } finally {
        this.loading = false;
      }
    }
  }

  // Helper properties to check validation status in HTML
  get nameInvalid() {
    const control = this.registroForm.get('name');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  get emailInvalid() {
    const control = this.registroForm.get('email');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  get phoneInvalid() {
    const control = this.registroForm.get('phone');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  get passwordInvalid() {
    const control = this.registroForm.get('password');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  get loginEmailInvalid() {
    const control = this.loginForm.get('email');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  get loginPasswordInvalid() {
    const control = this.loginForm.get('password');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }
}
