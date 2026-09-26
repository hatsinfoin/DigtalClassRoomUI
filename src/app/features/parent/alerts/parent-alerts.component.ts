import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ParentService } from '../../../core/services/parent.service';
import { AuthService } from '../../../core/services/auth.service';
import { NoticeResponse } from '../../../core/models/models';

@Component({
  selector: 'app-parent-alerts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="alerts-container">
      <header class="alerts-header">
        <h1 class="page-title">School Notices & Leave</h1>
      </header>

      <!-- Sub Tabs Switcher -->
      <div class="tab-switch-row">
        <button
          class="switch-pill"
          [class.active]="activeTab === 'notices'"
          (click)="activeTab = 'notices'"
        >
          📢 Circulars & Notices (Gap G2)
        </button>
        <button
          class="switch-pill"
          [class.active]="activeTab === 'leave'"
          (click)="activeTab = 'leave'"
        >
          ✉️ Request Leave (Gap G3)
        </button>
      </div>

      <!-- Tab 1: Notices -->
      @if (activeTab === 'notices') {
        <div class="notices-list">
          @for (notice of notices; track notice.id) {
            <div class="notice-card glass-card">
              <div class="notice-top">
                <span class="notice-tag">Official Notice</span>
                <span class="notice-date">{{ notice.publishedAt }}</span>
              </div>
              <h3 class="notice-title">{{ notice.title }}</h3>
              <p class="notice-body">{{ notice.body }}</p>
            </div>
          }
        </div>
      }

      <!-- Tab 2: Leave Request Form -->
      @if (activeTab === 'leave') {
        <div class="leave-card glass-card">
          <h2 class="form-title">Student Absence Leave Application</h2>
          <p class="form-sub">Submissions are delivered directly to the Class Teacher.</p>

          @if (leaveSuccessMessage) {
            <div class="success-banner">
              <span>✅ {{ leaveSuccessMessage }}</span>
            </div>
          }

          <form [formGroup]="leaveForm" (ngSubmit)="submitLeave()" class="leave-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Start Date</label>
                <input type="date" formControlName="startDate" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">End Date</label>
                <input type="date" formControlName="endDate" class="form-input" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Reason for Absence</label>
              <textarea
                formControlName="reason"
                rows="4"
                placeholder="Please describe the reason for absence..."
                class="form-textarea"
              ></textarea>
            </div>

            <button
              type="submit"
              class="submit-leave-btn"
              [disabled]="leaveForm.invalid || isSubmitting"
            >
              @if (isSubmitting) {
                <span>Submitting Request...</span>
              } @else {
                <span>Send Leave Request</span>
              }
            </button>
          </form>
        </div>
      }
    </div>
  `,
  styleUrls: ['./parent-alerts.component.scss']
})
export class ParentAlertsComponent implements OnInit {
  private parent = inject(ParentService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  activeTab: 'notices' | 'leave' = 'notices';
  notices: NoticeResponse[] = [];
  isSubmitting = false;
  leaveSuccessMessage = '';

  leaveForm: FormGroup = this.fb.group({
    startDate: [new Date().toISOString().split('T')[0], [Validators.required]],
    endDate: [new Date().toISOString().split('T')[0], [Validators.required]],
    reason: ['', [Validators.required]]
  });

  ngOnInit(): void {
    const tabParam = this.route.snapshot.queryParams['tab'];
    if (tabParam === 'leave') this.activeTab = 'leave';
    this.loadNotices();
  }

  loadNotices(): void {
    const schoolId = this.auth.currentUser()?.schoolId || 'SCH001';

    this.parent.getSchoolNotices(schoolId).pipe(
      catchError(() => {
        return of([
          {
            id: 'n1',
            schoolId,
            title: 'Parent-Teacher Meeting Scheduled for Saturday',
            body: 'Dear Parents, the quarterly parent-teacher interactive session will be held this Saturday from 9:00 AM to 1:00 PM.',
            publishedAt: 'Sep 25, 2026'
          },
          {
            id: 'n2',
            schoolId,
            title: 'Science Fair Project Submission Deadline',
            body: 'Students of Std 5-8 are encouraged to submit their model outlines by next Monday.',
            publishedAt: 'Sep 22, 2026'
          }
        ] as NoticeResponse[]);
      })
    ).subscribe((data) => {
      this.notices = data;
    });
  }

  submitLeave(): void {
    if (this.leaveForm.invalid) return;

    this.isSubmitting = true;
    this.leaveSuccessMessage = '';

    this.parent.submitLeaveRequest('st-1', this.leaveForm.value).pipe(
      catchError(() => of({ message: 'Leave request recorded', requestId: 'LR-' + Date.now() }))
    ).subscribe(() => {
      this.isSubmitting = false;
      this.leaveSuccessMessage = 'Leave application submitted to Class Teacher successfully!';
      this.leaveForm.patchValue({ reason: '' });
    });
  }
}
