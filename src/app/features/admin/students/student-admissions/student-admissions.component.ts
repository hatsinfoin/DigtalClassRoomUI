import { Component, OnInit, inject, signal, computed } from '@angular/core';
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

  // Sibling Auto-Detection Hint
  detectedExistingParent = signal<{ name: string; relation: string; childrenCount: number } | null>(null);

  // Forms
  enrollForm: FormGroup = this.fb.group({
    schoolId: ['', Validators.required],
    standardId: ['', Validators.required],
    section: ['A', Validators.required],
    name: ['', Validators.required],
    rollNumber: ['', Validators.required],
    gender: ['MALE', Validators.required],
    dob: ['2012-05-15', Validators.required],
    parentPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    parentName: [''],
    parentRelation: ['FATHER'],
    email: ['']
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
            siblingCount: matchingPhone.length > 0 ? matchingPhone.length : 1
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
  // INDIVIDUAL ADMISSION WORKFLOW (With Sibling Auto-Detection)
  // ──────────────────────────────────────────────────────────────
  openEnrollModal(): void {
    const schoolId = this.selectedSchoolId();
    const stdList = this.standards();
    this.detectedExistingParent.set(null);
    this.modalErrorMessage.set(null);

    this.enrollForm.reset({
      schoolId: schoolId,
      standardId: this.selectedStandardId() || stdList[0]?.id || '',
      section: this.selectedSection() || 'A',
      name: '',
      rollNumber: '',
      gender: 'MALE',
      dob: '2012-05-15',
      parentPhone: '',
      parentName: '',
      parentRelation: 'FATHER',
      email: ''
    });
    this.showEnrollModal.set(true);
  }

  closeEnrollModal(): void {
    this.showEnrollModal.set(false);
    this.detectedExistingParent.set(null);
    this.modalErrorMessage.set(null);
  }

  onParentPhoneChange(phone: string): void {
    if (!phone || phone.length < 10) {
      this.detectedExistingParent.set(null);
      return;
    }
    // Check if phone exists in active roster
    const matching = this.roster().filter(m => m.parentPhone === phone);
    if (matching.length > 0) {
      const parentName = matching[0].parentName || 'Existing Parent';
      const relation = matching[0].parentRelation || 'FATHER';
      this.detectedExistingParent.set({
        name: parentName,
        relation: relation,
        childrenCount: matching.length
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
    if (this.enrollForm.invalid) return;
    this.isSubmitting.set(true);
    this.modalErrorMessage.set(null);
    const formVal = this.enrollForm.value as StudentEnrollmentRequest;

    this.adminService.enrollStudent(formVal).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.showToast('success', `Student ${formVal.name} enrolled successfully! (Roll: ${formVal.rollNumber})`);
        this.closeEnrollModal();
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

  openLinkSiblingSection(): void {
    this.modalErrorMessage.set(null);
    const currentLinkedIds = (this.activeParent()?.linkedStudents || []).map(s => String(s.id));
    const available = this.roster().filter(m => !currentLinkedIds.includes(String(m.id)));
    this.availableStudentsToLink.set(available);
    this.selectedStudentToLink.set(available[0]?.id ? String(available[0].id) : '');
    this.showLinkSiblingForm.set(true);
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

  getSchoolName(schoolId: string): string {
    const s = this.schools().find(sc => String(sc.id) === String(schoolId));
    return s ? `${s.name} (${s.city})` : 'Digital Public School';
  }
}
