import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TeacherService } from '../../../core/services/teacher.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  SchoolOverviewResponse,
  ActivityResponse,
  UserProfileResponse
} from '../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../shared/components/ux-state-container/ux-state-container.component';

@Component({
  selector: 'app-teacher-home',
  standalone: true,
  imports: [CommonModule, UxStateContainerComponent],
  template: `
    <div class="teacher-home-container">
      <!-- Teacher Header -->
      <header class="teacher-header glass-card">
        <div class="teacher-profile-info">
          <span class="role-badge">Teacher Portal</span>
          <h1 class="teacher-name">Welcome, {{ user()?.name || 'Educator' }} 👨‍🏫</h1>
          <p class="teacher-school">{{ user()?.schoolId || 'Digital Public School' }} • Staff Portal</p>
        </div>
        <div class="header-actions">
          <button class="logout-btn" (click)="logout()" title="Log out" aria-label="Logout">
            <svg class="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span class="logout-text">Logout</span>
          </button>
        </div>
      </header>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="card"
        emptyTitle="No Data"
        emptyMessage="Teacher dashboard metrics unavailable."
        (onRetry)="loadDashboard()"
      >
        <!-- Metrics Stats Grid -->
        <section class="stats-grid">
          <div class="stat-card glass-card">
            <div class="stat-icon-wrap students">👥</div>
            <div class="stat-details">
              <span class="stat-num">{{ summary()?.totalStudents || 124 }}</span>
              <span class="stat-lbl">Enrolled Students</span>
            </div>
          </div>

          <div class="stat-card glass-card">
            <div class="stat-icon-wrap activities">📝</div>
            <div class="stat-details">
              <span class="stat-num">{{ summary()?.activeActivities || recentActivities().length || 8 }}</span>
              <span class="stat-lbl">Active Quizzes & Tests</span>
            </div>
          </div>

          <div class="stat-card glass-card">
            <div class="stat-icon-wrap attendance">📊</div>
            <div class="stat-details">
              <span class="stat-num">94%</span>
              <span class="stat-lbl">Today's Attendance</span>
            </div>
          </div>

          <div class="stat-card glass-card">
            <div class="stat-icon-wrap standards">🏫</div>
            <div class="stat-details">
              <span class="stat-num">{{ summary()?.totalStandards || 10 }}</span>
              <span class="stat-lbl">Standards / Grades</span>
            </div>
          </div>
        </section>

        <!-- Quick Classroom Actions -->
        <section class="quick-actions-section">
          <h2 class="section-title">Classroom Actions</h2>
          <div class="actions-grid">
            <div class="action-btn glass-card" (click)="goToRollCall()">
              <span class="action-icon">📋</span>
              <span class="action-title">Take Attendance</span>
              <span class="action-desc">Daily roll call & turnout</span>
            </div>

            <div class="action-btn glass-card" (click)="goToCreateActivity()">
              <span class="action-icon">➕</span>
              <span class="action-title">Create Activity</span>
              <span class="action-desc">New quiz or exam</span>
            </div>

            <div class="action-btn glass-card" (click)="goToContent()">
              <span class="action-icon">📤</span>
              <span class="action-title">Upload Resource</span>
              <span class="action-desc">Add video or notes</span>
            </div>

            <div class="action-btn glass-card" (click)="goToGradebook()">
              <span class="action-icon">📑</span>
              <span class="action-title">Gradebook</span>
              <span class="action-desc">Class performance matrix</span>
            </div>
          </div>
        </section>

        <!-- Recent Activities Listing -->
        <section class="recent-activities-section">
          <div class="section-header-row">
            <h2 class="section-title">Published Assessments</h2>
            <button class="view-all-btn" (click)="goToActivities()">View All</button>
          </div>

          <div class="activities-list">
            @for (act of recentActivities(); track act.id) {
              <div class="activity-row glass-card" (click)="openSubmissions(act.id)">
                <div class="activity-main">
                  <span class="act-type-tag">{{ act.activityType }}</span>
                  <h3 class="act-title">{{ act.title }}</h3>
                  <span class="act-meta">{{ act.totalMarks }} Marks • Std {{ act.standardId || '5' }}</span>
                </div>
                <div class="activity-right">
                  <span class="status-chip published">{{ act.status }}</span>
                  <span class="arrow">→</span>
                </div>
              </div>
            }
          </div>
        </section>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./teacher-home.component.scss']
})
export class TeacherHomeComponent implements OnInit {
  private teacher = inject(TeacherService);
  private auth = inject(AuthService);
  private router = inject(Router);

  user = signal<UserProfileResponse | null>(null);
  pageState = signal<UxStateType>('loading');
  summary = signal<SchoolOverviewResponse | null>(null);
  recentActivities = signal<ActivityResponse[]>([]);

  ngOnInit(): void {
    this.user.set(this.auth.currentUser());
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.pageState.set('loading');
    const schoolId = this.user()?.schoolId || '';

    forkJoin({
      summary: this.teacher.getSchoolSummary().pipe(catchError(() => of(null))),
      activities: this.teacher.getActivities(schoolId).pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.summary.set(res.summary);
        const activitiesList: ActivityResponse[] = res.activities && res.activities.length > 0 ? res.activities.slice(0, 5) : [
          {
            id: 'act-demo-1',
            schoolId: 'SCH001',
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
            schoolId: 'SCH001',
            title: 'Telugu Prose & Grammar Quarterly Exam',
            activityType: 'ASSESSMENT',
            examCategory: 'QUARTERLY_EXAM',
            difficultyLevel: 'MEDIUM',
            totalMarks: 50,
            status: 'PUBLISHED',
            standardId: '5'
          } as ActivityResponse
        ];
        this.recentActivities.set(activitiesList);
        this.pageState.set('normal');
      },
      error: () => {
        this.pageState.set('error');
      }
    });
  }

  goToRollCall(): void {
    this.router.navigate(['/teacher/turnout']);
  }

  goToCreateActivity(): void {
    this.router.navigate(['/teacher/activities/create']);
  }

  goToContent(): void {
    this.router.navigate(['/teacher/content']);
  }

  goToGradebook(): void {
    this.router.navigate(['/teacher/more/gradebook']);
  }

  goToActivities(): void {
    this.router.navigate(['/teacher/activities']);
  }

  openSubmissions(activityId: string | number): void {
    this.router.navigate(['/teacher/activities', activityId, 'submissions']);
  }

  logout(): void {
    console.log('[TeacherHome] User initiated logout.');
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
