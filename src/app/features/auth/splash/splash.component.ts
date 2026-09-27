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
    <div class="splash-container" (click)="proceed()">
      <div class="glow-backdrop"></div>

      <!-- Language Toggle Chip -->
      <div class="lang-toggle-bar" (click)="$event.stopPropagation()">
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
            తదుపరి తరం ఇంటరాక్టివ్ డిజిటల్ లెర్నింగ్
          } @else {
            Next-Gen Interactive Digital Learning
          }
        </p>
      </div>

      <!-- Progress indicator & Action -->
      <div class="bottom-action-group">
        <div class="loading-bar-wrapper">
          <div class="loading-bar-fill"></div>
        </div>
        <button class="continue-btn" (click)="proceed()">
          <span>Get Started →</span>
        </button>
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
  private hasDispatched = false;

  ngOnInit(): void {
    // 700ms brand presentation before route dispatch
    setTimeout(() => {
      this.dispatch();
    }, 700);
  }

  setLang(lang: string): void {
    this.selectedLang = lang;
    localStorage.setItem('lang', lang);
  }

  proceed(): void {
    this.dispatch();
  }

  private dispatch(): void {
    if (this.hasDispatched) return;
    this.hasDispatched = true;

    const isAuth = this.auth.isAuthenticated();
    const user = this.auth.currentUser();
    console.log('[SplashComponent] Dispatching route. isAuthenticated:', isAuth, 'user:', user);

    if (isAuth && user) {
      const rawRole = user.role as string | undefined;
      const role = rawRole ? (rawRole.startsWith('ROLE_') ? rawRole.substring(5) : rawRole) : '';

      let destination = '/student';
      if (role === 'ADMIN' || role === 'DIGITAL_CLASS_ADMIN') {
        destination = '/admin';
      } else if (role === 'TEACHER') {
        destination = '/teacher';
      } else if (role === 'PARENT') {
        destination = '/parent';
      } else if (role === 'STUDENT' || role === 'USER') {
        destination = '/student';
      } else {
        this.auth.logout();
        destination = '/login';
      }

      console.log('[SplashComponent] Target destination:', destination);
      this.router.navigateByUrl(destination, { replaceUrl: true }).catch(() => {
        this.router.navigateByUrl('/login', { replaceUrl: true });
      });
    } else {
      if (isAuth && !user) {
        this.auth.logout();
      }
      console.log('[SplashComponent] Navigating to /login');
      this.router.navigateByUrl('/login', { replaceUrl: true }).catch(() => {
        this.router.navigate(['/login']);
      });
    }
  }
}
