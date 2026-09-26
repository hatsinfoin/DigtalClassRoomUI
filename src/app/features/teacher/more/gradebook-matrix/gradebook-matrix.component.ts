import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TeacherService } from '../../../../core/services/teacher.service';
import { SectionGradebookResponse } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';

@Component({
  selector: 'app-gradebook-matrix',
  standalone: true,
  imports: [CommonModule, FormsModule, UxStateContainerComponent],
  template: `
    <div class="gradebook-container">
      <header class="gradebook-header">
        <button class="back-btn" (click)="goBack()">
          <span>←</span> Back
        </button>
        <div class="header-content">
          <h1 class="page-title">Gradebook Matrix</h1>
          <p class="page-subtitle">Interactive Student vs Assessment Marks Spreadsheet</p>
        </div>
        <button class="export-btn" (click)="exportCsv()">
          <span>📥 Export CSV (UTF-8 BOM)</span>
        </button>
      </header>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="table"
        emptyTitle="No Gradebook Records"
        emptyMessage="Select a standard and subject to view the matrix."
      >
        <div class="matrix-table-card glass-card">
          <div class="table-responsive">
            <table class="gradebook-table">
              <thead>
                <tr>
                  <th class="sticky-col">Roll No</th>
                  <th class="sticky-col-2">Student Name</th>
                  @for (col of (gradebook()?.columns || defaultCols); track col.activityId) {
                    <th class="exam-col">
                      <span class="col-title">{{ col.activityTitle }}</span>
                      <span class="col-marks">({{ col.totalMarks }}M)</span>
                    </th>
                  }
                  <th class="avg-col">Overall %</th>
                </tr>
              </thead>
              <tbody>
                @for (row of (gradebook()?.rows || defaultRows); track row.studentId) {
                  <tr>
                    <td class="sticky-col">{{ row.rollNumber }}</td>
                    <td class="sticky-col-2 font-bold">{{ row.studentName }}</td>
                    @for (score of row.scores; track $index) {
                      <td class="score-cell" [class.high]="score >= 18" [class.low]="score < 10">
                        {{ score !== null ? score : '-' }}
                      </td>
                    }
                    <td class="avg-cell">
                      <span class="pct-chip">{{ row.overallPercentage }}%</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./gradebook-matrix.component.scss']
})
export class GradebookMatrixComponent implements OnInit {
  private teacher = inject(TeacherService);
  private location = inject(Location);

  pageState = signal<UxStateType>('loading');
  gradebook = signal<SectionGradebookResponse | null>(null);

  defaultCols = [
    { activityId: 'a1', activityTitle: 'Unit 1 Quiz', totalMarks: 20 },
    { activityId: 'a2', activityTitle: 'Weekly Check 2', totalMarks: 20 },
    { activityId: 'a3', activityTitle: 'Monthly Test', totalMarks: 50 }
  ];

  defaultRows = [
    { studentId: 's1', rollNumber: '01', studentName: 'Aarav Reddy', scores: [18, 19, 45], overallPercentage: 91 },
    { studentId: 's2', rollNumber: '02', studentName: 'Bhavya Sri', scores: [20, 20, 48], overallPercentage: 98 },
    { studentId: 's3', rollNumber: '03', studentName: 'Chaitanya Varma', scores: [14, 15, 38], overallPercentage: 74 },
    { studentId: 's4', rollNumber: '04', studentName: 'Deepika Rao', scores: [16, 17, 42], overallPercentage: 83 }
  ];

  ngOnInit(): void {
    this.loadGradebook();
  }

  loadGradebook(): void {
    this.pageState.set('loading');

    this.teacher.getGradebook('5', 'A', 'subj-1').pipe(
      catchError(() => {
        return of({
          columns: this.defaultCols,
          rows: this.defaultRows
        } as SectionGradebookResponse);
      })
    ).subscribe((data) => {
      this.gradebook.set(data);
      this.pageState.set('normal');
    });
  }

  exportCsv(): void {
    const csvHeader = '\uFEFF' + 'Roll No,Student Name,Unit 1 Quiz (20M),Weekly Check 2 (20M),Monthly Test (50M),Overall %\n';
    const rows = this.gradebook()?.rows || this.defaultRows;
    const csvRows = rows.map(
      (r) => `${r.rollNumber},"${r.studentName}",${r.scores.join(',')},${r.overallPercentage}%`
    ).join('\n');
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Gradebook_Std5_SecA.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  goBack(): void {
    this.location.back();
  }
}
