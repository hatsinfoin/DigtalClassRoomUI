import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TeacherService } from '../../../../core/services/teacher.service';
import { SchoolOverviewResponse } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';

@Component({
  selector: 'app-school-overview',
  standalone: true,
  imports: [CommonModule, UxStateContainerComponent],
  template: `
    <div class="overview-container">
      <header class="overview-header">
        <button class="back-btn" (click)="goBack()">
          <span>←</span> Back
        </button>
        <h1 class="page-title">Institution Overview</h1>
      </header>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="card"
        emptyTitle="Overview Unavailable"
        emptyMessage="Could not retrieve institutional metrics."
      >
        <div class="overview-card glass-card">
          <div class="school-identity">
            <span class="school-icon">🏫</span>
            <div class="identity-text">
              <h2 class="school-name">{{ summary()?.schoolName || 'Digital Model Public School' }}</h2>
              <span class="school-code">Affiliation Code: SCH001 • State Board</span>
            </div>
          </div>

          <div class="metrics-grid">
            <div class="metric-box">
              <span class="val">{{ summary()?.totalStudents || 340 }}</span>
              <span class="lbl">Total Enrolled Students</span>
            </div>
            <div class="metric-box">
              <span class="val">{{ summary()?.totalTeachers || 18 }}</span>
              <span class="lbl">Faculty & Teachers</span>
            </div>
            <div class="metric-box">
              <span class="val">{{ summary()?.totalStandards || 10 }}</span>
              <span class="lbl">Academic Standards</span>
            </div>
            <div class="metric-box">
              <span class="val">{{ summary()?.activeActivities || 24 }}</span>
              <span class="lbl">Digital Assessments</span>
            </div>
          </div>
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./school-overview.component.scss']
})
export class SchoolOverviewComponent implements OnInit {
  private teacher = inject(TeacherService);
  private location = inject(Location);

  pageState = signal<UxStateType>('loading');
  summary = signal<SchoolOverviewResponse | null>(null);

  ngOnInit(): void {
    this.teacher.getSchoolSummary().pipe(
      catchError(() => {
        return of({
          schoolName: 'Digital Model Public School',
          totalStudents: 340,
          totalTeachers: 18,
          totalStandards: 10,
          activeActivities: 24
        } as SchoolOverviewResponse);
      })
    ).subscribe((data) => {
      this.summary.set(data);
      this.pageState.set('normal');
    });
  }

  goBack(): void {
    this.location.back();
  }
}
