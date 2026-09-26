import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StudentService } from '../../../../core/services/student.service';
import { StorageService } from '../../../../core/services/storage.service';
import { StudentActivityDetailResponse } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';

@Component({
  selector: 'app-exam-instructions',
  standalone: true,
  imports: [CommonModule, UxStateContainerComponent],
  template: `
    <div class="instructions-container">
      <header class="instructions-header">
        <button class="back-btn" (click)="goBack()">
          <span>←</span> Cancel & Back
        </button>
      </header>

      <app-ux-state
        [state]="pageState"
        skeletonLayout="card"
        emptyTitle="Exam Details Unavailable"
        emptyMessage="Could not retrieve exam parameters."
        (onRetry)="loadExam()"
      >
        <div class="instructions-card glass-card">
          <!-- Top Badge & Title -->
          <div class="badge-row">
            <span class="exam-type-badge">{{ activity?.activityType || 'ASSESSMENT' }}</span>
            <span class="exam-cat-badge">{{ formatExamCategory(activity?.examCategory || 'QUARTERLY_EXAM') }}</span>
          </div>

          <h1 class="exam-title">{{ activity?.title || 'Quarterly Examination' }}</h1>
          <p class="exam-desc">Read the guidelines below carefully before launching the exam session.</p>

          <!-- Metrics Grid -->
          <div class="metrics-grid">
            <div class="metric-box">
              <span class="metric-icon">❓</span>
              <div class="metric-info">
                <span class="metric-val">{{ activity?.questions?.length || 10 }}</span>
                <span class="metric-lbl">Total Questions</span>
              </div>
            </div>

            <div class="metric-box">
              <span class="metric-icon">⏱️</span>
              <div class="metric-info">
                <span class="metric-val">{{ durationMinutes }} Mins</span>
                <span class="metric-lbl">Time Limit</span>
              </div>
            </div>

            <div class="metric-box">
              <span class="metric-icon">🎯</span>
              <div class="metric-info">
                <span class="metric-val">{{ activity?.totalMarks || 20 }}</span>
                <span class="metric-lbl">Total Marks</span>
              </div>
            </div>

            <div class="metric-box">
              <span class="metric-icon">🛡️</span>
              <div class="metric-info">
                <span class="metric-val">Kiosk</span>
                <span class="metric-lbl">Anti-Cheat Mode</span>
              </div>
            </div>
          </div>

          <!-- Rules List -->
          <div class="rules-section">
            <h3 class="rules-heading">Instructions & Invariants</h3>
            <ul class="rules-list">
              <li>📌 Do not refresh or exit the browser during the examination attempt.</li>
              <li>📌 The exam will automatically submit when the countdown timer reaches zero.</li>
              <li>📌 Answers are automatically cached locally to prevent loss during intermittent disconnects.</li>
              @if (isAssessment) {
                <li class="alert-rule">⚠️ <strong>Anti-Cheat Active:</strong> AI hints and external assistance are disabled during this assessment.</li>
              } @else {
                <li class="info-rule">💡 <strong>Practice Mode:</strong> AI Hints are available for difficult questions.</li>
              }
            </ul>
          </div>

          <!-- Start / Resume CTA -->
          <button class="start-btn" (click)="beginExam()">
            <span>{{ hasSavedAnswers ? 'Resume Saved Session' : 'I Am Ready — Begin Exam' }}</span>
            <span class="arrow">→</span>
          </button>
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./exam-instructions.component.scss']
})
export class ExamInstructionsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private student = inject(StudentService);
  private storage = inject(StorageService);

  activityId = '';
  pageState: UxStateType = 'loading';
  activity: StudentActivityDetailResponse | null = null;
  durationMinutes = 30;
  hasSavedAnswers = false;

  get isAssessment(): boolean {
    return this.activity?.activityType === 'ASSESSMENT' || this.activity?.examCategory !== 'DAILY_PRACTICE';
  }

  ngOnInit(): void {
    this.activityId = this.route.snapshot.paramMap.get('activityId') || '';
    this.loadExam();
  }

  loadExam(): void {
    this.pageState = 'loading';

    this.student.getActivityDetail(this.activityId).pipe(
      catchError(() => {
        // Fallback demo exam for standalone testing
        return of({
          id: this.activityId,
          title: 'Science & Physics Assessment',
          activityType: 'ASSESSMENT',
          examCategory: 'QUARTERLY_EXAM',
          totalMarks: 20,
          difficultyLevel: 'MEDIUM',
          language: 'te,en',
          questions: [
            {
              id: 'q1',
              text: 'కింది వాటిలో ఏది సంపర్క బలం (Contact Force)? / Which of the following is a Contact Force?',
              type: 'MULTIPLE_CHOICE',
              marks: 2,
              options: [
                { id: 'opt1', text: 'గురుత్వాకర్షణ బలం / Gravitational force' },
                { id: 'opt2', text: 'ఘర్షణ బలం / Frictional force' },
                { id: 'opt3', text: 'అయస్కాంత బలం / Magnetic force' },
                { id: 'opt4', text: 'స్థిర విద్యుత్ బలం / Electrostatic force' }
              ]
            },
            {
              id: 'q2',
              text: 'బలం యొక్క SI ప్రమాణం ఏమిటి? / What is the SI unit of force?',
              type: 'MULTIPLE_CHOICE',
              marks: 2,
              options: [
                { id: 'opt21', text: 'జౌల్ / Joule' },
                { id: 'opt22', text: 'న్యూటన్ / Newton' },
                { id: 'opt23', text: 'పాస్కల్ / Pascal' },
                { id: 'opt24', text: 'వాట్ / Watt' }
              ]
            }
          ]
        } as StudentActivityDetailResponse);
      })
    ).subscribe((data) => {
      this.activity = data;
      this.pageState = 'normal';

      // Check if session has cached answers in IndexedDB
      this.storage.getExamAnswers(this.activityId).then((ans) => {
        this.hasSavedAnswers = ans.length > 0;
      }).catch(() => {});
    });
  }

  formatExamCategory(cat: string): string {
    return cat.replace(/_/g, ' ');
  }

  beginExam(): void {
    this.router.navigate(['/student/exam', this.activityId, 'attempt']);
  }

  goBack(): void {
    this.location.back();
  }
}
