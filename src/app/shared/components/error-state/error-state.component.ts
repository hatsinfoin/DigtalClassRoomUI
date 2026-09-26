import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-state-card glass-card">
      <div class="error-icon-circle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="error-svg">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 class="error-title">{{ title }}</h3>
      <p class="error-message">{{ message }}</p>
      <button class="error-retry-btn" (click)="retry.emit()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="retry-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>{{ retryText }}</span>
      </button>
    </div>
  `,
  styleUrls: ['./error-state.component.scss']
})
export class ErrorStateComponent {
  @Input() title = 'Connection Issue';
  @Input() message = 'Failed to load content. Please check your connection and try again.';
  @Input() retryText = 'Try Again';
  @Output() retry = new EventEmitter<void>();
}
