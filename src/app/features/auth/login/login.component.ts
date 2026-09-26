import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MascotComponent } from '../../../shared/components/mascot/mascot.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MascotComponent],
  template: `
    <div class="login-page">
      <div class="glow-bg"></div>

      <div class="login-card glass-card">
        <!-- Brand Header -->
        <div class="login-header">
          <app-mascot size="md" expression="happy" [animated]="false" />
          <h2 class="title">Welcome Back</h2>
          <p class="subtitle">Sign in to your DigitalClassRoom account</p>
        </div>

        @if (errorMessage()) {
          <div class="error-alert">
            <span class="error-icon">⚠️</span>
            <span class="error-text">{{ errorMessage() }}</span>
          </div>
        }

        <!-- Login Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label class="form-label" for="username">Username or ID</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                id="username"
                type="text"
                formControlName="username"
                placeholder="Enter username, email or phone"
                class="form-input"
                [class.invalid]="isFieldInvalid('username')"
                autocomplete="username"
              />
            </div>
            @if (isFieldInvalid('username')) {
              <span class="field-error">Username is required</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                placeholder="••••••••"
                class="form-input"
                [class.invalid]="isFieldInvalid('password')"
                autocomplete="current-password"
              />
              <button
                type="button"
                class="toggle-pwd-btn"
                (click)="showPassword.set(!showPassword())"
                tabindex="-1"
              >
                {{ showPassword() ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
            @if (isFieldInvalid('password')) {
              <span class="field-error">Password is required</span>
            }
          </div>

          <button
            type="submit"
            class="submit-btn"
            [disabled]="loginForm.invalid || isLoading()"
          >
            @if (isLoading()) {
              <span class="btn-spinner"></span>
              <span>Signing In...</span>
            } @else {
              <span>Sign In</span>
              <span class="arrow-icon">→</span>
            }
          </button>
        </form>

        <!-- Quick Role Switcher for seamless testing across portals -->
        <div class="demo-accounts-section">
          <div class="divider">
            <span>Quick Login Role Preset</span>
          </div>
          <div class="preset-chips">
            <button type="button" class="chip student" (click)="fillDemo('student', 'student123')">
              Student
            </button>
            <button type="button" class="chip teacher" (click)="fillDemo('teacher', 'teacher123')">
              Teacher
            </button>
            <button type="button" class="chip parent" (click)="fillDemo('parent', 'parent123')">
              Parent
            </button>
            <button type="button" class="chip admin" (click)="fillDemo('admin', 'admin123')">
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');

  loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  fillDemo(user: string, pass: string): void {
    this.loginForm.patchValue({
      username: user,
      password: pass
    });
  }

  onSubmit(): void {
    console.log('[LoginComponent] Submit triggered. Form valid:', this.loginForm.valid, 'Form value:', this.loginForm.value);

    if (this.loginForm.invalid) {
      console.warn('[LoginComponent] Form is invalid. Errors:', this.loginForm.errors, 'Controls:', {
        username: this.loginForm.get('username')?.errors,
        password: this.loginForm.get('password')?.errors
      });
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { username, password } = this.loginForm.value;
    console.log('[LoginComponent] Attempting login for username:', username);

    this.auth.login({ username, password }).subscribe({
      next: (response) => {
        console.log('[LoginComponent] ✅ Login succeeded! Profile received:', response);
        this.isLoading.set(false);
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        if (returnUrl) {
          console.log('[LoginComponent] Navigating to returnUrl:', returnUrl);
          this.router.navigateByUrl(returnUrl);
          return;
        }

        const rawRole = (response?.role || this.auth.currentUser()?.role || '') as string;
        const role = rawRole.startsWith('ROLE_') ? rawRole.substring(5) : rawRole;
        console.log('[LoginComponent] User role resolved to:', role);

        if (role === 'ADMIN') {
          console.log('[LoginComponent] Navigating to /admin');
          this.router.navigate(['/admin']);
        } else if (role === 'TEACHER') {
          console.log('[LoginComponent] Navigating to /teacher');
          this.router.navigate(['/teacher']);
        } else if (role === 'PARENT') {
          console.log('[LoginComponent] Navigating to /parent');
          this.router.navigate(['/parent']);
        } else {
          console.log('[LoginComponent] Navigating to /student');
          this.router.navigate(['/student']);
        }
      },
      error: (err) => {
        console.error('[LoginComponent] ❌ Login error received:', err);
        this.isLoading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Invalid username or password.');
        } else if (err.status === 403) {
          this.errorMessage.set('Your account has been deactivated. Contact admin.');
        } else if (err.isOffline || !navigator.onLine) {
          this.errorMessage.set('You are currently offline. Please check your internet connection.');
        } else {
          this.errorMessage.set(err.error?.message || 'Login failed. Please try again.');
        }
      }
    });
  }
}
