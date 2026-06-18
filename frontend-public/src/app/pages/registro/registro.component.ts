import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
  loading = false;
  successMessage = '';
  errorMessage = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.registroForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-]{8,20}$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      terms: [false, [Validators.requiredTrue]]
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const { name, email, phone, password } = this.registroForm.value;

    try {
      const result = await this.authService.signUp(name, email, phone, password);

      if (result.error) {
        this.errorMessage = result.error;
      } else {
        this.successMessage = '¡Registro completado! Se ha enviado un correo electrónico de confirmación a tu dirección de correo.';
        this.registroForm.reset();
      }
    } catch (err: any) {
      this.errorMessage = err.message || 'Ocurrió un error inesperado durante el registro.';
    } finally {
      this.loading = false;
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
}
