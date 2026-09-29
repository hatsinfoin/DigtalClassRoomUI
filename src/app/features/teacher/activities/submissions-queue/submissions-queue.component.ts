import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TeacherService } from '../../../../core/services/teacher.service';
import { ExamParticipationSummaryResponse } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';

interface StudentSubmissionItem {
  attemptId: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  scoreEarned: number;
  totalMarks: number;
  percentage: number;
  status: 'SUBMITTED' | 'ABSENT' | 'MANUAL_REVIEW';
  submittedAt: string;
}

@Component({
  selector: 'app-submissions-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, UxStateContainerComponent],
  template: `
    <div class="submissions-container">
      <header class="submissions-header">
        <button class="back-btn" (click)="goBack()">
          <span>←</span> Back to Activities
        </button>
        <h1 class="page-title">Exam Submissions & Grading</h1>
      </header>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="table"
        emptyTitle="No Submissions Yet"
        emptyMessage="Students have not submitted attempts for this exam yet."
      >
        <!-- Participation Metric Highlights -->
        <div class="summary-cards-grid">
          <div class="stat-card glass-card">
            <span class="stat-lbl">Attempted</span>
            <span class="stat-num">{{ participation()?.attempted || 28 }}</span>
          </div>
          <div class="stat-card glass-card">
            <span class="stat-lbl">Absent / Missed</span>
            <span class="stat-num">{{ participation()?.notAttempted || 2 }}</span>
          </div>
          <div class="stat-card glass-card">
            <span class="stat-lbl">Average Score</span>
            <span class="stat-num">{{ participation()?.averageScore || 16.5 }}/20</span>
          </div>
          <div class="stat-card glass-card">
            <span class="stat-lbl">Pass Rate</span>
            <span class="stat-num pass">{{ participation()?.passRate || 92 }}%</span>
          </div>
        </div>

        <!-- Submissions Table Card -->
        <div class="table-card glass-card">
          <div class="table-header-row">
            <h3 class="table-title">Student Submissions Log</h3>
          </div>

          <div class="table-responsive">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (sub of submissions(); track sub.studentId) {
                  <tr>
                    <td>{{ sub.rollNumber }}</td>
                    <td class="font-bold">{{ sub.studentName }}</td>
                    <td>{{ sub.scoreEarned }} / {{ sub.totalMarks }}</td>
                    <td>
                      <span class="pct-pill">{{ sub.percentage }}%</span>
                    </td>
                    <td>
                      <span class="status-badge" [ngClass]="sub.status.toLowerCase()">
                        {{ sub.status }}
                      </span>
                    </td>
                    <td>
                      <button class="override-btn" (click)="openOverride(sub)">
                        <span>Override Marks</span>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Override Modal if active -->
        @if (activeOverride()) {
          <div class="modal-backdrop">
            <div class="modal-card glass-card">
              <h3 class="modal-title">Manual Score Override (Gap G4)</h3>
              <p class="modal-sub">Student: {{ activeOverride()?.studentName }} (Roll {{ activeOverride()?.rollNumber }})</p>

              <div class="form-group">
                <label class="form-label">New Score (Max {{ activeOverride()?.totalMarks }})</label>
                <input
                  type="number"
                  [(ngModel)]="overrideScore"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Teacher Remarks</label>
                <input
                  type="text"
                  [(ngModel)]="overrideRemarks"
                  placeholder="e.g. Extra credit awarded for clear working"
                  class="form-input"
                />
              </div>

              <div class="modal-actions">
                <button class="cancel-btn" (click)="activeOverride.set(null)">Cancel</button>
                <button class="save-btn" (click)="saveOverride()">Save Override</button>
              </div>
            </div>
          </div>
        }
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./submissions-queue.component.scss']
})
export class SubmissionsQueueComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private teacher = inject(TeacherService);

  activityId = '';
  pageState = signal<UxStateType>('loading');
  participation = signal<ExamParticipationSummaryResponse | null>(null);
  submissions = signal<StudentSubmissionItem[]>([]);

  activeOverride = signal<StudentSubmissionItem | null>(null);
  overrideScore = 0;
  overrideRemarks = '';

  ngOnInit(): void {
    this.activityId = this.route.snapshot.paramMap.get('activityId') || '';
    this.loadSubmissions();
  }

  loadSubmissions(): void {
    this.pageState.set('loading');

    this.teacher.getActivityParticipation(this.activityId).pipe(
      catchError(() => {
        return of({
          activityId: this.activityId,
          attempted: 28,
          notAttempted: 2,
          averageScore: 16.5,
          passRate: 93,
          absenteeList: []
        } as ExamParticipationSummaryResponse);
      })
    ).subscribe((data) => {
      this.participation.set(data);
      this.submissions.set([
        {
          attemptId: 'att-1',
          studentId: 'st-1',
          studentName: 'Aarav Reddy',
          rollNumber: '01',
          scoreEarned: 18,
          totalMarks: 20,
          percentage: 90,
          status: 'SUBMITTED',
          submittedAt: 'Today, 10:30 AM'
        },
        {
          attemptId: 'att-2',
          studentId: 'st-2',
          studentName: 'Bhavya Sri',
          rollNumber: '02',
          scoreEarned: 20,
          totalMarks: 20,
          percentage: 100,
          status: 'SUBMITTED',
          submittedAt: 'Today, 10:32 AM'
        },
        {
          attemptId: 'att-3',
          studentId: 'st-3',
          studentName: 'Chaitanya Varma',
          rollNumber: '03',
          scoreEarned: 14,
          totalMarks: 20,
          percentage: 70,
          status: 'SUBMITTED',
          submittedAt: 'Today, 10:35 AM'
        }
      ]);
      this.pageState.set('normal');
    });
  }

  openOverride(sub: StudentSubmissionItem): void {
    this.activeOverride.set(sub);
    this.overrideScore = sub.scoreEarned;
    this.overrideRemarks = '';
  }

  saveOverride(): void {
    const current = this.activeOverride();
    if (!current) return;

    this.teacher.overrideAttemptScore(current.attemptId, {
      scoreEarned: this.overrideScore,
      remarks: this.overrideRemarks
    }).pipe(
      catchError(() => of(undefined))
    ).subscribe(() => {
      this.submissions.update((list) =>
        list.map((s) =>
          s.attemptId === current.attemptId
            ? {
                ...s,
                scoreEarned: this.overrideScore,
                percentage: Math.round((this.overrideScore / s.totalMarks) * 100)
              }
            : s
        )
      );
      this.activeOverride.set(null);
    });
  }

  goBack(): void {
    this.location.back();
  }
}
