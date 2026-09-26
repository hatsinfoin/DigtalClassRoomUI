import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { AcademicService } from '../../../core/services/academic.service';
import { UserProfileResponse } from '../../../core/models/models';
import { MascotComponent } from '../../../shared/components/mascot/mascot.component';
import { TeluguNfcPipe } from '../../../shared/pipes/telugu-nfc.pipe';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, MascotComponent, TeluguNfcPipe],
  template: `
    <div class="profile-container">
      <header class="profile-header">
        <h1 class="page-title">My Profile</h1>
      </header>

      <!-- Profile Header Hero Card -->
      <div class="user-card glass-card">
        <div class="user-avatar-wrap">
          <app-mascot size="lg" expression="happy" [animated]="false" />
        </div>
        <div class="user-info">
          <h2 class="user-name">{{ profile()?.name || profile()?.username || 'Student' }}</h2>
          <span class="user-role-badge">{{ profile()?.role || 'STUDENT' }}</span>
          <p class="user-roll">
            Roll No: {{ profile()?.rollNumber || '01' }} • Section {{ profile()?.section || 'A' }}
          </p>
        </div>
      </div>

      <!-- 1. Academic Details Card -->
      <div class="details-card glass-card">
        <h3 class="card-section-title">
          <span class="section-icon">🏫</span> Academic Details
        </h3>
        <div class="detail-row">
          <span class="detail-label">School Name</span>
          <span class="detail-value highlight-value">{{ schoolDisplayName() | teluguNfc }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Standard / Class</span>
          <span class="detail-value">{{ standardDisplayName() | teluguNfc }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Section</span>
          <span class="detail-value">{{ profile()?.section || 'Not Assigned' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Roll Number</span>
          <span class="detail-value">{{ profile()?.rollNumber || 'Not Assigned' }}</span>
        </div>
      </div>

      <!-- 2. Personal & Contact Details Card -->
      <div class="details-card glass-card">
        <h3 class="card-section-title">
          <span class="section-icon">👤</span> Personal & Contact
        </h3>
        <div class="detail-row">
          <span class="detail-label">Full Name</span>
          <span class="detail-value">{{ profile()?.name || 'Not Provided' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Username</span>
          <span class="detail-value">{{ profile()?.username || 'Not Provided' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email</span>
          <span class="detail-value">{{ profile()?.email || 'Not Provided' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Gender</span>
          <span class="detail-value">{{ profile()?.gender || 'Not Specified' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date of Birth</span>
          <span class="detail-value">
            {{ profile()?.dob ? (profile()?.dob | date:'mediumDate') : 'Not Provided' }}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Student Phone</span>
          <span class="detail-value">{{ profile()?.phoneNumber || profile()?.phone || 'Not Provided' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Parent Contact</span>
          <span class="detail-value">{{ profile()?.parentPhone || 'Not Provided' }}</span>
        </div>
      </div>

      <!-- 3. Account Information Card -->
      <div class="details-card glass-card">
        <h3 class="card-section-title">
          <span class="section-icon">📋</span> Account Information
        </h3>
        <div class="detail-row">
          <span class="detail-label">Profile ID</span>
          <span class="detail-value text-mono">{{ profile()?.id || profile()?.userId || 'N/A' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">School ID</span>
          <span class="detail-value text-mono">{{ profile()?.schoolId || 'N/A' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Standard ID</span>
          <span class="detail-value text-mono">{{ profile()?.standardId || 'N/A' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Account Created</span>
          <span class="detail-value">
            {{ profile()?.createdAt ? (profile()?.createdAt | date:'mediumDate') : 'N/A' }}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Last Updated</span>
          <span class="detail-value">
            {{ profile()?.updatedAt ? (profile()?.updatedAt | date:'mediumDate') : 'N/A' }}
          </span>
        </div>
      </div>

      <!-- 4. Settings & Preferences Section -->
      <div class="settings-card glass-card">
        <h3 class="settings-title">App Settings</h3>

        <!-- Language Preference -->
        <div class="setting-item">
          <div class="setting-left">
            <span class="setting-icon">🌐</span>
            <div class="setting-text">
              <span class="setting-name">App Language</span>
              <span class="setting-sub">English & తెలుగు</span>
            </div>
          </div>
          <div class="lang-toggle-btns">
            <button
              class="lang-btn"
              [class.active]="selectedLang() === 'en'"
              (click)="setLanguage('en')"
            >
              EN
            </button>
            <button
              class="lang-btn telugu"
              [class.active]="selectedLang() === 'te'"
              (click)="setLanguage('te')"
            >
              తెలుగు
            </button>
          </div>
        </div>

        <!-- Offline Downloads Navigation -->
        <div class="setting-item clickable" (click)="goToDownloads()">
          <div class="setting-left">
            <span class="setting-icon">💾</span>
            <div class="setting-text">
              <span class="setting-name">Offline Downloads</span>
              <span class="setting-sub">Manage cached lessons & media</span>
            </div>
          </div>
          <span class="arrow">→</span>
        </div>

        <!-- Change Password Navigation -->
        <div class="setting-item clickable" (click)="goToChangePassword()">
          <div class="setting-left">
            <span class="setting-icon">🔒</span>
            <div class="setting-text">
              <span class="setting-name">Security & Password</span>
              <span class="setting-sub">Update your account password</span>
            </div>
          </div>
          <span class="arrow">→</span>
        </div>
      </div>

      <!-- Logout CTA -->
      <button class="logout-btn glass-card" (click)="logout()">
        <span class="logout-icon">🚪</span>
        <span>Log Out of DigitalClassRoom</span>
      </button>
    </div>
  `,
  styleUrls: ['./student-profile.component.scss']
})
export class StudentProfileComponent implements OnInit {
  public auth = inject(AuthService);
  private academic = inject(AcademicService);
  private router = inject(Router);

