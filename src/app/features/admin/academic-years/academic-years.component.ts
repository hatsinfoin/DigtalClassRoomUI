import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AcademicService } from '../../../core/services/academic.service';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { AcademicYearResponse, AcademicYearRequest, SchoolResponse } from '../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../shared/components/ux-state-container/ux-state-container.component';

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
        <div class="header-actions">
          @if (isPlatformAdmin()) {
            <div class="school-filter-box">
              <label class="filter-label">Filter by School:</label>
              <select [ngModel]="selectedSchoolFilter()" (ngModelChange)="onSchoolFilterChange($event)" class="filter-select">
                <option value="ALL">🏛️ All Schools</option>
                @for (s of schools(); track s.id) {
                  <option [value]="s.id">{{ s.name }} ({{ s.code }})</option>
                }
              </select>
            </div>
          }
          <button class="primary-btn" (click)="openCreateModal()">
            <span>➕ Add Academic Session</span>
          </button>
        </div>
      </div>

      <app-ux-state
        [state]="pageState()"
        emptyMessage="No academic years configured. Add a new academic year session to get started."
        [technicalDetails]="technicalError()"
        (onRetry)="loadAcademicYears()"
      >
        <div class="grid-layout">
          @for (year of filteredAcademicYears(); track year.id) {
            <div class="glass-card" [class.active-card]="isYearActive(year)">
              <div class="school-chip">
                <span class="chip-icon">🏫</span>
                <span class="chip-text">{{ getSchoolDisplayName(year) }}</span>
              </div>

              <div class="year-card-header">
                <div>
                  <h3 class="year-title">{{ year.year }}</h3>
                  <span class="year-label">{{ year.label || ('Session ' + year.year) }}</span>
                </div>
                <span class="status-badge" [class.active]="isYearActive(year)" [class.inactive]="!isYearActive(year)">
                  {{ isYearActive(year) ? 'Active Term' : 'Archived' }}
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
                <button class="btn-edit" (click)="openEditModal(year)">
                  ✏️ Edit
                </button>
                <button
                  class="btn-toggle-status"
                  [class.btn-deactivate]="isYearActive(year)"
                  [class.btn-activate]="!isYearActive(year)"
                  (click)="openToggleConfirm(year)"
                >
                  {{ isYearActive(year) ? 'Deactivate' : 'Set as Active' }}
                </button>
              </div>
            </div>
          }
        </div>
      </app-ux-state>

      <!-- Confirmation Modal for Activate / Deactivate -->
      @if (showConfirmModal() && selectedYearForToggle()) {
        <div class="modal-overlay">
          <div class="modal-dialog toggle-confirm-dialog">
            <div class="modal-header">
              <h2 [style.color]="isYearActive(selectedYearForToggle()!) ? '#FF6B6B' : '#00D9A3'">
                {{ isYearActive(selectedYearForToggle()!) ? '⚠️ Deactivate Academic Session' : '⚡ Activate Academic Session' }}
              </h2>
              <button class="close-btn" (click)="closeConfirmModal()">✕</button>
            </div>

            <div class="confirm-content">
              @if (isYearActive(selectedYearForToggle()!)) {
                <p>
                  Are you sure you want to <strong>deactivate</strong> the academic session 
                  <strong>{{ selectedYearForToggle()?.year }}</strong>?
                </p>
                <div class="confirm-hint">
                  This term will be archived and set to inactive in the database.
                </div>
              } @else {
                <p>
                  Are you sure you want to set <strong>{{ selectedYearForToggle()?.year }}</strong> as the <strong>Active Academic Term</strong>?
                </p>
                <div class="confirm-hint">
                  This session will become the primary active term for student admissions, timetable, attendance, and exam management.
                </div>
              }
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeConfirmModal()">Cancel</button>
              <button
                type="button"
                [class.btn-danger]="isYearActive(selectedYearForToggle()!)"
                [class.btn-success]="!isYearActive(selectedYearForToggle()!)"
                [disabled]="isSubmitting()"
                (click)="confirmToggleActive()"
              >
                {{ isSubmitting() ? 'Updating...' : (isYearActive(selectedYearForToggle()!) ? 'Confirm Deactivate' : 'Confirm Activate') }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal: Create / Edit Academic Session -->
      @if (showModal()) {
        <div class="modal-overlay">
          <div class="modal-dialog edit-academic-modal">
            <div class="modal-header">
              <h2>{{ editingYearId() ? '✏️ Edit Academic Session' : '➕ New Academic Session' }}</h2>
              <button class="close-btn" (click)="closeModal()">✕</button>
            </div>

            <form [formGroup]="yearForm" (ngSubmit)="saveYear()">
              <div class="form-grid">
                <!-- Institution (TOP & ONLY NON-EDITABLE / LOCKED FIELD IN EDIT) -->
                <div class="form-group full-width" [class.locked-top-field]="editingYearId()">
                  <label class="field-label-top">
                    <span>🏛️ Institution</span>
                    @if (editingYearId()) {
                      <span class="badge-locked">🔒 Locked</span>
                    }
                  </label>
                  <select formControlName="schoolId">
                    <option value="">-- Choose School --</option>
                    @for (s of schools(); track s.id) {
                      <option [value]="s.id">{{ s.name }} ({{ s.code }})</option>
                    }
                  </select>
                </div>

                <!-- Editable Fields Below -->
                <div class="form-group">
                  <label>
                    <span>Academic Year (e.g. 2026-2027)</span>
                    @if (editingYearId()) {
                      <span class="badge-editable">✏️ Editable</span>
                    }
                  </label>
                  <input formControlName="year" placeholder="2026-2027" />
                </div>

                <div class="form-group">
                  <label>
                    <span>Session Label / Term Name</span>
                    @if (editingYearId()) {
                      <span class="badge-editable">✏️ Editable</span>
                    }
                  </label>
                  <input
                    formControlName="label"
                    placeholder="e.g. Academic Session 2026-27"
                    autofocus
                  />
                </div>

                <div class="form-group">
                  <label>
                    <span>Term Start Date</span>
                    @if (editingYearId()) {
                      <span class="badge-editable">✏️ Editable</span>
                    }
                  </label>
                  <input formControlName="startDate" type="date" />
                </div>

                <div class="form-group">
                  <label>
                    <span>Term End Date</span>
                    @if (editingYearId()) {
                      <span class="badge-editable">✏️ Editable</span>
                    }
                  </label>
                  <input formControlName="endDate" type="date" />
                </div>

                <div class="form-group full-width">
                  <label class="checkbox-row">
                    <input type="checkbox" formControlName="isActive" />
                    <span>Set as current active academic session</span>
                    @if (editingYearId()) {
                      <span class="badge-editable inline-badge">✏️ Editable</span>
                    }
                  </label>
                </div>

                @if (editingYearId()) {
                  <div class="form-group full-width locked-hint-box">
                    <span>ℹ️ Only the associated Institution is fixed. All session terms, dates, and active flags can be modified.</span>
                  </div>
                }
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-secondary" (click)="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="yearForm.invalid || isSubmitting()">
                  {{ isSubmitting() ? 'Saving...' : (editingYearId() ? 'Save Changes' : 'Create Session') }}
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

  isPlatformAdmin = computed(() => this.auth.isPlatformAdmin());
  isSchoolAdmin = computed(() => this.auth.isSchoolAdmin());

  pageState = signal<UxStateType>('loading');
  technicalError = signal<string>('');
  academicYears = signal<AcademicYearResponse[]>([]);
  schools = signal<SchoolResponse[]>([]);
  selectedSchoolFilter = signal<string>('ALL');
  showModal = signal<boolean>(false);
  editingYearId = signal<string | number | null>(null);
  showConfirmModal = signal<boolean>(false);
  selectedYearForToggle = signal<AcademicYearResponse | null>(null);
  isSubmitting = signal<boolean>(false);

  filteredAcademicYears = computed(() => {
    const filter = this.selectedSchoolFilter();
    const all = this.academicYears();
    if (!filter || filter === 'ALL') return all;
    return all.filter(y => String(y.schoolId) === filter);
  });

  yearForm: FormGroup = this.fb.group({
    schoolId: ['', Validators.required],
    year: ['', Validators.required],
    label: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    isActive: [true]
  });

  private defaultYears: AcademicYearResponse[] = [
    {
      id: 'AY-2026-27',
      schoolId: 'SCH001',
      year: '2026-2027',
      label: 'Academic Session 2026-2027 (Present Term)',
      startDate: '2026-06-01',
      endDate: '2027-04-30',
      isActive: true
    },
    {
      id: 'AY-2025-26',
      schoolId: 'SCH001',
      year: '2025-2026',
      label: 'Academic Session 2025-2026 (Archived)',
      startDate: '2025-06-01',
      endDate: '2026-04-30',
      isActive: false
    }
  ];

  ngOnInit(): void {
    this.loadSchools();
    this.loadAcademicYears();
  }

  loadSchools(): void {
    const isPlatform = this.auth.isPlatformAdmin();
    const userSchoolId = this.auth.getSchoolId();

    this.adminService.getSchools().pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (res) => {
        let sList = res && res.length > 0 ? res : [];

        // Scope schools for ROLE_ADMIN
        if (!isPlatform && userSchoolId) {
          const filtered = sList.filter(s =>
            String(s.id) === String(userSchoolId) ||
            String((s as any)._id) === String(userSchoolId) ||
            String(s.code) === String(userSchoolId) ||
            String(s.schoolCode) === String(userSchoolId)
          );
          if (filtered.length > 0) {
            sList = filtered;
            this.schools.set(sList);
            this.selectedSchoolFilter.set(String(sList[0].id));
          } else {
            this.adminService.getSchool(userSchoolId).pipe(
              catchError(() => of(null))
            ).subscribe(singleSchool => {
              if (singleSchool) {
                this.schools.set([singleSchool]);
                this.selectedSchoolFilter.set(String(singleSchool.id));
              } else {
                this.schools.set(sList);
              }
            });
          }
        } else {
          this.schools.set(sList);
        }

        if (sList.length > 0 && !this.yearForm.get('schoolId')?.value) {
          const targetSchoolId = userSchoolId || sList[0].id;
          this.yearForm.patchValue({ schoolId: targetSchoolId });
        }
      }
    });
  }

  loadAcademicYears(): void {
    this.pageState.set('loading');
    this.technicalError.set('');
    const isPlatform = this.auth.isPlatformAdmin();
    const userSchoolId = this.auth.getSchoolId();
    const targetSchoolId = (!isPlatform && userSchoolId) ? userSchoolId : undefined;

    console.log(`[AcademicYearsComponent] Fetching academic years with schoolId: ${targetSchoolId}`);

    this.academicService.getAcademicYears(targetSchoolId).subscribe({
      next: (data) => {
        let list = Array.isArray(data) ? data : [];
        if (targetSchoolId) {
          list = list.filter(y =>
            String(y.schoolId) === String(targetSchoolId) ||
            String(y.schoolCode) === String(targetSchoolId)
          );
        }
        this.academicYears.set(list);
        this.pageState.set(list.length === 0 ? 'empty' : 'normal');
      },
      error: (err) => {
        console.warn('[AcademicYearsComponent] Backend connection issue:', err);
        this.technicalError.set(`HTTP ${err.status ?? 0} (${err.statusText || 'Connection Refused'}) - /api/academic-years`);
        this.pageState.set('error');
      }
    });
  }

  openCreateModal(): void {
    const sList = this.schools();
    const isPlatform = this.auth.isPlatformAdmin();
    const userSchoolId = this.auth.getSchoolId();
    const targetSchool = (!isPlatform ? userSchoolId : null) || (sList[0]?.id || '');

    this.editingYearId.set(null);
    this.yearForm.enable();
    this.yearForm.reset({
      schoolId: targetSchool,
      year: '2026-2027',
      label: 'Academic Session 2026-27',
      startDate: '2026-06-01',
      endDate: '2027-04-30',
      isActive: true
    });

    if (!isPlatform && userSchoolId) {
      this.yearForm.get('schoolId')?.disable();
    }

    this.showModal.set(true);
  }

  openEditModal(year: AcademicYearResponse): void {
    const yearId = year.id ?? (year as any)._id;
    this.editingYearId.set(yearId);

    // First enable all to allow setting values
    this.yearForm.enable();
    this.yearForm.reset({
      schoolId: year.schoolId || '',
      year: year.year || '',
      label: year.label || `Academic Session ${year.year}`,
      startDate: this.formatDateForInput(year.startDate),
      endDate: this.formatDateForInput(year.endDate),
      isActive: this.isYearActive(year)
    });

    // ONLY disable Institution (schoolId) - all other fields remain editable!
    this.yearForm.get('schoolId')?.disable();

    this.showModal.set(true);
  }

  private formatDateForInput(dateVal: any): string {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') {
      if (dateVal.includes('T')) {
        return dateVal.split('T')[0];
      }
      return dateVal;
    }
    try {
      const d = new Date(dateVal);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingYearId.set(null);
  }

  openToggleConfirm(year: AcademicYearResponse): void {
    this.selectedYearForToggle.set(year);
    this.showConfirmModal.set(true);
  }

  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
    this.selectedYearForToggle.set(null);
  }

  saveYear(): void {
    if (this.yearForm.invalid) return;
    this.isSubmitting.set(true);
    const req = this.yearForm.getRawValue() as AcademicYearRequest;
    const editId = this.editingYearId();

    if (editId) {
      // Edit mode: update MongoDB Academic Year via PUT /api/academic/years/{id}
      const updatePayload: any = {
        ...req,
        isActive: req.isActive,
        active: req.isActive
      };

      this.academicService.updateAcademicYear(editId, updatePayload).pipe(
        catchError(() => {
          // Optimistic local update fallback
          const updated = this.academicYears().map(y => {
            const yId = y.id ?? (y as any)._id;
            if (String(yId) === String(editId)) {
              return {
                ...y,
                year: req.year,
                label: req.label,
                startDate: req.startDate,
                endDate: req.endDate,
                isActive: req.isActive,
                active: req.isActive
              };
            }
            return y;
          });
          this.academicYears.set(updated);
          return of(null);
        })
      ).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.loadAcademicYears();
        },
        error: () => {
          this.isSubmitting.set(false);
        }
      });
    } else {
      // Create mode
      this.academicService.createAcademicYear(req).pipe(
        catchError(() => {
          const newYear: AcademicYearResponse = {
            id: 'AY-' + Date.now().toString().slice(-4),
            schoolId: req.schoolId,
            year: req.year,
            label: req.label,
            startDate: req.startDate,
            endDate: req.endDate,
            isActive: req.isActive ?? true
          };
          this.academicYears.set([newYear, ...this.academicYears()]);
          return of(newYear);
        })
      ).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.loadAcademicYears();
        },
        error: () => {
          this.isSubmitting.set(false);
        }
      });
    }
  }

  onSchoolFilterChange(schoolId: string): void {
    this.selectedSchoolFilter.set(schoolId);
  }

  getSchoolDisplayName(year: AcademicYearResponse): string {
    if (year.schoolName) {
      return year.schoolCode ? `${year.schoolName} (${year.schoolCode})` : year.schoolName;
    }
    const targetId = String(year.schoolId || '');
    const found = this.schools().find(s => String(s.id) === targetId || String((s as any)._id) === targetId || String(s.code) === targetId || String(s.schoolCode) === targetId);
    if (found) {
      const codeStr = found.code || found.schoolCode || '';
      return codeStr ? `${found.name} (${codeStr})` : found.name;
    }
    return year.schoolId ? `School #${year.schoolId}` : 'All Schools';
  }

  isYearActive(year: AcademicYearResponse): boolean {
    return Boolean(year?.active === true || year?.isActive === true);
  }

  confirmToggleActive(): void {
    const year = this.selectedYearForToggle();
    if (!year) return;

    this.isSubmitting.set(true);
    const yearId = year.id ?? (year as any)._id;
    const currentActive = this.isYearActive(year);
    const targetState = !currentActive;
    console.log(`[AcademicYearsComponent] Toggling Active state for year ${year.year} (${yearId}) -> ${targetState}`);

    // Optimistically update UI
    const updated = this.academicYears().map(y => {
      const yId = y.id ?? (y as any)._id;
      if (yId === yearId) {
        return { ...y, isActive: targetState, active: targetState };
      }
      // If activating this year, all other years for the same school are deactivated
      if (targetState && (y.schoolId === year.schoolId || !year.schoolId)) {
        return { ...y, isActive: false, active: false };
      }
      return y;
    });
    this.academicYears.set(updated);

    // Call Backend API: PUT /api/academic/years/{id} with dual attributes
    const updatePayload: any = {
      isActive: targetState,
      active: targetState,
      schoolId: year.schoolId,
      year: year.year,
      label: year.label || `Academic Session ${year.year}`,
      startDate: year.startDate,
      endDate: year.endDate
    };

    this.academicService.updateAcademicYear(yearId, updatePayload).subscribe({
      next: (res) => {
        console.log('[AcademicYearsComponent] ✅ Successfully updated academic year in MongoDB:', res);
        this.isSubmitting.set(false);
        this.closeConfirmModal();
        this.loadAcademicYears();
      },
      error: (err) => {
        console.warn('[AcademicYearsComponent] Backend update returned error or not implemented, kept optimistic state:', err);
        this.isSubmitting.set(false);
        this.closeConfirmModal();
      }
    });
  }
}

