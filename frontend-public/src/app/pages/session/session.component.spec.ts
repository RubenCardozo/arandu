import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SessionComponent } from './session.component';
import { AuthService } from '../../services/auth.service';
import { BehaviorSubject } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('SessionComponent', () => {
  let component: SessionComponent;
  let fixture: ComponentFixture<SessionComponent>;
  let authServiceMock: any;
  let routerMock: any;
  let currentUserSubject: BehaviorSubject<User | null>;

  beforeEach(async () => {
    currentUserSubject = new BehaviorSubject<User | null>(null);

    authServiceMock = {
      currentUser$: currentUserSubject.asObservable(),
      signOut: vi.fn().mockResolvedValue({}),
      getUserInitials: vi.fn().mockReturnValue('U')
    };

    await TestBed.configureTestingModule({
      imports: [SessionComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SessionComponent);
    component = fixture.componentInstance;

    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    routerMock = router;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should redirect to /registro if user is null', () => {
    currentUserSubject.next(null);
    fixture.detectChanges();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/registro']);
  });

  it('should show user details if logged in', () => {
    const mockUser: any = {
      id: '123',
      email: 'test@arandu.ch',
      user_metadata: {
        full_name: 'Ruben Cardozo',
        phone: '+41 79 111 22 33'
      },
      aud: 'authenticated',
      created_at: ''
    };
    currentUserSubject.next(mockUser);
    component.activeTab = 'profile';
    fixture.detectChanges();

    expect(component.userFullName).toBe('Ruben Cardozo');
    expect(component.userPhone).toBe('+41 79 111 22 33');
    
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Ruben Cardozo');
    expect(compiled.textContent).toContain('test@arandu.ch');
  });

  it('should call signOut and redirect to home on sign out', async () => {
    const mockUser: any = {
      id: '123',
      email: 'test@arandu.ch',
      user_metadata: {},
      aud: 'authenticated',
      created_at: ''
    };
    currentUserSubject.next(mockUser);
    fixture.detectChanges();

    await component.onSignOut();
    expect(authServiceMock.signOut).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });
});
