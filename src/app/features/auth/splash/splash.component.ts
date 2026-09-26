import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MascotComponent } from '../../../shared/components/mascot/mascot.component';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule, MascotComponent],
  template: `
    <div class="splash-container">
      <div class="glow-backdrop"></div>

      <!-- Language Toggle Chip -->
      <div class="lang-toggle-bar">
        <button
          class="lang-chip"
          [class.active]="selectedLang === 'en'"
          (click)="setLang('en')"
        >
          English
        </button>
        <button
          class="lang-chip telugu"
          [class.active]="selectedLang === 'te'"
          (click)="setLang('te')"
        >
          తెలుగు
        </button>
      </div>

      <!-- Brand Hero -->
      <div class="splash-hero">
        <app-mascot size="xl" expression="happy" [animated]="true" />
        <h1 class="brand-title">DigitalClassRoom</h1>
        <p class="brand-subtitle">
          @if (selectedLang === 'te') {
            డిజిటల్ తరగతి గది — భావి విద్యకు స్వాగతం
          } @else {
            Next-Gen Interactive Digital Learning
          }
        </p>
      </div>

      <!-- Progress indicator -->
      <div class="loading-bar-wrapper">
        <div class="loading-bar-fill"></div>
      </div>

      <div class="version-tag">
        <span>EduPulse v1.0.0</span>
      </div>
    </div>
  `,
  styleUrls: ['./splash.component.scss']
})
export class SplashComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  selectedLang = localStorage.getItem('lang') || 'en';

  ngOnInit(): void {
    // 800ms brand presentation before route dispatch
    setTimeout(() => {
      this.dispatch();
    }, 900);
  }

  setLang(lang: string): void {
    this.selectedLang = lang;
    localStorage.setItem('lang', lang);
  }

  private dispatch(): void {
    if (this.auth.isAuthenticated()) {
      const user = this.auth.currentUser();
      const role = user?.role;
      if (role === 'ADMIN') {
        this.router.navigate(['/admin']);
      } else if (role === 'TEACHER') {
        this.router.navigate(['/teacher']);
      } else if (role === 'PARENT') {
        this.router.navigate(['/parent']);
      } else {
        this.router.navigate(['/student']);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }
}
