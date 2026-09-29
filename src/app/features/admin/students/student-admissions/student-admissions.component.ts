import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminService } from '../../../../core/services/admin.service';
import { AcademicService } from '../../../../core/services/academic.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  StudentEnrollmentRequest,
  StudentEnrollmentResponse,
  StudentUpdateRequest,
  BulkEnrollmentResult,
  StandardResponse,
  SchoolResponse,
  ParentProfileResponse,
  ParentUpdateRequest,
  LinkedSiblingSummary
} from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';
import { TeluguNfcPipe } from '../../../../shared/pipes/telugu-nfc.pipe';

interface StudentRosterItem {
  id: string | number;
  name: string;
  rollNumber: string;
  standardNumber: number;
  standardId?: string | number;
  section: string;
  parentPhone: string;
  parentName?: string;
  parentRelation?: string;
  gender: string;
  dob?: string;
  email?: string;
  status: string;
  siblingCount?: number;
}

@Component({
  selector: 'app-student-admissions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UxStateContainerComponent, TeluguNfcPipe],
  templateUrl: './student-admissions.component.html',
  styleUrls: ['./student-admissions.component.scss']
})
export class StudentAdmissionsComponent implements OnInit {
  private adminService = inject(AdminService);
  private academicService = inject(AcademicService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  // Role Signals
  isPlatformAdmin = computed(() => this.auth.isPlatformAdmin());
  isAdmin = computed(() => this.auth.isPlatformAdmin() || this.auth.isSchoolAdmin());

  // Page State
  pageState = signal<UxStateType>('normal');
  pageErrorTitle = signal<string>('Failed to load student directory');
  pageErrorMessage = signal<string>('');
  hasSearched = signal<boolean>(false);
  isSearching = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Toast Notifications & Modal Error Banners
  toast = signal<{ type: 'error' | 'success'; text: string } | null>(null);
  private toastTimeout: any = null;
  modalErrorMessage = signal<string | null>(null);

  // Data Signals
  schools = signal<SchoolResponse[]>([]);
  standards = signal<StandardResponse[]>([]);
  roster = signal<StudentRosterItem[]>([]);
  bulkResult = signal<BulkEnrollmentResult | null>(null);

  // Filter Selection Signals
  selectedSchoolId = signal<string>('');
  selectedStandardId = signal<string>('');
  selectedSection = signal<string>('');
  availableSections = signal<string[]>(['A', 'B', 'C']);

  // Modal Control Signals
  showEnrollModal = signal<boolean>(false);
  showEditStudentModal = signal<boolean>(false);
  showBulkModal = signal<boolean>(false);
  showParentModal = signal<boolean>(false);
  isEditingParent = signal<boolean>(false);
  showLinkSiblingForm = signal<boolean>(false);

  // Active Parent Context for Modal
  activeParent = signal<ParentProfileResponse | null>(null);
  siblingSearchPhone = signal<string>('');
  availableStudentsToLink = signal<StudentRosterItem[]>([]);
  selectedStudentToLink = signal<string>('');
  siblingSearchText = signal<string>('');
  isSiblingDropdownOpen = signal<boolean>(false);
  isLoadingAvailableStudents = signal<boolean>(false);

  filteredStudentsToLink = computed(() => {
    const q = this.siblingSearchText().trim().toLowerCase();
    const list = this.availableStudentsToLink();
    if (!q) return list;
    return list.filter(stu => {
      const name = (stu.name || '').toLowerCase();
      const roll = (stu.rollNumber || '').toLowerCase();
      const section = (stu.section || '').toLowerCase();
      const stdNum = String(stu.standardNumber || '');
      const phone = (stu.parentPhone || '').toLowerCase();
      return name.includes(q) || roll.includes(q) || section.includes(q) || stdNum.includes(q) || phone.includes(q);
    });
  });

  selectedStudentDetails = computed(() => {
    const selId = this.selectedStudentToLink();
    if (!selId) return null;
    return this.availableStudentsToLink().find(s => String(s.id) === String(selId)) || null;
  });

  // Sibling Auto-Detection Hint & 3-Step Wizard
  detectedExistingParent = signal<{
    name: string;
    relation: string;
    childrenCount: number;
    siblings?: Array<{
      id?: string | number;
      name: string;
      rollNumber?: string;
      standardNumber?: number | string;
      section?: string;
    }>;
  } | null>(null);
  enrollmentStep = signal<1 | 2 | 3>(1);
  createdCredentials = signal<{
    username: string;
    tempPassword?: string;
    studentName: string;
    rollNumber: string;
    parentPhone: string;
    parentName?: string;
    isExistingParent?: boolean;
  } | null>(null);

  // Forms
  enrollForm: FormGroup = this.fb.group({
    schoolId: ['', Validators.required],
    standardId: ['', Validators.required],
    section: ['A', Validators.required],
    name: ['', Validators.required],
    rollNumber: ['', Validators.required],
    gender: ['MALE', Validators.required],
    dob: ['2012-05-15', Validators.required],
    email: [''],
    // Parent Details
    parentPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    parentName: [''],
    parentRelation: ['FATHER', Validators.required],
    alternatePhone: [''],
    occupation: [''],
    address: [''],
    preferredLanguage: ['TELUGU']
  });

  editStudentForm: FormGroup = this.fb.group({
    id: [''],
    schoolId: ['', Validators.required],
    standardId: ['', Validators.required],
    section: ['A', Validators.required],
    name: ['', Validators.required],
    rollNumber: ['', Validators.required],
    gender: ['MALE', Validators.required],
    dob: ['2012-05-15', Validators.required],
    parentPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    email: ['']
  });

  parentEditForm: FormGroup = this.fb.group({
    schoolId: ['', Validators.required],
    name: ['', Validators.required],
    relation: ['FATHER', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    alternatePhone: [''],
    email: [''],
    occupation: [''],
    address: [''],
    preferredLanguage: ['TELUGU']
  });

  bulkStandardId = '';
  selectedFile: File | null = null;

  ngOnInit(): void {
    this.initializeSchoolScope();
    this.enrollForm.get('standardId')?.valueChanges.subscribe(() => {
      if (this.showEnrollModal()) {
        this.autoFetchRollNumber();
      }
    });
    this.enrollForm.get('section')?.valueChanges.subscribe(() => {
      if (this.showEnrollModal()) {
        this.autoFetchRollNumber();
      }
    });
  }

  // Toast Helper
  showToast(type: 'error' | 'success', text: string): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toast.set({ type, text });
    this.toastTimeout = setTimeout(() => {
      this.toast.set(null);
    }, 5000);
  }

  dismissToast(): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toast.set(null);
  }

