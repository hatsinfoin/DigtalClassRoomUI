import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface AdminNavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-shell-layout">
      <!-- Side Navigation Sidebar (Desktop-First) -->
      <aside class="admin-sidebar glass-card">
        <div class="sidebar-header">
          <div class="admin-brand">
            <span class="brand-logo">🏫</span>
            <div class="brand-text">
              <span class="brand-title">Admin Console</span>
              <span class="brand-sub">DigitalClassRoom</span>
            </div>
          </div>
        </div>

        <nav class="sidebar-nav">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              class="nav-link"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <div class="admin-user-info">
            <span class="admin-avatar">🛡️</span>
            <div class="info-text">
              <span class="admin-name">{{ auth.currentUser()?.name || 'Administrator' }}</span>
              <span class="admin-role">Super Admin</span>
            </div>
          </div>
          <button class="logout-btn" (click)="logout()">
            <span>🚪 Logout</span>
          </button>
        </div>
      </aside>

      <!-- Main Desktop Body Outlet -->
      <main class="admin-main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styleUrls: ['./admin-shell.component.scss']
})
export class AdminShellComponent {
  public auth = inject(AuthService);
  private router = inject(Router);

  navItems: AdminNavItem[] = [
    { path: '/admin/schools', label: 'Schools Management', icon: '🏛️' },
    { path: '/admin/academic-years', label: 'Academic Years', icon: '📅' },
    { path: '/admin/standards', label: 'Standards / Classes', icon: '🎒' },
    { path: '/admin/subjects', label: 'Curriculum Subjects', icon: '📚' },
    { path: '/admin/students', label: 'Student Admissions', icon: '👥' },
    { path: '/admin/grading-policy', label: 'Grading Policy', icon: '⚖️' },
    { path: '/admin/analytics', label: 'System Analytics', icon: '📈' },
    { path: '/admin/ingestion', label: 'PDF Ingestion Monitor', icon: '⚡' }
  ];

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
