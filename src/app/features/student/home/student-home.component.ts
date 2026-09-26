import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { AcademicService } from '../../../core/services/academic.service';
import { StudentService } from '../../../core/services/student.service';
import {
  SubjectResponse,
  StudentProgress,
  StudentActivitySummaryResponse,
  UserProfileResponse
} from '../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../shared/components/ux-state-container/ux-state-container.component';
import { ProgressRingComponent } from '../../../shared/components/progress-ring/progress-ring.component';
import { MascotComponent } from '../../../shared/components/mascot/mascot.component';
import { TeluguNfcPipe } from '../../../shared/pipes/telugu-nfc.pipe';

@Component({
  selector: 'app-student-home',
  standalone: true,
  imports: [
    CommonModule,
    UxStateContainerComponent,
    ProgressRingComponent,
    MascotComponent,
    TeluguNfcPipe
  ],
  template: `
    <div class="student-home-container">
      <!-- Header / Greeting Section (Always visible) -->
      <header class="home-header glass-card">
        <div class="greeting-info">
          <span class="greeting-badge">{{ standardDisplayName() }} • Sec {{ userProfile()?.section || 'A' }}</span>
          <h1 class="student-name">Hi, {{ userProfile()?.name || 'Student' }}! 👋</h1>
          <p class="greeting-motto">Ready to discover something amazing today?</p>
        </div>
        <div class="header-actions">
          <div class="avatar-mascot-wrapper">
            <app-mascot
              [size]="auth.ageGroup() === 'early' ? 'lg' : 'md'"
              expression="happy"
              [animated]="auth.ageGroup() === 'early'"
            />
          </div>
          <button class="logout-btn" (click)="logout()" title="Log out" aria-label="Logout">
            <svg class="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="card"
        emptyTitle="Welcome to your Classroom!"
        emptyMessage="No enrolled subjects or lessons found yet."
        [showMascot]="true"
        emptyMascotSpeech="Let's get ready to learn!"
        (onRetry)="loadHomeData()"
      >

        <!-- Continue Learning Card -->
        @if (continueProgress()) {
          <section class="section-container">
            <div class="section-title-row">
              <h2 class="section-title">Continue Learning</h2>
              <span class="pulse-indicator">Resume</span>
            </div>
            <div class="continue-card glass-card" (click)="resumeLastLesson()">
              <div class="card-left-accent"></div>
              <div class="continue-content">
                <span class="lesson-tag">Last Activity</span>
                <h3 class="lesson-title">{{ continueProgress()?.lessonId || 'Introduction to Physics & Forces' }}</h3>
                <div class="progress-bar-row">
                  <div class="progress-track">
                    <div class="progress-fill" [style.width.%]="continueProgress()?.completionPercent || 0"></div>
                  </div>
                  <span class="progress-pct">{{ continueProgress()?.completionPercent || 0 }}%</span>
                </div>
              </div>
              <button class="resume-btn">
                <span>▶</span>
              </button>
            </div>
          </section>
        }

        <!-- Upcoming Exam / Test Alerts -->
        @if (upcomingExams().length > 0) {
          <section class="section-container">
            <div class="section-title-row">
              <h2 class="section-title">Upcoming Tests & Practice</h2>
              <span class="badge-count">{{ upcomingExams().length }}</span>
            </div>
            <div class="exam-alerts-list">
              @for (exam of upcomingExams(); track exam.id) {
                <div class="exam-alert-card glass-card">
                  <div class="exam-badge" [ngClass]="exam.examCategory.toLowerCase()">
                    {{ formatExamCategory(exam.examCategory) }}
                  </div>
                  <div class="exam-info">
                    <h4 class="exam-title">{{ exam.title }}</h4>
                    <span class="exam-meta">{{ exam.totalQuestions }} Questions • {{ exam.totalMarks }} Marks</span>
                  </div>
                  <button class="start-exam-btn" (click)="startExam(exam.id)">
                    Start
                  </button>
                </div>
              }
            </div>
          </section>
        }

        <!-- Subjects Carousel / Grid -->
        <section class="section-container">
          <div class="section-title-row">
            <h2 class="section-title">My Subjects</h2>
            <button class="view-all-btn" (click)="goToSubjects()">View All</button>
          </div>

          <div class="subjects-carousel">
            @for (subject of subjects(); track subject.id) {
              <div
                class="subject-card glass-card"
                [ngClass]="getSubjectGradient(subject.name)"
                (click)="openSubject(subject.id)"
              >
                <div class="subject-card-top">
                  <div class="subject-icon-box">
                    <span>{{ getSubjectIcon(subject.name) }}</span>
                  </div>
                  <app-progress-ring
                    [progress]="getSubjectProgress(subject.id)"
                    [size]="46"
                    [strokeWidth]="4"
                    progressColor="#00D9A3"
                    trackColor="rgba(255,255,255,0.15)"
                  />
                </div>
                <div class="subject-card-bottom">
                  <h3 class="subject-name">{{ subject.name | teluguNfc }}</h3>
                  <span class="subject-code">{{ subject.code || 'CODE' }}</span>
                </div>
              </div>
            }
          </div>
        </section>

        <!-- Quick AI Tutor Banner -->
        <section class="section-container ai-banner-section">
          <div class="ai-banner glass-card" (click)="openAiTutor()">
            <div class="ai-banner-content">
              <div class="ai-pill">✨ 24/7 AI Tutor</div>
              <h3 class="ai-title">Need help with your homework?</h3>
              <p class="ai-desc">Ask Gyan anything in Telugu or English!</p>
            </div>
            <div class="ai-action">
              <button class="ai-ask-btn">Ask AI</button>
            </div>
          </div>
        </section>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./student-home.component.scss']
})
export class StudentHomeComponent implements OnInit {
  public auth = inject(AuthService);
  private academic = inject(AcademicService);
  private student = inject(StudentService);
  private router = inject(Router);

  pageState = signal<UxStateType>('loading');
  userProfile = signal<UserProfileResponse | null>(null);
  standardDisplayName = signal<string>('Class 5');
  subjects = signal<SubjectResponse[]>([]);
  progressList = signal<StudentProgress[]>([]);
  continueProgress = signal<StudentProgress | null>(null);
  upcomingExams = signal<StudentActivitySummaryResponse[]>([]);

  ngOnInit(): void {
    this.loadHomeData();
  }

  loadHomeData(): void {
    this.pageState.set('loading');
    const user = this.auth.currentUser();
    this.userProfile.set(user);

    const schoolId = user?.schoolId || '';
    const standardId = user?.standardId || '';

    forkJoin({
      subjects: this.academic.getSubjects(schoolId, standardId).pipe(catchError(() => of([]))),
      progress: this.student.getProgress().pipe(catchError(() => of([]))),
      activities: this.student.getActivities(undefined, 'QUARTERLY_EXAM').pipe(catchError(() => of([]))),
      standard: standardId ? this.academic.getStandard(standardId).pipe(catchError(() => of(null))) : of(null)
    }).subscribe({
      next: (results) => {
        if (results.standard) {
          this.standardDisplayName.set(results.standard.name || `Class ${results.standard.standardNumber}`);
        } else if (standardId && !isNaN(Number(standardId))) {
          this.standardDisplayName.set(`Class ${standardId}`);
        } else {
          this.standardDisplayName.set('Class 5');
        }

        this.subjects.set(results.subjects);
        this.progressList.set(results.progress);
        this.upcomingExams.set(results.activities.slice(0, 3));

        if (results.progress.length > 0) {
          const sorted = [...results.progress].sort((a, b) => {
            return new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime();
          });
          this.continueProgress.set(sorted[0]);
        }

        if (results.subjects.length === 0 && results.progress.length === 0) {
          this.pageState.set('empty');
        } else {
          this.pageState.set('normal');
        }
      },
      error: () => {
        this.pageState.set('error');
      }
    });
  }

  getSubjectProgress(subjectId: string | number): number {
    const list = this.progressList();
    if (!list || list.length === 0) return 0;
    const matched = list.filter((p: any) => String(p.subjectId) === String(subjectId));
    if (matched.length === 0) return 0;
    const total = matched.reduce((sum, p) => sum + (p.completionPercent || 0), 0);
    return Math.round(total / matched.length);
  }

  getSubjectGradient(name: string): string {
    const n = (name || '').toLowerCase();
    if (n.includes('math') || n.includes('గణితం')) return 'grad-math';
    if (n.includes('science') || n.includes('సైన్స్')) return 'grad-science';
    if (n.includes('telugu') || n.includes('తెలుగు')) return 'grad-telugu';
    if (n.includes('english') || n.includes('ఇంగ్లీష్')) return 'grad-english';
    if (n.includes('social') || n.includes('history')) return 'grad-history';
    if (n.includes('evs') || n.includes('పరిసరాల')) return 'grad-evs';
    return 'grad-default';
  }

  getSubjectIcon(name: string): string {
    const n = (name || '').toLowerCase();
    if (n.includes('math') || n.includes('గణితం')) return '📐';
    if (n.includes('science') || n.includes('సైన్స్')) return '🔬';
    if (n.includes('telugu') || n.includes('తెలుగు')) return '📖';
    if (n.includes('english') || n.includes('ఇంగ్లీష్')) return '🔤';
    if (n.includes('social') || n.includes('history')) return '🌍';
    if (n.includes('evs') || n.includes('పరిసరాల')) return '🌱';
    return '📚';
  }

  formatExamCategory(cat: string): string {
    return cat.replace(/_/g, ' ');
  }

  resumeLastLesson(): void {
    const progress = this.continueProgress();
    if (progress?.lessonId) {
      this.router.navigate(['/student/learn/subject', 'default', 'lesson', progress.lessonId]);
    } else {
      this.router.navigate(['/student/learn']);
    }
  }

  openSubject(subjectId: string | number): void {
    this.router.navigate(['/student/learn/subject', subjectId]);
  }

  goToSubjects(): void {
    this.router.navigate(['/student/learn']);
  }

  startExam(activityId: string | number): void {
    this.router.navigate(['/student/exam', activityId, 'instructions']);
  }

  openAiTutor(): void {
    this.router.navigate(['/student/ai']);
  }

  logout(): void {
    console.log('[StudentHome] User initiated logout.');
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