  private extractErrorMessage(err: any, defaultMsg: string): string {
    if (!err) return defaultMsg;
    if (typeof err === 'string') return err;
    if (err?.error?.message) return err.error.message;
    if (err?.error?.error) return err.error.error;
    if (err?.error?.details) return err.error.details;
    if (err?.statusText && err?.status) return `Server error (${err.status}): ${err.statusText}`;
    if (err?.message) return err.message;
    return defaultMsg;
  }

  /**
   * Initializes tenant school scoping based on Role & Auth state.
   */
  initializeSchoolScope(): void {
    const isPlatform = this.auth.isPlatformAdmin();
    const userSchoolId = this.auth.getSchoolId() || this.auth.currentUser()?.schoolId || '';

    this.adminService.getSchools().subscribe({
      next: (schoolList) => {
        const list = schoolList && schoolList.length > 0 ? schoolList : [];
        this.schools.set(list);

        const initialSchoolId = isPlatform
          ? (userSchoolId || list[0]?.id || '')
          : (userSchoolId || list[0]?.id || '');

        if (initialSchoolId) {
          this.selectedSchoolId.set(String(initialSchoolId));
          this.loadStandardsForSchool(String(initialSchoolId));
        }
      },
      error: (err) => {
        const msg = this.extractErrorMessage(err, 'Failed to fetch schools directory');
        this.showToast('error', msg);
      }
    });
  }

