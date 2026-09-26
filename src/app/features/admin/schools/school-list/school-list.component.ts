import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../../../core/services/admin.service';
import { SchoolResponse, SchoolRequest } from '../../../../core/models/models';
import { UxStateContainerComponent } from '../../../../shared/components/ux-state-container/ux-state-container.component';
import { PageState } from '../../../../shared/components/ux-state-container/ux-state-container.component';

@Component({
  selector: 'app-school-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UxStateContainerComponent],
  template: `
    <div class="admin-page-container">
      <div class="page-header">
        <div class="title-group">
          <h1>Institutions & Schools</h1>
          <p>Manage enrolled institutional campuses, configurations, and contact directories</p>
        </div>
        <button class="primary-btn" (click)="openCreateModal()">
          <span>➕ Add Institution</span>
        </button>
      </div>

      <div class="table-toolbar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by school name, code or city..."
            [(ngModel)]="searchQuery"
            (input)="filterSchools()"
          />
        </div>
        <div class="meta-count">
          Showing {{ filteredSchools.length }} of {{ schools.length }} schools
        </div>
      </div>

      <app-ux-state
        [state]="pageState"
        emptyMessage="No schools enrolled yet. Click 'Add Institution' to create one."
        (retry)="loadSchools()"
      >
        <div class="glass-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>School Code</th>
                <th>Institution Name</th>
                <th>City / Region</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (school of filteredSchools; track school.id) {
                <tr>
                  <td class="code-cell">{{ school.code }}</td>
                  <td class="name-cell">{{ school.name }}</td>
                  <td>{{ school.city }}, {{ school.state }}</td>
                  <td>{{ school.phone }}</td>
                  <td>
                    <span class="status-badge" style="color: #00D9A3; font-size: 13px;">● Active</span>
                  </td>
                  <td>
                    <div class="action-group">
                      <button class="btn-icon" (click)="openEditModal(school)" title="Edit School">
                        ✏️ Edit
                      </button>
                      <button class="btn-icon btn-danger" (click)="openDeleteModal(school)" title="Delete School">
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-ux-state>

      <!-- Create/Edit Modal -->
      @if (showFormModal) {
        <div class="modal-overlay" (click)="closeFormModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editingSchoolId ? 'Edit Institution' : 'Add New Institution' }}</h2>
              <button class="close-btn" (click)="closeFormModal()">✕</button>
            </div>

            <form [formGroup]="schoolForm" (ngSubmit)="saveSchool()">
              <div class="form-grid">
                <div class="form-group full-width">
                  <label>Institution Name (Preserves Telugu NFC)</label>
                  <input formControlName="name" placeholder="e.g. ZP High School (తెలుగు / English)" />
                </div>
                <div class="form-group">
                  <label>School Code</label>
                  <input formControlName="code" placeholder="e.g. ZPHS-VJA-01" [readonly]="!!editingSchoolId" />
                </div>
                <div class="form-group">
                  <label>Contact Phone</label>
                  <input formControlName="phone" placeholder="+91 9876543210" />
                </div>
                <div class="form-group">
                  <label>City</label>
                  <input formControlName="city" placeholder="Vijayawada" />
                </div>
                <div class="form-group">
                  <label>State</label>
                  <input formControlName="state" placeholder="Andhra Pradesh" />
                </div>
                <div class="form-group full-width">
                  <label>Email Address</label>
                  <input formControlName="email" type="email" placeholder="principal@zphs.edu.in" />
                </div>
                <div class="form-group full-width">
                  <label>Campus Address</label>
                  <textarea formControlName="address" rows="2" placeholder="Full postal address..."></textarea>
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-secondary" (click)="closeFormModal()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="schoolForm.invalid || isSubmitting">
                  {{ isSubmitting ? 'Saving...' : 'Save School' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Guarded Delete Modal with Verification -->
      @if (showDeleteModal && selectedSchoolForDelete) {
        <div class="modal-overlay" (click)="closeDeleteModal()">
          <div class="modal-dialog delete-confirm-box" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 style="color: #FF6B6B;">⚠️ Guarded Deletion</h2>
              <button class="close-btn" (click)="closeDeleteModal()">✕</button>
            </div>
            <p>
              Are you sure you want to delete <strong>{{ selectedSchoolForDelete.name }}</strong>?
              This action cannot be undone and purges tenant associations.
            </p>
            <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 12px;">
              Please type the school code <strong>{{ selectedSchoolForDelete.code }}</strong> to confirm:
            </p>
            <input
              class="confirm-input"
              [(ngModel)]="deleteConfirmInput"
              [placeholder]="selectedSchoolForDelete.code"
            />
            <div class="modal-footer" style="justify-content: center;">
              <button type="button" class="btn-secondary" (click)="closeDeleteModal()">Cancel</button>
              <button
                type="button"
                class="btn-primary"
                style="background: #FF6B6B;"
                [disabled]="deleteConfirmInput !== selectedSchoolForDelete.code || isSubmitting"
                (click)="confirmDelete()"
              >
                {{ isSubmitting ? 'Deleting...' : 'Confirm Delete' }}
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
  private fb = inject(FormBuilder);

  pageState: PageState = 'loading';
  schools: SchoolResponse[] = [];
  filteredSchools: SchoolResponse[] = [];
  searchQuery = '';

  showFormModal = false;
  editingSchoolId: string | number | null = null;
  showDeleteModal = false;
  selectedSchoolForDelete: SchoolResponse | null = null;
  deleteConfirmInput = '';
  isSubmitting = false;

  schoolForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    code: ['', Validators.required],
    phone: ['', Validators.required],
    city: ['', Validators.required],
    state: ['Andhra Pradesh', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    address: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadSchools();
  }

  loadSchools(): void {
    this.pageState = 'loading';
    this.adminService.getSchools().subscribe({
      next: (data) => {
        this.schools = data || [];
        this.filterSchools();
        this.pageState = this.schools.length === 0 ? 'empty' : 'normal';
      },
      error: () => {
        this.pageState = 'error';
      }
    });
  }

  filterSchools(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredSchools = [...this.schools];
      return;
    }
    this.filteredSchools = this.schools.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q)
    );
  }

  openCreateModal(): void {
    this.editingSchoolId = null;
    this.schoolForm.reset({
      name: '',
      code: '',
      phone: '',
      city: '',
      state: 'Andhra Pradesh',
      email: '',
      address: ''
    });
    this.showFormModal = true;
  }

  openEditModal(school: SchoolResponse): void {
    this.editingSchoolId = school.id;
    this.schoolForm.patchValue({
      name: school.name,
      code: school.code,
      phone: school.phone,
      city: school.city,
      state: school.state,
      email: school.email,
      address: school.address
    });
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
  }

  saveSchool(): void {
    if (this.schoolForm.invalid) return;
    this.isSubmitting = true;
    const formVal = this.schoolForm.value as SchoolRequest;

    if (this.editingSchoolId) {
      this.adminService.updateSchool(this.editingSchoolId, formVal).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeFormModal();
          this.loadSchools();
        },
        error: () => {
          this.isSubmitting = false;
        }
      });
    } else {
      this.adminService.createSchool(formVal).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeFormModal();
          this.loadSchools();
        },
        error: () => {
          this.isSubmitting = false;
        }
      });
    }
  }

  openDeleteModal(school: SchoolResponse): void {
    this.selectedSchoolForDelete = school;
    this.deleteConfirmInput = '';
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedSchoolForDelete = null;
    this.deleteConfirmInput = '';
  }

  confirmDelete(): void {
    if (!this.selectedSchoolForDelete) return;
    this.isSubmitting = true;
    this.adminService.deleteSchool(this.selectedSchoolForDelete.id).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeDeleteModal();
        this.loadSchools();
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }
}
