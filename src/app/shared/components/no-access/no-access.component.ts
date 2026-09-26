import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-no-access',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="no-access-card glass-card">
      <div class="no-access-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="lock-svg">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      </div>
      <h3 class="no-access-title">Access Restricted</h3>
      <p class="no-access-message">You do not have permission to view this resource. Please contact your school administrator if you think this is an error.</p>
      <button class="back-btn" (click)="goBack()">
        Go Back
      </button>
    </div>
  `,
  styleUrls: ['./no-access.component.scss']
})
export class NoAccessComponent {
  private location = inject(Location);

  goBack(): void {
    this.location.back();
  }
}
