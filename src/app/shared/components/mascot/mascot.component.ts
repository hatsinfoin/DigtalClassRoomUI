import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mascot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mascot-container" [ngClass]="['size-' + size, 'expression-' + expression, animated ? 'animated' : '']">
      @if (speechText) {
        <div class="speech-bubble">
          <span>{{ speechText }}</span>
        </div>
      }
      <div class="gyan-avatar">
        <svg viewBox="0 0 100 100" class="gyan-svg">
          <!-- Body -->
          <ellipse cx="50" cy="55" rx="36" ry="38" fill="#6C63FF" />
          <!-- Belly -->
          <ellipse cx="50" cy="62" rx="26" ry="26" fill="#8B85FF" opacity="0.4" />
          <!-- Feathers / Details -->
          <path d="M42 58 Q50 64 58 58" stroke="rgba(255,255,255,0.4)" stroke-width="2" fill="none" />
          <path d="M44 68 Q50 74 56 68" stroke="rgba(255,255,255,0.4)" stroke-width="2" fill="none" />
          
          <!-- Eyes -->
          <circle cx="36" cy="42" r="14" fill="#FFFFFF" />
          <circle cx="64" cy="42" r="14" fill="#FFFFFF" />
          
          @if (expression === 'happy' || expression === 'cheering') {
            <!-- Happy Curvy Eyes -->
            <path d="M28 42 Q36 34 44 42" stroke="#1E1B4B" stroke-width="3.5" stroke-linecap="round" fill="none" />
            <path d="M56 42 Q64 34 72 42" stroke="#1E1B4B" stroke-width="3.5" stroke-linecap="round" fill="none" />
          } @else if (expression === 'sleeping') {
            <path d="M28 44 Q36 50 44 44" stroke="#1E1B4B" stroke-width="3" stroke-linecap="round" fill="none" />
            <path d="M56 44 Q64 50 72 44" stroke="#1E1B4B" stroke-width="3" stroke-linecap="round" fill="none" />
          } @else {
            <!-- Pupils with Sparkles -->
            <circle cx="38" cy="42" r="7" fill="#1E1B4B" />
            <circle cx="62" cy="42" r="7" fill="#1E1B4B" />
            <circle cx="36" cy="40" r="2.5" fill="#FFFFFF" />
            <circle cx="60" cy="40" r="2.5" fill="#FFFFFF" />
          }

          <!-- Beak -->
          <polygon points="46,47 54,47 50,56" fill="#F59E0B" />

          <!-- Graduation Cap / Ears -->
          <polygon points="50,12 25,24 50,34 75,24" fill="#FCD34D" />
          <rect x="42" y="26" width="16" height="6" rx="3" fill="#F59E0B" />
          <circle cx="75" cy="24" r="3" fill="#EF4444" />
          <path d="M75 24 L78 36" stroke="#EF4444" stroke-width="2" stroke-linecap="round" />

          <!-- Feet -->
          <ellipse cx="40" cy="92" rx="6" ry="3" fill="#F59E0B" />
          <ellipse cx="60" cy="92" rx="6" ry="3" fill="#F59E0B" />
        </svg>
      </div>
    </div>
  `,
  styleUrls: ['./mascot.component.scss']
})
export class MascotComponent {
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() expression: 'happy' | 'thinking' | 'cheering' | 'waving' | 'sleeping' | 'neutral' = 'happy';
  @Input() animated = true;
  @Input() speechText = '';
}