  profile = signal<UserProfileResponse | null>(null);
  schoolDisplayName = signal<string>('Loading School...');
  standardDisplayName = signal<string>('Class 5');
  selectedLang = signal<string>(localStorage.getItem('lang') || 'en');

  ngOnInit(): void {
    const current = this.auth.currentUser();
    if (current) {
      this.profile.set(current);
      this.resolveSchoolAndStandard(current);
    }

    this.auth.fetchProfile().pipe(
      catchError(() => of(current))
    ).subscribe((p) => {
      if (p) {
        this.profile.set(p);
        this.resolveSchoolAndStandard(p);
      }
    });
  }

  private resolveSchoolAndStandard(p: UserProfileResponse): void {
    // 1. School Name Resolution
    if (p.schoolName) {
      this.schoolDisplayName.set(p.schoolName);
    } else if (p.schoolId) {
      this.academic.getSchool(p.schoolId).pipe(
        catchError(() => of(null))
      ).subscribe((sch) => {
        if (sch && sch.name) {
          this.schoolDisplayName.set(sch.name);
        } else {
          this.schoolDisplayName.set(`School (${p.schoolId})`);
        }
      });
    } else {
      this.schoolDisplayName.set('School Not Assigned');
    }

    // 2. Standard Name Resolution
    if (p.standardName) {
      this.standardDisplayName.set(p.standardName);
    } else if (p.standardId) {
      this.academic.getStandard(p.standardId).pipe(
        catchError(() => of(null))
      ).subscribe((std) => {
        if (std) {
          this.standardDisplayName.set(std.name || `Class ${std.standardNumber}`);
        } else if (!isNaN(Number(p.standardId))) {
          this.standardDisplayName.set(`Class ${p.standardId}`);
        } else {
          this.standardDisplayName.set('Standard 1');
        }
      });
    } else {
      this.standardDisplayName.set('Standard 1');
    }
  }

  setLanguage(lang: string): void {
    this.selectedLang.set(lang);
    localStorage.setItem('lang', lang);
  }

  goToDownloads(): void {
    this.router.navigate(['/student/me/downloads']);
  }

  goToChangePassword(): void {
    this.router.navigate(['/change-password']);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
