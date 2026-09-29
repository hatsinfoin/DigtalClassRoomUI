import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminService } from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SchoolResponse, SchoolOverviewResponse, StandardMetricItem, SubjectMetricItem } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';

export interface StandardPerformance {
  standard: string;
  passRate: number;
  avgScore: number;
  totalStudents: number;
  distinctAttempted: number;
  participationRate: number;
}

export interface SubjectPerformance {
  subject: string;
  avgMastery: number;
  passRate: number;
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

        <div class="header-actions">
          <select
            class="school-select"
            [ngModel]="selectedSchoolId()"
            (ngModelChange)="onSchoolSelect($event)"
            [disabled]="!isPlatformAdmin() && schools().length <= 1"
            title="Institutional Campus"
          >
            @for (s of schools(); track s.id) {
              <option [value]="s.id">{{ s.name }}@if (s.code || s.schoolCode) { ({{ s.code || s.schoolCode }}) }</option>
            }
          </select>
          <button class="btn-refresh" (click)="loadAnalytics()" title="Refresh Analytics">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <app-ux-state
        [state]="pageState()"
        emptyMessage="No analytics data available for this institution."
        (onRetry)="loadAnalytics()"
      >
        <!-- KPI Cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon pupils-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div class="kpi-details">
              <span>Total Enrolled Pupils</span>
              <h2>{{ totalStudents() }}</h2>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon faculty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
              </svg>
            </div>
            <div class="kpi-details">
              <span>Teaching Faculty</span>
              <h2>{{ totalTeachers() }}</h2>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon standards-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <div class="kpi-details">
              <span>Class Standards</span>
              <h2>{{ totalStandards() }}</h2>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon gpa-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00D9A3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                <polyline points="16 7 22 7 22 13"></polyline>
              </svg>
            </div>
            <div class="kpi-details">
              <span>Average Institution GPA</span>
              <h2 style="color: #00D9A3;">{{ avgGpa().toFixed(2) }} / 10</h2>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon attempts-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
            </div>
            <div class="kpi-details">
              <span>Total Exam Submissions</span>
              <h2>{{ totalAttempts() }}</h2>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon pass-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A855F7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8" r="7"></circle>
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
              </svg>
            </div>
            <div class="kpi-details">
              <span>Overall Pass Rate</span>
              <h2 style="color: #A855F7;">{{ schoolPassPercentage().toFixed(1) }}%</h2>
            </div>
          </div>
        </div>

