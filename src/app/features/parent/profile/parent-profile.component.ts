import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfileResponse } from '../../../core/models/models';

@Component({
  selector: 'app-parent-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-container">
      <header class="profile-header">
        <h1 class="page-title">Parent Account</h1>
      </header>

      <div class="user-card glass-card">
        <div class="user-avatar">👤</div>
        <div class="user-info">
          <h2 class="user-name">{{ profile?.name || 'Parent Guardian' }}</h2>
          <span class="user-role-badge">Parent / Guardian</span>
          <p class="user-phone">📞 Registered Mobile: {{ profile?.phone || '9876543210' }}</p>
        </div>
      </div>

      <div class="settings-card glass-card">
        <h3 class="settings-title">Preferences & Security</h3>

        <div class="setting-row clickable" (click)="goToChangePassword()">
          <div class="row-left">
            <span class="icon">🔒</span>
            <div class="row-text">
              <span class="title">Change Password</span>
              <span class="sub">Update account access security</span>
            </div>
          </div>
          <span class="arrow">→</span>
        </div>
      </div>

      <button class="logout-btn glass-card" (click)="logout()">
        <span>🚪 Log Out</span>
      </button>
    </div>
  `,
  styleUrls: ['./parent-profile.component.scss']
})
export class ParentProfileComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  profile: UserProfileResponse | null = null;

  ngOnInit(): void {
    this.profile = this.auth.currentUser();
  }

  goToChangePassword(): void {
    this.router.navigate(['/change-password']);
  }

  logout(): void {
    this.auth.logout();
  }
}
