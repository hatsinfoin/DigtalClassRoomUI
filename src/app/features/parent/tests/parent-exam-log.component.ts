import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ParentService } from '../../../core/services/parent.service';
import { ExamHistoryItem } from '../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../shared/components/ux-state-container/ux-state-container.component';

@Component({
  selector: 'app-parent-exam-log',
  standalone: true,
  imports: [CommonModule, UxStateContainerComponent],
  template: `
    <div class="exam-log-container">
      <header class="log-header">
        <h1 class="page-title">Assessment & Test History</h1>
        <p class="page-subtitle">Timeline of all weekly, monthly, and quarterly tests</p>
      </header>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="list"
        emptyTitle="No Tests Recorded"
        emptyMessage="Test attempts will appear here after completion."
      >
        <div class="exams-timeline">
          @for (exam of (exams()?.length ? exams() : defaultExams); track exam.attemptId || $index) {
            <div class="timeline-item glass-card">
              <div class="timeline-left">
                <span class="exam-cat-pill">{{ formatCategory(exam.examCategory) }}</span>
                <h3 class="exam-title">{{ exam.title }}</h3>
                <span class="exam-date">🗓️ {{ exam.date }} • Subject: {{ exam.subjectName }}</span>
              </div>

              <div class="timeline-right">
                <span class="score-display">{{ exam.scoreEarned }} / {{ exam.totalMarks }}</span>
                <span class="pct-badge" [class.pass]="exam.passed">{{ exam.percentage }}%</span>
              </div>
            </div>
          }
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./parent-exam-log.component.scss']
})
export class ParentExamLogComponent implements OnInit {
  private parent = inject(ParentService);
  private route = inject(ActivatedRoute);

  studentId = '';
  pageState = signal<UxStateType>('loading');
  exams = signal<ExamHistoryItem[]>([]);

  defaultExams: ExamHistoryItem[] = [
    {
      attemptId: 'att-1',
      title: 'Physics Forces & Energy Quiz',
      subjectName: 'Science',
      examCategory: 'WEEKLY_TEST',
      scoreEarned: 18,
      totalMarks: 20,
      percentage: 90,
      passed: true,
      date: 'Sep 24, 2026'
    },
    {
      attemptId: 'att-2',
      title: 'Telugu Prose Monthly Examination',
      subjectName: 'Telugu',
      examCategory: 'MONTHLY_TEST',
      scoreEarned: 45,
      totalMarks: 50,
      percentage: 90,
      passed: true,
      date: 'Sep 20, 2026'
    },
    {
      attemptId: 'att-3',
      title: 'Mathematics Fractions & Geometry Test',
      subjectName: 'Mathematics',
      examCategory: 'QUARTERLY_EXAM',
      scoreEarned: 48,
      totalMarks: 50,
      percentage: 96,
      passed: true,
      date: 'Sep 15, 2026'
    }
  ];

  ngOnInit(): void {
    this.studentId = this.route.snapshot.queryParams['studentId'] || 'st-1';
    this.loadExams();
  }

  loadExams(): void {
    this.pageState.set('loading');

    this.parent.getChildExamHistory(this.studentId).pipe(
      catchError(() => {
        return of(this.defaultExams);
      })
    ).subscribe((data) => {
      this.exams.set(data);
      this.pageState.set('normal');
    });
  }

  formatCategory(cat?: string): string {
    return (cat || 'EXAM').replace(/_/g, ' ');
  }
}
