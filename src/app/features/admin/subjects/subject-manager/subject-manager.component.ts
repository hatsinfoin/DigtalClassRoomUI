import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AcademicService } from '../../../../core/services/academic.service';
import { AdminService } from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SubjectResponse, SubjectRequest, StandardResponse, AcademicYearResponse, SchoolResponse } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';
import { TeluguNfcPipe } from '../../../../shared/pipes/telugu-nfc.pipe';

interface StandardSubjectsGroup {
  standard: StandardResponse;
  standardId: string;
  standardNumber: number;
  standardName: string;
  section?: string;
  subjects: SubjectResponse[];
  isExpanded: boolean;
}

@Component({
  selector: 'app-subject-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UxStateContainerComponent, TeluguNfcPipe],
  template: `
    <div class="admin-page-container">
      <!-- Top Title & Action Header -->
      <div class="page-header">
        <div class="title-group">
          <h1>Curriculum Subjects</h1>
          <p>Define bilingual subjects, curriculum modules, and standard associations</p>
        </div>

        <div class="header-main-actions">
          @if (isPlatformAdmin()) {
            <div class="school-filter-box">
              <label class="filter-label">School:</label>
              <select [ngModel]="selectedSchoolId()" (ngModelChange)="onSchoolChange($event)" class="filter-select">
                @for (s of schools(); track s.id) {
                  <option [value]="s.id">{{ s.name }} ({{ s.code }})</option>
                }
              </select>
            </div>
          }
          <button class="secondary-btn" (click)="toggleAllStandards()">
            <span>{{ areAllExpanded() ? '▲ Collapse All' : '▼ Expand All' }}</span>
          </button>
          <button class="primary-btn" (click)="openCreateModal()">
            <span>➕ Add Subject</span>
          </button>
        </div>
      </div>

      <!-- School Identity Banner for ROLE_ADMIN -->
      <div class="school-scope-banner">
        <div class="school-info">
          <span class="school-icon">🏫</span>
          <div class="school-details">
            <span class="school-title">{{ currentSchoolName() }}</span>
            <span class="school-code-pill">{{ currentSchoolCode() }}</span>
          </div>
        </div>
        <div class="stats-pills">
          <span class="stat-pill">
            <strong>{{ standards().length }}</strong> Standards
          </span>
          <span class="stat-pill">
            <strong>{{ subjects().length }}</strong> Total Subjects
          </span>
        </div>
      </div>

      <!-- Top Search Toolbar -->
      <div class="search-toolbar-card">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            [ngModel]="searchTerm()"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Search subjects by name (English / తెలుగు), code (e.g. MATH-10), or class..."
            class="top-search-input"
          />
          @if (searchTerm()) {
            <button class="clear-search-btn" (click)="onSearchChange('')">✕</button>
          }
        </div>
        <div class="search-stats">
          <span>Showing <strong>{{ filteredGroups().length }}</strong> classes with subjects</span>
        </div>
      </div>

      <!-- Main Content with UX State -->
      <app-ux-state
        [state]="pageState()"
        emptyMessage="No subjects configured for this institution. Click 'Add Subject' to get started."
        [technicalDetails]="technicalError()"
        (onRetry)="loadAllData()"
      >
        <div class="standard-accordions-list">
          @for (group of filteredGroups(); track group.standardId) {
            <div class="standard-accordion-card" [class.expanded]="group.isExpanded">
              <!-- Accordion Header -->
              <div class="standard-header-bar" (click)="toggleStandard(group.standardId)">
                <div class="standard-identity">
                  <span class="grade-icon">📚</span>
                  <div class="standard-titles">
                    <h3>{{ group.standardName }}</h3>
                    <span class="grade-count-pill">{{ group.subjects.length }} Subjects</span>
                  </div>
                </div>

                <div class="standard-actions" (click)="$event.stopPropagation()">
                  <button class="btn-toggle-accordion" (click)="toggleStandard(group.standardId)">
                    <span>{{ group.isExpanded ? '▲' : '▼' }}</span>
                  </button>
                </div>
              </div>

              <!-- Accordion Body: Subjects Grid -->
              @if (group.isExpanded) {
                <div class="standard-body-content">
                  @if (group.subjects.length === 0) {
                    <div class="empty-subjects-placeholder">
                      <span>No subjects mapped to this standard yet.</span>
                      <button class="btn-link" (click)="openCreateModal(group.standardId)">+ Add First Subject</button>
                    </div>
                  } @else {
                    <div class="subjects-grid">
                      @for (sub of group.subjects; track sub.id) {
                        <div class="subject-card glass-card">
                          <div class="subject-card-header">
                            <span class="code-pill">{{ sub.code }}</span>
                            <span class="lang-badge" [class.telugu-lang]="sub.language === 'te'" [class.english-lang]="sub.language === 'en'">
                              {{ getLanguageLabel(sub.language) }}
                            </span>
                          </div>

                          <div class="subject-body">
                            <h4 class="subject-title">{{ sub.name }}</h4>
                            <div class="telugu-sub-title">{{ sub.name | teluguNfc }}</div>
                            <div class="subject-meta-row">
                              <span class="meta-tag">📘 Standard {{ group.standardNumber }}</span>
                            </div>
                          </div>

                          <div class="subject-card-footer">
                            <button class="btn-card-action btn-edit" (click)="openEditModal(sub)" title="Edit Subject Details">
                              <span>✏️ Edit</span>
                            </button>
                            <button class="btn-card-action btn-delete" (click)="openDeleteConfirm(sub)" title="Delete Subject">
                              <span>🗑️ Delete</span>
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      </app-ux-state>

      <!-- Modal: Add / Edit Subject -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-dialog edit-subject-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editingSubjectId() ? '✏️ Edit Subject' : '➕ Add Curriculum Subject' }}</h2>
              <button class="close-btn" (click)="closeModal()">✕</button>
            </div>

            <form [formGroup]="subjectForm" (ngSubmit)="saveSubject()">
              <div class="form-grid">
                <!-- Institution (Locked in Edit or for School Admin) -->
                <div class="form-group full-width" [class.locked-field]="editingSubjectId() || !isPlatformAdmin()">
                  <label class="field-label-top">
                    <span>🏛️ Institution</span>
                    @if (editingSubjectId() || !isPlatformAdmin()) {
                      <span class="badge-locked">🔒 Fixed</span>
                    }
                  </label>
                  <select formControlName="schoolId">
                    <option value="">-- Select Institution --</option>
                    @for (s of schools(); track s.id) {
                      <option [value]="s.id">{{ s.name }} ({{ s.code }})</option>
                    }
                  </select>
                </div>

                <!-- Standard / Class Selection -->
                <div class="form-group" [class.locked-field]="editingSubjectId()">
                  <label>
                    <span>Standard / Class</span>
                    @if (editingSubjectId()) {
                      <span class="badge-locked">🔒 Locked</span>
                    }
                  </label>
                  <select formControlName="standardId">
                    <option value="">-- Select Class --</option>
                    @for (std of standards(); track std.id) {
                      <option [value]="std.id">Standard {{ std.standardNumber }} - {{ std.name }}</option>
                    }
                  </select>
                </div>

                <!-- Academic Year -->
                <div class="form-group" [class.locked-field]="editingSubjectId()">
                  <label>
                    <span>Academic Session</span>
                    @if (editingSubjectId()) {
                      <span class="badge-locked">🔒 Locked</span>
                    }
                  </label>
                  <select formControlName="academicYearId">
                    <option value="">-- Select Year --</option>
                    @for (y of academicYears(); track y.id) {
                      <option [value]="y.id">{{ y.year }} ({{ y.label || 'Session ' + y.year }})</option>
                    }
                  </select>
                </div>

                <!-- Subject Code (e.g. MATH-10) -->
                <div class="form-group">
                  <label>
                    <span>Subject Code</span>
                    @if (editingSubjectId()) {
                      <span class="badge-editable">✏️ Editable</span>
                    }
                  </label>
                  <input formControlName="code" placeholder="e.g. MATH-10, TEL-10, PSCI-10" />
                </div>

                <!-- Medium / Instruction Language -->
                <div class="form-group">
                  <label>
                    <span>Medium / Language</span>
                    @if (editingSubjectId()) {
                      <span class="badge-editable">✏️ Editable</span>
                    }
                  </label>
                  <select formControlName="language">
                    <option value="both">Bilingual (English + Telugu)</option>
                    <option value="te">Telugu Medium Only</option>
                    <option value="en">English Medium Only</option>
                  </select>
                </div>

                <!-- Subject Name (Telugu / English NFC) -->
                <div class="form-group full-width">
                  <label>
                    <span>Subject Name (English / తెలుగు)</span>
                    @if (editingSubjectId()) {
                      <span class="badge-editable">✏️ Editable</span>
                    }
                  </label>
                  <input formControlName="name" placeholder="e.g. Mathematics (గణిత శాస్త్రం)" autofocus />
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-secondary" (click)="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="subjectForm.invalid || isSubmitting()">
                  {{ isSubmitting() ? 'Saving...' : (editingSubjectId() ? 'Save Changes' : 'Create Subject') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Confirmation Modal: Delete Subject -->
      @if (showDeleteModal() && selectedSubjectForDelete()) {
        <div class="modal-overlay" (click)="closeDeleteModal()">
          <div class="modal-dialog delete-confirm-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="text-danger">⚠️ Delete Curriculum Subject</h2>
              <button class="close-btn" (click)="closeDeleteModal()">✕</button>
            </div>

            <div class="delete-content">
              <p>
                Are you sure you want to delete the subject 
                <strong>{{ selectedSubjectForDelete()?.name }}</strong> (<code>{{ selectedSubjectForDelete()?.code }}</code>)?
              </p>
              <div class="delete-warning-box">
                This will remove the subject mapping from the standard curriculum.
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeDeleteModal()">Cancel</button>
              <button
                type="button"
                class="btn-danger"
                [disabled]="isSubmitting()"
                (click)="confirmDeleteSubject()"
              >
                {{ isSubmitting() ? 'Deleting...' : 'Confirm Delete' }}
              </button>
            </div>
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

  isPlatformAdmin = computed(() => this.auth.isPlatformAdmin());
  isSchoolAdmin = computed(() => this.auth.isSchoolAdmin());

  pageState = signal<UxStateType>('loading');
  technicalError = signal<string>('');
  subjects = signal<SubjectResponse[]>([]);
  standards = signal<StandardResponse[]>([]);
  schools = signal<SchoolResponse[]>([]);
  academicYears = signal<AcademicYearResponse[]>([]);
  selectedSchoolId = signal<string>('');
  searchTerm = signal<string>('');

  standardAccordionState = signal<Record<string, boolean>>({});

  showModal = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  editingSubjectId = signal<string | number | null>(null);
  selectedSubjectForDelete = signal<SubjectResponse | null>(null);
  isSubmitting = signal<boolean>(false);

  currentSchoolName = computed(() => {
    const sid = this.selectedSchoolId();
    const found = this.schools().find(s => String(s.id) === sid || String((s as any)._id) === sid || String(s.code) === sid);
    return found ? found.name : 'Digital Public School';
  });

  currentSchoolCode = computed(() => {
    const sid = this.selectedSchoolId();
    const found = this.schools().find(s => String(s.id) === sid || String((s as any)._id) === sid || String(s.code) === sid);
    return found ? (found.code || found.schoolCode || 'SCH001') : 'SCH001';
  });

  subjectGroups = computed<StandardSubjectsGroup[]>(() => {
    const stds = [...this.standards()].sort((a, b) => (b.standardNumber || 0) - (a.standardNumber || 0));
    const allSubjects = this.subjects();
    const accordionState = this.standardAccordionState();

    return stds.map(std => {
      const stdId = String(std.id ?? (std as any)._id);
      const matchedSubjects = allSubjects.filter(sub => {
        const subStd = String(sub.standardId || '');
        return subStd === stdId || subStd === String(std.standardNumber);
      });

      // Default to false (all collapsed on page load)
      const isExp = accordionState[stdId] !== undefined ? accordionState[stdId] : false;

      return {
        standard: std,
        standardId: stdId,
        standardNumber: std.standardNumber,
        standardName: std.name || `Standard ${std.standardNumber}`,
        section: std.section,
        subjects: matchedSubjects,
        isExpanded: isExp
      };
    });
  });

  filteredGroups = computed<StandardSubjectsGroup[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const groups = this.subjectGroups();
    if (!term) return groups;

    return groups.map(g => {
      const filteredSubjects = g.subjects.filter(s =>
        (s.name && s.name.toLowerCase().includes(term)) ||
        (s.code && s.code.toLowerCase().includes(term)) ||
        g.standardName.toLowerCase().includes(term)
      );

      const matchesGroupTitle = g.standardName.toLowerCase().includes(term);

      return {
        ...g,
        subjects: matchesGroupTitle ? g.subjects : filteredSubjects,
        isExpanded: matchesGroupTitle || filteredSubjects.length > 0
      };
    }).filter(g => g.subjects.length > 0 || g.standardName.toLowerCase().includes(term));
  });

  areAllExpanded = computed(() => {
    const groups = this.filteredGroups();
    if (groups.length === 0) return false;
    return groups.every(g => g.isExpanded);
  });

  subjectForm: FormGroup = this.fb.group({
    schoolId: ['', Validators.required],
    academicYearId: ['', Validators.required],
    standardId: ['', Validators.required],
    code: ['', Validators.required],
    name: ['', Validators.required],
    language: ['both', Validators.required]
  });

  private defaultSubjects: SubjectResponse[] = [
    { id: 'SUB01', schoolId: 'SCH001', standardId: '10', code: 'MATH-10', name: 'Mathematics (గణిత శాస్త్రం)', language: 'both' },
    { id: 'SUB02', schoolId: 'SCH001', standardId: '10', code: 'PSCI-10', name: 'Physical Science (భౌతిక రసాయన శాస్త్రాలు)', language: 'both' },
    { id: 'SUB03', schoolId: 'SCH001', standardId: '10', code: 'BSCI-10', name: 'Biological Science (జీవ శాస్త్రం)', language: 'both' },
    { id: 'SUB04', schoolId: 'SCH001', standardId: '10', code: 'TEL-10', name: 'Telugu First Language (ప్రథమ భాష తెలుగు)', language: 'te' },
    { id: 'SUB05', schoolId: 'SCH001', standardId: '10', code: 'ENG-10', name: 'English General (ఇంగ్లీష్)', language: 'en' },
    { id: 'SUB06', schoolId: 'SCH001', standardId: '10', code: 'SOC-10', name: 'Social Studies (సాంఘిక శాస్త్రం)', language: 'both' },
    { id: 'SUB07', schoolId: 'SCH001', standardId: '9', code: 'MATH-09', name: 'Mathematics (గణితం - 9వ తరగతి)', language: 'both' },
    { id: 'SUB08', schoolId: 'SCH001', standardId: '9', code: 'SCI-09', name: 'General Science (సాధారణ శాస్త్రం)', language: 'both' },
    { id: 'SUB09', schoolId: 'SCH001', standardId: '8', code: 'MATH-08', name: 'Mathematics (గణితం - 8వ తరగతి)', language: 'both' }
  ];

  private defaultStandards: StandardResponse[] = [
    { id: '10', schoolId: 'SCH001', academicYearId: 'AY-2026-27', standardNumber: 10, name: 'Standard 10 (10వ తరగతి - SSC)', section: 'A' },
    { id: '9', schoolId: 'SCH001', academicYearId: 'AY-2026-27', standardNumber: 9, name: 'Standard 9 (9వ తరగతి)', section: 'A' },
    { id: '8', schoolId: 'SCH001', academicYearId: 'AY-2026-27', standardNumber: 8, name: 'Standard 8 (8వ తరగతి)', section: 'A' }
  ];

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.pageState.set('loading');
    this.technicalError.set('');
    const isPlatform = this.auth.isPlatformAdmin();
    const userSchoolId = this.auth.getSchoolId();

    this.adminService.getSchools().pipe(
      catchError((err) => {
        console.warn('[SubjectManagerComponent] Error fetching schools:', err);
        return of([]);
      })
    ).subscribe(sList => {
      let schools = sList && sList.length > 0 ? sList : [];

      if (!isPlatform && userSchoolId) {
        const filtered = schools.filter(s =>
          String(s.id) === String(userSchoolId) ||
          String((s as any)._id) === String(userSchoolId) ||
          String(s.code) === String(userSchoolId) ||
          String(s.schoolCode) === String(userSchoolId)
        );
        if (filtered.length > 0) schools = filtered;
      }
      this.schools.set(schools);

      const targetSchoolId = (!isPlatform && userSchoolId) ? userSchoolId : (schools[0]?.id || 'SCH001');
      this.selectedSchoolId.set(String(targetSchoolId));

      this.loadSchoolCurriculum(targetSchoolId);
    });
  }

  loadSchoolCurriculum(schoolId: string | number): void {
    // Load Academic Years
    this.academicService.getAcademicYears(schoolId).pipe(
      catchError(() => of([]))
    ).subscribe(years => {
      const yList = Array.isArray(years) ? years : [];
      this.academicYears.set(yList);
    });

    // Load Standards for School
    this.academicService.getStandards(schoolId).pipe(
      catchError((err) => {
        console.warn('[SubjectManagerComponent] Standards fetch issue:', err);
        return of([]);
      })
    ).subscribe(stds => {
      const stdList = Array.isArray(stds) ? stds : [];
      this.standards.set(stdList);

      // Load Subjects for School
      this.academicService.getSubjects(schoolId).subscribe({
        next: (subs) => {
          const list = Array.isArray(subs) ? subs : [];
          this.subjects.set(list);
          this.pageState.set(list.length === 0 ? 'empty' : 'normal');
        },
        error: (err) => {
          console.warn('[SubjectManagerComponent] Backend connection issue:', err);
          this.technicalError.set(`HTTP ${err.status ?? 0} (${err.statusText || 'Connection Refused'}) - /api/subjects`);
          this.pageState.set('error');
        }
      });
    });
  }

  onSchoolChange(newSchoolId: string): void {
    this.selectedSchoolId.set(newSchoolId);
    this.loadSchoolCurriculum(newSchoolId);
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  toggleStandard(standardId: string): void {
    const cur = { ...this.standardAccordionState() };
    cur[standardId] = cur[standardId] !== undefined ? !cur[standardId] : false;
    this.standardAccordionState.set(cur);
  }

  toggleAllStandards(): void {
    const willExpand = !this.areAllExpanded();
    const updated: Record<string, boolean> = {};
    for (const g of this.subjectGroups()) {
      updated[g.standardId] = willExpand;
    }
    this.standardAccordionState.set(updated);
  }

  getLanguageLabel(lang?: string): string {
    if (lang === 'te') return 'Telugu Medium';
    if (lang === 'en') return 'English Medium';
    return 'Bilingual (EN + TE)';
  }

  openCreateModal(standardId?: string): void {
    const sid = this.selectedSchoolId();
    const stds = this.standards();
    const years = this.academicYears();

    this.editingSubjectId.set(null);
    this.subjectForm.enable();
    this.subjectForm.reset({
      schoolId: sid,
      academicYearId: years[0]?.id || '',
      standardId: standardId || stds[0]?.id || '',
      code: '',
      name: '',
      language: 'both'
    });

    if (!this.auth.isPlatformAdmin()) {
      this.subjectForm.get('schoolId')?.disable();
    }

    this.showModal.set(true);
  }

  openEditModal(subject: SubjectResponse): void {
    const subId = subject.id ?? (subject as any)._id;
    this.editingSubjectId.set(subId);

    this.subjectForm.enable();
    this.subjectForm.reset({
      schoolId: subject.schoolId || this.selectedSchoolId(),
      academicYearId: subject.academicYearId || (this.academicYears()[0]?.id || ''),
      standardId: subject.standardId || '',
      code: subject.code || '',
      name: subject.name || '',
      language: subject.language || 'both'
    });

    // Lock institution & standard structure
    this.subjectForm.get('schoolId')?.disable();
    this.subjectForm.get('standardId')?.disable();
    this.subjectForm.get('academicYearId')?.disable();

    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingSubjectId.set(null);
  }

  openDeleteConfirm(subject: SubjectResponse): void {
    this.selectedSubjectForDelete.set(subject);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.selectedSubjectForDelete.set(null);
  }

  saveSubject(): void {
    if (this.subjectForm.invalid) return;
    this.isSubmitting.set(true);
    const req = this.subjectForm.getRawValue() as SubjectRequest;
    const editId = this.editingSubjectId();

    if (editId) {
      // Update Subject in DB via PUT /api/academic/subjects/{id}
      this.academicService.updateSubject(editId, req).pipe(
        catchError(() => {
          const updated = this.subjects().map(s => {
            const sId = s.id ?? (s as any)._id;
            if (String(sId) === String(editId)) {
              return { ...s, ...req };
            }
            return s;
          });
          this.subjects.set(updated);
          return of(null);
        })
      ).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.loadSchoolCurriculum(this.selectedSchoolId());
        },
        error: () => {
          this.isSubmitting.set(false);
        }
      });
    } else {
      // Create Subject in DB via POST /api/academic/subjects
      this.academicService.createSubject(req).pipe(
        catchError(() => {
          const newSub: SubjectResponse = {
            ...req,
            id: 'SUB-' + Date.now().toString().slice(-4)
          };
          this.subjects.set([...this.subjects(), newSub]);
          return of(newSub);
        })
      ).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.loadSchoolCurriculum(this.selectedSchoolId());
        },
        error: () => {
          this.isSubmitting.set(false);
        }
      });
    }
  }

  confirmDeleteSubject(): void {
    const sub = this.selectedSubjectForDelete();
    if (!sub) return;

    this.isSubmitting.set(true);
    const subId = sub.id ?? (sub as any)._id;

    // Optimistic delete
    this.subjects.set(this.subjects().filter(s => {
      const sId = s.id ?? (s as any)._id;
      return String(sId) !== String(subId);
    }));

    this.academicService.deleteSubject(subId).pipe(
      catchError(() => of(null))
    ).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeDeleteModal();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.closeDeleteModal();
      }
    });
  }
}

