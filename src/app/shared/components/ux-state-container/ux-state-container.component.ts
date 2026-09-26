import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ErrorStateComponent } from '../error-state/error-state.component';
import { OfflineBannerComponent } from '../offline-banner/offline-banner.component';
import { NoAccessComponent } from '../no-access/no-access.component';

export type UxStateType = 'normal' | 'loading' | 'empty' | 'error' | 'offline' | 'expired' | 'no-access' | 'success';
export type PageState = UxStateType;

@Component({
  selector: 'app-ux-state',
  standalone: true,
  imports: [
    CommonModule,
    SkeletonComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    OfflineBannerComponent,
    NoAccessComponent
  ],
  template: `
    @switch (state) {
      @case ('loading') {
        <app-skeleton [layout]="skeletonLayout" />
      }
      @case ('empty') {
        <app-empty-state
          [title]="emptyTitle"
          [message]="emptyMessage"
          [ctaText]="emptyCtaText"
          [showMascot]="showMascot"
          [mascotSpeech]="emptyMascotSpeech"
          (ctaClick)="onEmptyCta.emit()"
        />
      }
      @case ('error') {
        <app-error-state
          [title]="errorTitle"
          [message]="errorMessage"
          (retry)="onRetry.emit()"
        />
      }
      @case ('offline') {
        <div class="ux-offline-wrapper">
          <app-offline-banner />
          <ng-content />
        </div>
      }
      @case ('no-access') {
        <app-no-access />
      }
      @default {
        <ng-content />
      }
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .ux-offline-wrapper {
      display: flex;
      flex-direction: column;
      width: 100%;
    }
  `]
})
export class UxStateContainerComponent {
  @Input() state: UxStateType = 'loading';
  @Input() skeletonLayout: 'list' | 'card' | 'grid' | 'table' = 'list';
  @Input() emptyTitle = 'Nothing here yet';
  @Input() emptyMessage = 'No data available at this moment.';
  @Input() emptyCtaText = '';
  @Input() emptyMascotSpeech = '';
  @Input() showMascot = false;
  @Input() errorTitle = 'Connection Issue';
  @Input() errorMessage = 'Something went wrong while fetching data.';
  @Output() onRetry = new EventEmitter<void>();
  @Output() onEmptyCta = new EventEmitter<void>();
}
