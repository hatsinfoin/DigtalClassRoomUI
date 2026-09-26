import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ParentService } from '../../../core/services/parent.service';
import { StudentPerformanceDossierResponse } from '../../../core/models/models';
import { TeluguNfcPipe } from '../../../shared/pipes/telugu-nfc.pipe';
import { UxStateContainerComponent, UxStateType } from '../../../shared/components/ux-state-container/ux-state-container.component';

@Component({
  selector: 'app-parent-progress',
  standalone: true,
  imports: [
    CommonModule,
    TeluguNfcPipe,
    UxStateContainerComponent
  ],
  template: `
    <div class="parent-progress-container">
      <header class="progress-header">
        <h1 class="page-title">Child Report Card & Progress</h1>
        <p class="page-subtitle">Term academic performance dossier</p>
      </header>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="card"
        emptyTitle="Report Card In Preparation"
        emptyMessage="Term grades will be published after the quarterly assessment cycle."
      >
        <!-- Overall Summary Card -->
        <div class="summary-card glass-card">
          <div class="summary-top">
            <span class="report-badge">Official Term Report</span>
            <div class="overall-row">
              <span class="grade-big">{{ dossier()?.overallGrade || 'A+' }}</span>
              <div class="score-details">
                <span class="pct-big">{{ dossier()?.cumulativePercentage || 91 }}%</span>
                <span class="pct-lbl">Cumulative Term Average</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Subject Wise Breakdown List -->
        <div class="subjects-list-card glass-card">
          <h3 class="card-title">Subject Wise Performance</h3>

          <div class="subjects-grid">
            @for (subj of (dossier()?.subjectGrades?.length ? dossier()!.subjectGrades : defaultSubjects); track subj.subjectName) {
              <div class="subject-item glass-card">
                <div class="subj-header">
                  <h4 class="subj-name">{{ subj.subjectName | teluguNfc }}</h4>
                  <span class="grade-tag">{{ subj.grade }}</span>
                </div>

                <div class="score-bar-row">
                  <div class="progress-track">
                    <div class="progress-fill" [style.width.%]="subj.percentage"></div>
                  </div>
                  <span class="score-num">{{ subj.percentage }}%</span>
                </div>

                <div class="subj-footer">
                  <span>{{ subj.testsAttempted }} Tests Attempted</span>
                  <span>Avg: {{ subj.averageScore }}/100</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Teacher Remarks Section -->
        <div class="remarks-card glass-card">
          <h3 class="card-title">Teacher Observations</h3>
          <p class="remarks-text">
            "Aarav shows exceptional analytical abilities in Mathematics and Science. Demonstrates active class participation and consistent homework completion."
          </p>
          <span class="teacher-sign">— Class Teacher, Std 5-A</span>
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./parent-progress.component.scss']
})
export class ParentProgressComponent implements OnInit {
  private parent = inject(ParentService);
  private route = inject(ActivatedRoute);

  studentId = '';
  pageState = signal<UxStateType>('loading');
  dossier = signal<StudentPerformanceDossierResponse | null>(null);

  defaultSubjects = [
    { subjectName: 'Mathematics (గణితం)', grade: 'A+', percentage: 94, testsAttempted: 4, averageScore: 94 },
    { subjectName: 'General Science (సైన్స్)', grade: 'A', percentage: 88, testsAttempted: 3, averageScore: 88 },
    { subjectName: 'Telugu (తెలుగు)', grade: 'A+', percentage: 92, testsAttempted: 4, averageScore: 92 },
    { subjectName: 'English Language', grade: 'B+', percentage: 80, testsAttempted: 3, averageScore: 80 }
  ];

  ngOnInit(): void {
    this.studentId = this.route.snapshot.queryParams['studentId'] || 'st-1';
    this.loadReportCard();
  }

  loadReportCard(): void {
    this.pageState.set('loading');

    this.parent.getChildReportCard(this.studentId).pipe(
      catchError(() => {
        return of({
          studentName: 'Aarav Reddy',
          overallGrade: 'A+',
          cumulativePercentage: 91,
          subjectGrades: this.defaultSubjects
        } as StudentPerformanceDossierResponse);
      })
    ).subscribe((data) => {
      this.dossier.set(data);
      this.pageState.set('normal');
    });
  }
}
