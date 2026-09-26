import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AcademicService } from '../../../../core/services/academic.service';
import { AdminService } from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SubjectResponse, SubjectRequest, StandardResponse, AcademicYearResponse, SchoolResponse } from '../../../../core/models/models';
import { UxStateContainerComponent, PageState } from '../../../../shared/components/ux-state-container/ux-state-container.component';
import { TeluguNfcPipe } from '../../../../shared/pipes/telugu-nfc.pipe';

@Component({
  selector: 'app-subject-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UxStateContainerComponent, TeluguNfcPipe],
  template: `
    <div class="admin-page-container">
      <div class="page-header">
        <div class="title-group">
          <h1>Curriculum Subjects</h1>
          <p>Define bilingual subjects, curriculum modules, and standard associations</p>
        </div>
        <button class="primary-btn" (click)="openCreateModal()">
          <span>➕ Add Subject</span>
        </button>
      </div>

      <app-ux-state
        [state]="pageState"
        emptyMessage="No subjects registered. Click 'Add Subject' to configure school curriculum."
        (retry)="loadSubjects()"
      >
        <div class="subjects-grid">
          @for (sub of subjects; track sub.id) {
            <div class="glass-card">
              <div class="subject-top-bar">
                <span class="code-pill">{{ sub.code }}</span>
                <span class="lang-badge">{{ sub.language === 'te' ? 'Telugu Medium' : (sub.language === 'en' ? 'English Medium' : 'Bilingual') }}</span>
              </div>

              <div class="subject-body">
                <h3>{{ sub.name }}</h3>
                <div class="telugu-sub-title">{{ sub.name | teluguNfc }}</div>
                <div class="std-association">
                  <span>Standard: {{ sub.standardId || 'Global' }}</span>
                </div>
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
              <h2>Add Curriculum Subject</h2>
              <button class="close-btn" (click)="closeModal()">✕</button>
            </div>

            <form [formGroup]="subjectForm" (ngSubmit)="saveSubject()">
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
                    <option value="">-- Select Year --</option>
                    @for (y of academicYears; track y.id) {
                      <option [value]="y.id">{{ y.year }} ({{ y.label }})</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label>Standard / Grade</label>
                  <select formControlName="standardId">
                    <option value="">-- Select Standard --</option>
                    @for (std of standards; track std.id) {
                      <option [value]="std.id">Std {{ std.standardNumber }} - {{ std.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label>Subject Code</label>
                  <input formControlName="code" placeholder="e.g. MATH-10, TEL-08, SCI-10" />
                </div>
                <div class="form-group">
                  <label>Subject Name (Telugu / English NFC)</label>
                  <input formControlName="name" placeholder="e.g. Mathematics / గణితం" />
                </div>
                <div class="form-group">
                  <label>Medium / Instruction Language</label>
                  <select formControlName="language">
                    <option value="both">Bilingual (English + Telugu)</option>
                    <option value="te">Telugu Medium Only</option>
                    <option value="en">English Medium Only</option>
                  </select>
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-secondary" (click)="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="subjectForm.invalid || isSubmitting">
                  {{ isSubmitting ? 'Creating...' : 'Create Subject' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./subject-manager.component.scss']
})
export class SubjectManagerComponent implements OnInit {
  private academicService = inject(AcademicService);
  private adminService = inject(AdminService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  pageState: PageState = 'loading';
  subjects: SubjectResponse[] = [];
  standards: StandardResponse[] = [];
  schools: SchoolResponse[] = [];
  academicYears: AcademicYearResponse[] = [];

  showModal = false;
  isSubmitting = false;

  subjectForm: FormGroup = this.fb.group({
    schoolId: ['', Validators.required],
    academicYearId: ['', Validators.required],
    standardId: ['', Validators.required],
    code: ['', Validators.required],
    name: ['', Validators.required],
    language: ['both', Validators.required]
  });

  ngOnInit(): void {
    this.loadMeta();
    this.loadSubjects();
  }

  loadMeta(): void {
    this.adminService.getSchools().subscribe(s => {
      this.schools = s || [];
      const sid = this.auth.currentUser()?.schoolId || this.schools[0]?.id;
      if (sid) {
        this.subjectForm.patchValue({ schoolId: sid });
        this.academicService.getStandards(sid).subscribe(stds => {
          this.standards = stds || [];
          if (this.standards.length > 0) {
            this.subjectForm.patchValue({ standardId: this.standards[0].id });
          }
        });
      }
    });

    this.academicService.getAcademicYears().subscribe(y => {
      this.academicYears = y || [];
      if (this.academicYears.length > 0) {
        this.subjectForm.patchValue({ academicYearId: this.academicYears[0].id });
      }
    });
  }

  loadSubjects(): void {
    this.pageState = 'loading';
    const schoolId = this.auth.currentUser()?.schoolId;
    this.academicService.getSubjects(schoolId).subscribe({
      next: (data) => {
        this.subjects = data || [];
        this.pageState = this.subjects.length === 0 ? 'empty' : 'normal';
      },
      error: () => {
        this.pageState = 'error';
      }
    });
  }

  openCreateModal(): void {
    this.subjectForm.reset({
      schoolId: this.auth.currentUser()?.schoolId || (this.schools[0]?.id || ''),
      academicYearId: this.academicYears[0]?.id || '',
      standardId: this.standards[0]?.id || '',
      code: '',
      name: '',
      language: 'both'
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveSubject(): void {
    if (this.subjectForm.invalid) return;
    this.isSubmitting = true;
    const req = this.subjectForm.value as SubjectRequest;

    this.academicService.createSubject(req).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeModal();
        this.loadSubjects();
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }
}