  /**
   * Loads standards for the active school scope.
   */
  loadStandardsForSchool(schoolId: string): void {
    this.academicService.getStandards(schoolId).subscribe({
      next: (stds) => {
        const stdList = stds || [];
        this.standards.set(stdList);
        this.selectedStandardId.set('');
        this.selectedSection.set('');
        this.hasSearched.set(false);
        this.roster.set([]);
      },
      error: (err) => {
        const msg = this.extractErrorMessage(err, 'Failed to load standards for selected campus');
        this.showToast('error', msg);
      }
    });
  }

  /**
   * Handle School Change (Platform Admin only)
   */
  onSchoolChange(newSchoolId: string): void {
    this.selectedSchoolId.set(newSchoolId);
    this.loadStandardsForSchool(newSchoolId);
  }

  /**
   * Handle Standard Selection (Cascades to Sections and resets search)
   */
  onStandardChange(stdId: string): void {
    this.selectedStandardId.set(stdId);
    this.selectedSection.set('');
    this.hasSearched.set(false);
    this.roster.set([]);

    if (stdId) {
      this.availableSections.set(['A', 'B', 'C']);
    } else {
      this.availableSections.set([]);
    }
  }

  /**
   * Handle Section Selection
   */
  onSectionChange(sec: string): void {
    this.selectedSection.set(sec);
    this.hasSearched.set(false);
    this.roster.set([]);
  }

  /**
   * On-Demand Search Execution (Triggered only when Admin clicks 'Search Students')
   */
  onSearch(): void {
    const stdId = this.selectedStandardId();
    if (!stdId) return;

    this.isSearching.set(true);
    this.pageState.set('loading');
    const schoolId = this.selectedSchoolId();
    const section = this.selectedSection();

    this.adminService.getStudents(stdId, section, schoolId).subscribe({
      next: (data) => {
        this.isSearching.set(false);
        this.hasSearched.set(true);

        const selectedStd = this.standards().find(s => String(s.id) === String(stdId));
        const stdNumber = selectedStd ? selectedStd.standardNumber : 10;

        const mappedRoster: StudentRosterItem[] = (data || []).map(stu => {
          const matchingPhone = (data || []).filter(s => s.parentPhone && s.parentPhone === stu.parentPhone);
          const computedSiblings = stu.siblingCount !== undefined && stu.siblingCount !== null
            ? Number(stu.siblingCount)
            : (matchingPhone.length > 0 ? matchingPhone.length : 1);

          return {
            id: stu.id,
            name: stu.name,
            rollNumber: stu.rollNumber,
            standardNumber: stdNumber,
            standardId: stu.standardId || stdId,
            section: stu.section,
            parentPhone: stu.parentPhone,
            parentName: (stu as any).parentName || '',
            parentRelation: (stu as any).parentRelation || 'FATHER',
            gender: String(stu.gender || 'MALE'),
            dob: stu.dob || '2012-05-15',
            email: stu.email || '',
            status: 'ACTIVE',
            siblingCount: computedSiblings
          };
        });

        this.roster.set(mappedRoster);
        if (mappedRoster.length > 0) {
          this.pageState.set('normal');
        } else {
          this.pageState.set('empty');
        }
      },
      error: (err) => {
        this.isSearching.set(false);
        const errorText = this.extractErrorMessage(err, 'Failed to fetch student directory');
        this.pageErrorTitle.set('API Error');
        this.pageErrorMessage.set(errorText);
        this.pageState.set('error');
        this.showToast('error', errorText);
      }
    });
  }

