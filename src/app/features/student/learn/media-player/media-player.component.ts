import { Component, OnInit, OnDestroy, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { interval, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MediaService } from '../../../../core/services/media.service';
import { StudentService } from '../../../../core/services/student.service';
import { AuthService } from '../../../../core/services/auth.service';
import { StudentProgress } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';

@Component({
  selector: 'app-media-player',
  standalone: true,
  imports: [
    CommonModule,
    UxStateContainerComponent,
    DurationPipe
  ],
  template: `
    <div class="player-page-container">
      <header class="player-top-bar glass-card">
        <button class="back-btn" (click)="goBack()">
          <span>←</span> Back
        </button>
        <span class="lecture-badge">Video Lecture</span>
      </header>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="card"
        emptyTitle="Media Unavailable"
        emptyMessage="Video stream could not be loaded."
        (onRetry)="loadMediaStream()"
      >
        <div class="media-card glass-card">
          <!-- Video Screen Container -->
          <div class="video-wrapper">
            <video
              #videoEl
              class="main-video"
              [src]="streamUrl()"
              (timeupdate)="onTimeUpdate()"
              (ended)="onEnded()"
              (loadedmetadata)="onLoadedMetadata()"
              playsinline
            ></video>

            <!-- Video Overlay Play Button -->
            @if (!isPlaying()) {
              <div class="play-overlay" (click)="togglePlay()">
                <button class="overlay-play-btn">▶</button>
              </div>
            }
          </div>

          <!-- Custom Player Controls Bar -->
          <div class="controls-bar">
            <!-- Timeline Scrub -->
            <div class="timeline-container">
              <input
                type="range"
                min="0"
                [max]="duration() || 100"
                [value]="currentTime()"
                (input)="seek($event)"
                class="timeline-slider"
              />
            </div>

            <div class="control-buttons-row">
              <div class="left-controls">
                <button class="control-btn play-btn" (click)="togglePlay()">
                  {{ isPlaying() ? '⏸' : '▶' }}
                </button>
                <div class="time-display">
                  <span>{{ currentTime() | duration }}</span>
                  <span>/</span>
                  <span>{{ duration() | duration }}</span>
                </div>
              </div>

              <div class="right-controls">
                <!-- Speed Selector -->
                <button class="speed-btn" (click)="cycleSpeed()">
                  {{ playbackRate() }}x
                </button>

                <!-- Fullscreen -->
                <button class="control-btn" (click)="toggleFullscreen()">
                  ⛶
                </button>
              </div>
            </div>
          </div>
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./media-player.component.scss']
})
export class MediaPlayerComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;

  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private mediaService = inject(MediaService);
  private student = inject(StudentService);
  private auth = inject(AuthService);

  mediaId = '';
  lessonId = '';
  pageState = signal<UxStateType>('loading');
  streamUrl = signal<string>('');
  isPlaying = signal<boolean>(false);
  currentTime = signal<number>(0);
  duration = signal<number>(0);
  playbackRate = signal<number>(1.0);

  private heartbeatSub?: Subscription;

  ngOnInit(): void {
    this.mediaId = this.route.snapshot.paramMap.get('mediaId') || 'default';
    this.lessonId = this.route.snapshot.paramMap.get('lessonId') || '';
    this.loadMediaStream();
    this.startHeartbeat();
  }

  ngOnDestroy(): void {
    this.heartbeatSub?.unsubscribe();
    this.sendProgressHeartbeat();
    // Memory leak prevention per Invariant I7
    if (this.mediaId && this.mediaId !== 'default') {
      this.mediaService.revokeMediaUrl(this.mediaId);
    }
  }

  loadMediaStream(): void {
    this.pageState.set('loading');

    if (!this.mediaId || this.mediaId === 'default') {
      // If default placeholder, use educational video stream directly
      const sampleUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      this.streamUrl.set(sampleUrl);
      this.pageState.set('normal');
      return;
    }

    this.mediaService.getMediaStreamUrl(this.mediaId).pipe(
      catchError(() => {
        // Fallback demo sample video for testing
        return of('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
      })
    ).subscribe({
      next: (url) => {
        this.streamUrl.set(url);
        this.pageState.set('normal');
      },
      error: () => {
        this.pageState.set('error');
      }
    });
  }

  togglePlay(): void {
    const v = this.videoRef?.nativeElement;
    if (!v) return;

    if (v.paused) {
      v.play();
      this.isPlaying.set(true);
    } else {
      v.pause();
      this.isPlaying.set(false);
    }
  }

  onTimeUpdate(): void {
    const v = this.videoRef?.nativeElement;
    if (v) {
      this.currentTime.set(Math.floor(v.currentTime));
    }
  }

  onLoadedMetadata(): void {
    const v = this.videoRef?.nativeElement;
    if (v) {
      this.duration.set(Math.floor(v.duration));
    }
  }

  onEnded(): void {
    this.isPlaying.set(false);
    this.sendProgressHeartbeat();
  }

  seek(event: Event): void {
    const input = event.target as HTMLInputElement;
    const v = this.videoRef?.nativeElement;
    if (v) {
      const val = Number(input.value);
      v.currentTime = val;
      this.currentTime.set(val);
    }
  }

  cycleSpeed(): void {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const currIdx = speeds.indexOf(this.playbackRate());
    const nextSpeed = speeds[(currIdx + 1) % speeds.length];
    this.playbackRate.set(nextSpeed);
    const v = this.videoRef?.nativeElement;
    if (v) v.playbackRate = nextSpeed;
  }

  toggleFullscreen(): void {
    const v = this.videoRef?.nativeElement;
    if (!v) return;
    if (v.requestFullscreen) {
      v.requestFullscreen();
    }
  }

  private startHeartbeat(): void {
    // Post progress heartbeat every 10s for video streaming telemetry
    this.heartbeatSub = interval(10000).subscribe(() => {
      this.sendProgressHeartbeat();
    });
  }

  private sendProgressHeartbeat(): void {
    const user = this.auth.currentUser();
    const dur = this.duration();
    const cur = this.currentTime();
    if (!user || !dur) return;

    const pct = Math.min(100, Math.round((cur / dur) * 100));

    const progress: StudentProgress = {
      studentId: user.userId || user.id || '',
      lessonId: this.lessonId,
      completionPercent: pct,
      lastPosition: cur,
      lastAccessedAt: new Date().toISOString(),
      completed: pct >= 95
    };

    this.student.saveProgress(progress).pipe(catchError(() => of(progress))).subscribe();
  }

  goBack(): void {
    this.location.back();
  }
}
