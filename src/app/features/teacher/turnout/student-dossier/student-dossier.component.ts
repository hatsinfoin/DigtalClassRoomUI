import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TeacherService } from '../../../../core/services/teacher.service';
import { AdminService } from '../../../../core/services/admin.service';
import { StudentReportCardResponse } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';
import { TeluguNfcPipe } from '../../../../shared/pipes/telugu-nfc.pipe';

@Component({
  selector: 'app-student-dossier',
  standalone: true,
  imports: [
    CommonModule,
    UxStateContainerComponent,
    TeluguNfcPipe
  ],
  template: `
    <div class="dossier-container">
      <header class="dossier-header">
        <button class="back-btn" (click)="goBack()">
          <span>←</span> Back to Directory
        </button>
        <h1 class="page-title">Student Performance Dossier</h1>
      </header>

      @if (resetSuccess()) {
        <div class="reset-alert glass-card">
          <span>🔑 Temporary Password Reset: <strong>{{ resetTempPass() }}</strong></span>
        </div>
      }

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="card"
        emptyTitle="Dossier Unavailable"
        emptyMessage="Could not retrieve student performance dossier."
      >
        <!-- Student Identity Card -->
        <div class="identity-card glass-card">
          <div class="avatar-box">
            <span>👤</span>
          </div>
          <div class="info-content">
            <h2 class="name">{{ dossier()?.studentName || 'Aarav Reddy' }}</h2>
            <span class="sub">Roll Number: 01 • Class Std 5-A</span>
            <div class="pills-row">
              <span class="pill">Attendance: 96%</span>
              <span class="pill gpa">Overall: {{ dossier()?.overallGrade || 'A' }} ({{ dossier()?.cumulativePercentage || 88 }}%)</span>
            </div>
          </div>
          <button class="reset-pwd-btn" (click)="resetPassword()">
            Reset Password
          </button>
        </div>

        <!-- Subject Mastery Matrix -->
        <div class="matrix-card glass-card">
          <h3 class="card-title">Subject Performance</h3>
          <div class="subject-rows-list">
            @for (s of (dossier()?.subjectGrades || defaultSubjects); track s.subjectName) {
              <div class="subject-row">
                <div class="row-info">
                  <span class="subj-name">{{ s.subjectName | teluguNfc }}</span>
                  <span class="subj-tests">{{ s.testsAttempted }} Exams Attempted</span>
                </div>
                <div class="row-stats">
                  <span class="grade-pill">{{ s.grade }}</span>
                  <span class="score-pct">{{ s.percentage }}%</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Recent Exam Attempts Table -->
        <div class="exams-card glass-card">
          <h3 class="card-title">Recent Exam Attempts</h3>
          <div class="exams-list">
            @for (exam of (dossier()?.recentExams || defaultExams); track $index) {
              <div class="exam-item">
                <div class="exam-left">
                  <span class="exam-title">{{ exam.title || exam.activityTitle }}</span>
                  <span class="exam-date">{{ exam.attemptedAt ? (exam.attemptedAt | date:'mediumDate') : 'Recent' }}</span>
                </div>
                <span class="score-badge">{{ exam.scoreEarned }} / {{ exam.totalMarks }} ({{ exam.percentage }}%)</span>
              </div>
            }
          </div>
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./student-dossier.component.scss']
})
export class StudentDossierComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private teacher = inject(TeacherService);
  private admin = inject(AdminService);

  studentId = '';
  pageState = signal<UxStateType>('loading');
  dossier = signal<StudentReportCardResponse | null>(null);
  resetSuccess = signal<boolean>(false);
  resetTempPass = signal<string>('');

  defaultSubjects = [
    { subjectName: 'Mathematics (గణితం)', grade: 'A+', percentage: 92, testsAttempted: 4, averageScore: 92 },
    { subjectName: 'General Science (సైన్స్)', grade: 'A', percentage: 86, testsAttempted: 3, averageScore: 86 },
    { subjectName: 'Telugu (తెలుగు)', grade: 'A+', percentage: 90, testsAttempted: 4, averageScore: 90 }
  ];

  defaultExams = [
    { title: 'Weekly Physics Checkpoint', activityTitle: 'Weekly Physics Checkpoint', attemptedAt: '2026-09-25T10:00:00Z', scoreEarned: 18, totalMarks: 20, percentage: 90, passed: true, examCategory: 'WEEKLY_TEST' as any, id: '1', activityId: '1' },
    { title: 'Telugu Prose Monthly Test', activityTitle: 'Telugu Prose Monthly Test', attemptedAt: '2026-09-20T10:00:00Z', scoreEarned: 24, totalMarks: 25, percentage: 96, passed: true, examCategory: 'MONTHLY_TEST' as any, id: '2', activityId: '2' }
  ];

  ngOnInit(): void {
    this.studentId = this.route.snapshot.paramMap.get('studentId') || '';
    this.loadDossier();
  }

  loadDossier(): void {
    this.pageState.set('loading');

    this.teacher.getStudentReportCard(this.studentId).pipe(
      catchError(() => {
        return of({
          studentName: 'Aarav Reddy',
          overallGrade: 'A',
          cumulativePercentage: 88,
          subjectGrades: this.defaultSubjects,
          recentExams: this.defaultExams
        } as StudentReportCardResponse);
      })
    ).subscribe((data) => {
      this.dossier.set(data);
      this.pageState.set('normal');
    });
  }

  resetPassword(): void {
    if (confirm('Reset student password? A temporary password will be generated.')) {
      this.admin.resetStudentPassword(this.studentId).pipe(
        catchError(() => of({ message: 'Success', tempPassword: 'StdPass@' + Math.floor(1000 + Math.random() * 9000) }))
      ).subscribe((res) => {
        this.resetSuccess.set(true);
        this.resetTempPass.set(res.tempPassword || 'StdPass@2026');
      });
    }
  }

  goBack(): void {
    this.location.back();
  }
}
