import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MascotComponent } from '../../../shared/components/mascot/mascot.component';

function passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
  const newPass = control.get('newPassword')?.value;
  const confirmPass = control.get('confirmPassword')?.value;
  if (newPass && confirmPass && newPass !== confirmPass) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MascotComponent],
  template: `
    <div class="change-password-page">
      <div class="glow-bg"></div>

      <div class="card glass-card">
        <div class="header">
          <app-mascot size="md" expression="neutral" [animated]="false" />
          <h2 class="title">Change Password</h2>
          <p class="subtitle">Please update your password to secure your account</p>
        </div>

        @if (successMessage()) {
          <div class="success-alert">
            <span>✅ {{ successMessage() }}</span>
          </div>
        }

        @if (errorMessage()) {
          <div class="error-alert">
            <span>⚠️ {{ errorMessage() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form">
          <div class="form-group">
            <label class="form-label" for="currPass">Current Password</label>
            <div class="input-wrapper">
              <input
                id="currPass"
                [type]="showCurr() ? 'text' : 'password'"
                formControlName="currentPassword"
                placeholder="Enter current password"
                class="form-input"
              />
              <button type="button" class="toggle-btn" (click)="showCurr.set(!showCurr())">
                {{ showCurr() ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
            @if (isFieldInvalid('currentPassword')) {
              <span class="error-msg">Current password is required</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="newPass">New Password</label>
            <div class="input-wrapper">
              <input
                id="newPass"
                [type]="showNew() ? 'text' : 'password'"
                formControlName="newPassword"
                placeholder="Minimum 8 characters"
                class="form-input"
              />
              <button type="button" class="toggle-btn" (click)="showNew.set(!showNew())">
                {{ showNew() ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
            @if (isFieldInvalid('newPassword')) {
              <span class="error-msg">Password must be at least 8 characters</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="confPass">Confirm New Password</label>
            <div class="input-wrapper">
              <input
                id="confPass"
                [type]="showConf() ? 'text' : 'password'"
                formControlName="confirmPassword"
                placeholder="Re-enter new password"
                class="form-input"
              />
              <button type="button" class="toggle-btn" (click)="showConf.set(!showConf())">
                {{ showConf() ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
            @if (form.hasError('passwordMismatch') && form.get('confirmPassword')?.touched) {
              <span class="error-msg">Passwords do not match</span>
            }
          </div>

          <button
            type="submit"
            class="submit-btn"
            [disabled]="form.invalid || isLoading()"
          >
            @if (isLoading()) {
              <span class="spinner"></span>
              <span>Updating Password...</span>
            } @else {
              <span>Update Password</span>
            }
          </button>
        </form>
      </div>
    </div>
  `,
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  showCurr = signal(false);
  showNew = signal(false);
  showConf = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  form: FormGroup = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: [passwordMatchValidator] }
  );

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const { currentPassword, newPassword } = this.form.value;

    this.auth.changePassword({ currentPassword: currentPassword || '', newPassword: newPassword || '' }).subscribe({
      next: (_res: { message: string }) => {
        this.isLoading.set(false);
        this.successMessage.set('Password updated successfully! Redirecting...');
        setTimeout(() => {
          const role = this.auth.currentUser()?.role;
          if (role === 'ADMIN') this.router.navigate(['/admin']);
          else if (role === 'TEACHER') this.router.navigate(['/teacher']);
          else if (role === 'PARENT') this.router.navigate(['/parent']);
          else this.router.navigate(['/student']);
        }, 1200);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to update password. Please check your current password.');
      }
    });
  }
}
