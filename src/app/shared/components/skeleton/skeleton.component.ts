import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-container" [ngClass]="layout">
      @if (layout === 'list') {
        @for (i of [1,2,3,4,5]; track i) {
          <div class="skeleton-row glass-card">
            <div class="skeleton-avatar shimmer"></div>
            <div class="skeleton-lines">
              <div class="skeleton-line shimmer title"></div>
              <div class="skeleton-line shimmer subtitle"></div>
            </div>
          </div>
        }
      } @else if (layout === 'card') {
        @for (i of [1,2,3]; track i) {
          <div class="skeleton-card glass-card">
            <div class="skeleton-banner shimmer"></div>
            <div class="skeleton-card-body">
              <div class="skeleton-line shimmer title"></div>
              <div class="skeleton-line shimmer short"></div>
              <div class="skeleton-line shimmer full"></div>
            </div>
          </div>
        }
      } @else if (layout === 'grid') {
        <div class="skeleton-grid-inner">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="skeleton-grid-item glass-card">
              <div class="skeleton-icon-box shimmer"></div>
              <div class="skeleton-line shimmer short"></div>
              <div class="skeleton-line shimmer mini"></div>
            </div>
          }
        </div>
      } @else if (layout === 'table') {
        <div class="skeleton-table glass-card">
          <div class="skeleton-header-row shimmer"></div>
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="skeleton-table-row shimmer"></div>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./skeleton.component.scss']
})
export class SkeletonComponent {
  @Input() layout: 'list' | 'card' | 'grid' | 'table' = 'list';
}
