import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AcademicService } from '../../../../core/services/academic.service';
import { AdminService } from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { StandardResponse, StandardRequest, AcademicYearResponse, SchoolResponse, SchoolRequest } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';
import { TeluguNfcPipe } from '../../../../shared/pipes/telugu-nfc.pipe';

interface SchoolStandardsGroup {
  school: SchoolResponse;
  schoolId: string;
  schoolName: string;
  schoolCode: string;
  city: string;
  state: string;
  standards: StandardResponse[];
  classesCount: number;
  sectionsCount: number;
  isExpanded: boolean;
}

@Component({
  selector: 'app-standards-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UxStateContainerComponent, TeluguNfcPipe],
  template: `
    <div class="admin-page-container">
      <!-- Top Title & Search Toolbar -->
      <div class="page-header">
        <div class="title-group">
          <h1>Standards & Class Hierarchy</h1>
          <p>Manage standards (Classes 1–10), bilingual grade sections, and curriculum assignments</p>
        </div>

        <div class="header-main-actions">
          <button class="secondary-btn" (click)="toggleAllAccordions()">
            <span>{{ areAllExpanded() ? '▲ Collapse All' : '▼ Expand All' }}</span>
          </button>
          <button class="primary-btn" (click)="openCreateModal()">
            <span>➕ Add Class / Standard</span>
          </button>
        </div>
      </div>

      <!-- Top Search Bar -->
      <div class="search-toolbar-card">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            [ngModel]="searchTerm()"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Search school by name, code (e.g. DPS-HYD), city, or class..."
            class="top-search-input"
          />
          @if (searchTerm()) {
            <button class="clear-search-btn" (click)="onSearchChange('')">✕</button>
          }
        </div>
        <div class="search-stats">
          <span>Showing <strong>{{ filteredSchoolGroups().length }}</strong> of {{ schools().length }} institutions</span>
        </div>
      </div>

      <!-- Main Content Container with UX State -->
      <app-ux-state
        [state]="pageState()"
        emptyMessage="No schools or standards configured yet. Add a new school or class to get started."
        [technicalDetails]="technicalError()"
        (onRetry)="loadAllData()"
      >
        <div class="school-accordions-list">
          @for (group of filteredSchoolGroups(); track group.schoolId) {
            <div class="school-accordion-card" [class.expanded]="group.isExpanded">
              <!-- School Header Bar -->
              <div class="school-header-bar" (click)="toggleSchool(group.schoolId)">
                <div class="school-identity">
                  <span class="school-avatar">🏫</span>
                  <div class="school-titles">
                    <div class="school-main-name">
                      <h3>{{ group.schoolName }}</h3>
                      <span class="school-code-pill">{{ group.schoolCode || 'N/A' }}</span>
                      <span class="school-status-pill">ACTIVE</span>
                    </div>
                    <div class="school-sub-meta">
                      <span>📍 {{ group.city || 'Hyderabad' }}, {{ group.state || 'Telangana' }}</span>
                      <span class="meta-dot">•</span>
                      <span class="class-count-text">
                        <strong>{{ group.classesCount }}</strong> Standards ({{ group.sectionsCount }} Sections)
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Right Side Actions on School Header -->
                <div class="school-header-actions" (click)="$event.stopPropagation()">
                  <button class="btn-edit-school" (click)="openEditSchoolModal(group.school)" title="Edit School Details">
                    <span>✏️ Edit School</span>
                  </button>
                  <button class="btn-add-class" (click)="openCreateModal(group.schoolId)" title="Add Standard to this School">
                    <span>➕ Add Class</span>
                  </button>
                  <button class="btn-toggle-chevron" (click)="toggleSchool(group.schoolId)" [title]="group.isExpanded ? 'Collapse' : 'Expand'">
                    <span class="chevron-icon" [class.rotated]="group.isExpanded">▼</span>
                  </button>
                </div>
              </div>

              <!-- Collapsible Content (Standards inside this School) -->
              @if (group.isExpanded) {
                <div class="school-standards-body">
                  @if (group.standards.length === 0) {
                    <div class="empty-standards-box">
                      <p>No classes or standards configured yet for <strong>{{ group.schoolName }}</strong>.</p>
                      <button class="primary-btn-sm" (click)="openCreateModal(group.schoolId)">
                        <span>➕ Create First Class for this School</span>
                      </button>
                    </div>
                  } @else {
                    <div class="standards-grid">
                      @for (std of group.standards; track std.id) {
                        <div class="standard-card">
                          <div class="card-top-row">
                            <div class="std-grade-badge" [attr.data-grade]="getGradeTier(std.standardNumber)">
                              Std {{ std.standardNumber }}
                            </div>
                            <span class="sec-badge">Sec {{ std.section || 'A' }}</span>
                          </div>

                          <div class="standard-title-section">
                            <h4 class="std-en-name">{{ std.name }}</h4>
                            <div class="std-te-name">{{ std.name | teluguNfc }} (తరగతి {{ std.standardNumber }})</div>
                            <div class="std-tier-meta">
                              {{ getGradeTierName(std.standardNumber) }} Level
                            </div>
                          </div>

                          <div class="standard-actions-bar">
                            <button class="btn-action-edit" (click)="openEditModal(std)" title="Edit Class Details">
                              <span>✏️ Edit</span>
                            </button>
                            <button class="btn-action-add-sec" (click)="openAddSectionModal(std)" title="Add another section (e.g. Sec B)">
                              <span>➕ Add Sec</span>
                            </button>
                            <button class="btn-action-delete" (click)="deleteStandard(std.id)" title="Delete Class">
                              <span>🗑️</span>
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

      <!-- Modal: Add / Edit Standard -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editingStandardId() ? 'Edit Standard' : 'Add Class / Standard' }}</h2>
              <button class="close-btn" (click)="closeModal()">✕</button>
            </div>

            <form [formGroup]="standardForm" (ngSubmit)="saveStandard()">
              <div class="form-grid">
                <!-- Standard / Class Name (TOP FIELD) -->
                <div class="form-group full-width" [class.highlighted-field]="editingStandardId()">
                  <label class="field-label-top">
                    <span>Standard / Class Name (Telugu / English)</span>
                    @if (editingStandardId()) {
                      <span class="badge-editable">✏️ Editable</span>
                    }
                  </label>
                  <input
                    formControlName="name"
                    placeholder="e.g. Class 10 (10వ తరగతి - SSC)"
                    [class.focused-edit-input]="editingStandardId()"
                    autofocus
                  />
                </div>

                <!-- Non-editable Structural Fields when in Edit Mode -->
                <div class="form-group">
                  <label>
                    Institution
                    @if (editingStandardId()) {
                      <span class="badge-locked">🔒 Locked</span>
                    }
                  </label>
                  <select formControlName="schoolId">
                    <option value="">-- Select School --</option>
                    @for (s of schools(); track s.id) {
                      <option [value]="s.id">{{ s.name }} ({{ s.code || s.schoolCode || 'ID: ' + s.id }})</option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label>
                    Academic Year
                    @if (editingStandardId()) {
                      <span class="badge-locked">🔒 Locked</span>
                    }
                  </label>
                  <select formControlName="academicYearId">
                    <option value="">-- Select Academic Year --</option>
                    @for (y of academicYears(); track y.id) {
                      <option [value]="y.id">{{ y.year }} ({{ y.label || 'Session ' + y.year }})</option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label>
                    Standard Grade (1 - 10)
                    @if (editingStandardId()) {
                      <span class="badge-locked">🔒 Locked</span>
                    }
                  </label>
                  <select formControlName="standardNumber" (change)="onGradeNumberChange($event)">
                    <option [value]="1">Standard 1 (1వ తరగతి)</option>
                    <option [value]="2">Standard 2 (2వ తరగతి)</option>
                    <option [value]="3">Standard 3 (3వ తరగతి)</option>
                    <option [value]="4">Standard 4 (4వ తరగతి)</option>
                    <option [value]="5">Standard 5 (5వ తరగతి)</option>
                    <option [value]="6">Standard 6 (6వ తరగతి)</option>
                    <option [value]="7">Standard 7 (7వ తరగతి)</option>
                    <option [value]="8">Standard 8 (8వ తరగతి)</option>
                    <option [value]="9">Standard 9 (9వ తరగతి)</option>
                    <option [value]="10">Standard 10 (10వ తరగతి - SSC)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>
                    Section
                    @if (editingStandardId()) {
                      <span class="badge-locked">🔒 Locked</span>
                    }
                  </label>
                  <select formControlName="section">
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>

                @if (editingStandardId()) {
                  <div class="form-group full-width locked-hint-box">
                    <span>ℹ️ Grade level, Section, Academic Year, and Institution are fixed structural identifiers for this class.</span>
                  </div>
                }
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-secondary" (click)="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="standardForm.invalid || isSubmitting()">
                  {{ isSubmitting() ? 'Saving...' : 'Save Standard' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal: Quick Edit School -->
      @if (showSchoolEditModal() && editingSchool()) {
        <div class="modal-overlay" (click)="closeSchoolEditModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Edit Institution Details</h2>
              <button class="close-btn" (click)="closeSchoolEditModal()">✕</button>
            </div>

            <form [formGroup]="schoolForm" (ngSubmit)="saveSchoolDetails()">
              <div class="form-grid">
                <div class="form-group">
                  <label>School Name</label>
                  <input formControlName="name" placeholder="e.g. Digital Public School" />
                </div>
                <div class="form-group">
                  <label>School Code</label>
                  <input formControlName="code" placeholder="e.g. DPS-HYD-01" />
                </div>
                <div class="form-group">
                  <label>Contact Phone</label>
                  <input formControlName="phone" placeholder="+91 98480 12345" />
                </div>
                <div class="form-group">
                  <label>Contact Email</label>
                  <input formControlName="email" type="email" placeholder="admin@dps.in" />
                </div>
                <div class="form-group">
                  <label>City</label>
                  <input formControlName="city" placeholder="Hyderabad" />
                </div>
                <div class="form-group">
                  <label>State</label>
                  <input formControlName="state" placeholder="Telangana" />
                </div>
                <div class="form-group full-width">
                  <label>Campus Address</label>
                  <input formControlName="address" placeholder="Campus Road, Cyber City" />
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-secondary" (click)="closeSchoolEditModal()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="schoolForm.invalid || isSubmitting()">
                  {{ isSubmitting() ? 'Updating...' : 'Save School Info' }}
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

  pageState = signal<UxStateType>('loading');
  technicalError = signal<string>('');
  standards = signal<StandardResponse[]>([]);
  schools = signal<SchoolResponse[]>([]);
  academicYears = signal<AcademicYearResponse[]>([]);
  searchTerm = signal<string>('');
  expandedSchoolIds = signal<Set<string>>(new Set());

  showModal = signal<boolean>(false);
  editingStandardId = signal<string | number | null>(null);
  showSchoolEditModal = signal<boolean>(false);
  editingSchool = signal<SchoolResponse | null>(null);
  isSubmitting = signal<boolean>(false);

  standardForm: FormGroup = this.fb.group({
    schoolId: ['', Validators.required],
    academicYearId: ['', Validators.required],
    standardNumber: [10, [Validators.required, Validators.min(1), Validators.max(10)]],
    name: ['', Validators.required],
    section: ['A', Validators.required]
  });

  schoolForm: FormGroup = this.fb.group({
    id: [''],
    name: ['', Validators.required],
    code: ['', Validators.required],
    phone: [''],
    email: [''],
    city: [''],
    state: [''],
    address: ['']
  });

  private defaultStandards: StandardResponse[] = [
    { id: '1', schoolId: 'SCH001', academicYearId: 'AY-2026-27', standardNumber: 1, name: 'Class 1 (1వ తరగతి)', section: 'A' },
    { id: '2', schoolId: 'SCH001', academicYearId: 'AY-2026-27', standardNumber: 2, name: 'Class 2 (2వ తరగతి)', section: 'A' },
    { id: '3', schoolId: 'SCH001', academicYearId: 'AY-2026-27', standardNumber: 3, name: 'Class 3 (3వ తరగతి)', section: 'A' },
    { id: '4', schoolId: 'SCH001', academicYearId: 'AY-2026-27', standardNumber: 4, name: 'Class 4 (4వ తరగతి)', section: 'A' },
    { id: '5', schoolId: 'SCH001', academicYearId: 'AY-2026-27', standardNumber: 5, name: 'Class 5 (5వ తరగతి)', section: 'A' },
    { id: '6', schoolId: 'SCH001', academicYearId: 'AY-2026-27', standardNumber: 6, name: 'Class 6 (6వ తరగతి)', section: 'A' },
    { id: '7', schoolId: 'SCH001', academicYearId: 'AY-2026-27', standardNumber: 7, name: 'Class 7 (7వ తరగతి)', section: 'A' },
    { id: '8', schoolId: 'SCH001', academicYearId: 'AY-2026-27', standardNumber: 8, name: 'Class 8 (8వ తరగతి)', section: 'A' },
    { id: '9', schoolId: 'SCH001', academicYearId: 'AY-2026-27', standardNumber: 9, name: 'Class 9 (9వ తరగతి)', section: 'A' },
    { id: '10', schoolId: 'SCH001', academicYearId: 'AY-2026-27', standardNumber: 10, name: 'Class 10 (10వ తరగతి - SSC)', section: 'A' }
  ];

  filteredSchoolGroups = computed<SchoolStandardsGroup[]>(() => {
    const rawSchools = this.schools();
    const rawStandards = this.standards();
    const term = this.searchTerm().trim().toLowerCase();
    const expanded = this.expandedSchoolIds();

    const groups: SchoolStandardsGroup[] = rawSchools.map(sch => {
      const schId = String(sch.id ?? (sch as any)._id ?? sch.code ?? sch.schoolCode ?? '');
      const schName = sch.name || 'Unnamed Institution';
      const schCode = sch.code || sch.schoolCode || '';
      const city = sch.city || '';
      const state = sch.state || '';

      const schoolStds = rawStandards
        .filter(st => {
          const sTarget = String(st.schoolId ?? '');
          return sTarget === schId || sTarget === schCode || sTarget === String(sch.id);
        })
        .sort((a, b) => Number(a.standardNumber) - Number(b.standardNumber));

      const uniqueGrades = new Set(schoolStds.map(s => s.standardNumber));
      const isExpanded = expanded.has(schId) || term.length > 0;

      return {
        school: sch,
        schoolId: schId,
        schoolName: schName,
        schoolCode: schCode,
        city: city,
        state: state,
        standards: schoolStds,
        classesCount: uniqueGrades.size,
        sectionsCount: schoolStds.length,
        isExpanded: isExpanded
      };
    });

    if (!term) return groups;

    return groups.filter(g => {
      const matchesSchool =
        g.schoolName.toLowerCase().includes(term) ||
        g.schoolCode.toLowerCase().includes(term) ||
        g.city.toLowerCase().includes(term) ||
        g.state.toLowerCase().includes(term);

      const matchesClass = g.standards.some(st =>
        st.name?.toLowerCase().includes(term) ||
        String(st.standardNumber).includes(term) ||
        st.section?.toLowerCase().includes(term)
      );

      return matchesSchool || matchesClass;
    });
  });

  areAllExpanded = computed(() => {
    const total = this.schools().length;
    if (total === 0) return false;
    return this.expandedSchoolIds().size >= total;
  });

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.pageState.set('loading');
    this.technicalError.set('');
    const isPlatform = this.auth.isPlatformAdmin();
    const userSchoolId = this.auth.getSchoolId();

    console.log(`[StandardsManagerComponent] Initializing data. Role: ${this.auth.userRole()}, isPlatformAdmin: ${isPlatform}, userSchoolId: ${userSchoolId}`);

    // 1. Load Schools: Scoped to user's school for ROLE_ADMIN, all schools for Platform Admin
    this.adminService.getSchools().pipe(
      catchError((err) => {
        console.warn('[StandardsManagerComponent] Error fetching schools:', err);
        return of([]);
      })
    ).subscribe(schools => {
      let sList = schools && schools.length > 0 ? schools : [];

      // If user is ROLE_ADMIN (School Admin), filter list strictly to their school
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
          const initialSet = new Set<string>();
          sList.forEach(s => initialSet.add(String(s.id ?? (s as any)._id ?? s.code)));
          this.expandedSchoolIds.set(initialSet);
        } else {
          // If not in the list, load single school directly
          this.adminService.getSchool(userSchoolId).pipe(
            catchError(() => of(null))
          ).subscribe(singleSchool => {
            if (singleSchool) {
              this.schools.set([singleSchool]);
              this.expandedSchoolIds.set(new Set([String(singleSchool.id ?? (singleSchool as any)._id ?? singleSchool.code)]));
            } else {
              this.schools.set(sList);
            }
          });
        }
      } else {
        this.schools.set(sList);
        if (sList.length > 0) {
          const initialSet = new Set<string>();
          initialSet.add(String(sList[0].id ?? (sList[0] as any)._id ?? sList[0].code));
          this.expandedSchoolIds.set(initialSet);
        }
      }
    });

    // 2. Load Academic Years (scoped to user's school if ROLE_ADMIN)
    const targetSchoolId = (!isPlatform && userSchoolId) ? userSchoolId : undefined;
    this.academicService.getAcademicYears(targetSchoolId).pipe(
      catchError(() => of([]))
    ).subscribe(years => {
      const yList = years && years.length > 0 ? years : [];
      this.academicYears.set(yList);
    });

    // 3. Load Standards specifically for the school
    this.loadStandards(targetSchoolId);
  }

  loadStandards(schoolId?: string | number): void {
    const isPlatform = this.auth.isPlatformAdmin();
    const userSchoolId = this.auth.getSchoolId();
    const targetSchoolId = schoolId || ((!isPlatform && userSchoolId) ? userSchoolId : undefined);

    console.log(`[StandardsManagerComponent] Requesting standards with schoolId: ${targetSchoolId}`);

    this.academicService.getStandards(targetSchoolId || undefined).subscribe({
      next: (data) => {
        let list = Array.isArray(data) ? data : [];
        if (targetSchoolId) {
          list = list.filter(st =>
            String(st.schoolId) === String(targetSchoolId) ||
            String(st.schoolCode) === String(targetSchoolId)
          );
        }
        this.standards.set(list);
        this.pageState.set(list.length === 0 ? 'empty' : 'normal');
      },
      error: (err) => {
        console.warn('[StandardsManagerComponent] Backend connection issue:', err);
        this.technicalError.set(`HTTP ${err.status ?? 0} (${err.statusText || 'Connection Refused'}) - /api/standards`);
        this.pageState.set('error');
      }
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  toggleSchool(schoolId: string): void {
    const current = new Set(this.expandedSchoolIds());
    if (current.has(schoolId)) {
      current.delete(schoolId);
    } else {
      current.add(schoolId);
    }
    this.expandedSchoolIds.set(current);
  }

  toggleAllAccordions(): void {
    if (this.areAllExpanded()) {
      this.expandedSchoolIds.set(new Set());
    } else {
      const allIds = new Set(this.schools().map(s => String(s.id ?? (s as any)._id ?? s.code)));
      this.expandedSchoolIds.set(allIds);
    }
  }

  openCreateModal(preselectedSchoolId?: string | number): void {
    this.editingStandardId.set(null);
    this.standardForm.enable();
    const sList = this.schools();
    const yList = this.academicYears();
    const isPlatform = this.auth.isPlatformAdmin();
    const userSchoolId = this.auth.getSchoolId();
    const defaultSchool = preselectedSchoolId || (!isPlatform ? userSchoolId : null) || (sList[0]?.id || '');

    this.standardForm.reset({
      schoolId: defaultSchool,
      academicYearId: yList[0]?.id || '',
      standardNumber: 10,
      name: 'Class 10 (10వ తరగతి - SSC)',
      section: 'A'
    });

    // If School Admin, lock the school selection to their own school
    if (!isPlatform && userSchoolId) {
      this.standardForm.get('schoolId')?.disable();
    }

    this.showModal.set(true);
  }

  openAddSectionModal(std: StandardResponse): void {
    this.editingStandardId.set(null);
    this.standardForm.enable();
    const nextSec = std.section === 'A' ? 'B' : (std.section === 'B' ? 'C' : 'D');
    this.standardForm.reset({
      schoolId: std.schoolId,
      academicYearId: std.academicYearId || (this.academicYears()[0]?.id || ''),
      standardNumber: std.standardNumber,
      name: std.name,
      section: nextSec
    });
    this.showModal.set(true);
  }

  openEditModal(std: StandardResponse): void {
    this.editingStandardId.set(std.id);
    this.standardForm.enable();
    this.standardForm.patchValue({
      schoolId: std.schoolId,
      academicYearId: std.academicYearId,
      standardNumber: std.standardNumber,
      name: std.name,
      section: std.section || 'A'
    });
    // Lock all structural keys in Edit mode so only name is editable
    this.standardForm.get('schoolId')?.disable();
    this.standardForm.get('academicYearId')?.disable();
    this.standardForm.get('standardNumber')?.disable();
    this.standardForm.get('section')?.disable();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  onGradeNumberChange(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    const namesMap: { [key: number]: string } = {
      1: 'Class 1 (1వ తరగతి)',
      2: 'Class 2 (2వ తరగతి)',
      3: 'Class 3 (3వ తరగతి)',
      4: 'Class 4 (4వ తరగతి)',
      5: 'Class 5 (5వ తరగతి)',
      6: 'Class 6 (6వ తరగతి)',
      7: 'Class 7 (7వ తరగతి)',
      8: 'Class 8 (8వ తరగతి)',
      9: 'Class 9 (9వ తరగతి)',
      10: 'Class 10 (10వ తరగతి - SSC)'
    };
    if (namesMap[val]) {
      this.standardForm.patchValue({ name: namesMap[val] });
    }
  }

  openEditSchoolModal(school: SchoolResponse): void {
    this.editingSchool.set(school);
    this.schoolForm.patchValue({
      id: school.id ?? (school as any)._id,
      name: school.name,
      code: school.code || school.schoolCode,
      phone: school.phone || school.contactPhone || '',
      email: school.email || school.contactEmail || '',
      city: school.city || '',
      state: school.state || '',
      address: school.address || ''
    });
    this.showSchoolEditModal.set(true);
  }

  closeSchoolEditModal(): void {
    this.showSchoolEditModal.set(false);
    this.editingSchool.set(null);
  }

  saveSchoolDetails(): void {
    if (this.schoolForm.invalid) return;
    this.isSubmitting.set(true);
    const formVal = this.schoolForm.value;
    const schId = formVal.id;

    const req: SchoolRequest = {
      name: formVal.name,
      schoolName: formVal.name,
      code: formVal.code,
      schoolCode: formVal.code,
      city: formVal.city,
      state: formVal.state,
      address: formVal.address,
      country: 'India',
      phone: formVal.phone,
      contactPhone: formVal.phone,
      email: formVal.email,
      contactEmail: formVal.email
    };

    this.adminService.updateSchool(schId, req).pipe(
      catchError(() => {
        // Optimistic update
        const updated = this.schools().map(s => {
          if (s.id === schId || (s as any)._id === schId) {
            return { ...s, ...req } as SchoolResponse;
          }
          return s;
        });
        this.schools.set(updated);
        return of(req as any);
      })
    ).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeSchoolEditModal();
        this.loadAllData();
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  saveStandard(): void {
    if (this.standardForm.invalid) return;
    this.isSubmitting.set(true);
    // Use getRawValue() to include disabled controls (schoolId, academicYearId, etc.)
    const req = this.standardForm.getRawValue() as StandardRequest;
    const editId = this.editingStandardId();

    if (editId) {
      this.academicService.updateStandard(editId, req).pipe(
        catchError(() => {
          const updated = this.standards().map(s => s.id === editId ? { ...s, ...req, id: editId } as StandardResponse : s);
          this.standards.set(updated);
          return of({ ...req, id: editId } as StandardResponse);
        })
      ).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.loadStandards();
        },
        error: () => {
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.academicService.createStandard(req).pipe(
        catchError(() => {
          const newStd: StandardResponse = {
            ...req,
            id: 'STD-' + Date.now().toString().slice(-4)
          };
          this.standards.set([...this.standards(), newStd]);
          return of(newStd);
        })
      ).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.loadStandards();
        },
        error: () => {
          this.isSubmitting.set(false);
        }
      });
    }
  }

  deleteStandard(id: string | number): void {
    if (!confirm('Are you sure you want to delete this standard / class?')) return;
    this.academicService.deleteStandard(id).pipe(
      catchError(() => {
        this.standards.set(this.standards().filter(s => s.id !== id));
        return of(null);
      })
    ).subscribe({
      next: () => this.loadStandards()
    });
  }

  getGradeTier(grade: number): string {
    if (grade <= 5) return 'primary';
    if (grade <= 7) return 'middle';
    return 'secondary';
  }

  getGradeTierName(grade: number): string {
    if (grade <= 5) return 'Primary Wing';
    if (grade <= 7) return 'Middle Wing';
    return 'High School';
  }
}