  // ──────────────────────────────────────────────────────────────
  // 3-STEP INDIVIDUAL ADMISSION WORKFLOW (With Sibling Auto-Detection)
  // ──────────────────────────────────────────────────────────────
  openEnrollModal(): void {
    const schoolId = this.selectedSchoolId();
    const stdList = this.standards();
    this.detectedExistingParent.set(null);
    this.modalErrorMessage.set(null);
    this.enrollmentStep.set(1);
    this.createdCredentials.set(null);

    this.enrollForm.reset({
      schoolId: schoolId,
      standardId: this.selectedStandardId() || stdList[0]?.id || '',
      section: this.selectedSection() || 'A',
      name: '',
      rollNumber: '',
      gender: 'MALE',
      dob: '2012-05-15',
      email: '',
      parentPhone: '',
      parentName: '',
      parentRelation: 'FATHER',
      alternatePhone: '',
      occupation: '',
      address: '',
      preferredLanguage: 'TELUGU'
    });
    this.showEnrollModal.set(true);
    this.autoFetchRollNumber();
  }


  autoFetchRollNumber(): void {
    const standardId = this.enrollForm.get('standardId')?.value;
    const section = this.enrollForm.get('section')?.value || 'A';
    const schoolId = this.selectedSchoolId();
    if (standardId && section) {
      this.adminService.getNextRollNumber(standardId, section, '2026-2027', schoolId).subscribe({
        next: (res) => {
          if (res && res.suggestedRollNumber) {
            this.enrollForm.patchValue({ rollNumber: res.suggestedRollNumber }, { emitEvent: false });
          }
        },
        error: (err) => {
          console.warn('Could not auto-generate roll number', err);
        }
      });
    }
  }

  closeEnrollModal(): void {
    this.showEnrollModal.set(false);
    this.detectedExistingParent.set(null);
    this.modalErrorMessage.set(null);
    this.enrollmentStep.set(1);
    this.createdCredentials.set(null);
  }

  isStep1Valid(): boolean {
    const f = this.enrollForm;
    return !!(
      f.get('standardId')?.valid &&
      f.get('section')?.valid &&
      f.get('name')?.valid &&
      f.get('rollNumber')?.valid &&
      f.get('gender')?.valid &&
      f.get('dob')?.valid
    );
  }

  goToStep2(): void {
    if (!this.isStep1Valid()) {
      this.modalErrorMessage.set('Please fill all required student details in Step 1.');
      return;
    }
    this.modalErrorMessage.set(null);
    this.enrollmentStep.set(2);
  }

  goToStep1(): void {
    this.modalErrorMessage.set(null);
    this.enrollmentStep.set(1);
  }

  onParentPhoneChange(phone: string): void {
    if (!phone || phone.trim().length < 10) {
      this.detectedExistingParent.set(null);
      return;
    }

    const cleanPhone = phone.trim();
    // 1. Check if parent profile exists on server
    this.adminService.getParentProfile(cleanPhone, this.selectedSchoolId()).subscribe({
      next: (profile: any) => {
        // Strict verification: only consider as existing parent if real data (name, id, or linked students) is returned
        const isValidParent = Boolean(
          profile &&
          !profile.error &&
          profile.status !== 'NOT_FOUND' &&
          profile.status !== 404 &&
          profile.found !== false &&
          (
            (profile.name && typeof profile.name === 'string' && profile.name.trim().length > 0 && profile.name.trim() !== 'Existing Parent') ||
            (profile.linkedStudents && Array.isArray(profile.linkedStudents) && profile.linkedStudents.length > 0) ||
            (profile.children && Array.isArray(profile.children) && profile.children.length > 0)
          )
        );

        if (isValidParent) {
          const parentName = (profile.name || profile.parentName || profile.guardianName || '').trim();
          const relation = profile.relation || profile.parentRelation || 'FATHER';
          const rawSiblings = profile.linkedStudents || profile.children || [];
          const siblings = rawSiblings.map((s: any) => ({
            id: s.id || s.studentId,
            name: s.name || s.studentName || 'Student',
            rollNumber: s.rollNumber || s.rollNo || '',
            standardNumber: s.standardNumber || s.standardName || s.grade || '',
            section: s.section || 'A'
          }));
          const childrenCount = siblings.length > 0 ? siblings.length : (profile.childrenCount || 1);

          this.detectedExistingParent.set({
            name: parentName || 'Parent',
            relation: relation,
            childrenCount: childrenCount,
            siblings: siblings
          });
          this.enrollForm.patchValue({
            parentName: parentName,
            parentRelation: relation,
            alternatePhone: profile.alternatePhone || '',
            occupation: profile.occupation || '',
            address: profile.address || '',
            preferredLanguage: profile.preferredLanguage || 'TELUGU'
          });
        } else {
          // If server didn't find a valid parent, check local roster fallback
          this.checkRosterForExistingParent(cleanPhone);
        }
      },
      error: () => {
        // Fallback: Check active roster
        this.checkRosterForExistingParent(cleanPhone);
      }
    });
  }

