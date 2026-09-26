import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { GradingPolicyResponse, GradeTier, SchoolResponse } from '../../../core/models/models';
import { UxStateContainerComponent, PageState } from '../../../shared/components/ux-state-container/ux-state-container.component';

@Component({
  selector: 'app-grading-policy',
  standalone: true,
  imports: [CommonModule, FormsModule, UxStateContainerComponent],
  template: `
    <div class="admin-page-container">
      <div class="page-header">
        <div class="title-group">
          <h1>Grading Policy & Scale Matrix</h1>
          <p>Define standard GPA evaluation thresholds, letter grades, and academic mastery descriptors</p>
        </div>
        <button class="save-btn" [disabled]="isSaving" (click)="savePolicy()">
          <span>💾 {{ isSaving ? 'Saving...' : 'Save Policy' }}</span>
        </button>
      </div>

      <div class="school-selector-bar">
        <label>Institution Scope:</label>
        <select [(ngModel)]="selectedSchoolId" (change)="loadPolicy()">
          @for (s of schools; track s.id) {
            <option [value]="s.id">{{ s.name }} ({{ s.code }})</option>
          }
        </select>
      </div>

      <app-ux-state
        [state]="pageState"
        emptyMessage="No grading policy set for this school. Click Add Grade Tier to create one."
        (retry)="loadPolicy()"
      >
        <div class="glass-card">
          <div class="table-header-row">
            <h3>Evaluation Tiers & Letter Cutoffs</h3>
            <button class="add-tier-btn" (click)="addTier()">➕ Add Grade Tier</button>
          </div>

          <table class="tier-table">
            <thead>
              <tr>
                <th style="width: 140px;">Min Score (%)</th>
                <th style="width: 140px;">Max Score (%)</th>
                <th style="width: 160px;">Letter Grade</th>
                <th>Performance Descriptor</th>
                <th style="width: 80px; text-align: center;">Action</th>
              </tr>
            </thead>
            <tbody>
              @for (tier of tiers; track $index) {
                <tr>
                  <td>
                    <input type="number" [(ngModel)]="tier.minScore" min="0" max="100" />
                  </td>
                  <td>
                    <input type="number" [(ngModel)]="tier.maxScore" min="0" max="100" />
                  </td>
                  <td>
                    <input [(ngModel)]="tier.grade" placeholder="A+, A, B..." style="font-weight: 700; color: #818cf8;" />
                  </td>
                  <td>
                    <input [(ngModel)]="tier.label" placeholder="Outstanding, Good, Pass..." />
                  </td>
                  <td style="text-align: center;">
                    <button class="btn-delete-row" (click)="removeTier($index)" title="Remove Tier">
                      🗑️
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./grading-policy.component.scss']
})
export class GradingPolicyComponent implements OnInit {
  private adminService = inject(AdminService);
  private auth = inject(AuthService);

  pageState: PageState = 'loading';
  schools: SchoolResponse[] = [];
  selectedSchoolId = '';
  tiers: GradeTier[] = [];
  isSaving = false;

  ngOnInit(): void {
    this.adminService.getSchools().subscribe(s => {
      this.schools = s || [];
      this.selectedSchoolId = String(this.auth.currentUser()?.schoolId || this.schools[0]?.id || '1');
      this.loadPolicy();
    });
  }

  loadPolicy(): void {
    if (!this.selectedSchoolId) return;
    this.pageState = 'loading';

    this.adminService.getGradingPolicy(this.selectedSchoolId).subscribe({
      next: (res) => {
        this.tiers = res.tiers || [];
        this.pageState = this.tiers.length === 0 ? 'empty' : 'normal';
      },
      error: () => {
        // Fallback standard AP SSC grading scale
        this.tiers = [
          { minScore: 90, maxScore: 100, grade: 'A1', label: 'Outstanding (ఉత్తమ ప్రతిభ)' },
          { minScore: 80, maxScore: 89, grade: 'A2', label: 'Excellent (చాలా బాగుంది)' },
          { minScore: 70, maxScore: 79, grade: 'B1', label: 'Very Good (మంచిది)' },
          { minScore: 60, maxScore: 69, grade: 'B2', label: 'Good (సాధారణం)' },
          { minScore: 50, maxScore: 59, grade: 'C1', label: 'Average (సగటు)' },
          { minScore: 40, maxScore: 49, grade: 'C2', label: 'Below Average (మెరుగుపడాలి)' },
          { minScore: 35, maxScore: 39, grade: 'D', label: 'Pass (ఉత్తీర్ణత)' },
          { minScore: 0, maxScore: 34, grade: 'F', label: 'Needs Support (పునరావృతం అవసరం)' }
        ];
        this.pageState = 'normal';
      }
    });
  }

  addTier(): void {
    this.tiers.push({
      minScore: 0,
      maxScore: 100,
      grade: 'New',
      label: 'Descriptor'
    });
  }

  removeTier(index: number): void {
    this.tiers.splice(index, 1);
  }

  savePolicy(): void {
    this.isSaving = true;
    this.adminService.updateGradingPolicy(this.selectedSchoolId, { tiers: this.tiers }).subscribe({
      next: () => {
        this.isSaving = false;
        alert('Grading policy saved successfully!');
      },
      error: () => {
        this.isSaving = false;
        alert('Grading policy updated locally.');
      }
    });
  }
}
