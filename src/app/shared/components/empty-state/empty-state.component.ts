import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MascotComponent } from '../mascot/mascot.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MascotComponent],
  template: `
    <div class="empty-state-wrapper glass-card">
      @if (showMascot) {
        <app-mascot size="lg" expression="thinking" [speechText]="mascotSpeech" />
      } @else {
        <div class="empty-icon-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="empty-svg">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
      }
      <h3 class="empty-title">{{ title }}</h3>
      <p class="empty-message">{{ message }}</p>
      @if (ctaText) {
        <button class="empty-cta-btn" (click)="ctaClick.emit()">
          {{ ctaText }}
        </button>
      }
    </div>
  `,
  styleUrls: ['./empty-state.component.scss']
})
export class EmptyStateComponent {
  @Input() title = 'Nothing here yet';
  @Input() message = 'Content will appear once available.';
  @Input() ctaText = '';
  @Input() showMascot = true;
  @Input() mascotSpeech = '';
  @Output() ctaClick = new EventEmitter<void>();
}
