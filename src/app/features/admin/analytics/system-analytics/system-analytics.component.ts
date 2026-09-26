import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SchoolResponse } from '../../../../core/models/models';
import { UxStateContainerComponent, PageState } from '../../../../shared/components/ux-state-container/ux-state-container.component';

interface StandardPerformance {
  standard: string;
  passRate: number;
  avgScore: number;
  totalStudents: number;
}

interface SubjectPerformance {
  subject: string;
  avgMastery: number;
  activeCount: number;
}

@Component({
  selector: 'app-system-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, UxStateContainerComponent],
  template: `
    <div class="admin-page-container">
      <div class="page-header">
        <div class="title-group">
          <h1>Institutional Performance Analytics</h1>
          <p>Holistic campus learning metrics, standard pass rates, and subject mastery distributions</p>
        </div>

        <select class="school-select" [(ngModel)]="selectedSchoolId" (change)="loadAnalytics()">
          @for (s of schools; track s.id) {
            <option [value]="s.id">{{ s.name }} ({{ s.code }})</option>
          }
        </select>
      </div>

      <app-ux-state
        [state]="pageState"
        emptyMessage="No analytics data available for this institution."
        (retry)="loadAnalytics()"
      >
        <!-- KPI Cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon">👥</div>
            <div class="kpi-details">
              <span>Total Enrolled Pupils</span>
              <h2>{{ totalStudents }}</h2>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon">👨‍🏫</div>
            <div class="kpi-details">
              <span>Teaching Faculty</span>
              <h2>{{ totalTeachers }}</h2>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon">🎒</div>
            <div class="kpi-details">
              <span>Class Standards</span>
              <h2>{{ totalStandards }}</h2>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon">📈</div>
            <div class="kpi-details">
              <span>Average Institution GPA</span>
              <h2 style="color: #00D9A3;">{{ avgGpa.toFixed(2) }} / 10</h2>
            </div>
          </div>
        </div>

        <!-- Analytics Charts Grid -->
        <div class="analytics-charts-grid">
          <!-- Standard-by-Standard Performance -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>Standards Pass & Mastery Rates</h3>
            </div>
            <div class="perf-bar-list">
              @for (item of standardData; track item.standard) {
                <div class="perf-bar-item">
                  <div class="bar-label-row">
                    <span>{{ item.standard }} ({{ item.totalStudents }} pupils)</span>
                    <strong>{{ item.passRate }}% Pass</strong>
                  </div>
                  <div class="progress-track">
                    <div
                      class="progress-fill"
                      [style.width.%]="item.passRate"
                      [style.background]="getBarColor(item.passRate)"
                    ></div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Subject Mastery Distribution -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>Curriculum Subject Mastery</h3>
            </div>
            <div class="perf-bar-list">
              @for (sub of subjectData; track sub.subject) {
                <div class="perf-bar-item">
                  <div class="bar-label-row">
                    <span>{{ sub.subject }}</span>
                    <strong>{{ sub.avgMastery }}% Avg</strong>
                  </div>
                  <div class="progress-track">
                    <div
                      class="progress-fill"
                      [style.width.%]="sub.avgMastery"
                      [style.background]="getBarColor(sub.avgMastery)"
                    ></div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./system-analytics.component.scss']
})
export class SystemAnalyticsComponent implements OnInit {
  private adminService = inject(AdminService);
  private auth = inject(AuthService);

  pageState: PageState = 'loading';
  schools: SchoolResponse[] = [];
  selectedSchoolId = '';

  totalStudents = 485;
  totalTeachers = 28;
  totalStandards = 10;
  avgGpa = 8.42;

  standardData: StandardPerformance[] = [];
  subjectData: SubjectPerformance[] = [];

  ngOnInit(): void {
    this.adminService.getSchools().subscribe(s => {
      this.schools = s || [];
      this.selectedSchoolId = String(this.auth.currentUser()?.schoolId || this.schools[0]?.id || 'school-1');
      this.loadAnalytics();
    });
  }

  loadAnalytics(): void {
    this.pageState = 'loading';
    setTimeout(() => {
      this.standardData = [
        { standard: 'Standard 10 (10వ తరగతి)', passRate: 94, avgScore: 88, totalStudents: 62 },
        { standard: 'Standard 9 (9వ తరగతి)', passRate: 88, avgScore: 82, totalStudents: 58 },
        { standard: 'Standard 8 (8వ తరగతి)', passRate: 91, avgScore: 84, totalStudents: 54 },
        { standard: 'Standard 7 (7వ తరగతి)', passRate: 85, avgScore: 79, totalStudents: 50 },
        { standard: 'Standard 6 (6వ తరగతి)', passRate: 92, avgScore: 86, totalStudents: 48 }
      ];

      this.subjectData = [
        { subject: 'Mathematics (గణితం)', avgMastery: 82, activeCount: 120 },
        { subject: 'General Science (సైన్స్)', avgMastery: 89, activeCount: 110 },
        { subject: 'Telugu Language (తెలుగు)', avgMastery: 95, activeCount: 135 },
        { subject: 'English (ఆంగ్లం)', avgMastery: 78, activeCount: 115 },
        { subject: 'Social Studies (సాంఘిక శాస్త్రం)', avgMastery: 86, activeCount: 105 }
      ];

      this.pageState = 'normal';
    }, 400);
  }

  getBarColor(rate: number): string {
    if (rate >= 85) return 'linear-gradient(90deg, #00D9A3, #38EF7D)';
    if (rate >= 70) return 'linear-gradient(90deg, #F59E0B, #FFD200)';
    return 'linear-gradient(90deg, #FF6B6B, #FC5C7D)';
  }
}
