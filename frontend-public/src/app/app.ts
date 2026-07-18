import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from './services/auth.service';
import { Subscription } from 'rxjs';
import { ChatWidgetComponent } from './components/chat-widget/chat-widget.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule, FormsModule, ReactiveFormsModule, ChatWidgetComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  title = 'Arandu';
  isLoggedIn = false;
  userInitials = '';
  mobileMenuOpen = false;
  searchQuery = '';
  showUserDropdown = false;
  isScrolled = false;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollY = window.scrollY;
    if (scrollY > 120) {
      this.isScrolled = true;
    } else if (scrollY < 40) {
      this.isScrolled = false;
    }
  }

  toggleUserDropdown(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.showUserDropdown = !this.showUserDropdown;
  }

  closeUserDropdown() {
    this.showUserDropdown = false;
  }

  async signOut() {
    this.closeUserDropdown();
    this.loading = true;
    try {
      await this.authService.signOut();
      this.router.navigate(['/']);
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      this.loading = false;
    }
  }

  // Modal properties
  showAuthModal = false;
  isLoginMode = true;
  loading = false;
  successMessage = '';
  errorMessage = '';
  showPassword = false;
  loginForm!: FormGroup;
  registroForm!: FormGroup;
  
  private authSubscription!: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      this.userInitials = this.authService.getUserInitials(user ?? null);
    });

    this.registroForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      terms: [false, [Validators.requiredTrue]]
    });

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }

  onMobileSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/buscar'], { queryParams: { q: this.searchQuery.trim() } });
      this.searchQuery = '';
      this.closeMobileMenu();
    }
  }

  // Modal actions
  openAuthModal() {
    this.showAuthModal = true;
    this.isLoginMode = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.loginForm.reset();
    this.registroForm.reset();
    this.closeMobileMenu();
    this.updateBodyScroll();
  }

  closeAuthModal() {
    this.showAuthModal = false;
    this.successMessage = '';
    this.errorMessage = '';
    this.updateBodyScroll();
  }

  toggleAuthMode(loginMode: boolean) {
    this.isLoginMode = loginMode;
    this.successMessage = '';
    this.errorMessage = '';
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onGoogleSignIn() {
    this.loading = true;
    this.errorMessage = '';
    try {
      const result = await this.authService.signInWithGoogle();
      if (result.error) {
        this.errorMessage = result.error;
      }
    } catch (err: any) {
      this.errorMessage = err.message || 'Error inesperado';
    } finally {
      this.loading = false;
    }
  }

  async onSubmitAuth() {
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
          this.successMessage = '¡Inicio de sesión exitoso!';
          setTimeout(() => {
            this.closeAuthModal();
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

      const { firstName, lastName, email, password } = this.registroForm.value;
      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      try {
        const result = await this.authService.signUp(fullName, email, '', password);

        if (result.error) {
          this.errorMessage = result.error;
        } else {
          this.successMessage = '¡Registro completado con éxito! Entrando en tu cuenta...';
          setTimeout(() => {
            this.closeAuthModal();
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

  // Getters for form validation
  get firstNameInvalid() {
    const control = this.registroForm.get('firstName');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  get lastNameInvalid() {
    const control = this.registroForm.get('lastName');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  get emailInvalid() {
    const control = this.registroForm.get('email');
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

  // Footer Modal Controls
  footerModalType: string | null = null;
  contactName = '';
  contactEmail = '';
  contactSubject = '';
  contactMessage = '';
  contactSubmitted = false;

  newsletterEmail = '';
  newsletterSubmitted = false;

  openFooterModal(type: string, event?: Event) {
    if (event) {
      event.preventDefault();
    }
    this.footerModalType = type;
    this.contactSubmitted = false;
    this.newsletterSubmitted = false;
    this.updateBodyScroll();
  }

  closeFooterModal() {
    this.footerModalType = null;
    this.updateBodyScroll();
  }

  submitContact() {
    if (this.contactName && this.contactEmail && this.contactMessage) {
      this.contactSubmitted = true;
      setTimeout(() => {
        this.contactSubmitted = false;
        this.closeFooterModal();
        this.contactName = '';
        this.contactEmail = '';
        this.contactSubject = '';
        this.contactMessage = '';
      }, 2500);
    }
  }

  submitNewsletter() {
    if (this.newsletterEmail) {
      this.newsletterSubmitted = true;
      setTimeout(() => {
        this.newsletterSubmitted = false;
        this.closeFooterModal();
        this.newsletterEmail = '';
      }, 2500);
    }
  }

  footerNewsletterEmail = '';
  footerNewsletterSubmitted = false;

  submitFooterNewsletter() {
    if (this.footerNewsletterEmail && this.footerNewsletterEmail.trim()) {
      this.footerNewsletterSubmitted = true;
      setTimeout(() => {
        this.footerNewsletterSubmitted = false;
        this.footerNewsletterEmail = '';
      }, 3000);
    }
  }

  updateBodyScroll() {
    const isAnyModalOpen = this.showAuthModal || !!this.footerModalType;
    if (isAnyModalOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
  }
}
