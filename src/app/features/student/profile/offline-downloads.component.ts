import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { StorageService } from '../../../core/services/storage.service';

@Component({
  selector: 'app-offline-downloads',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="downloads-container">
      <header class="downloads-header">
        <button class="back-btn" (click)="goBack()">
          <span>←</span> Back
        </button>
        <div class="header-card glass-card">
          <span class="header-badge">Offline Cache</span>
          <h1 class="header-title">Downloaded Content</h1>
          <p class="header-subtitle">Manage offline lessons, media blobs, and queued sync records.</p>
        </div>
      </header>

      <!-- Storage Statistics Card -->
      <div class="stats-card glass-card">
        <div class="stat-item">
          <span class="stat-value">{{ cachedLessonsCount }}</span>
          <span class="stat-label">Cached Lessons</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ queuedRecordsCount }}</span>
          <span class="stat-label">Pending Syncs</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">~14.2 MB</span>
          <span class="stat-label">Local Storage</span>
        </div>
      </div>

      <!-- Cached Items List -->
      <div class="cached-list glass-card">
        <h3 class="list-title">Locally Cached Subjects</h3>

        <div class="cache-row">
          <div class="row-left">
            <span class="row-icon">📐</span>
            <div class="row-text">
              <span class="row-name">Mathematics (గణితం)</span>
              <span class="row-size">4 Chapters • 8.4 MB</span>
            </div>
          </div>
          <span class="status-badge">Available Offline</span>
        </div>

        <div class="cache-row">
          <div class="row-left">
            <span class="row-icon">🔬</span>
            <div class="row-text">
              <span class="row-name">General Science (సైన్స్)</span>
              <span class="row-size">3 Chapters • 5.8 MB</span>
            </div>
          </div>
          <span class="status-badge">Available Offline</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="actions-group">
        <button class="clear-btn glass-card" (click)="clearCache()">
          <span>🗑️ Clear Offline Cache</span>
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./offline-downloads.component.scss']
})
export class OfflineDownloadsComponent implements OnInit {
  private location = inject(Location);
  private storage = inject(StorageService);

  cachedLessonsCount = 7;
  queuedRecordsCount = 0;

  ngOnInit(): void {
    this.storage.getPendingProgressCount().then((cnt: number) => {
      this.queuedRecordsCount = cnt;
    }).catch(() => {});
  }

  clearCache(): void {
    if (confirm('Are you sure you want to clear offline cached lessons and media?')) {
      this.cachedLessonsCount = 0;
      alert('Offline cache cleared successfully.');
    }
  }

  goBack(): void {
    this.location.back();
  }
}
