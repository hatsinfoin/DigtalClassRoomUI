import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StudentService } from '../../../core/services/student.service';
import { StudentReportCardResponse, StudentProgress } from '../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../shared/components/ux-state-container/ux-state-container.component';
import { ProgressRingComponent } from '../../../shared/components/progress-ring/progress-ring.component';
import { TeluguNfcPipe } from '../../../shared/pipes/telugu-nfc.pipe';

@Component({
  selector: 'app-progress-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    UxStateContainerComponent,
    ProgressRingComponent,
    TeluguNfcPipe
  ],
  template: `
    <div class="progress-dashboard-container">
      <header class="dashboard-header">
        <h1 class="dashboard-title">Academic Progress</h1>
        <p class="dashboard-subtitle">Track your learning milestones, scores, and mastery.</p>
      </header>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="card"
        emptyTitle="No Progress Records"
        emptyMessage="Start studying chapters to generate your performance report."
        (onRetry)="loadProgress()"
      >
        <!-- Top Overall Summary Card -->
        <div class="overall-card glass-card">
          <div class="overall-left">
            <span class="report-badge">Term Report</span>
            <div class="grade-display">
              <span class="grade-letter">{{ report()?.overallGrade || 'A' }}</span>
              <div class="grade-details">
                <span class="pct-text">{{ report()?.cumulativePercentage || 85 }}%</span>
                <span class="label-text">Overall Score</span>
              </div>
            </div>
            <div class="streak-box">
              <span class="streak-icon">🔥</span>
              <span class="streak-text">7-Day Learning Streak!</span>
            </div>
          </div>

          <div class="overall-ring">
            <app-progress-ring
              [progress]="report()?.cumulativePercentage || 85"
              [size]="96"
              [strokeWidth]="8"
              progressColor="#6C63FF"
              trackColor="rgba(255,255,255,0.1)"
            />
          </div>
        </div>

        <!-- Subject Breakdown Section -->
        <section class="section-block">
          <h2 class="section-title">Subject Mastery</h2>
          <div class="subject-grades-grid">
            @for (subj of (report()?.subjectGrades?.length ? report()!.subjectGrades : defaultSubjectGrades); track subj.subjectName) {
              <div class="subject-grade-card glass-card">
                <div class="card-header">
                  <h3 class="subject-name">{{ subj.subjectName | teluguNfc }}</h3>
                  <span class="subject-grade-badge">{{ subj.grade }}</span>
                </div>

                <div class="score-row">
                  <div class="progress-bar-wrap">
                    <div class="progress-fill" [style.width.%]="subj.percentage"></div>
                  </div>
                  <span class="pct-val">{{ subj.percentage }}%</span>
                </div>

                <div class="exam-stats">
                  <span>{{ subj.testsAttempted }} Tests Taken</span>
                  <span>Avg: {{ subj.averageScore }}/100</span>
                </div>
              </div>
            }
          </div>
        </section>

        <!-- Recent Exam History Table -->
        <section class="section-block">
          <h2 class="section-title">Recent Exam Submissions</h2>
          <div class="exams-table-card glass-card">
            @for (exam of (report()?.recentExams?.length ? report()!.recentExams : defaultExams); track exam.title) {
              <div class="exam-row">
                <div class="exam-main">
                  <h4 class="exam-name">{{ exam.title }}</h4>
                  <span class="exam-date">{{ exam.date }}</span>
                </div>
                <div class="exam-score">
                  <span class="score-text">{{ exam.scoreEarned }} / {{ exam.totalMarks }}</span>
                  <span class="exam-grade">{{ exam.percentage }}%</span>
                </div>
              </div>
            }
          </div>
        </section>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./progress-dashboard.component.scss']
})
export class ProgressDashboardComponent implements OnInit {
  private student = inject(StudentService);

  pageState = signal<UxStateType>('loading');
  report = signal<StudentReportCardResponse | null>(null);
  progressList = signal<StudentProgress[]>([]);

  defaultSubjectGrades = [
    { subjectName: 'Mathematics (గణితం)', grade: 'A+', percentage: 92, testsAttempted: 4, averageScore: 92 },
    { subjectName: 'General Science (సైన్స్)', grade: 'A', percentage: 84, testsAttempted: 3, averageScore: 84 },
    { subjectName: 'Telugu (తెలుగు వాచకం)', grade: 'A+', percentage: 90, testsAttempted: 5, averageScore: 90 },
    { subjectName: 'English Language', grade: 'B+', percentage: 78, testsAttempted: 3, averageScore: 78 }
  ];

  defaultExams = [
    { title: 'Weekly Math Checkpoint 3', date: 'Yesterday', scoreEarned: 18, totalMarks: 20, percentage: 90 },
    { title: 'Science Unit Test - Forces', date: '3 days ago', scoreEarned: 22, totalMarks: 25, percentage: 88 },
    { title: 'Telugu Grammar Practice', date: '5 days ago', scoreEarned: 10, totalMarks: 10, percentage: 100 }
  ];

  ngOnInit(): void {
    this.loadProgress();
  }

  loadProgress(): void {
    this.pageState.set('loading');

    forkJoin({
      report: this.student.getMyPerformance().pipe(catchError(() => of(null))),
      progress: this.student.getProgress().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.report.set(res.report);
        this.progressList.set(res.progress);
        this.pageState.set('normal');
      },
      error: () => {
        this.pageState.set('error');
      }
    });
  }
}
