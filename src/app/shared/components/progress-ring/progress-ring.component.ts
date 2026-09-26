import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-ring',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="progress-ring-container" [style.width.px]="size" [style.height.px]="size">
      <svg [attr.width]="size" [attr.height]="size" class="progress-ring-svg">
        <circle
          class="progress-ring-bg"
          [attr.stroke]="trackColor"
          [attr.stroke-width]="strokeWidth"
          fill="transparent"
          [attr.r]="radius"
          [attr.cx]="center"
          [attr.cy]="center"
        />
        <circle
          class="progress-ring-fill"
          [attr.stroke]="progressColor"
          [attr.stroke-width]="strokeWidth"
          fill="transparent"
          [attr.r]="radius"
          [attr.cx]="center"
          [attr.cy]="center"
          [attr.stroke-dasharray]="circumference"
          [attr.stroke-dashoffset]="strokeDashoffset"
          stroke-linecap="round"
        />
      </svg>
      @if (showLabel) {
        <div class="progress-label">
          <span class="percentage">{{ progress }}%</span>
        </div>
      }
    </div>
  `,
  styleUrls: ['./progress-ring.component.scss']
})
export class ProgressRingComponent {
  @Input() progress = 0; // 0 to 100
  @Input() size = 64;
  @Input() strokeWidth = 6;
  @Input() progressColor = '#6C63FF';
  @Input() trackColor = 'rgba(255, 255, 255, 0.08)';
  @Input() showLabel = true;

  get center(): number {
    return this.size / 2;
  }

  get radius(): number {
    return (this.size - this.strokeWidth) / 2;
  }

  get circumference(): number {
    return 2 * Math.PI * this.radius;
  }

  get strokeDashoffset(): number {
    const clamped = Math.max(0, Math.min(100, this.progress));
    return this.circumference - (clamped / 100) * this.circumference;
  }
}
