import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { of, interval, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AcademicService } from '../../../../core/services/academic.service';
import { StudentService } from '../../../../core/services/student.service';
import { StorageService } from '../../../../core/services/storage.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ContentChunkResponse, StudentProgress } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';
import { TeluguNfcPipe } from '../../../../shared/pipes/telugu-nfc.pipe';

@Component({
  selector: 'app-lesson-reader',
  standalone: true,
  imports: [
    CommonModule,
    UxStateContainerComponent,
    TeluguNfcPipe
  ],
  template: `
    <div class="reader-container">
      <!-- Floating Top Action Bar -->
      <header class="reader-bar glass-card">
        <button class="back-btn" (click)="goBack()">
          <span>←</span> Back
        </button>

        <div class="reader-controls">
          <!-- Language Mode Toggle -->
          <div class="lang-switch">
            <button
              class="switch-btn"
              [class.active]="langMode() === 'bilingual'"
              (click)="langMode.set('bilingual')"
            >
              Both
            </button>
            <button
              class="switch-btn telugu"
              [class.active]="langMode() === 'te'"
              (click)="langMode.set('te')"
            >
              తెలుగు
            </button>
            <button
              class="switch-btn"
              [class.active]="langMode() === 'en'"
              (click)="langMode.set('en')"
            >
              English
            </button>
          </div>

          <!-- Font Size Adjuster -->
          <div class="font-controls">
            <button class="font-btn" (click)="adjustFontSize(-2)">A-</button>
            <button class="font-btn" (click)="adjustFontSize(2)">A+</button>
          </div>
        </div>
      </header>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="list"
        emptyTitle="No Reading Chunks"
        emptyMessage="This lesson does not contain reading text yet."
        (onRetry)="loadChunks()"
      >
        <!-- Chunks Reader Content -->
        <main class="reader-content" [style.font-size.px]="fontSize()">
          @for (chunk of chunks(); track chunk.id; let idx = $index) {
            <article class="chunk-card glass-card" [class.active-chunk]="currentChunkIndex() === idx">
              <div class="chunk-header">
                <span class="chunk-num">Section {{ idx + 1 }}</span>
                @if (chunk.sectionHeader) {
                  <h2 class="chunk-section-title">{{ chunk.sectionHeader | teluguNfc }}</h2>
                }
              </div>

              <div class="chunk-body">
                @if (langMode() === 'bilingual' || langMode() === 'te') {
                  <div class="telugu-pane text-telugu">
                    {{ chunk.teluguContent || chunk.content | teluguNfc }}
                  </div>
                }

                @if (langMode() === 'bilingual' || langMode() === 'en') {
                  <div class="english-pane font-body">
                    {{ chunk.englishContent || chunk.content }}
                  </div>
                }
              </div>
            </article>
          }
        </main>

        <!-- Bottom Progress Tracker & Next/Prev Controls -->
        <footer class="reader-footer glass-card">
          <div class="footer-progress-bar">
            <div class="progress-indicator" [style.width.%]="calcProgressPct()"></div>
          </div>
          <div class="footer-actions">
            <button
              class="nav-btn prev"
              [disabled]="currentChunkIndex() <= 0"
              (click)="prevChunk()"
            >
              ← Previous Section
            </button>
            <span class="chunk-status">{{ currentChunkIndex() + 1 }} of {{ chunks().length || 1 }}</span>
            <button
              class="nav-btn next"
              [disabled]="currentChunkIndex() >= chunks().length - 1"
              (click)="nextChunk()"
            >
              Next Section →
            </button>
          </div>
        </footer>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./lesson-reader.component.scss']
})
export class LessonReaderComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private academic = inject(AcademicService);
  private student = inject(StudentService);
  private storage = inject(StorageService);
  private auth = inject(AuthService);

  lessonId = '';
  pageState = signal<UxStateType>('loading');
  chunks = signal<ContentChunkResponse[]>([]);
  currentChunkIndex = signal<number>(0);
  fontSize = signal<number>(16);
  langMode = signal<'bilingual' | 'te' | 'en'>('bilingual');

  private heartbeatSub?: Subscription;

  ngOnInit(): void {
    this.lessonId = this.route.snapshot.paramMap.get('lessonId') || '';
    this.loadChunks();
    this.startHeartbeat();
  }

  ngOnDestroy(): void {
    this.heartbeatSub?.unsubscribe();
    this.sendProgressHeartbeat();
  }

  loadChunks(): void {
    this.pageState.set('loading');
    const schoolId = this.auth.currentUser()?.schoolId || '';

    this.academic.getContentChunks(this.lessonId, schoolId).pipe(
      catchError(() => {
        return of([]);
      })
    ).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.chunks.set(data);
          this.pageState.set('normal');
          this.storage.cacheLesson(this.lessonId, this.langMode(), data).catch(() => {});
        } else {
          // Provide standard reading text fallback for demo
          this.chunks.set([
            {
              id: 'chunk-1',
              lessonId: this.lessonId,
              sectionHeader: 'పరిచయం / Introduction',
              sequenceOrder: 1,
              content: 'విజ్ఞాన శాస్త్రం అనేది నిరంతర పరిశీలన మరియు ప్రయోగాల ద్వారా విశ్వం గురించి అవగాహన కల్పించే క్రమబద్ధమైన విజ్ఞానం. Science is the systematic study of the structure and behavior of the physical and natural world through observation and experiment.',
              teluguContent: 'విజ్ఞాన శాస్త్రం అనేది నిరంతర పరిశీలన మరియు ప్రయోగాల ద్వారా విశ్వం గురించి అవగాహన కల్పించే క్రమబద్ధమైన విజ్ఞానం.',
              englishContent: 'Science is the systematic study of the structure and behavior of the physical and natural world through observation and experiment.'
            },
            {
              id: 'chunk-2',
              lessonId: this.lessonId,
              sectionHeader: 'ముఖ్యాంశాలు / Key Principles',
              sequenceOrder: 2,
              content: 'బలములు మరియు వాటి రకాలు: స్పర్శ బలాలు మరియు క్షేత్ర బలాలు. Forces are categorized into contact forces and non-contact forces (field forces).',
              teluguContent: 'బలములు మరియు వాటి రకాలు: స్పర్శ బలాలు (Contact Forces) మరియు క్షేత్ర బలాలు (Field Forces).',
              englishContent: 'Forces are broadly categorized into contact forces and non-contact forces (field forces).'
            }
          ]);
          this.pageState.set('normal');
        }
      },
      error: () => {
        this.pageState.set('error');
      }
    });
  }

  adjustFontSize(delta: number): void {
    this.fontSize.set(Math.max(14, Math.min(26, this.fontSize() + delta)));
  }

  prevChunk(): void {
    if (this.currentChunkIndex() > 0) {
      this.currentChunkIndex.set(this.currentChunkIndex() - 1);
      this.sendProgressHeartbeat();
    }
  }

  nextChunk(): void {
    if (this.currentChunkIndex() < this.chunks().length - 1) {
      this.currentChunkIndex.set(this.currentChunkIndex() + 1);
      this.sendProgressHeartbeat();
    }
  }

  calcProgressPct(): number {
    const total = this.chunks().length;
    if (total === 0) return 0;
    return Math.round(((this.currentChunkIndex() + 1) / total) * 100);
  }

  private startHeartbeat(): void {
    // Post progress heartbeat every 30s
    this.heartbeatSub = interval(30000).subscribe(() => {
      this.sendProgressHeartbeat();
    });
  }

  private sendProgressHeartbeat(): void {
    const user = this.auth.currentUser();
    if (!user) return;

    const progress: StudentProgress = {
      studentId: user.userId || user.id || '',
      lessonId: this.lessonId,
      completionPercent: this.calcProgressPct(),
      lastPosition: this.currentChunkIndex(),
      lastAccessedAt: new Date().toISOString(),
      completed: this.calcProgressPct() >= 100
    };

    this.student.saveProgress(progress).pipe(catchError(() => of(progress))).subscribe();
  }

  goBack(): void {
    this.location.back();
  }
}
