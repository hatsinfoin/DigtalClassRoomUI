import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AcademicService } from '../../../../core/services/academic.service';
import { StudentService } from '../../../../core/services/student.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LessonResponse, StudentProgress } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';
import { TeluguNfcPipe } from '../../../../shared/pipes/telugu-nfc.pipe';

@Component({
  selector: 'app-subject-hub',
  standalone: true,
  imports: [
    CommonModule,
    UxStateContainerComponent,
    TeluguNfcPipe
  ],
  template: `
    <div class="subject-hub-container">
      <!-- Back Navigation Header -->
      <header class="hub-header">
        <button class="back-btn" (click)="goBack()">
          <span>←</span> Back to Subjects
        </button>
        <div class="hub-title-card glass-card">
          <span class="hub-tag">Chapters & Curriculum</span>
          <h1 class="hub-title">Subject Chapters</h1>
          <p class="hub-subtitle">Follow your step-by-step learning journey</p>
        </div>
      </header>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="list"
        emptyTitle="No Lessons Found"
        emptyMessage="Lessons have not been assigned to this subject yet."
        (onRetry)="loadLessons()"
      >
        <div class="lesson-timeline">
          @for (lesson of lessons(); track lesson.id; let idx = $index) {
            <div
              class="lesson-card glass-card"
              (click)="openLesson(lesson.id)"
            >
              <div class="lesson-index-badge">
                <span>{{ idx + 1 }}</span>
              </div>

              <div class="lesson-details">
                <span class="chapter-label">Chapter {{ lesson.orderIndex || (idx + 1) }}</span>
                <h3 class="lesson-title">{{ lesson.title | teluguNfc }}</h3>
                <div class="lesson-meta">
                  <span class="lang-tag">{{ lesson.language || 'Telugu & English' }}</span>
                  @if (isCompleted(lesson.id)) {
                    <span class="completed-badge">✓ Completed</span>
                  }
                </div>
              </div>

              <div class="lesson-action">
                <button class="open-btn">
                  <span>Start</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          }
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./subject-hub.component.scss']
})
export class SubjectHubComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private academic = inject(AcademicService);
  private student = inject(StudentService);
  private auth = inject(AuthService);

  subjectId = '';
  pageState = signal<UxStateType>('loading');
  lessons = signal<LessonResponse[]>([]);
  progressMap = signal<Map<string | number, StudentProgress>>(new Map());

  ngOnInit(): void {
    this.subjectId = this.route.snapshot.paramMap.get('subjectId') || '';
    this.loadLessons();
  }

  loadLessons(): void {
    this.pageState.set('loading');
    const schoolId = this.auth.currentUser()?.schoolId || '';

    // 1. Fetch and render lessons immediately
    this.academic.getLessons(schoolId, this.subjectId).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (list) => {
        this.lessons.set(list);
        this.pageState.set(list.length === 0 ? 'empty' : 'normal');
      },
      error: () => {
        this.pageState.set('error');
      }
    });

    // 2. Fetch progress telemetry asynchronously in background
    this.student.getProgress().pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (progressList) => {
        const map = new Map<string | number, StudentProgress>();
        progressList.forEach((p) => {
          if (p.lessonId) map.set(p.lessonId, p);
        });
        this.progressMap.set(map);
      }
    });
  }

  isCompleted(lessonId: string | number): boolean {
    const prog = this.progressMap().get(lessonId);
    return !!(prog && (prog.completed || prog.completionPercent >= 100));
  }

  openLesson(lessonId: string | number): void {
    this.router.navigate(['/student/learn/subject', this.subjectId, 'lesson', lessonId]);
  }

  goBack(): void {
    this.location.back();
  }
}
