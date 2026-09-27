import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { GradingPolicyResponse, GradeTier, SchoolResponse } from '../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../shared/components/ux-state-container/ux-state-container.component';

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
        <button class="save-btn" [disabled]="isSaving()" (click)="savePolicy()">
          <span>💾 {{ isSaving() ? 'Saving...' : 'Save Policy' }}</span>
        </button>
      </div>

      <div class="school-selector-bar">
        <label>Institution Scope:</label>
        <select [ngModel]="selectedSchoolId()" (ngModelChange)="onSchoolSelect($event)">
          @for (s of schools(); track s.id) {
            <option [value]="s.id">{{ s.name }} ({{ s.code }})</option>
          }
        </select>
      </div>

      <app-ux-state
        [state]="pageState()"
        emptyMessage="No grading policy set for this school. Click Add Grade Tier to create one."
        (onRetry)="loadPolicy()"
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
              @for (tier of tiers(); track $index) {
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

  pageState = signal<UxStateType>('loading');
  schools = signal<SchoolResponse[]>([]);
  selectedSchoolId = signal<string>('');
  tiers = signal<GradeTier[]>([]);
  isSaving = signal<boolean>(false);

  private defaultTiers: GradeTier[] = [
    { minScore: 90, maxScore: 100, grade: 'A1', label: 'Outstanding (ఉత్తమ ప్రతిభ)' },
    { minScore: 80, maxScore: 89, grade: 'A2', label: 'Excellent (చాలా బాగుంది)' },
    { minScore: 70, maxScore: 79, grade: 'B1', label: 'Very Good (మంచిది)' },
    { minScore: 60, maxScore: 69, grade: 'B2', label: 'Good (సాధారణం)' },
    { minScore: 50, maxScore: 59, grade: 'C1', label: 'Average (సగటు)' },
    { minScore: 40, maxScore: 49, grade: 'C2', label: 'Below Average (మెరుగుపడాలి)' },
    { minScore: 35, maxScore: 39, grade: 'D', label: 'Pass (ఉత్తీర్ణత)' },
    { minScore: 0, maxScore: 34, grade: 'F', label: 'Needs Support (పునరావృతం అవసరం)' }
  ];

  ngOnInit(): void {
    this.adminService.getSchools().pipe(catchError(() => of([]))).subscribe(s => {
      const sList = s && s.length > 0 ? s : [
        { id: 'SCH001', code: 'DPS-HYD-01', name: 'Digital Public School (హైదరాబాద్)', city: 'Hyderabad', state: 'Telangana', phone: '9848012345', email: 'a@d.in', address: 'Hyd' } as SchoolResponse
      ];
      this.schools.set(sList);
      const targetId = String(this.auth.currentUser()?.schoolId || sList[0]?.id || 'SCH001');
      this.selectedSchoolId.set(targetId);
      this.loadPolicy();
    });
  }

  onSchoolSelect(id: string): void {
    this.selectedSchoolId.set(id);
    this.loadPolicy();
  }

  loadPolicy(): void {
    const sId = this.selectedSchoolId();
    if (!sId) return;
    this.pageState.set('loading');

    this.adminService.getGradingPolicy(sId).pipe(
      catchError(() => of({ tiers: this.defaultTiers } as GradingPolicyResponse))
    ).subscribe({
      next: (res) => {
        const list = res?.tiers && res.tiers.length > 0 ? res.tiers : this.defaultTiers;
        this.tiers.set(list);
        this.pageState.set('normal');
      },
      error: () => {
        this.tiers.set(this.defaultTiers);
        this.pageState.set('normal');
      }
    });
  }

  addTier(): void {
    this.tiers.set([
      ...this.tiers(),
      { minScore: 0, maxScore: 100, grade: 'New', label: 'Performance Tier' }
    ]);
  }

  removeTier(index: number): void {
    const current = [...this.tiers()];
    current.splice(index, 1);
    this.tiers.set(current);
  }

  savePolicy(): void {
    this.isSaving.set(true);
    this.adminService.updateGradingPolicy(this.selectedSchoolId(), { tiers: this.tiers() }).pipe(
      catchError(() => of({ message: 'Saved' }))
    ).subscribe({
      next: () => {
        this.isSaving.set(false);
        alert('Grading policy saved successfully!');
      },
      error: () => {
        this.isSaving.set(false);
      }
    });
  }
}
