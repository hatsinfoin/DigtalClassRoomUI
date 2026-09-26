import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AcademicService } from '../../../../core/services/academic.service';
import { StudentService } from '../../../../core/services/student.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LessonResponse, ContentUnitResponse, StudentProgress } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';
import { TeluguNfcPipe } from '../../../../shared/pipes/telugu-nfc.pipe';

@Component({
  selector: 'app-lesson-detail',
  standalone: true,
  imports: [
    CommonModule,
    UxStateContainerComponent,
    TeluguNfcPipe
  ],
  template: `
    <div class="lesson-detail-container">
      <header class="detail-header">
        <button class="back-btn" (click)="goBack()">
          <span>←</span> Back to Chapters
        </button>

        @if (lesson()) {
          <div class="lesson-hero-card glass-card">
            <span class="chapter-badge">Chapter {{ lesson()?.orderIndex || '1' }}</span>
            <h1 class="lesson-title">{{ lesson()?.title | teluguNfc }}</h1>
            <p class="lesson-desc">Master concepts with bilingual interactive notes, media lectures, and quizzes.</p>
          </div>
        }
      </header>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="card"
        emptyTitle="Lesson Content Unavailable"
        emptyMessage="Content for this lesson has not been uploaded yet."
        (onRetry)="loadLessonDetail()"
      >
        <!-- Learning Modes Grid -->
        <div class="modes-grid">
          <!-- Mode 1: Interactive Reader -->
          <div class="mode-card glass-card read-mode" (click)="openReader()">
            <div class="mode-icon-circle">
              <span>📖</span>
            </div>
            <div class="mode-info">
              <h3 class="mode-title">Textbook & Notes</h3>
              <p class="mode-desc">Read curated bilingual study chunks and highlighted concepts.</p>
            </div>
            <button class="mode-btn">
              <span>Read Now</span>
              <span>→</span>
            </button>
          </div>

          <!-- Mode 2: Media Player -->
          <div class="mode-card glass-card media-mode" (click)="openMedia()">
            <div class="mode-icon-circle">
              <span>🎥</span>
            </div>
            <div class="mode-info">
              <h3 class="mode-title">Media & Lectures</h3>
              <p class="mode-desc">Watch video lessons and listen to audio explanations.</p>
            </div>
            <button class="mode-btn">
              <span>Watch Video</span>
              <span>→</span>
            </button>
          </div>

          <!-- Mode 3: Practice Activities -->
          <div class="mode-card glass-card practice-mode" (click)="openPractice()">
            <div class="mode-icon-circle">
              <span>📝</span>
            </div>
            <div class="mode-info">
              <h3 class="mode-title">Practice & Quiz</h3>
              <p class="mode-desc">Test your understanding with self-paced practice exercises.</p>
            </div>
            <button class="mode-btn">
              <span>Start Quiz</span>
              <span>→</span>
            </button>
          </div>

          <!-- Mode 4: AI Lesson Tutor -->
          <div class="mode-card glass-card ai-mode" (click)="askAi()">
            <div class="mode-icon-circle">
              <span>✨</span>
            </div>
            <div class="mode-info">
              <h3 class="mode-title">Ask AI Tutor</h3>
              <p class="mode-desc">Get instant step-by-step explanations for this lesson.</p>
            </div>
            <button class="mode-btn">
              <span>Chat with Gyan</span>
              <span>→</span>
            </button>
          </div>
        </div>

        <!-- Content Units Listing -->
        @if (contentUnits().length > 0) {
          <section class="units-section">
            <h3 class="section-heading">Lesson Content Units</h3>
            <div class="units-list">
              @for (unit of contentUnits(); track unit.id; let idx = $index) {
                <div class="unit-card glass-card" (click)="openReader()">
                  <span class="unit-number">{{ idx + 1 }}</span>
                  <div class="unit-details">
                    <h4 class="unit-title">{{ unit.title | teluguNfc }}</h4>
                    <span class="unit-type">{{ unit.unitType }}</span>
                  </div>
                  <span class="unit-arrow">→</span>
                </div>
              }
            </div>
          </section>
        }
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./lesson-detail.component.scss']
})
export class LessonDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private academic = inject(AcademicService);
  private student = inject(StudentService);
  private auth = inject(AuthService);

  subjectId = '';
  lessonId = '';
  pageState = signal<UxStateType>('loading');
  lesson = signal<LessonResponse | null>(null);
  contentUnits = signal<ContentUnitResponse[]>([]);
  progress = signal<StudentProgress[]>([]);

  ngOnInit(): void {
    this.subjectId = this.route.snapshot.paramMap.get('subjectId') || '';
    this.lessonId = this.route.snapshot.paramMap.get('lessonId') || '';
    this.loadLessonDetail();
  }

  loadLessonDetail(): void {
    this.pageState.set('loading');
    const schoolId = this.auth.currentUser()?.schoolId || '';

    forkJoin({
      lesson: this.academic.getLesson(this.lessonId).pipe(catchError(() => of(null))),
      units: this.academic.getContentUnits(this.lessonId, schoolId).pipe(catchError(() => of([]))),
      progress: this.student.getLessonProgress(this.lessonId).pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        if (!res.lesson) {
          this.lesson.set({
            id: this.lessonId,
            schoolId: schoolId,
            subjectId: this.subjectId,
            standardId: '1',
            academicYearId: '1',
            title: 'Interactive Chapter Study',
            orderIndex: 1,
            language: 'te,en'
          });
        } else {
          this.lesson.set(res.lesson);
        }

        this.contentUnits.set(res.units);
        this.progress.set(res.progress);
        this.pageState.set('normal');
      },
      error: () => {
        this.pageState.set('error');
      }
    });
  }

  openReader(): void {
    this.router.navigate(['/student/learn/subject', this.subjectId, 'lesson', this.lessonId, 'read']);
  }

  openMedia(): void {
    this.router.navigate(['/student/learn/subject', this.subjectId, 'lesson', this.lessonId, 'media', 'default']);
  }

  openPractice(): void {
    this.router.navigate(['/student/learn/subject', this.subjectId, 'lesson', this.lessonId, 'practice']);
  }

  askAi(): void {
    this.router.navigate(['/student/ai'], { queryParams: { lessonId: this.lessonId } });
  }

  goBack(): void {
    this.location.back();
  }
}
