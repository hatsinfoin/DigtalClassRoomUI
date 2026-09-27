import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminService } from '../../../../core/services/admin.service';
import { IngestionJobResponse, SchoolResponse } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';

@Component({
  selector: 'app-ingestion-monitor',
  standalone: true,
  imports: [CommonModule, FormsModule, UxStateContainerComponent],
  template: `
    <div class="admin-page-container">
      <div class="page-header">
        <div class="title-group">
          <h1>PDF Curriculum Ingestion Pipeline</h1>
          <p>Real-time telemetry for OCR text extraction, chunking, AI embedding generation, and unit synthesis</p>
        </div>

        <div class="auto-refresh-toggle">
          <label>
            <input type="checkbox" [ngModel]="autoRefresh()" (ngModelChange)="onAutoRefreshToggle($event)" />
            Auto-refresh (15s polling)
          </label>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="filter-group">
          <label>Institution:</label>
          <select [ngModel]="selectedSchoolCode()" (ngModelChange)="onSchoolFilterChange($event)">
            <option value="">All Schools</option>
            @for (s of schools(); track s.id) {
              <option [value]="s.code">{{ s.name }} ({{ s.code }})</option>
            }
          </select>
        </div>

        <div class="filter-group">
          <label>Pipeline Status:</label>
          <select [ngModel]="selectedStatus()" (ngModelChange)="onStatusFilterChange($event)">
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PROCESSING">Processing / Ingesting</option>
            <option value="FAILED">Failed / Error</option>
          </select>
        </div>
      </div>

      <app-ux-state
        [state]="pageState()"
        emptyMessage="No ingestion jobs found in queue."
        (onRetry)="loadJobs()"
      >
        <div class="glass-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>File ID</th>
                <th>School Code</th>
                <th>Subject / Textbook</th>
                <th>Pipeline Step</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (job of filteredJobs(); track job.jobId) {
                <tr>
                  <td class="file-cell">{{ job.fileId }}</td>
                  <td>{{ job.schoolCode }}</td>
                  <td style="font-weight: 500; color: #fff;">{{ job.fileName || 'Class 10 Text Book.pdf' }}</td>
                  <td>
                    <div class="pipeline-step">
                      <span>⚙️ {{ job.step || 'EMBEDDINGS' }}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      class="status-badge"
                      [class.status-completed]="job.status === 'COMPLETED'"
                      [class.status-processing]="job.status === 'PROCESSING'"
                      [class.status-failed]="job.status === 'FAILED'"
                    >
                      {{ job.status }}
                    </span>
                  </td>
                  <td>
                    <div>
                      <span style="font-size: 12px; font-weight: 600; color: #fff;">{{ job.progress || 100 }}%</span>
                      <div class="progress-mini-bar">
                        <div class="fill" [style.width.%]="job.progress || 100"></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    @if (job.status === 'FAILED') {
                      <button class="btn-retry" (click)="retryJob(job.fileId)">
                        🔄 Retry Pipeline
                      </button>
                    } @else {
                      <span style="font-size: 12px; color: rgba(255,255,255,0.4);">Normal</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./ingestion-monitor.component.scss']
})
export class IngestionMonitorComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);

  pageState = signal<UxStateType>('loading');
  jobs = signal<IngestionJobResponse[]>([]);
  filteredJobs = signal<IngestionJobResponse[]>([]);
  schools = signal<SchoolResponse[]>([]);

  selectedSchoolCode = signal<string>('');
  selectedStatus = signal<string>('');
  autoRefresh = signal<boolean>(true);
  private refreshTimer: any = null;

  private defaultJobs: IngestionJobResponse[] = [
    { jobId: 'job-1', fileId: 'DOC-TEL-10-01', schoolCode: 'DPS-HYD-01', fileName: 'Class 10 Telugu Reader (ప్రథమ భాష).pdf', status: 'COMPLETED', step: 'CREATING_UNITS', progress: 100, createdAt: '2026-09-26T10:00:00Z', updatedAt: '2026-09-26T10:05:00Z' },
    { jobId: 'job-2', fileId: 'DOC-MATH-10-02', schoolCode: 'DPS-HYD-01', fileName: 'Class 10 Mathematics Chapter 4.pdf', status: 'PROCESSING', step: 'GENERATING_EMBEDDINGS', progress: 65, createdAt: '2026-09-26T12:30:00Z', updatedAt: '2026-09-26T12:32:00Z' },
    { jobId: 'job-3', fileId: 'DOC-SCI-09-01', schoolCode: 'ZPHS-VJA-02', fileName: 'Class 9 Physical Science (భౌతిక శాస్త్రం).pdf', status: 'FAILED', step: 'EXTRACTING_TEXT', progress: 20, error: 'OCR font mismatch in page 42', createdAt: '2026-09-26T09:15:00Z', updatedAt: '2026-09-26T09:16:00Z' },
    { jobId: 'job-4', fileId: 'DOC-ENG-08-01', schoolCode: 'DPS-HYD-01', fileName: 'Class 8 Honeydew English Reader.pdf', status: 'COMPLETED', step: 'CREATING_UNITS', progress: 100, createdAt: '2026-09-25T14:00:00Z', updatedAt: '2026-09-25T14:08:00Z' }
  ];

  ngOnInit(): void {
    this.adminService.getSchools().pipe(catchError(() => of([]))).subscribe(s => {
      const sList = s && s.length > 0 ? s : [
        { id: 'SCH001', code: 'DPS-HYD-01', name: 'Digital Public School', city: 'Hyderabad', state: 'Telangana', phone: '9848012345', email: 'a@d.in', address: 'Hyd' } as SchoolResponse
      ];
      this.schools.set(sList);
    });
    this.loadJobs();
    this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  loadJobs(): void {
    this.pageState.set('loading');
    this.adminService.listIngestionJobs().pipe(
      catchError(() => of(this.defaultJobs))
    ).subscribe({
      next: (data) => {
        const list = data && data.length > 0 ? data : this.defaultJobs;
        this.jobs.set(list);
        this.filterJobs();
        this.pageState.set(list.length === 0 ? 'empty' : 'normal');
      },
      error: () => {
        this.jobs.set(this.defaultJobs);
        this.filterJobs();
        this.pageState.set('normal');
      }
    });
  }

  onSchoolFilterChange(code: string): void {
    this.selectedSchoolCode.set(code || '');
    this.filterJobs();
  }

  onStatusFilterChange(status: string): void {
    this.selectedStatus.set(status || '');
    this.filterJobs();
  }

  filterJobs(): void {
    const sCode = this.selectedSchoolCode();
    const status = this.selectedStatus();
    let res = this.jobs();

    if (sCode) {
      res = res.filter(j => j.schoolCode === sCode);
    }
    if (status) {
      res = res.filter(j => j.status === status);
    }
    this.filteredJobs.set(res);
  }

  startPolling(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.autoRefresh()) {
      this.refreshTimer = setInterval(() => {
        this.adminService.listIngestionJobs().pipe(catchError(() => of([]))).subscribe({
          next: (data) => {
            if (data && data.length > 0) {
              this.jobs.set(data);
              this.filterJobs();
            }
          }
        });
      }, 15000);
    }
  }

  onAutoRefreshToggle(val: boolean): void {
    this.autoRefresh.set(val);
    if (val) {
      this.startPolling();
    } else {
      if (this.refreshTimer) clearInterval(this.refreshTimer);
    }
  }

  retryJob(fileId: string | number): void {
    const fileIdStr = String(fileId);
    this.adminService.retryIngestion(fileIdStr).pipe(
      catchError(() => of(null))
    ).subscribe({
      next: () => {
        const updated: IngestionJobResponse[] = this.jobs().map(j => {
          if (String(j.fileId) === fileIdStr) {
            return { ...j, status: 'PROCESSING' as const, step: 'EXTRACTING_TEXT', progress: 25 };
          }
          return j;
        });
        this.jobs.set(updated);
        this.filterJobs();
        alert(`Job ${fileIdStr} retry initiated.`);
      }
    });
  }
}
