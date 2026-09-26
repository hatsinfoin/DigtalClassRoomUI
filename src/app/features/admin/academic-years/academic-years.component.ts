import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AcademicService } from '../../../core/services/academic.service';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { AcademicYearResponse, AcademicYearRequest, SchoolResponse } from '../../../core/models/models';
import { UxStateContainerComponent, PageState } from '../../../shared/components/ux-state-container/ux-state-container.component';

@Component({
  selector: 'app-academic-years',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UxStateContainerComponent],
  template: `
    <div class="admin-page-container">
      <div class="page-header">
        <div class="title-group">
          <h1>Academic Years</h1>
          <p>Configure institutional school terms, active sessions, and grading timelines</p>
        </div>
        <button class="primary-btn" (click)="openCreateModal()">
          <span>➕ Add Academic Session</span>
        </button>
      </div>

      <app-ux-state
        [state]="pageState"
        emptyMessage="No academic years configured. Add a new academic year session to get started."
        (retry)="loadAcademicYears()"
      >
        <div class="grid-layout">
          @for (year of academicYears; track year.id) {
            <div class="glass-card" [class.active-card]="year.isActive">
              <div class="year-card-header">
                <div>
                  <h3 class="year-title">{{ year.year }}</h3>
                  <span class="year-label">{{ year.label }}</span>
                </div>
                <span class="status-badge" [class.active]="year.isActive" [class.inactive]="!year.isActive">
                  {{ year.isActive ? 'Active Term' : 'Archived' }}
                </span>
              </div>

              <div class="date-range-box">
                <div class="date-item">
                  <span class="date-label">Start Date</span>
                  <span class="date-value">{{ year.startDate | date:'mediumDate' }}</span>
                </div>
                <div class="date-item" style="text-align: right;">
                  <span class="date-label">End Date</span>
                  <span class="date-value">{{ year.endDate | date:'mediumDate' }}</span>
                </div>
              </div>

              <div class="card-footer-actions">
                <button (click)="toggleActive(year)">
                  {{ year.isActive ? 'Deactivate' : 'Set as Active' }}
                </button>
              </div>
            </div>
          }
        </div>
      </app-ux-state>

      <!-- Modal -->
      @if (showModal) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>New Academic Session</h2>
              <button class="close-btn" (click)="closeModal()">✕</button>
            </div>

            <form [formGroup]="yearForm" (ngSubmit)="saveYear()">
              <div class="form-grid">
                <div class="form-group">
                  <label>Select Institution</label>
                  <select formControlName="schoolId">
                    <option value="">-- Choose School --</option>
                    @for (s of schools; track s.id) {
                      <option [value]="s.id">{{ s.name }} ({{ s.code }})</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label>Academic Year (e.g. 2026-2027)</label>
                  <input formControlName="year" placeholder="2026-2027" />
                </div>
                <div class="form-group">
                  <label>Session Label / Term Name</label>
                  <input formControlName="label" placeholder="Academic Session 2026-27" />
                </div>
                <div class="form-group">
                  <label>Term Start Date</label>
                  <input formControlName="startDate" type="date" />
                </div>
                <div class="form-group">
                  <label>Term End Date</label>
                  <input formControlName="endDate" type="date" />
                </div>
                <div class="form-group">
                  <label class="checkbox-row">
                    <input type="checkbox" formControlName="isActive" />
                    <span>Set as current active academic session</span>
                  </label>
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-secondary" (click)="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="yearForm.invalid || isSubmitting">
                  {{ isSubmitting ? 'Creating...' : 'Create Session' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./academic-years.component.scss']
})
export class AcademicYearsComponent implements OnInit {
  private academicService = inject(AcademicService);
  private adminService = inject(AdminService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  pageState: PageState = 'loading';
  academicYears: AcademicYearResponse[] = [];
  schools: SchoolResponse[] = [];
  showModal = false;
  isSubmitting = false;

  yearForm: FormGroup = this.fb.group({
    schoolId: ['', Validators.required],
    year: ['', Validators.required],
    label: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    isActive: [true]
  });

  ngOnInit(): void {
    this.loadSchools();
    this.loadAcademicYears();
  }

  loadSchools(): void {
    this.adminService.getSchools().subscribe({
      next: (res) => {
        this.schools = res || [];
        if (this.schools.length > 0 && !this.yearForm.get('schoolId')?.value) {
          const currentSchoolId = this.auth.currentUser()?.schoolId || this.schools[0].id;
          this.yearForm.patchValue({ schoolId: currentSchoolId });
        }
      }
    });
  }

  loadAcademicYears(): void {
    this.pageState = 'loading';
    const currentSchoolId = this.auth.currentUser()?.schoolId;
    this.academicService.getAcademicYears(currentSchoolId).subscribe({
      next: (data) => {
        this.academicYears = data || [];
        this.pageState = this.academicYears.length === 0 ? 'empty' : 'normal';
      },
      error: () => {
        this.pageState = 'error';
      }
    });
  }

  openCreateModal(): void {
    this.yearForm.reset({
      schoolId: this.auth.currentUser()?.schoolId || (this.schools[0]?.id || ''),
      year: '2026-2027',
      label: 'Academic Session 2026-27',
      startDate: '2026-06-01',
      endDate: '2027-04-30',
      isActive: true
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveYear(): void {
    if (this.yearForm.invalid) return;
    this.isSubmitting = true;
    const req = this.yearForm.value as AcademicYearRequest;

    this.academicService.createAcademicYear(req).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeModal();
        this.loadAcademicYears();
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  toggleActive(year: AcademicYearResponse): void {
    // Optimistic toggle
    year.isActive = !year.isActive;
  }
}
