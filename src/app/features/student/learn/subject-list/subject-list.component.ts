import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AcademicService } from '../../../../core/services/academic.service';
import { StudentService } from '../../../../core/services/student.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SubjectResponse, StudentProgress } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';
import { ProgressRingComponent } from '../../../../shared/components/progress-ring/progress-ring.component';
import { TeluguNfcPipe } from '../../../../shared/pipes/telugu-nfc.pipe';

@Component({
  selector: 'app-subject-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UxStateContainerComponent,
    ProgressRingComponent,
    TeluguNfcPipe
  ],
  template: `
    <div class="subject-list-container">
      <header class="page-header">
        <h1 class="page-title">Learning Hub</h1>
        <p class="page-subtitle">Select a subject to explore interactive chapters and lessons</p>

        <!-- Search / Filter -->
        <div class="search-bar glass-card">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            placeholder="Search subjects by name..."
            class="search-input"
          />
        </div>
      </header>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="grid"
        emptyTitle="No Subjects Found"
        emptyMessage="No subjects match your current search query."
        (onRetry)="loadSubjects()"
      >
        <div class="subjects-grid">
          @for (subject of filteredSubjects(); track subject.id) {
            <div
              class="subject-card glass-card"
              [ngClass]="getSubjectGradient(subject.name)"
              (click)="openSubject(subject.id)"
            >
              <div class="card-top">
                <div class="icon-circle">
                  <span>{{ getSubjectIcon(subject.name) }}</span>
                </div>
                <app-progress-ring
                  [progress]="getSubjectProgress(subject.id)"
                  [size]="48"
                  [strokeWidth]="4"
                  progressColor="#00D9A3"
                  trackColor="rgba(255,255,255,0.15)"
                />
              </div>

              <div class="card-info">
                <h3 class="subject-name">{{ subject.name | teluguNfc }}</h3>
                <span class="subject-code">{{ subject.code || 'CODE' }} • {{ standardDisplayName() }}</span>
              </div>

              <div class="card-footer">
                <span class="action-label">Open Subject</span>
                <span class="arrow">→</span>
              </div>
            </div>
          }
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./subject-list.component.scss']
})
export class SubjectListComponent implements OnInit {
  public auth = inject(AuthService);
  private academic = inject(AcademicService);
  private student = inject(StudentService);
  private router = inject(Router);

  pageState = signal<UxStateType>('loading');
  subjects = signal<SubjectResponse[]>([]);
  progressList = signal<StudentProgress[]>([]);
  standardDisplayName = signal<string>('Class 5');
  searchQuery = signal<string>('');

  filteredSubjects = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.subjects();
    if (!q) return list;
    return list.filter(
      (s) =>
        (typeof s.name === 'string' ? s.name : (s.name as any)?.en || '').toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q))
    );
  });

  ngOnInit(): void {
    this.loadSubjects();
  }

  loadSubjects(): void {
    this.pageState.set('loading');
    const user = this.auth.currentUser();
    const schoolId = user?.schoolId || '';
    const standardId = user?.standardId || '';

    forkJoin({
      subjects: this.academic.getSubjects(schoolId, standardId).pipe(catchError(() => of([]))),
      progress: this.student.getProgress().pipe(catchError(() => of([]))),
      standard: standardId ? this.academic.getStandard(standardId).pipe(catchError(() => of(null))) : of(null)
    }).subscribe({
      next: (res) => {
        this.subjects.set(res.subjects);
        this.progressList.set(res.progress);
        if (res.standard) {
          this.standardDisplayName.set(res.standard.name || `Class ${res.standard.standardNumber}`);
        } else if (standardId && !isNaN(Number(standardId))) {
          this.standardDisplayName.set(`Class ${standardId}`);
        } else {
          this.standardDisplayName.set('Class 5');
        }
        this.pageState.set(res.subjects.length === 0 ? 'empty' : 'normal');
      },
      error: () => {
        this.pageState.set('error');
      }
    });
  }

  getSubjectProgress(subjectId: string | number): number {
    const list = this.progressList();
    if (!list || list.length === 0) return 0;
    const matched = list.filter((p: any) => String(p.subjectId) === String(subjectId));
    if (matched.length === 0) return 0;
    const total = matched.reduce((sum, p) => sum + (p.completionPercent || 0), 0);
    return Math.round(total / matched.length);
  }

  getSubjectGradient(name: string): string {
    const n = (name || '').toLowerCase();
    if (n.includes('math') || n.includes('గణితం')) return 'grad-math';
    if (n.includes('science') || n.includes('సైన్స్')) return 'grad-science';
    if (n.includes('telugu') || n.includes('తెలుగు')) return 'grad-telugu';
    if (n.includes('english') || n.includes('ఇంగ్లీష్')) return 'grad-english';
    if (n.includes('social') || n.includes('history')) return 'grad-history';
    if (n.includes('evs') || n.includes('పరిసరాల')) return 'grad-evs';
    return 'grad-default';
  }

  getSubjectIcon(name: string): string {
    const n = (name || '').toLowerCase();
    if (n.includes('math') || n.includes('గణితం')) return '📐';
    if (n.includes('science') || n.includes('సైన్స్')) return '🔬';
    if (n.includes('telugu') || n.includes('తెలుగు')) return '📖';
    if (n.includes('english') || n.includes('ఇంగ్లీష్')) return '🔤';
    if (n.includes('social') || n.includes('history')) return '🌍';
    if (n.includes('evs') || n.includes('పరిసరాల')) return '🌱';
    return '📚';
  }

  openSubject(subjectId: string | number): void {
    this.router.navigate(['/student/learn/subject', subjectId]);
  }
}