        <!-- Analytics Charts Grid -->
        <div class="analytics-charts-grid">
          <!-- Standard-by-Standard Performance -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>Standards Pass & Mastery Rates</h3>
              <span class="badge">{{ standardData().length }} Standards</span>
            </div>
            <div class="perf-bar-list">
              @if (standardData().length === 0) {
                <div class="empty-list-notice">
                  <p>No standard exam data recorded yet.</p>
                </div>
              }
              @for (item of standardData(); track item.standard) {
                <div class="perf-bar-item">
                  <div class="bar-label-row">
                    <span class="label-name">{{ item.standard }} ({{ item.totalStudents }} pupils)</span>
                    <span class="label-stats">
                      <strong>{{ item.passRate.toFixed(1) }}% Pass</strong>
                      <small class="avg-sub">({{ item.avgScore.toFixed(1) }}% Avg)</small>
                    </span>
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
              <span class="badge">{{ subjectData().length }} Subjects</span>
            </div>
            <div class="perf-bar-list">
              @if (subjectData().length === 0) {
                <div class="empty-list-notice">
                  <p>No subject performance data recorded yet.</p>
                </div>
              }
              @for (sub of subjectData(); track sub.subject) {
                <div class="perf-bar-item">
                  <div class="bar-label-row">
                    <span class="label-name">{{ sub.subject }}</span>
                    <span class="label-stats">
                      <strong>{{ sub.avgMastery.toFixed(1) }}% Avg</strong>
                      <small class="avg-sub">({{ sub.activeCount }} attempts)</small>
                    </span>
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

  isPlatformAdmin = computed(() => this.auth.isPlatformAdmin());

  pageState = signal<UxStateType>('loading');
  schools = signal<SchoolResponse[]>([]);
  selectedSchoolId = signal<string>('');

  totalStudents = signal<number>(0);
  totalTeachers = signal<number>(0);
  totalStandards = signal<number>(0);
  avgGpa = signal<number>(0);
  totalAttempts = signal<number>(0);
  schoolPassPercentage = signal<number>(0);

  standardData = signal<StandardPerformance[]>([]);
  subjectData = signal<SubjectPerformance[]>([]);

  ngOnInit(): void {
    this.initializeSchoolScope();
  }

  initializeSchoolScope(): void {
    const isPlatform = this.auth.isPlatformAdmin();
    const userSchoolId = this.auth.getSchoolId() || this.auth.currentUser()?.schoolId || '';

    if (!isPlatform && userSchoolId) {
      // Role_Admin: Query ONLY their specific school and load its analytics directly
      this.adminService.getSchool(userSchoolId).pipe(
        catchError(err => {
          console.warn('[SystemAnalytics] getSchool by ID failed, trying getSchools with filter:', err);
          return this.adminService.getSchools();
        })
      ).subscribe((res: any) => {
        let list: SchoolResponse[] = [];
        if (Array.isArray(res)) {
          list = res.filter(s =>
            String(s.id) === String(userSchoolId) ||
            String((s as any)._id) === String(userSchoolId) ||
            String(s.code) === String(userSchoolId) ||
            String(s.schoolCode) === String(userSchoolId)
          );
        } else if (res && (res.id || (res as any)._id || res.schoolCode || res.name)) {
          list = [res as SchoolResponse];
        }

        if (list.length === 0) {
          const profile = this.auth.currentUser();
          list = [{
            id: userSchoolId,
            name: profile?.schoolName || 'Institutional Campus',
            code: '',
            schoolCode: '',
            address: '',
            city: '',
            state: ''
          } as SchoolResponse];
        }

        this.schools.set(list);
        this.selectedSchoolId.set(String(userSchoolId));
        this.loadAnalytics();
      });
    } else {
      // Platform / Super Admin: load all institutions
      this.adminService.getSchools().pipe(
        catchError(() => of([]))
      ).subscribe(sList => {
        const list = sList && sList.length > 0 ? sList : [];
        this.schools.set(list);
        const initialSchool = userSchoolId || list[0]?.id || '';
        if (initialSchool) {
          this.selectedSchoolId.set(String(initialSchool));
          this.loadAnalytics();
        } else {
          this.pageState.set('empty');
        }
      });
    }
  }

  onSchoolSelect(id: string): void {
    this.selectedSchoolId.set(id);
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.pageState.set('loading');
    const schoolId = this.selectedSchoolId() || this.auth.getSchoolId() || this.auth.currentUser()?.schoolId || '';

    this.adminService.getSchoolOverview(schoolId).pipe(
      catchError(err => {
        console.warn('Failed to fetch live school overview analytics, falling back to defaults:', err);
        return of(null);
      })
    ).subscribe((res: SchoolOverviewResponse | null) => {
      if (res) {
        this.totalStudents.set(res.totalEnrolledStudents || 0);
        this.totalTeachers.set(res.totalTeachers || 0);
        this.totalStandards.set(res.totalStandards || (res.standardMetrics ? res.standardMetrics.length : 0));
        this.avgGpa.set(res.schoolAveragePercentage ? (res.schoolAveragePercentage / 10) : 0);
        this.totalAttempts.set(res.totalAttempts || 0);
        this.schoolPassPercentage.set(res.schoolPassPercentage || 0);

        if (res.standardMetrics && res.standardMetrics.length > 0) {
          this.standardData.set(
            res.standardMetrics.map(sm => ({
              standard: this.formatStandardName(sm.standardId),
              passRate: sm.passPercentage || 0,
              avgScore: sm.avgPercentage || 0,
              totalStudents: sm.totalEnrolledStudents || 0,
              distinctAttempted: sm.distinctStudentsAttempted || 0,
              participationRate: sm.participationRate || 0
            }))
          );
        } else {
          this.standardData.set([]);
        }

        if (res.subjectMetrics && res.subjectMetrics.length > 0) {
          this.subjectData.set(
            res.subjectMetrics.map(sub => ({
              subject: this.formatSubjectName(sub.subjectId),
              avgMastery: sub.avgPercentage || 0,
              passRate: sub.passPercentage || 0,
              activeCount: sub.totalAttempts || 0
            }))
          );
        } else {
          this.subjectData.set([]);
        }

        this.pageState.set('normal');
      } else {
        // Fallback state if server returns null/error
        this.totalStudents.set(0);
        this.totalTeachers.set(0);
        this.totalStandards.set(0);
        this.avgGpa.set(0);
        this.totalAttempts.set(0);
        this.schoolPassPercentage.set(0);
        this.standardData.set([]);
        this.subjectData.set([]);
        this.pageState.set('empty');
      }
    });
  }

  formatStandardName(standardId: string | number): string {
    if (!standardId) return 'Standard';
    const standardStr = String(standardId);
    const clean = standardStr.replace(/^(STD-|STD_|GRADE_|CLASS_)/i, '').trim();
    const teluguNumerals: { [key: string]: string } = {
      '1': '1వ తరగతి',
      '2': '2వ తరగతి',
      '3': '3వ తరగతి',
      '4': '4వ తరగతి',
      '5': '5వ తరగతి',
      '6': '6వ తరగతి',
      '7': '7వ తరగతి',
      '8': '8వ తరగతి',
      '9': '9వ తరగతి',
      '10': '10వ తరగతి'
    };
    const telugu = teluguNumerals[clean] ? ` (${teluguNumerals[clean]})` : '';
    return `Standard ${clean}${telugu}`;
  }

  formatSubjectName(subjectId: string | number): string {
    if (!subjectId) return 'Subject';
    const s = String(subjectId).toUpperCase();
    if (s.includes('MATH')) return 'Mathematics (గణితం)';
    if (s.includes('SCI') || s.includes('PHYS') || s.includes('CHEM') || s.includes('BIO')) return 'General Science (సామాన్య శాస్త్రం)';
    if (s.includes('TEL')) return 'Telugu Language (తెలుగు భాష)';
    if (s.includes('ENG')) return 'English (ఆంగ్లం)';
    if (s.includes('SOC')) return 'Social Studies (సాంఘిక శాస్త్రం)';
    if (s.includes('HIN')) return 'Hindi (హిందీ)';
    return String(subjectId);
  }

  getBarColor(rate: number): string {
    if (rate >= 85) return 'linear-gradient(90deg, #00D9A3, #38EF7D)';
    if (rate >= 70) return 'linear-gradient(90deg, #F59E0B, #FFD200)';
    return 'linear-gradient(90deg, #FF6B6B, #FC5C7D)';
  }
}
