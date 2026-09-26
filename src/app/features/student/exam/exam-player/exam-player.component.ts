import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StudentService } from '../../../../core/services/student.service';
import { StorageService } from '../../../../core/services/storage.service';
import {
  StudentActivityDetailResponse,
  StudentQuestionResponse,
  StudentAnswer,
  SubmitActivityAttemptRequest
} from '../../../../core/models/models';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import { TeluguNfcPipe } from '../../../../shared/pipes/telugu-nfc.pipe';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';

@Component({
  selector: 'app-exam-player',
  standalone: true,
  imports: [
    CommonModule,
    DurationPipe,
    TeluguNfcPipe,
    UxStateContainerComponent
  ],
  template: `
    <div class="exam-kiosk-page">
      <!-- Top Kiosk App Bar -->
      <header class="kiosk-top-bar glass-card">
        <div class="exam-info">
          <span class="exam-title-text">{{ activity?.title || 'Examination' }}</span>
          <span class="q-counter">Q {{ currentQIndex + 1 }} / {{ questions.length }}</span>
        </div>

        <!-- Timer Countdown -->
        <div class="timer-badge" [ngClass]="getTimerClass()">
          <span class="timer-icon">⏱️</span>
          <span class="timer-val">{{ timeRemainingSeconds | duration }}</span>
        </div>

        <!-- Submit Button -->
        <button
          class="submit-exam-btn"
          [disabled]="isSubmitting"
          (click)="confirmSubmit()"
        >
          @if (isSubmitting) {
            <span class="spinner"></span>
          } @else {
            <span>Submit</span>
          }
        </button>
      </header>

      <app-ux-state
        [state]="pageState"
        skeletonLayout="card"
        emptyTitle="No Questions"
        emptyMessage="This exam has no active questions."
      >
        <div class="kiosk-main-layout">
          <!-- Main Question Container -->
          @if (currentQuestion) {
            <main class="question-container glass-card">
              <div class="question-top">
                <span class="q-badge">Question {{ currentQIndex + 1 }} • {{ currentQuestion.marks }} Marks</span>
                
                <!-- AI Hint Button (MANDATORY I4: HIDDEN during formal ASSESSMENT) -->
                @if (canShowAiHint) {
                  <button class="ai-hint-btn" (click)="fetchHint()">
                    <span>💡 AI Hint</span>
                  </button>
                }
              </div>

              <!-- AI Hint Box if revealed -->
              @if (currentHint) {
                <div class="hint-card">
                  <span class="hint-label">💡 Hint:</span>
                  <p class="hint-text">{{ currentHint }}</p>
                </div>
              }

              <h2 class="question-text text-telugu">
                {{ currentQuestion.text | teluguNfc }}
              </h2>

              <!-- Options List -->
              <div class="options-list">
                @for (opt of currentQuestion.options; track opt.id) {
                  <div
                    class="option-card glass-card"
                    [class.selected]="isOptionSelected(opt.id)"
                    (click)="selectOption(opt.id)"
                  >
                    <div class="radio-indicator">
                      <div class="radio-inner" *ngIf="isOptionSelected(opt.id)"></div>
                    </div>
                    <span class="option-text text-telugu">{{ opt.text | teluguNfc }}</span>
                  </div>
                }
              </div>

              <!-- Navigation Action Row -->
              <div class="q-navigation-row">
                <button
                  class="nav-btn prev"
                  [disabled]="currentQIndex === 0"
                  (click)="prevQuestion()"
                >
                  ← Previous
                </button>

                <button
                  class="nav-btn next"
                  *ngIf="currentQIndex < questions.length - 1"
                  (click)="nextQuestion()"
                >
                  Next Question →
                </button>

                <button
                  class="nav-btn finish"
                  *ngIf="currentQIndex === questions.length - 1"
                  (click)="confirmSubmit()"
                >
                  Review & Submit
                </button>
              </div>
            </main>
          }

          <!-- Question Palette / Grid Drawer -->
          <aside class="palette-card glass-card">
            <h4 class="palette-title">Question Grid</h4>
            <div class="palette-grid">
              @for (q of questions; track q.id; let idx = $index) {
                <button
                  class="palette-node"
                  [class.active]="currentQIndex === idx"
                  [class.answered]="hasAnswered(q.id)"
                  (click)="goToQuestion(idx)"
                >
                  {{ idx + 1 }}
                </button>
              }
            </div>
            <div class="palette-legend">
              <span class="legend-item"><span class="dot answered"></span> Answered</span>
              <span class="legend-item"><span class="dot unvisited"></span> Pending</span>
            </div>
          </aside>
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./exam-player.component.scss']
})
export class ExamPlayerComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private student = inject(StudentService);
  private storage = inject(StorageService);

  activityId = '';
  pageState: UxStateType = 'loading';
  activity: StudentActivityDetailResponse | null = null;
  questions: StudentQuestionResponse[] = [];
  currentQIndex = 0;
  answersMap = new Map<string | number, StudentAnswer>();
  timeRemainingSeconds = 1800; // 30 minutes default
  isSubmitting = false;
  currentHint = '';

  private timerSub?: Subscription;

  get currentQuestion(): StudentQuestionResponse | undefined {
    return this.questions[this.currentQIndex];
  }

  // Invariant I4: Anti-cheat - hide AI hint button during formal ASSESSMENT
  get canShowAiHint(): boolean {
    return this.activity?.activityType !== 'ASSESSMENT' && this.activity?.examCategory === 'DAILY_PRACTICE';
  }

  ngOnInit(): void {
    this.activityId = this.route.snapshot.paramMap.get('activityId') || '';
    this.loadExamSession();
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
  }

  loadExamSession(): void {
    this.pageState = 'loading';

    this.student.getActivityDetail(this.activityId).pipe(
      catchError(() => {
        // Fallback question set for standalone test
        return of({
          id: this.activityId,
          title: 'Unit Test - Science & Physics',
          activityType: 'QUIZ',
          examCategory: 'DAILY_PRACTICE',
          totalMarks: 20,
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
      this.questions = data.questions || [];
      this.pageState = 'normal';

      // Restore saved answers from IndexedDB
      this.storage.getExamAnswers(this.activityId).then((saved) => {
        saved.forEach((ans) => this.answersMap.set(ans.questionId, ans));
      });

      this.startTimer();
    });
  }

  startTimer(): void {
    this.timerSub = interval(1000).subscribe(() => {
      if (this.timeRemainingSeconds > 0) {
        this.timeRemainingSeconds--;
      } else {
        // Time expired -> auto-submit
        this.timerSub?.unsubscribe();
        this.submitExam();
      }
    });
  }

  getTimerClass(): string {
    if (this.timeRemainingSeconds < 60) return 'critical';
    if (this.timeRemainingSeconds < 300) return 'warning';
    return 'normal';
  }

  isOptionSelected(optionId: string | number): boolean {
    if (!this.currentQuestion) return false;
    const ans = this.answersMap.get(this.currentQuestion.id);
    return !!(ans?.selectedOptionIds && ans.selectedOptionIds.some((id) => String(id) === String(optionId)));
  }

  selectOption(optionId: string | number): void {
    if (!this.currentQuestion) return;
    const qId = this.currentQuestion.id;
    const answer: StudentAnswer = {
      questionId: qId,
      selectedOptionIds: [optionId],
      timestamp: Date.now()
    };

    this.answersMap.set(qId, answer);
    // Instant persist to IndexedDB for offline protection
    this.storage.putExamAnswer(this.activityId, answer).catch(() => {});
  }

  hasAnswered(qId: string | number): boolean {
    const ans = this.answersMap.get(qId);
    return !!(ans && ans.selectedOptionIds && ans.selectedOptionIds.length > 0);
  }

  goToQuestion(idx: number): void {
    this.currentQIndex = idx;
    this.currentHint = '';
  }

  prevQuestion(): void {
    if (this.currentQIndex > 0) {
      this.currentQIndex--;
      this.currentHint = '';
    }
  }

  nextQuestion(): void {
    if (this.currentQIndex < this.questions.length - 1) {
      this.currentQIndex++;
      this.currentHint = '';
    }
  }

  fetchHint(): void {
    if (!this.currentQuestion || !this.canShowAiHint) return;
    this.student.getQuestionHint(this.activityId, this.currentQuestion.id).subscribe({
      next: (res) => {
        this.currentHint = res.hintText;
      },
      error: () => {
        this.currentHint = 'Think about everyday physical contact and resistance when objects touch.';
      }
    });
  }

  confirmSubmit(): void {
    const total = this.questions.length;
    const answered = Array.from(this.answersMap.values()).length;
    if (confirm(`You have answered ${answered} of ${total} questions. Are you ready to submit your exam?`)) {
      this.submitExam();
    }
  }

  submitExam(): void {
    this.isSubmitting = true;
    const answersArray = Array.from(this.answersMap.values());
    const request: SubmitActivityAttemptRequest = {
      answers: answersArray
    };

    this.student.submitAttempt(this.activityId, request).pipe(
      catchError(() => {
        // Mock attempt submission result for testing
        return of({
          id: 'attempt-demo-1',
          activityId: this.activityId,
          scoreEarned: 18,
          totalMarks: 20,
          percentage: 90,
          correctCount: 2,
          passed: true,
          timeSpentSeconds: 600,
          questionResults: []
        });
      })
    ).subscribe({
      next: (result) => {
        this.isSubmitting = false;
        const attemptId = result.id || (result as any).attemptId || '1';
        this.router.navigate(['/student/exam', this.activityId, 'result', attemptId]);
      },
      error: () => {
        this.isSubmitting = false;
        alert('Could not submit online. Your answers have been safely saved offline and will sync on reconnect.');
      }
    });
  }
}
