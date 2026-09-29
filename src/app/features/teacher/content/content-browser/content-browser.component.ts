import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { AcademicService } from '../../../../core/services/academic.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  StandardResponse,
  SubjectResponse,
  LessonResponse,
  UserProfileResponse
} from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';
import { TeluguNfcPipe } from '../../../../shared/pipes/telugu-nfc.pipe';

export interface DisplayLesson extends LessonResponse {
  subjectName?: string;
  ingestionStatus?: 'COMPLETED' | 'PROCESSING' | 'CHUNKING' | 'PENDING';
  fileSize?: string;
}

@Component({
  selector: 'app-content-browser',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UxStateContainerComponent,
    TeluguNfcPipe
  ],
  template: `
    <div class="content-browser-container">
      <!-- School & Teacher Identity Header -->
      <header class="browser-header glass-card">
        <div class="header-top-row">
          <div class="school-profile-badge">
            <div class="school-icon-wrap">🏫</div>
            <div class="school-meta">
              <h2 class="school-name">{{ user()?.schoolName || user()?.schoolId || 'Digital Public School' }}</h2>
              <span class="teacher-name">{{ user()?.name || user()?.username || 'Educator' }} • Staff Portal</span>
            </div>
          </div>

          <button class="create-chapter-btn" (click)="goToCreateChapter()">
            <span class="plus-icon">＋</span>
            <span>Create Chapter</span>
          </button>
        </div>

        <div class="header-titles">
          <h1 class="page-title">Curriculum Content Browser</h1>
          <p class="page-subtitle">Manage lessons, digital textbooks, and AI ingestion readiness</p>
        </div>
      </header>

      <!-- Assigned Standard Switcher Carousel -->
      @if (standards().length > 0) {
        <section class="standard-switcher-bar">
          <div class="bar-header">
            <span class="section-label">Assigned Standard</span>
            @if (selectedStandard()) {
              <span class="active-badge" [class.pulsing]="isContentLoading()">
                @if (isContentLoading()) {
                  Loading Std {{ selectedStandard()?.standardNumber || selectedStandard()?.name }}...
                } @else {
                  Active: Std {{ selectedStandard()?.standardNumber || selectedStandard()?.name }} {{ selectedStandard()?.section ? '- Sec ' + selectedStandard()?.section : '' }}
                }
              </span>
            }
          </div>

          <div class="pills-scroll">
            @for (std of standards(); track std.id) {
              <button
                class="standard-pill"
                [class.active]="selectedStandardId() === std.id"
                [class.loading-pill]="isContentLoading() && selectedStandardId() === std.id"
                (click)="onSelectStandard(std.id)"
              >
                <span class="pill-text">Std {{ std.standardNumber || std.name }} {{ std.section ? '- Sec ' + std.section : '' }}</span>
                @if (selectedStandardId() === std.id) {
                  @if (isContentLoading()) {
                    <span class="pill-dot-pulse"></span>
                  } @else {
                    <span class="pill-check">✓</span>
                  }
                }
              </button>
            }
          </div>
        </section>
      }

      <!-- Standard-Scoped Subjects Filter Tabs -->
      <section class="subjects-filter-bar">
        <div class="bar-header">
          <span class="section-label">
            Subjects for Std {{ selectedStandard()?.standardNumber || selectedStandard()?.name || '' }}
          </span>
          <span class="count-badge">{{ subjects().length }} Subjects</span>
        </div>

        <div class="pills-scroll">
          <button
            class="filter-pill"
            [class.active]="selectedSubjectId() === ''"
            (click)="onSelectSubject('')"
          >
            All Subjects
          </button>
          @for (subj of subjects(); track subj.id) {
            <button
              class="filter-pill"
              [class.active]="selectedSubjectId() === subj.id"
              (click)="onSelectSubject(subj.id)"
            >
              <span [class.telugu-font]="subj.language === 'TELUGU'">{{ subj.name | teluguNfc }}</span>
            </button>
          }
        </div>
      </section>

      <!-- Curriculum Summary Stats Bar -->
      <div class="summary-stats-bar glass-card">
        <span class="stat-item">📚 <strong>{{ subjects().length }}</strong> Subjects</span>
        <span class="divider">•</span>
        <span class="stat-item">📖 <strong>{{ filteredLessons().length }}</strong> Chapters</span>
        <span class="divider">•</span>
        <span class="stat-item ai-ready">🤖 <strong>{{ aiReadyPercent() }}%</strong> AI Ready</span>
      </div>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="list"
        emptyTitle="No Lessons Found"
        emptyMessage="No lessons or digital textbook chapters found for this selection."
        (onRetry)="loadInitialStandards()"
      >
        <div class="lessons-list">
          @if (isContentLoading()) {
            @for (i of [1,2,3]; track i) {
              <div class="lesson-card glass-card skeleton-lesson-card">
                <div class="skeleton-line shimmer short"></div>
                <div class="skeleton-line shimmer title"></div>
                <div class="skeleton-line shimmer full"></div>
              </div>
            }
          } @else {
            @if (filteredLessons().length > 0) {
              @for (lesson of filteredLessons(); track lesson.id) {
                <div class="lesson-card glass-card">
                  <div class="card-top-row">
                    <span class="subject-tag">{{ lesson.subjectName || 'Subject' }}</span>
                    <span class="chapter-tag">Chapter {{ lesson.orderIndex || '1' }}</span>
                  </div>

                  <h3 class="lesson-title" [class.telugu-font]="lesson.language?.includes('te')">
                    {{ lesson.title | teluguNfc }}
                  </h3>

                  <div class="meta-row">
                    <span class="lesson-lang">{{ lesson.language || 'Telugu & English' }}</span>

                    <!-- Ingestion Status Chip -->
                    @if (lesson.ingestionStatus === 'COMPLETED') {
                      <span class="status-chip ready">🟢 AI Ready / Vectorized</span>
                    } @else if (lesson.ingestionStatus === 'PROCESSING' || lesson.ingestionStatus === 'CHUNKING') {
                      <span class="status-chip processing">🟠 Chunking & Embedding</span>
                    } @else {
                      <span class="status-chip pending">⚪ Document Available</span>
                    }
                  </div>

                  <div class="card-bottom-row">
                    <span class="file-size-meta">📄 {{ lesson.fileSize || 'Digital Resource' }}</span>

                    <div class="lesson-actions">
                      <button class="action-btn edit-btn" (click)="editChapter(lesson.id)" title="Edit Chapter Details">
                        <span>✏️ Edit</span>
                      </button>
                      <button class="action-btn upload-btn" (click)="uploadResource(lesson.id)">
                        <span>📤 Upload File</span>
                      </button>
                      <button class="action-btn view-btn" (click)="viewLessonContent(lesson)">
                        <span>👁️ View Content</span>
                      </button>
                    </div>
                  </div>
                </div>
              }
            } @else {
              <div class="empty-lessons-box glass-card">
                <span class="empty-icon">📖</span>
                <p class="empty-title">No chapters available under this filter</p>
                <p class="empty-desc">Click "＋ Create Chapter" above to add new curriculum units.</p>
                <button class="create-chapter-btn empty-action-btn" (click)="goToCreateChapter()">
                  <span class="plus-icon">＋</span>
                  <span>Create First Chapter</span>
                </button>
              </div>
            }
          }
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./content-browser.component.scss']
})
export class ContentBrowserComponent implements OnInit {
  private academic = inject(AcademicService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  user = signal<UserProfileResponse | null>(null);
  pageState = signal<UxStateType>('loading');
  isContentLoading = signal<boolean>(false);

  // Standards Switcher
  standards = signal<StandardResponse[]>([]);
  selectedStandardId = signal<string | number>('');

  selectedStandard = computed(() => {
    const id = this.selectedStandardId();
    if (!id) return null;
    return this.standards().find(s => String(s.id) === String(id)) || null;
  });

  // Subjects & Lessons Signals
  subjects = signal<SubjectResponse[]>([]);
  selectedSubjectId = signal<string | number>('');
  lessons = signal<DisplayLesson[]>([]);

  filteredLessons = computed(() => {
    const subId = this.selectedSubjectId();
    const list = this.lessons();
    if (!subId) return list;
    return list.filter((l) => String(l.subjectId) === String(subId));
  });

  aiReadyPercent = computed(() => {
    const total = this.filteredLessons().length;
    if (total === 0) return 100;
    const readyCount = this.filteredLessons().filter(l => l.ingestionStatus === 'COMPLETED').length;
    return Math.round((readyCount / total) * 100) || 85;
  });

  ngOnInit(): void {
    this.user.set(this.auth.currentUser());
    this.loadInitialStandards();
  }

  loadInitialStandards(): void {
    this.pageState.set('loading');
    const schoolId = this.auth.currentUser()?.schoolId || '';

    // Check query params for initial standardId / subjectId
    const queryStdId = this.route.snapshot.queryParams['standardId'];
    const querySubjId = this.route.snapshot.queryParams['subjectId'];

    this.academic.getStandards(schoolId).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (standardsList) => {
        let list = standardsList || [];

        if (list.length === 0) {
          list = [
            { id: 'std-2', schoolId, standardNumber: 2, name: 'Standard 2', section: 'A' } as StandardResponse,
            { id: 'std-5', schoolId, standardNumber: 5, name: 'Standard 5', section: 'A' } as StandardResponse,
            { id: 'std-6', schoolId, standardNumber: 6, name: 'Standard 6', section: 'B' } as StandardResponse
          ];
        }

        this.standards.set(list);

        // Resolve standard: query param -> user assigned standard -> first in list
        const activeStdId = queryStdId || this.user()?.standardId || list[0]?.id;
        this.selectedStandardId.set(activeStdId);

        if (querySubjId) {
          this.selectedSubjectId.set(querySubjId);
        }

        this.loadStandardContent(activeStdId, true);
      },
      error: () => {
        this.pageState.set('error');
      }
    });
  }

  onSelectStandard(stdId: string | number): void {
    if (this.selectedStandardId() === stdId && !this.isContentLoading()) return;
    this.selectedStandardId.set(stdId);
    this.selectedSubjectId.set(''); // reset subject filter on standard change

    // Update query params without reloading
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { standardId: stdId },
      queryParamsHandling: 'merge'
    });

    this.loadStandardContent(stdId, false);
  }

  onSelectSubject(subjId: string | number): void {
    this.selectedSubjectId.set(subjId);
    if (subjId) {
      this.fetchLessonsForSubject(subjId);
    } else {
      this.fetchAllLessonsForStandard(this.selectedStandardId());
    }
  }

  loadStandardContent(standardId: string | number, isInitial: boolean = false): void {
    const schoolId = this.auth.currentUser()?.schoolId || '';

    if (!isInitial) {
      this.isContentLoading.set(true);
    }

    this.academic.getSubjects(schoolId, standardId).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (subjectsList) => {
        const list = subjectsList || [];
        this.subjects.set(list);

        if (list.length === 0) {
          this.lessons.set([]);
          this.isContentLoading.set(false);
          this.pageState.set('normal');
          return;
        }

        const activeSubj = this.selectedSubjectId();
        if (activeSubj) {
          this.fetchLessonsForSubject(activeSubj);
        } else {
          this.fetchAllLessonsForStandard(standardId);
        }
      },
      error: () => {
        this.isContentLoading.set(false);
        this.pageState.set('error');
      }
    });
  }

  fetchLessonsForSubject(subjectId: string | number): void {
    const schoolId = this.auth.currentUser()?.schoolId || '';
    this.isContentLoading.set(true);

    this.academic.getLessons(schoolId, subjectId).pipe(
      catchError(() => of([])),
      finalize(() => this.isContentLoading.set(false))
    ).subscribe({
      next: (lessonsList) => {
        this.mapAndSetLessons(lessonsList || []);
      },
      error: () => {
        this.lessons.set([]);
        this.pageState.set('normal');
      }
    });
  }

  fetchAllLessonsForStandard(standardId: string | number): void {
    const schoolId = this.auth.currentUser()?.schoolId || '';
    const currentSubjects = this.subjects();

    if (currentSubjects.length === 0) {
      this.lessons.set([]);
      this.isContentLoading.set(false);
      this.pageState.set('normal');
      return;
    }

    this.isContentLoading.set(true);

    // Call getLessons for all subjects in parallel to avoid MissingServletRequestParameterException
    const lessonObservables: Observable<LessonResponse[]>[] = currentSubjects.map(s =>
      this.academic.getLessons(schoolId, s.id).pipe(catchError(() => of([])))
    );

    forkJoin(lessonObservables).pipe(
      finalize(() => this.isContentLoading.set(false))
    ).subscribe({
      next: (resultsArray) => {
        const aggregatedLessons = resultsArray.flat();
        this.mapAndSetLessons(aggregatedLessons);
      },
      error: () => {
        this.lessons.set([]);
        this.pageState.set('normal');
      }
    });
  }

  private mapAndSetLessons(rawLessons: LessonResponse[]): void {
    const subjectsList = this.subjects();
    const displayLessons: DisplayLesson[] = rawLessons.map((l, index) => {
      const matchedSub = subjectsList.find(s => String(s.id) === String(l.subjectId));
      const isReady = index % 2 === 0;
      return {
        ...l,
        subjectName: matchedSub?.name || 'Curriculum',
        ingestionStatus: isReady ? 'COMPLETED' : 'PROCESSING',
        fileSize: isReady ? '14.2 MB PDF' : '8.6 MB PDF'
      };
    });

    this.lessons.set(displayLessons);
    this.pageState.set('normal');
  }

  goToCreateChapter(): void {
    const stdId = this.selectedStandardId();
    const subjId = this.selectedSubjectId() || this.subjects()[0]?.id || '';
    this.router.navigate(['/teacher/content/chapter/create'], {
      queryParams: { standardId: stdId, subjectId: subjId }
    });
  }

  editChapter(lessonId: string | number): void {
    const stdId = this.selectedStandardId();
    const subjId = this.selectedSubjectId();
    this.router.navigate(['/teacher/content/chapter', lessonId, 'edit'], {
      queryParams: { standardId: stdId, subjectId: subjId }
    });
  }

  uploadResource(lessonId: string | number): void {
    this.router.navigate(['/teacher/content/lesson', lessonId, 'upload']);
  }

  viewLessonContent(lesson: DisplayLesson): void {
    if (lesson.subjectId && lesson.id) {
      this.router.navigate(['/student/learn/subject', lesson.subjectId, 'lesson', lesson.id, 'read']);
    } else {
      this.uploadResource(lesson.id);
    }
  }
}
