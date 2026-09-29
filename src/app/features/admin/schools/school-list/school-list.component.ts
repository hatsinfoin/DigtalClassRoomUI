import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminService } from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SchoolResponse, SchoolRequest } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';

@Component({
  selector: 'app-school-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UxStateContainerComponent],
  template: `
    <div class="admin-page-container">
      <div class="page-header">
        <div class="title-group">
          <h1>{{ isPlatformAdmin() ? 'Institutions & Schools' : 'Institutional Campus Profile' }}</h1>
          <p>{{ isPlatformAdmin() ? 'Manage enrolled institutional campuses, configurations, and contact directories' : 'Manage your school profile, campus details, and contact directory' }}</p>
        </div>
        @if (isPlatformAdmin()) {
          <button class="primary-btn" (click)="openCreateModal()">
            <span>➕ Add Institution</span>
          </button>
        }
      </div>

      <div class="table-toolbar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by school name, code or city..."
            [ngModel]="searchQuery()"
            (ngModelChange)="onSearchChange($event)"
          />
        </div>
        <div class="meta-count">
          Showing {{ filteredSchools().length }} of {{ schools().length }} schools
        </div>
      </div>

      <app-ux-state
        [state]="pageState()"
        emptyTitle="No Institutions Yet"
        emptyMessage="No schools found in the database."
        emptyCtaText="➕ Add First Institution"
        [technicalDetails]="technicalError()"
        (onEmptyCta)="openCreateModal()"
        (onRetry)="loadSchools()"
      >
        <div class="glass-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>School Code</th>
                <th>Institution Name</th>
                <th>Contact Details</th>
                <th>City / Region</th>
                <th>Campus Address</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (school of filteredSchools(); track school.id) {
                <tr>
                  <td class="code-cell">{{ school.schoolCode || school.code || 'SCH-CODE' }}</td>
                  <td class="name-cell">{{ school.schoolName || school.name }}</td>
                  <td class="contact-cell">
                    @if (school.phone || school.contactPhone) {
                      <div class="contact-line">📞 {{ school.phone || school.contactPhone }}</div>
                    }
                    @if (school.email || school.contactEmail) {
                      <div class="contact-line email">✉️ {{ school.email || school.contactEmail }}</div>
                    }
                    @if (!school.phone && !school.contactPhone && !school.email && !school.contactEmail) {
                      <span class="text-muted" style="color: rgba(255,255,255,0.4); font-size: 12px;">N/A</span>
                    }
                  </td>
                  <td>{{ school.city || 'N/A' }}, {{ school.state || 'AP' }}</td>
                  <td>{{ school.address || (school.city + ', ' + (school.country || 'India')) }}</td>
                  <td>
                    <span class="status-badge" style="color: #00D9A3; font-size: 13px;">● Active</span>
                  </td>
                  <td>
                    <div class="action-group">
                      <button class="btn-icon" (click)="openEditModal(school)" title="Edit School">
                        ✏️ Edit
                      </button>
                      @if (isPlatformAdmin()) {
                        <button class="btn-icon btn-danger" (click)="openDeleteModal(school)" title="Delete School">
                          🗑️ Delete
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-ux-state>

      <!-- Create/Edit Modal -->
      @if (showFormModal()) {
        <div class="modal-overlay">
          <div class="modal-dialog">
            <div class="modal-header">
              <h2>{{ editingSchoolId() ? 'Edit Institution' : 'Add New Institution' }}</h2>
              <button class="close-btn" (click)="closeFormModal()">✕</button>
            </div>

            <form [formGroup]="schoolForm" (ngSubmit)="saveSchool()">
              <div class="form-grid">
                <div class="form-group full-width">
                  <label>Institution Name (Preserves Telugu NFC) *</label>
                  <input
                    formControlName="name"
                    placeholder="e.g. Roha International School / రోహా ఇంటర్నేషనల్ స్కూల్"
                    [class.invalid]="isFieldInvalid('name')"
                    (input)="onNameInput()"
                  />
                  @if (isFieldInvalid('name')) {
                    <span class="field-error">Institution Name is required (min 3 characters).</span>
                  }
                </div>

                <div class="form-group">
                  <label>School Code (Unique) *</label>
                  <input
                    formControlName="code"
                    placeholder="e.g. ROHA-INT-01"
                    [readonly]="!!editingSchoolId()"
                    [class.invalid]="isFieldInvalid('code')"
                  />
                  @if (isFieldInvalid('code')) {
                    <span class="field-error">School Code is required (letters, numbers, hyphens).</span>
                  } @else if (!editingSchoolId()) {
                    <span class="field-hint">Unique identifier used for tenant login & routing.</span>
                  }
                </div>

                <div class="form-group">
                  <label>City *</label>
                  <input
                    formControlName="city"
                    placeholder="Vijayawada / Nellore / Hyderabad"
                    [class.invalid]="isFieldInvalid('city')"
                  />
                  @if (isFieldInvalid('city')) {
                    <span class="field-error">City is required.</span>
                  }
                </div>

                <div class="form-group">
                  <label>State *</label>
                  <input
                    formControlName="state"
                    placeholder="Andhra Pradesh"
                    [class.invalid]="isFieldInvalid('state')"
                  />
                  @if (isFieldInvalid('state')) {
                    <span class="field-error">State is required.</span>
                  }
                </div>

                <div class="form-group">
                  <label>Contact Phone (Optional)</label>
                  <input
                    formControlName="phone"
                    placeholder="+91 9876543210"
                    [class.invalid]="isFieldInvalid('phone')"
                  />
                  @if (isFieldInvalid('phone')) {
                    <span class="field-error">Please enter a valid phone number.</span>
                  }
                </div>

                <div class="form-group">
                  <label>Email Address (Optional)</label>
                  <input
                    formControlName="email"
                    type="email"
                    placeholder="principal@rohaschool.edu.in"
                    [class.invalid]="isFieldInvalid('email')"
                  />
                  @if (isFieldInvalid('email')) {
                    <span class="field-error">Please provide a valid email address.</span>
                  }
                </div>

                <div class="form-group full-width">
                  <label>Campus Address *</label>
                  <textarea
                    formControlName="address"
                    rows="2"
                    placeholder="Full street and postal campus address..."
                    [class.invalid]="isFieldInvalid('address')"
                  ></textarea>
                  @if (isFieldInvalid('address')) {
                    <span class="field-error">Campus Address is required (min 3 characters).</span>
                  }
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-secondary" (click)="closeFormModal()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="isSubmitting()">
                  {{ isSubmitting() ? 'Saving to Database...' : 'Save School' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Guarded Delete Modal with Verification -->
      @if (showDeleteModal() && selectedSchoolForDelete()) {
        <div class="modal-overlay">
          <div class="modal-dialog delete-confirm-box">
            <div class="modal-header">
              <h2 style="color: #FF6B6B;">⚠️ Guarded Deletion</h2>
              <button class="close-btn" (click)="closeDeleteModal()">✕</button>
            </div>
            <p>
              Are you sure you want to delete <strong>{{ selectedSchoolForDelete()?.schoolName || selectedSchoolForDelete()?.name }}</strong>?
              This action permanently removes the institution from MongoDB.
            </p>
            <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 12px;">
              Please type the school code <strong>{{ selectedSchoolForDelete()?.schoolCode || selectedSchoolForDelete()?.code }}</strong> to confirm:
            </p>
            <input
              class="confirm-input"
              [ngModel]="deleteConfirmInput()"
              (ngModelChange)="deleteConfirmInput.set($event)"
              (keyup.enter)="!isDeleteDisabled() && confirmDelete()"
              [placeholder]="selectedSchoolForDelete()?.schoolCode || selectedSchoolForDelete()?.code || ''"
            />
            <div class="modal-footer" style="justify-content: center;">
              <button type="button" class="btn-secondary" (click)="closeDeleteModal()">Cancel</button>
              <button
                type="button"
                class="btn-primary"
                style="background: #FF6B6B;"
                [disabled]="isDeleteDisabled()"
                (click)="confirmDelete()"
              >
                {{ isSubmitting() ? 'Deleting...' : 'Confirm Delete' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./school-list.component.scss']
})
export class SchoolListComponent implements OnInit {
  private adminService = inject(AdminService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  isPlatformAdmin = computed(() => this.auth.isPlatformAdmin());
  isSchoolAdmin = computed(() => this.auth.isSchoolAdmin());

  pageState = signal<UxStateType>('loading');
  schools = signal<SchoolResponse[]>([]);
  filteredSchools = signal<SchoolResponse[]>([]);
  searchQuery = signal<string>('');
  technicalError = signal<string>('');

  showFormModal = signal<boolean>(false);
  editingSchoolId = signal<string | number | null>(null);
  showDeleteModal = signal<boolean>(false);
  selectedSchoolForDelete = signal<SchoolResponse | null>(null);
  deleteConfirmInput = signal<string>('');
  isSubmitting = signal<boolean>(false);

  schoolForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    code: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z0-9_\-\.]+$/)]],
    city: ['Vijayawada', [Validators.required]],
    state: ['Andhra Pradesh', [Validators.required]],
    address: ['', [Validators.required, Validators.minLength(3)]],
    phone: [''],
    email: ['']
  });

  private fallbackSchools: SchoolResponse[] = [
    {
      id: 'SCH001',
      code: 'DPS-HYD-01',
      schoolCode: 'DPS-HYD-01',
      name: 'Digital Public School (హైదరాబాద్)',
      schoolName: 'Digital Public School (హైదరాబాద్)',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      phone: '+91 98480 12345',
      email: 'admin@digitalpublicschool.edu.in',
      address: 'Plot 42, Knowledge City, HITEC City, Hyderabad'
    }
  ];

  ngOnInit(): void {
    this.loadSchools();
  }

  loadSchools(): void {
    this.pageState.set('loading');
    this.technicalError.set('');
    const isPlatform = this.auth.isPlatformAdmin();
    const userSchoolId = this.auth.getSchoolId();

    console.log(`[SchoolListComponent] Loading schools. isPlatformAdmin: ${isPlatform}, userSchoolId: ${userSchoolId}`);

    // If Institutional Admin (ROLE_ADMIN), query only their specific school
    if (!isPlatform && userSchoolId) {
      this.adminService.getSchool(userSchoolId).pipe(
        catchError((err) => {
          console.warn('[SchoolListComponent] getSchool by ID failed, trying getSchools() with filter:', err);
          return this.adminService.getSchools();
        })
      ).subscribe({
        next: (res: any) => {
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
          this.schools.set(list);
          this.filterSchools();
          this.pageState.set(list.length === 0 ? 'empty' : 'normal');
        },
        error: (err) => {
          console.warn('[SchoolListComponent] Backend connection issue:', err);
          this.technicalError.set(`HTTP ${err.status ?? 0} (${err.statusText || 'Connection Refused'}) - /api/schools`);
          this.pageState.set('error');
        }
      });
      return;
    }

    // Platform Admin (DIGITAL_CLASS_ADMIN): Query all schools
    this.adminService.getSchools().subscribe({
      next: (data) => {
        console.log('[SchoolListComponent] MongoDB schools fetched:', data);
        const list = Array.isArray(data) ? data : [];
        this.schools.set(list);
        this.filterSchools();
        this.pageState.set(list.length === 0 ? 'empty' : 'normal');
      },
      error: (err) => {
        console.warn('[SchoolListComponent] Backend connection issue:', err);
        this.technicalError.set(`HTTP ${err.status ?? 0} (${err.statusText || 'Connection Refused'}) - /api/schools`);
        this.pageState.set('error');
      }
    });
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val || '');
    this.filterSchools();
  }

  filterSchools(): void {
    const q = this.searchQuery().toLowerCase().trim();
    const all = this.schools();
    if (!q) {
      this.filteredSchools.set([...all]);
      return;
    }
    this.filteredSchools.set(all.filter(s =>
      (s.name || s.schoolName || '').toLowerCase().includes(q) ||
      (s.code || s.schoolCode || '').toLowerCase().includes(q) ||
      (s.city || '').toLowerCase().includes(q)
    ));
  }

  isFieldInvalid(field: string): boolean {
    const control = this.schoolForm.get(field);
    if (!control) return false;
    if (field === 'phone' || field === 'email') {
      return !!(control.value && control.invalid);
    }
    return !!(control.invalid && (control.dirty || control.touched));
  }

  onNameInput(): void {
    if (!this.editingSchoolId()) {
      const name = this.schoolForm.get('name')?.value || '';
      const codeControl = this.schoolForm.get('code');
      const emailControl = this.schoolForm.get('email');

      if (codeControl && (!codeControl.value || codeControl.pristine)) {
        const clean = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (clean) {
          const generatedCode = clean.slice(0, 16);
          codeControl.setValue(generatedCode);
          if (emailControl && (!emailControl.value || emailControl.pristine)) {
            emailControl.setValue(`admin@${generatedCode.toLowerCase().replace(/[^a-z0-9]/g, '')}.edu.in`);
          }
        }
      }
    }
  }

  openCreateModal(): void {
    this.editingSchoolId.set(null);
    this.schoolForm.reset({
      name: '',
      code: '',
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
      address: '',
      phone: '',
      email: ''
    });
    this.showFormModal.set(true);
  }

  openEditModal(school: SchoolResponse): void {
    this.editingSchoolId.set(school.id);
    this.schoolForm.patchValue({
      name: school.schoolName || school.name || '',
      code: school.schoolCode || school.code || '',
      city: school.city || 'Vijayawada',
      state: school.state || 'Andhra Pradesh',
      address: school.address || '',
      phone: school.contactPhone || school.phone || '',
      email: school.contactEmail || school.email || ''
    });
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
  }

  saveSchool(): void {
    if (this.schoolForm.invalid) {
      const invalidControls: Record<string, any> = {};
      Object.keys(this.schoolForm.controls).forEach(key => {
        const ctrl = this.schoolForm.get(key);
        if (ctrl && ctrl.invalid) {
          invalidControls[key] = { errors: ctrl.errors, value: ctrl.value };
        }
      });
      console.warn('[SchoolListComponent] Form has validation errors in controls:', invalidControls);
      this.schoolForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.schoolForm.value;
    const editId = this.editingSchoolId();

    const payload: SchoolRequest = {
      name: (formVal.name || '').trim(),
      schoolName: (formVal.name || '').trim(),
      code: (formVal.code || '').trim(),
      schoolCode: (formVal.code || '').trim(),
      city: (formVal.city || '').trim(),
      state: (formVal.state || '').trim(),
      address: (formVal.address || '').trim(),
      country: 'India',
      phone: (formVal.phone || '').trim(),
      contactPhone: (formVal.phone || '').trim(),
      email: (formVal.email || '').trim(),
      contactEmail: (formVal.email || '').trim()
    };

    console.log('[SchoolListComponent] Submitting to MongoDB. EditId:', editId, 'Payload:', payload);

    if (editId) {
      this.adminService.updateSchool(editId, payload).subscribe({
        next: (res) => {
          console.log('[SchoolListComponent] ✅ School updated in MongoDB:', res);
          this.isSubmitting.set(false);
          this.closeFormModal();
          this.loadSchools();
        },
        error: (err) => {
          console.error('[SchoolListComponent] ❌ Error updating school:', err);
          this.isSubmitting.set(false);
          const msg = err.error?.message || err.error?.schoolCode || 'Failed to update institution in database.';
          alert(msg);
        }
      });
    } else {
      this.adminService.createSchool(payload).subscribe({
        next: (res) => {
          console.log('[SchoolListComponent] ✅ School saved to MongoDB:', res);
          this.isSubmitting.set(false);
          this.closeFormModal();
          this.loadSchools();
        },
        error: (err) => {
          console.error('[SchoolListComponent] ❌ Error creating school in MongoDB:', err);
          this.isSubmitting.set(false);
          const msg = err.error?.message || err.error?.schoolCode || err.error?.error || 'Failed to create institution in database.';
          alert(msg);
        }
      });
    }
  }

  openDeleteModal(school: SchoolResponse): void {
    this.selectedSchoolForDelete.set(school);
    this.deleteConfirmInput.set('');
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.selectedSchoolForDelete.set(null);
    this.deleteConfirmInput.set('');
  }

  isDeleteDisabled(): boolean {
    const target = this.selectedSchoolForDelete();
    if (!target || this.isSubmitting()) return true;
    const targetCode = (target.schoolCode || target.code || '').trim().toUpperCase();
    const inputCode = (this.deleteConfirmInput() || '').trim().toUpperCase();
    return !inputCode || inputCode !== targetCode;
  }

  confirmDelete(): void {
    const target = this.selectedSchoolForDelete();
    if (!target) return;

    const targetId = target.id ?? (target as any)._id ?? target.schoolCode ?? target.code;
    if (!targetId) {
      alert('Cannot delete: Missing institution ID');
      return;
    }

    this.isSubmitting.set(true);
    console.log('[SchoolListComponent] Initiating deletion for School ID:', targetId, 'Code:', target.schoolCode || target.code);

    this.adminService.deleteSchool(targetId).subscribe({
      next: () => {
        console.log('[SchoolListComponent] ✅ Deleted school from MongoDB:', targetId);
        this.isSubmitting.set(false);
        this.closeDeleteModal();
        // Optimistically remove from local signal
        this.schools.update(list => list.filter(s => s.id !== targetId && (s.schoolCode || s.code) !== targetId));
        this.filterSchools();
        this.loadSchools();
      },
      error: (err) => {
        console.error('[SchoolListComponent] ❌ Error deleting school from MongoDB:', err);
        this.isSubmitting.set(false);

        // Check if it was a fallback school or already removed from MongoDB
        if (targetId === 'SCH001' || err.status === 404) {
          console.warn('[SchoolListComponent] School not found in MongoDB or was fallback. Removing from local list.');
          this.schools.update(list => list.filter(s => s.id !== targetId && (s.schoolCode || s.code) !== targetId));
          this.filterSchools();
          this.closeDeleteModal();
          return;
        }

        const errMsg = err.error?.message || err.error?.error || err.statusText || 'Failed to delete institution from database.';
        alert(`Deletion failed: ${errMsg}`);
        this.closeDeleteModal();
      }
    });
  }
}
