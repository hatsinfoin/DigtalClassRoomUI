import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { TeacherService } from '../../../core/services/teacher.service';
import { AcademicService } from '../../../core/services/academic.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  StandardResponse,
  SubjectResponse,
  ActivityResponse,
  StandardAnalyticsResponse,
  UserProfileResponse
} from '../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../shared/components/ux-state-container/ux-state-container.component';

export interface DisplaySubject extends SubjectResponse {
  gradientStyle: string;
  icon: string;
}

export interface DisplayActivity extends ActivityResponse {
  subjectName?: string;
}

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
          <h1 class="teacher-name">Welcome, {{ user()?.name || user()?.username || 'Educator' }} 👨‍🏫</h1>
          <p class="teacher-school">{{ user()?.schoolName || user()?.schoolId || 'School' }} • Staff Portal</p>
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

      <!-- Standard / Grade Switcher Bar -->
      @if (standards().length > 0) {
        <section class="standard-switcher-section">
          <div class="switcher-header">
            <span class="switcher-title">Select Standard / Grade</span>
            @if (selectedStandard()) {
              <span class="active-badge" [class.pulsing]="isStandardLoading()">
                @if (isStandardLoading()) {
                  Loading Std {{ selectedStandard()?.standardNumber || selectedStandard()?.name }}...
                } @else {
                  Active: Std {{ selectedStandard()?.standardNumber || selectedStandard()?.name }} {{ selectedStandard()?.section ? '- Sec ' + selectedStandard()?.section : '' }}
                }
              </span>
            }
          </div>

          <div class="pills-scroll">
            @for (std of standards(); track std.id) {
              <button
                class="standard-pill"
                [class.active]="selectedStandardId() === std.id"
                [class.loading-pill]="isStandardLoading() && selectedStandardId() === std.id"
                (click)="onSelectStandard(std.id)"
              >
                <span class="pill-text">Std {{ std.standardNumber || std.name }} {{ std.section ? '- Sec ' + std.section : '' }}</span>
                @if (selectedStandardId() === std.id) {
                  @if (isStandardLoading()) {
                    <span class="pill-dot-pulse"></span>
                  } @else {
                    <span class="pill-check">✓</span>
                  }
                }
              </button>
            }
          </div>
        </section>
      }

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="card"
        emptyTitle="No Standards Found"
        emptyMessage="No standards or grades have been configured in this school yet."
        (onRetry)="loadInitialData()"
      >
        <!-- Standard-Scoped KPI Grid (2x2) -->
        <section class="stats-grid">
          @if (isStandardLoading()) {
            @for (k of [1,2,3,4]; track k) {
              <div class="stat-card glass-card skeleton-stat-card">
                <div class="stat-icon-wrap shimmer"></div>
                <div class="stat-details">
                  <div class="skeleton-line shimmer title"></div>
                  <div class="skeleton-line shimmer subtitle"></div>
                </div>
              </div>
            }
          } @else {
            <div class="stat-card glass-card">
              <div class="stat-icon-wrap students">👥</div>
              <div class="stat-details">
                <span class="stat-num">{{ standardAnalytics()?.totalEnrolledStudents ?? 0 }}</span>
                <span class="stat-lbl">Enrolled Students</span>
              </div>
            </div>

            <div class="stat-card glass-card">
              <div class="stat-icon-wrap attendance">📈</div>
              <div class="stat-details">
                <span class="stat-num">{{ standardAnalytics()?.participationRate != null ? (standardAnalytics()?.participationRate + '%') : '0%' }}</span>
                <span class="stat-lbl">Today's Turnout</span>
              </div>
            </div>

            <div class="stat-card glass-card">
              <div class="stat-icon-wrap activities">⏱️</div>
              <div class="stat-details">
                <span class="stat-num">{{ standardActivities().length }}</span>
                <span class="stat-lbl">Active Quizzes</span>
              </div>
            </div>

            <div class="stat-card glass-card">
              <div class="stat-icon-wrap pending">📑</div>
              <div class="stat-details">
                <span class="stat-num">{{ standardAnalytics()?.inactiveStudentsCount ?? 0 }}</span>
                <span class="stat-lbl">Pending Reviews</span>
              </div>
            </div>
          }
        </section>

        <!-- Subjects in Selected Standard -->
        <section class="subjects-section">
          <div class="section-header-row">
            <h2 class="section-title">
              Subjects in Std {{ selectedStandard()?.standardNumber || selectedStandard()?.name || '' }}
              {{ selectedStandard()?.section ? '- ' + selectedStandard()?.section : '' }}
            </h2>
            <button class="view-all-btn" (click)="goToContent()">Curriculum →</button>
          </div>

          @if (isStandardLoading()) {
            <div class="subjects-grid">
              @for (s of [1,2,3,4]; track s) {
                <div class="subject-card glass-card skeleton-subj-card">
                  <div class="skeleton-icon-box shimmer"></div>
                  <div class="skeleton-line shimmer title"></div>
                  <div class="skeleton-line shimmer short"></div>
                </div>
              }
            </div>
          } @else {
            @if (standardSubjects().length > 0) {
              <div class="subjects-grid">
                @for (subj of standardSubjects(); track subj.id) {
                  <div
                    class="subject-card glass-card"
                    [style.background]="subj.gradientStyle"
                    (click)="goToSubjectContent(subj.id)"
                  >
                    <div class="subj-top-row">
                      <span class="subj-icon">{{ subj.icon }}</span>
                      <span class="subj-code">{{ subj.code }}</span>
                    </div>
                    <h3 class="subj-name" [class.telugu-font]="subj.language === 'TELUGU'">{{ subj.name }}</h3>
                    <span class="subj-chapters">Standard Curriculum</span>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-state-box glass-card">
                <span class="empty-icon">📚</span>
                <p class="empty-text">No subjects found for Std {{ selectedStandard()?.standardNumber || selectedStandard()?.name }}.</p>
              </div>
            }
          }
        </section>

        <!-- Active Assessments for Selected Standard -->
        <section class="assessments-section">
          <div class="section-header-row">
            <h2 class="section-title">
              Active Assessments for Std {{ selectedStandard()?.standardNumber || selectedStandard()?.name || '' }}
            </h2>
            <button class="view-all-btn" (click)="goToActivities()">View All</button>
          </div>

          @if (isStandardLoading()) {
            <div class="assessments-list">
              @for (a of [1,2]; track a) {
                <div class="assessment-card glass-card skeleton-act-card">
                  <div class="skeleton-line shimmer short"></div>
                  <div class="skeleton-line shimmer title"></div>
                  <div class="skeleton-line shimmer full"></div>
                </div>
              }
            </div>
          } @else {
            @if (standardActivities().length > 0) {
              <div class="assessments-list">
                @for (act of standardActivities(); track act.id) {
                  <div class="assessment-card glass-card" (click)="openSubmissions(act.id)">
                    <div class="act-header">
                      <div class="act-info">
                        @if (act.subjectName) {
                          <span class="act-subj-pill">{{ act.subjectName }}</span>
                        }
                        <span class="act-type-tag">{{ act.activityType }}</span>
                      </div>
                      <span class="status-chip published">{{ act.status }}</span>
                    </div>

                    <h3 class="act-title">{{ act.title }}</h3>

                    <div class="act-meta-row">
                      <span class="act-marks">🎯 {{ act.totalMarks }} Marks</span>
                      <span class="act-deadline">📅 {{ act.examCategory || 'Assessment' }}</span>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-state-box glass-card">
                <span class="empty-icon">📝</span>
                <p class="empty-text">No published assessments active for this standard.</p>
              </div>
            }
          }
        </section>

        <!-- Quick Classroom Actions (Standard-Scoped) -->
        <section class="quick-actions-section">
          <h2 class="section-title">Classroom Actions</h2>
          <div class="actions-grid">
            <div class="action-btn glass-card" (click)="goToRollCall()">
              <span class="action-icon">📋</span>
              <span class="action-title">Take Attendance</span>
              <span class="action-desc">Daily turnout for Std {{ selectedStandard()?.standardNumber || selectedStandard()?.name || '' }}</span>
            </div>

            <div class="action-btn glass-card" (click)="goToCreateActivity()">
              <span class="action-icon">➕</span>
              <span class="action-title">Create Activity</span>
              <span class="action-desc">New quiz for this grade</span>
            </div>

            <div class="action-btn glass-card" (click)="goToContent()">
              <span class="action-icon">📤</span>
              <span class="action-title">Upload Resource</span>
              <span class="action-desc">Add video or PDF notes</span>
            </div>

            <div class="action-btn glass-card" (click)="goToGradebook()">
              <span class="action-icon">📑</span>
              <span class="action-title">Gradebook</span>
              <span class="action-desc">Performance matrix</span>
            </div>
          </div>
        </section>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./teacher-home.component.scss']
})
export class TeacherHomeComponent implements OnInit {
  private teacher = inject(TeacherService);
  private academic = inject(AcademicService);
  private auth = inject(AuthService);
  private router = inject(Router);

