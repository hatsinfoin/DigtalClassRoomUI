import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="offline-banner">
      <div class="offline-content">
        <span class="offline-icon">🔌</span>
        <span class="offline-text">You are currently offline. Showing cached lessons. Progress will sync when reconnected.</span>
      </div>
    </div>
  `,
  styleUrls: ['./offline-banner.component.scss']
})
export class OfflineBannerComponent {}
