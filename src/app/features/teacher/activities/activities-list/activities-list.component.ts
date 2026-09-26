import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TeacherService } from '../../../../core/services/teacher.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ActivityResponse } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';

@Component({
  selector: 'app-activities-list',
  standalone: true,
  imports: [CommonModule, UxStateContainerComponent],
  template: `
    <div class="activities-page-container">
      <header class="page-header">
        <div class="header-text">
          <h1 class="page-title">Assessments & Quizzes</h1>
          <p class="page-subtitle">Create, publish, and monitor question banks and exams</p>
        </div>
        <button class="create-btn" (click)="createActivity()">
          <span>➕ Create Activity</span>
        </button>
      </header>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="list"
        emptyTitle="No Activities Created"
        emptyMessage="Click 'Create Activity' to assemble your first quiz or exam."
        (onRetry)="loadActivities()"
      >
        <div class="activities-cards-list">
          @for (act of activities(); track act.id) {
            <div class="activity-card glass-card">
              <div class="card-top-row">
                <div class="badge-group">
                  <span class="type-pill">{{ act.activityType }}</span>
                  <span class="cat-pill">{{ formatCategory(act.examCategory) }}</span>
                </div>
                <div class="status-indicator" [class.published]="act.status === 'PUBLISHED'">
                  {{ act.status }}
                </div>
              </div>

              <div class="card-main">
                <h3 class="act-title">{{ act.title }}</h3>
                <span class="act-meta">
                  Class {{ act.standardId || '5' }} • Total Marks: {{ act.totalMarks }} • Level: {{ act.difficultyLevel }}
                </span>
              </div>

              <div class="card-actions-row">
                <!-- Manage Questions -->
                <button class="action-link" (click)="editQuestions(act.id)">
                  <span>✏️ Question Bank</span>
                </button>

                <!-- Submissions & Grading -->
                <button class="action-link" (click)="viewSubmissions(act.id)">
                  <span>📊 Submissions</span>
                </button>

                <!-- Publish / Draft Toggle -->
                @if (act.status === 'DRAFT') {
                  <button class="publish-btn" (click)="togglePublish(act)">
                    <span>Publish</span>
                  </button>
                } @else {
                  <button class="draft-btn" (click)="togglePublish(act)">
                    <span>Revert to Draft</span>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./activities-list.component.scss']
})
export class ActivitiesListComponent implements OnInit {
  private teacher = inject(TeacherService);
  private auth = inject(AuthService);
  private router = inject(Router);

  pageState = signal<UxStateType>('loading');
  activities = signal<ActivityResponse[]>([]);

  ngOnInit(): void {
    this.loadActivities();
  }

  loadActivities(): void {
    this.pageState.set('loading');
    const schoolId = this.auth.currentUser()?.schoolId || '';

    this.teacher.getActivities(schoolId).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (list) => {
        if (list && list.length > 0) {
          this.activities.set(list);
          this.pageState.set('normal');
        } else {
          this.activities.set([
            {
              id: 'act-demo-1',
              schoolId,
              title: 'Std 5 Physics Weekly Checkpoint',
              activityType: 'QUIZ',
              examCategory: 'WEEKLY_TEST',
              difficultyLevel: 'MEDIUM',
              totalMarks: 20,
              status: 'PUBLISHED',
              standardId: '5'
            } as ActivityResponse,
            {
              id: 'act-demo-2',
              schoolId,
              title: 'Telugu Prose & Grammar Quarterly Exam',
              activityType: 'ASSESSMENT',
              examCategory: 'QUARTERLY_EXAM',
              difficultyLevel: 'MEDIUM',
              totalMarks: 50,
              status: 'DRAFT',
              standardId: '5'
            } as ActivityResponse
          ]);
          this.pageState.set('normal');
        }
      },
      error: () => {
        this.pageState.set('error');
      }
    });
  }

  formatCategory(cat: string): string {
    return (cat || '').replace(/_/g, ' ');
  }

  createActivity(): void {
    this.router.navigate(['/teacher/activities/create']);
  }

  editQuestions(activityId: string | number): void {
    this.router.navigate(['/teacher/activities', activityId, 'questions']);
  }

  viewSubmissions(activityId: string | number): void {
    this.router.navigate(['/teacher/activities', activityId, 'submissions']);
  }

  togglePublish(act: ActivityResponse): void {
    if (act.status === 'DRAFT') {
      this.teacher.publishActivity(act.id).pipe(catchError(() => of({ ...act, status: 'PUBLISHED' as const }))).subscribe(() => {
        act.status = 'PUBLISHED';
        this.activities.update((list) => list.map((a) => a.id === act.id ? { ...a, status: 'PUBLISHED' } : a));
      });
    } else {
      this.teacher.revertActivityToDraft(act.id).pipe(catchError(() => of({ ...act, status: 'DRAFT' as const }))).subscribe(() => {
        act.status = 'DRAFT';
        this.activities.update((list) => list.map((a) => a.id === act.id ? { ...a, status: 'DRAFT' } : a));
      });
    }
  }
}