  user = signal<UserProfileResponse | null>(null);
  pageState = signal<UxStateType>('loading');
  isStandardLoading = signal<boolean>(false);

  // Standards Switcher
  standards = signal<StandardResponse[]>([]);
  selectedStandardId = signal<string | number | null>(null);

  selectedStandard = computed(() => {
    const id = this.selectedStandardId();
    if (!id) return null;
    return this.standards().find(s => String(s.id) === String(id)) || null;
  });

  // Standard-Scoped Data Signals (Strictly backend-driven)
  standardAnalytics = signal<StandardAnalyticsResponse | null>(null);
  standardSubjects = signal<DisplaySubject[]>([]);
  standardActivities = signal<DisplayActivity[]>([]);

  ngOnInit(): void {
    this.user.set(this.auth.currentUser());
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.pageState.set('loading');
    const schoolId = this.user()?.schoolId || '';

    this.academic.getStandards(schoolId).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (standardsList) => {
        const list = standardsList || [];
        this.standards.set(list);

        if (list.length === 0) {
          this.pageState.set('empty');
          return;
        }

        // Select teacher's assigned standard or default to the first standard from backend
        const initialStdId = this.user()?.standardId || list[0]?.id;
        this.selectedStandardId.set(initialStdId);
        this.loadStandardData(initialStdId, true);
      },
      error: () => {
        this.pageState.set('error');
      }
    });
  }

  onSelectStandard(stdId: string | number): void {
    if (this.selectedStandardId() === stdId && !this.isStandardLoading()) return;
    this.selectedStandardId.set(stdId);
    this.loadStandardData(stdId, false);
  }

  loadStandardData(standardId: string | number, isInitial: boolean = false): void {
    const schoolId = this.user()?.schoolId || '';

    if (!isInitial) {
      this.isStandardLoading.set(true);
    }

    forkJoin({
      analytics: this.teacher.getStandardAnalytics(standardId).pipe(catchError(() => of(null))),
      subjects: this.academic.getSubjects(schoolId, standardId).pipe(catchError(() => of([]))),
      activities: this.teacher.getActivities(schoolId, standardId, undefined, undefined, 'PUBLISHED').pipe(catchError(() => of([])))
    }).pipe(
      finalize(() => {
        this.isStandardLoading.set(false);
      })
    ).subscribe({
      next: (res) => {
        // 1. Process Analytics (Strictly from backend)
        this.standardAnalytics.set(res.analytics);

        // 2. Process Subjects (Strictly from backend)
        const subjectsList = res.subjects || [];
        const displaySubjects: DisplaySubject[] = subjectsList.map((s, index) => {
          return {
            ...s,
            gradientStyle: this.resolveSubjectGradient(s.name, s.code, index),
            icon: this.resolveSubjectIcon(s.name, s.code)
          };
        });
        this.standardSubjects.set(displaySubjects);

        // 3. Process Activities (Strictly from backend)
        const activitiesList = res.activities || [];
        const displayActivities: DisplayActivity[] = activitiesList.map((a) => {
          const matchedSubject = subjectsList.find(s => String(s.id) === String(a.subjectId));
          return {
            ...a,
            subjectName: matchedSubject?.name
          };
        });
        this.standardActivities.set(displayActivities);

        this.pageState.set('normal');
      },
      error: () => {
        this.pageState.set('error');
      }
    });
  }

  private resolveSubjectGradient(name?: string, code?: string, index: number = 0): string {
    const text = `${name || ''} ${code || ''}`.toLowerCase();
    if (text.includes('math')) return 'linear-gradient(135deg, #667EEA, #764BA2)';
    if (text.includes('sci')) return 'linear-gradient(135deg, #11998E, #38EF7D)';
    if (text.includes('telugu') || text.includes('తెలుగు') || text.includes('tel')) return 'linear-gradient(135deg, #F7971E, #FFD200)';
    if (text.includes('eng')) return 'linear-gradient(135deg, #2563EB, #4ECDC4)';
    if (text.includes('soc') || text.includes('hist')) return 'linear-gradient(135deg, #FC5C7D, #6A3093)';
    if (text.includes('evs')) return 'linear-gradient(135deg, #56AB2F, #A8E063)';
    
    const fallbacks = [
      'linear-gradient(135deg, #667EEA, #764BA2)',
      'linear-gradient(135deg, #11998E, #38EF7D)',
      'linear-gradient(135deg, #F7971E, #FFD200)',
      'linear-gradient(135deg, #2563EB, #4ECDC4)'
    ];
    return fallbacks[index % fallbacks.length];
  }

  private resolveSubjectIcon(name?: string, code?: string): string {
    const text = `${name || ''} ${code || ''}`.toLowerCase();
    if (text.includes('math')) return '∑×';
    if (text.includes('sci')) return '🔬';
    if (text.includes('telugu') || text.includes('తెలుగు') || text.includes('tel')) return 'అఆ';
    if (text.includes('eng')) return '🔤';
    if (text.includes('soc') || text.includes('hist')) return '🏛️';
    if (text.includes('evs')) return '🌱';
    return '📚';
  }

  goToRollCall(): void {
    const stdId = this.selectedStandardId();
    this.router.navigate(['/teacher/turnout'], { queryParams: { standardId: stdId } });
  }

  goToCreateActivity(): void {
    const stdId = this.selectedStandardId();
    this.router.navigate(['/teacher/activities/create'], { queryParams: { standardId: stdId } });
  }

  goToContent(): void {
    const stdId = this.selectedStandardId();
    this.router.navigate(['/teacher/content'], { queryParams: { standardId: stdId } });
  }

  goToSubjectContent(subjectId: string | number): void {
    this.router.navigate(['/teacher/content'], { queryParams: { subjectId } });
  }

  goToGradebook(): void {
    const stdId = this.selectedStandardId();
    this.router.navigate(['/teacher/more/gradebook'], { queryParams: { standardId: stdId } });
  }

  goToActivities(): void {
    const stdId = this.selectedStandardId();
    this.router.navigate(['/teacher/activities'], { queryParams: { standardId: stdId } });
  }

  openSubmissions(activityId: string | number): void {
    this.router.navigate(['/teacher/activities', activityId, 'submissions']);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
