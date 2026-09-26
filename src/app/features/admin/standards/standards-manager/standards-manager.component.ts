import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AcademicService } from '../../../../core/services/academic.service';
import { AdminService } from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { StandardResponse, StandardRequest, AcademicYearResponse, SchoolResponse } from '../../../../core/models/models';
import { UxStateContainerComponent, PageState } from '../../../../shared/components/ux-state-container/ux-state-container.component';
import { TeluguNfcPipe } from '../../../../shared/pipes/telugu-nfc.pipe';

@Component({
  selector: 'app-standards-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UxStateContainerComponent, TeluguNfcPipe],
  template: `
    <div class="admin-page-container">
      <div class="page-header">
        <div class="title-group">
          <h1>Standards & Class Hierarchy</h1>
          <p>Manage standards (Classes 1–10), bilingual grade sections, and curriculum assignments</p>
        </div>
        <button class="primary-btn" (click)="openCreateModal()">
          <span>➕ Add Class / Standard</span>
        </button>
      </div>

      <app-ux-state
        [state]="pageState"
        emptyMessage="No standards configured for this institution yet."
        (retry)="loadStandards()"
      >
        <div class="standards-grid">
          @for (std of standards; track std.id) {
            <div class="glass-card">
              <div>
                <div class="standard-card-top">
                  <div class="std-badge">
                    Std {{ std.standardNumber }}
                  </div>
                  <span class="section-pill">Sec {{ std.section || 'A' }}</span>
                </div>

                <div class="standard-info">
                  <h3>{{ std.name }}</h3>
                  <div class="telugu-name">{{ std.name | teluguNfc }} (తరగతి {{ std.standardNumber }})</div>
                  <div class="meta-row">
                    <span>Grade Level: {{ std.standardNumber <= 5 ? 'Primary' : (std.standardNumber <= 7 ? 'Middle' : 'Secondary') }}</span>
                  </div>
                </div>
              </div>

              <div class="standard-card-actions">
                <button (click)="openEditModal(std)">✏️ Edit</button>
                <button class="btn-danger" (click)="deleteStandard(std.id)">🗑️ Delete</button>
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
              <h2>{{ editingStandardId ? 'Edit Standard' : 'Add Class / Standard' }}</h2>
              <button class="close-btn" (click)="closeModal()">✕</button>
            </div>

            <form [formGroup]="standardForm" (ngSubmit)="saveStandard()">
              <div class="form-grid">
                <div class="form-group">
                  <label>Institution</label>
                  <select formControlName="schoolId">
                    <option value="">-- Select School --</option>
                    @for (s of schools; track s.id) {
                      <option [value]="s.id">{{ s.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label>Academic Year</label>
                  <select formControlName="academicYearId">
                    <option value="">-- Select Academic Year --</option>
                    @for (y of academicYears; track y.id) {
                      <option [value]="y.id">{{ y.year }} ({{ y.label }})</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label>Standard Grade (1 - 10)</label>
                  <select formControlName="standardNumber">
                    <option [value]="1">Standard 1 (1వ తరగతి)</option>
                    <option [value]="2">Standard 2 (2వ తరగతి)</option>
                    <option [value]="3">Standard 3 (3వ తరగతి)</option>
                    <option [value]="4">Standard 4 (4వ తరగతి)</option>
                    <option [value]="5">Standard 5 (5వ తరగతి)</option>
                    <option [value]="6">Standard 6 (6వ తరగతి)</option>
                    <option [value]="7">Standard 7 (7వ తరగతి)</option>
                    <option [value]="8">Standard 8 (8వ తరగతి)</option>
                    <option [value]="9">Standard 9 (9వ తరగతి)</option>
                    <option [value]="10">Standard 10 (10వ తరగతి)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Standard / Class Name (Telugu / English)</label>
                  <input formControlName="name" placeholder="e.g. Class 10 - SSC" />
                </div>
                <div class="form-group">
                  <label>Section</label>
                  <select formControlName="section">
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-secondary" (click)="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="standardForm.invalid || isSubmitting">
                  {{ isSubmitting ? 'Saving...' : 'Save Standard' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./standards-manager.component.scss']
})
export class StandardsManagerComponent implements OnInit {
  private academicService = inject(AcademicService);
  private adminService = inject(AdminService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  pageState: PageState = 'loading';
  standards: StandardResponse[] = [];
  schools: SchoolResponse[] = [];
  academicYears: AcademicYearResponse[] = [];

  showModal = false;
  editingStandardId: string | number | null = null;
  isSubmitting = false;

  standardForm: FormGroup = this.fb.group({
    schoolId: ['', Validators.required],
    academicYearId: ['', Validators.required],
    standardNumber: [10, [Validators.required, Validators.min(1), Validators.max(10)]],
    name: ['', Validators.required],
    section: ['A', Validators.required]
  });

  ngOnInit(): void {
    this.loadMeta();
    this.loadStandards();
  }

  loadMeta(): void {
    this.adminService.getSchools().subscribe(schools => {
      this.schools = schools || [];
      const userSchoolId = this.auth.currentUser()?.schoolId || this.schools[0]?.id;
      if (userSchoolId) {
        this.standardForm.patchValue({ schoolId: userSchoolId });
      }
    });

    this.academicService.getAcademicYears().subscribe(years => {
      this.academicYears = years || [];
      if (this.academicYears.length > 0) {
        this.standardForm.patchValue({ academicYearId: this.academicYears[0].id });
      }
    });
  }

  loadStandards(): void {
    this.pageState = 'loading';
    const schoolId = this.auth.currentUser()?.schoolId;
    this.academicService.getStandards(schoolId).subscribe({
      next: (data) => {
        this.standards = data || [];
        this.pageState = this.standards.length === 0 ? 'empty' : 'normal';
      },
      error: () => {
        this.pageState = 'error';
      }
    });
  }

  openCreateModal(): void {
    this.editingStandardId = null;
    this.standardForm.reset({
      schoolId: this.auth.currentUser()?.schoolId || (this.schools[0]?.id || ''),
      academicYearId: this.academicYears[0]?.id || '',
      standardNumber: 10,
      name: 'Class 10 (10వ తరగతి)',
      section: 'A'
    });
    this.showModal = true;
  }

  openEditModal(std: StandardResponse): void {
    this.editingStandardId = std.id;
    this.standardForm.patchValue({
      schoolId: std.schoolId,
      academicYearId: std.academicYearId,
      standardNumber: std.standardNumber,
      name: std.name,
      section: std.section || 'A'
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveStandard(): void {
    if (this.standardForm.invalid) return;
    this.isSubmitting = true;
    const req = this.standardForm.value as StandardRequest;

    if (this.editingStandardId) {
      this.academicService.updateStandard(this.editingStandardId, req).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeModal();
          this.loadStandards();
        },
        error: () => {
          this.isSubmitting = false;
        }
      });
    } else {
      this.academicService.createStandard(req).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeModal();
          this.loadStandards();
        },
        error: () => {
          this.isSubmitting = false;
        }
      });
    }
  }

  deleteStandard(id: string | number): void {
    if (!confirm('Are you sure you want to delete this standard?')) return;
    this.academicService.deleteStandard(id).subscribe({
      next: () => this.loadStandards()
    });
  }
}