  private checkRosterForExistingParent(cleanPhone: string): void {
    const matching = this.roster().filter(m =>
      m.parentPhone &&
      m.parentPhone.trim() === cleanPhone &&
      m.parentName &&
      m.parentName.trim().length > 0 &&
      m.parentName.trim() !== 'Existing Parent'
    );

    if (matching.length > 0) {
      const parentName = matching[0].parentName!.trim();
      const relation = matching[0].parentRelation || 'FATHER';
      const siblings = matching.map(m => ({
        id: m.id,
        name: m.name || 'Student',
        rollNumber: m.rollNumber || '',
        standardNumber: m.standardNumber || '',
        section: m.section || 'A'
      }));

      this.detectedExistingParent.set({
        name: parentName,
        relation: relation,
        childrenCount: matching.length,
        siblings: siblings
      });
      this.enrollForm.patchValue({
        parentName: parentName,
        parentRelation: relation
      });
    } else {
      this.detectedExistingParent.set(null);
    }
  }

  saveEnrollment(): void {
    if (this.enrollForm.invalid) {
      this.modalErrorMessage.set('Please fill all required fields before completing admission.');
      return;
    }
    this.isSubmitting.set(true);
    this.modalErrorMessage.set(null);
    const formVal = this.enrollForm.value as StudentEnrollmentRequest;

    this.adminService.enrollStudent(formVal).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.createdCredentials.set({
          username: res.username || `${formVal.name.toLowerCase().replace(/\s+/g, '')}_${formVal.rollNumber}`,
          tempPassword: res.tempPassword || 'password123',
          studentName: formVal.name,
          rollNumber: formVal.rollNumber,
          parentPhone: formVal.parentPhone,
          parentName: formVal.parentName,
          isExistingParent: !!this.detectedExistingParent()
        });
        this.enrollmentStep.set(3);
        this.showToast('success', `Student ${formVal.name} enrolled successfully!`);

        if (this.hasSearched() && String(this.selectedStandardId()) === String(formVal.standardId)) {
          this.onSearch();
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const errMsg = this.extractErrorMessage(err, 'Failed to enroll student. Please check inputs and try again.');
        this.modalErrorMessage.set(errMsg);
        this.showToast('error', errMsg);
      }
    });
  }

  copyCredentials(text?: string): void {
    if (!text) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('success', 'Credentials copied to clipboard!');
      });
    }
  }

  // ──────────────────────────────────────────────────────────────
  // EDIT STUDENT MODAL WORKFLOW
  // ──────────────────────────────────────────────────────────────
  openEditStudentModal(student: StudentRosterItem): void {
    this.modalErrorMessage.set(null);
    this.editStudentForm.reset({
      id: student.id,
      schoolId: this.selectedSchoolId(),
      standardId: student.standardId || this.selectedStandardId(),
      section: student.section,
      name: student.name,
      rollNumber: student.rollNumber,
      gender: student.gender,
      dob: student.dob || '2012-05-15',
      parentPhone: student.parentPhone,
      email: student.email || ''
    });
    this.showEditStudentModal.set(true);
  }

  closeEditStudentModal(): void {
    this.showEditStudentModal.set(false);
    this.modalErrorMessage.set(null);
  }

  saveStudentEdit(): void {
    if (this.editStudentForm.invalid) return;
    this.isSubmitting.set(true);
    this.modalErrorMessage.set(null);
    const formVal = this.editStudentForm.value;

    const updatePayload: StudentUpdateRequest = {
      name: formVal.name,
      rollNumber: formVal.rollNumber,
      standardId: formVal.standardId,
      section: formVal.section,
      gender: formVal.gender,
      dob: formVal.dob,
      parentPhone: formVal.parentPhone,
      email: formVal.email
    };

    this.adminService.updateStudent(formVal.id, updatePayload, this.selectedSchoolId()).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.showToast('success', `Student details updated successfully!`);
        this.closeEditStudentModal();
        // Update local roster
        const list = this.roster().map(s => {
          if (String(s.id) === String(formVal.id)) {
            return {
              ...s,
              name: formVal.name,
              rollNumber: formVal.rollNumber,
              standardId: formVal.standardId,
              section: formVal.section,
              gender: formVal.gender,
              dob: formVal.dob,
              parentPhone: formVal.parentPhone,
              email: formVal.email
            };
          }
          return s;
        });
        this.roster.set(list);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const errMsg = this.extractErrorMessage(err, 'Failed to update student details');
        this.modalErrorMessage.set(errMsg);
        this.showToast('error', errMsg);
      }
    });
  }

  // ──────────────────────────────────────────────────────────────
  // PARENT PROFILE & SIBLINGS MANAGEMENT WORKFLOW
  // ──────────────────────────────────────────────────────────────
  openParentModal(student: StudentRosterItem): void {
    this.isEditingParent.set(false);
    this.showLinkSiblingForm.set(false);
    this.modalErrorMessage.set(null);

    // Fetch Parent Profile & Siblings by Parent Phone
    this.adminService.getParentProfile(student.parentPhone, this.selectedSchoolId()).subscribe({
      next: (profile) => {
        this.activeParent.set(profile);
        this.parentEditForm.reset({
          schoolId: this.selectedSchoolId(),
          name: profile.name,
          relation: profile.relation || 'FATHER',
          phone: profile.phone,
          alternatePhone: profile.alternatePhone || '',
          email: profile.email || '',
          occupation: profile.occupation || '',
          address: profile.address || '',
          preferredLanguage: profile.preferredLanguage || 'TELUGU'
        });
        this.showParentModal.set(true);
      },
      error: (err) => {
        const errMsg = this.extractErrorMessage(err, `Failed to load parent profile for phone ${student.parentPhone}`);
        this.showToast('error', errMsg);
      }
    });
  }

  closeParentModal(): void {
    this.showParentModal.set(false);
    this.activeParent.set(null);
    this.isEditingParent.set(false);
    this.showLinkSiblingForm.set(false);
    this.isSiblingDropdownOpen.set(false);
    this.siblingSearchText.set('');
    this.modalErrorMessage.set(null);
  }

  toggleEditParent(): void {
    this.modalErrorMessage.set(null);
    this.isEditingParent.set(!this.isEditingParent());
  }

  saveParentDetails(): void {
    if (this.parentEditForm.invalid) return;
    this.isSubmitting.set(true);
    this.modalErrorMessage.set(null);
    const formVal = this.parentEditForm.value as ParentUpdateRequest;
    const currentPhone = this.activeParent()?.phone || formVal.phone;

    this.adminService.updateParentProfile(currentPhone, formVal).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.activeParent.set(res);
        this.isEditingParent.set(false);
        this.showToast('success', 'Parent profile updated successfully!');

        // Update active roster parent info if phone or name changed
        const updated = this.roster().map(s => {
          if (s.parentPhone === currentPhone) {
            return {
              ...s,
              parentPhone: formVal.phone,
              parentName: formVal.name,
              parentRelation: formVal.relation
            };
          }
          return s;
        });
        this.roster.set(updated);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const errMsg = this.extractErrorMessage(err, 'Failed to save parent details');
        this.modalErrorMessage.set(errMsg);
        this.showToast('error', errMsg);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.searchable-student-select')) {
      this.isSiblingDropdownOpen.set(false);
    }
  }

  openLinkSiblingSection(): void {
    this.modalErrorMessage.set(null);
    this.siblingSearchText.set('');
    this.isSiblingDropdownOpen.set(false);
    this.showLinkSiblingForm.set(true);
    this.isLoadingAvailableStudents.set(true);

    const currentLinkedIds = (this.activeParent()?.linkedStudents || []).map(s => String(s.id));
    const schoolId = this.selectedSchoolId();

    // Fetch school-wide students so siblings from any class/standard can be searched and linked
    this.adminService.getStudents(undefined, undefined, schoolId).subscribe({
      next: (students) => {
        this.isLoadingAvailableStudents.set(false);
        const mapped: StudentRosterItem[] = (students || []).map(stu => {
          const std = this.standards().find(s => String(s.id) === String(stu.standardId));
          return {
            id: stu.id,
            name: stu.name,
            rollNumber: stu.rollNumber,
            standardNumber: std ? std.standardNumber : (stu as any).standardNumber || 0,
            standardId: stu.standardId,
            section: stu.section,
            parentPhone: stu.parentPhone,
            parentName: (stu as any).parentName || '',
            parentRelation: (stu as any).parentRelation || 'FATHER',
            gender: String(stu.gender || 'MALE'),
            dob: stu.dob || '2012-05-15',
            email: stu.email || '',
            status: 'ACTIVE'
          };
        }).filter(m => !currentLinkedIds.includes(String(m.id)));

        this.availableStudentsToLink.set(mapped);
        this.selectedStudentToLink.set(mapped.length > 0 ? String(mapped[0].id) : '');
      },
      error: () => {
        this.isLoadingAvailableStudents.set(false);
        const available = this.roster().filter(m => !currentLinkedIds.includes(String(m.id)));
        this.availableStudentsToLink.set(available);
        this.selectedStudentToLink.set(available.length > 0 ? String(available[0].id) : '');
      }
    });
  }

  closeLinkSiblingSection(): void {
    this.showLinkSiblingForm.set(false);
    this.isSiblingDropdownOpen.set(false);
    this.siblingSearchText.set('');
  }

  onSiblingSearchChange(val: string): void {
    this.siblingSearchText.set(val);
    this.isSiblingDropdownOpen.set(true);
  }

  openSiblingDropdown(): void {
    this.isSiblingDropdownOpen.set(true);
  }

  toggleSiblingDropdown(event?: MouseEvent): void {
    event?.stopPropagation();
    this.isSiblingDropdownOpen.update(v => !v);
  }

  clearSiblingSearch(event?: MouseEvent): void {
    event?.stopPropagation();
    this.siblingSearchText.set('');
    this.isSiblingDropdownOpen.set(true);
  }

  selectStudentToLink(stu: StudentRosterItem, event?: MouseEvent): void {
    event?.stopPropagation();
    this.selectedStudentToLink.set(String(stu.id));
    this.isSiblingDropdownOpen.set(false);
  }

  isStudentSelected(stuId: string | number | undefined): boolean {
    if (stuId === undefined || stuId === null) return false;
    return String(this.selectedStudentToLink()) === String(stuId);
  }

  confirmLinkSibling(): void {
    const studentId = this.selectedStudentToLink();
    const parentPhone = this.activeParent()?.phone;
    if (!studentId || !parentPhone) return;

    this.isSubmitting.set(true);
    this.modalErrorMessage.set(null);

    this.adminService.linkSiblingToParent(parentPhone, studentId, this.selectedSchoolId()).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.activeParent.set(res);
        this.showLinkSiblingForm.set(false);
        this.showToast('success', 'Sibling linked to parent profile successfully!');
        if (this.hasSearched()) {
          this.onSearch();
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const errMsg = this.extractErrorMessage(err, 'Failed to link sibling');
        this.modalErrorMessage.set(errMsg);
        this.showToast('error', errMsg);
      }
    });
  }

  unlinkSibling(sibling: LinkedSiblingSummary): void {
    if (!confirm(`Unlink ${sibling.name} from parent ${this.activeParent()?.name}?`)) return;
    const parentPhone = this.activeParent()?.phone;
    if (!parentPhone) return;

    this.modalErrorMessage.set(null);
    this.adminService.unlinkSiblingFromParent(parentPhone, sibling.id, this.selectedSchoolId()).subscribe({
      next: (res) => {
        this.activeParent.set(res);
        this.showToast('success', `Unlinked ${sibling.name} successfully!`);
        if (this.hasSearched()) {
          this.onSearch();
        }
      },
      error: (err) => {
        const errMsg = this.extractErrorMessage(err, 'Failed to unlink sibling');
        this.modalErrorMessage.set(errMsg);
        this.showToast('error', errMsg);
      }
    });
  }

  // ──────────────────────────────────────────────────────────────
  // BULK CSV INTAKE
  // ──────────────────────────────────────────────────────────────
  openBulkModal(): void {
    this.bulkStandardId = this.standards()[0]?.id ? String(this.standards()[0].id) : '';
    this.selectedFile = null;
    this.modalErrorMessage.set(null);
    this.showBulkModal.set(true);
  }

  closeBulkModal(): void {
    this.showBulkModal.set(false);
    this.modalErrorMessage.set(null);
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target?.files?.[0] || null;
  }

  submitBulkUpload(): void {
    if (!this.selectedFile) return;
    this.isSubmitting.set(true);
    this.modalErrorMessage.set(null);

    const fd = new FormData();
    fd.append('file', this.selectedFile);
    if (this.bulkStandardId) fd.append('standardId', this.bulkStandardId);
    if (this.selectedSchoolId()) fd.append('schoolId', this.selectedSchoolId());

    this.adminService.bulkEnrollStudents(fd).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.bulkResult.set(res);
        this.closeBulkModal();
        this.showToast('success', `Bulk upload completed: ${res.successCount} enrolled, ${res.failureCount} failed.`);
        if (this.hasSearched()) {
          this.onSearch();
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const errMsg = this.extractErrorMessage(err, 'Failed to process bulk CSV upload');
        this.modalErrorMessage.set(errMsg);
        this.showToast('error', errMsg);
      }
    });
  }

  // ──────────────────────────────────────────────────────────────
  // PASSWORD RESET
  // ──────────────────────────────────────────────────────────────
  resetPassword(student: StudentRosterItem): void {
    if (!confirm(`Reset credentials for ${student.name}? A temporary password will be assigned.`)) return;
    this.adminService.resetStudentPassword(student.id).subscribe({
      next: (res) => {
        this.showToast('success', res?.message || 'Password reset successfully!');
      },
      error: (err) => {
        const errMsg = this.extractErrorMessage(err, 'Failed to reset student password');
        this.showToast('error', errMsg);
      }
    });
  }

  deleteStudent(student: StudentRosterItem): void {
    const confirmMsg = `Are you sure you want to delete enrollment for ${student.name} (Roll: ${student.rollNumber})? This will remove their student record and account.`;
    if (!confirm(confirmMsg)) return;

    this.isSubmitting.set(true);
    const schoolId = this.selectedSchoolId();

    this.adminService.deleteStudent(student.id, schoolId).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showToast('success', `Student ${student.name} deleted successfully.`);
        // Remove locally from roster
        this.roster.update(list => list.filter(s => String(s.id) !== String(student.id)));
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const errMsg = this.extractErrorMessage(err, `Failed to delete student ${student.name}`);
        this.showToast('error', errMsg);
      }
    });
  }

  getSchoolName(schoolId: string): string {
    const s = this.schools().find(sc => String(sc.id) === String(schoolId));
    return s ? `${s.name} (${s.city})` : 'Digital Public School';
  }
}
