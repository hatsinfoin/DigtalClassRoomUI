import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="user-friendly-error-card glass-card">
      <!-- Soft glowing cloud / offline illustration -->
      <div class="error-illustration-wrapper">
        <div class="cloud-glow-icon">
          <svg viewBox="0 0 64 64" fill="none" class="cloud-svg" xmlns="http://www.w3.org/2000/svg">
            <path d="M48 40C52.4183 40 56 36.4183 56 32C56 27.8546 52.8465 24.4462 48.8037 24.0487C47.7856 16.0367 40.9419 10 32.5 10C25.3905 10 19.3364 14.2863 17.2023 20.485C16.4891 20.3308 15.7517 20.25 15 20.25C9.47715 20.25 5 24.7272 5 30.25C5 35.7728 9.47715 40.25 15 40.25H48" stroke="#a5b4fc" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M22 46L42 26" stroke="#FF6B6B" stroke-width="3.5" stroke-linecap="round" />
            <circle cx="43" cy="25" r="7" fill="#FF6B6B" />
            <path d="M40 22L46 28M46 22L40 28" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
          </svg>
        </div>
      </div>

      <!-- Bilingual Friendly Headline -->
      <h3 class="friendly-title">{{ title }}</h3>
      @if (teluguSubtitle) {
        <div class="telugu-subtitle">{{ teluguSubtitle }}</div>
      }

      <!-- Empathetic Message -->
      <p class="friendly-message">{{ message }}</p>

      <!-- Helpful Suggestions -->
      <div class="helpful-tips-box">
        <div class="tip-item">
          <span class="tip-dot">🌐</span>
          <span>Check your network cable or Wi-Fi connection</span>
        </div>
        <div class="tip-item">
          <span class="tip-dot">⏳</span>
          <span>School system may be undergoing brief maintenance</span>
        </div>
      </div>

      <!-- Primary Action: Try Again -->
      <button class="primary-retry-btn" (click)="retry.emit()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="retry-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>{{ retryText }}</span>
      </button>

      <!-- Collapsible Technical Details for IT / Support -->
      @if (technicalDetails) {
        <div class="technical-details-toggle">
          <button type="button" class="btn-tech-toggle" (click)="toggleTechDetails()">
            <span>Technical details for IT support</span>
            <span class="chevron-icon">{{ showTechDetails() ? '▲' : '▼' }}</span>
          </button>

          @if (showTechDetails()) {
            <div class="tech-details-box">
              <code>{{ technicalDetails }}</code>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./error-state.component.scss']
})
export class ErrorStateComponent {
  @Input() title = 'Unable to Connect to School Server';
  @Input() teluguSubtitle = 'పాఠశాల సర్వర్‌తో అనుసంధానం కాలేకపోయింది';
  @Input() message = 'We are having trouble connecting to the school system right now. Please check your internet connection or try again in a few moments.';
  @Input() retryText = 'Try Again';
  @Input() technicalDetails = '';
  @Output() retry = new EventEmitter<void>();

  showTechDetails = signal<boolean>(false);

  toggleTechDetails(): void {
    this.showTechDetails.set(!this.showTechDetails());
  }
}

