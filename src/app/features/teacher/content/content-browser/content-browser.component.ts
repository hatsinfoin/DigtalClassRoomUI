import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AcademicService } from '../../../../core/services/academic.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SubjectResponse, LessonResponse } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';
import { TeluguNfcPipe } from '../../../../shared/pipes/telugu-nfc.pipe';

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
      <header class="browser-header">
        <div class="header-left">
          <h1 class="page-title">Curriculum Content Browser</h1>
          <p class="page-subtitle">Manage lessons, digital textbooks, and media resources</p>
        </div>
      </header>

      <!-- Subject Filter Tabs -->
      <div class="filter-pills-row">
        <button
          class="filter-pill"
          [class.active]="selectedSubjectId() === ''"
          (click)="selectSubject('')"
        >
          All Subjects
        </button>
        @for (subj of subjects(); track subj.id) {
          <button
            class="filter-pill"
            [class.active]="selectedSubjectId() === subj.id"
            (click)="selectSubject(subj.id)"
          >
            {{ subj.name | teluguNfc }}
          </button>
        }
      </div>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="list"
        emptyTitle="No Lessons Found"
        emptyMessage="No lessons created under this subject yet."
        (onRetry)="loadContent()"
      >
        <div class="lessons-list">
          @for (lesson of filteredLessons(); track lesson.id) {
            <div class="lesson-card glass-card">
              <div class="lesson-info">
                <span class="chapter-tag">Chapter {{ lesson.orderIndex || '1' }}</span>
                <h3 class="lesson-title">{{ lesson.title | teluguNfc }}</h3>
                <span class="lesson-lang">{{ lesson.language || 'Telugu / English' }}</span>
              </div>

              <div class="lesson-actions">
                <button class="upload-btn" (click)="uploadResource(lesson.id)">
                  <span>📤 Upload File</span>
                </button>
              </div>
            </div>
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

  pageState = signal<UxStateType>('loading');
  subjects = signal<SubjectResponse[]>([]);
  lessons = signal<LessonResponse[]>([]);
  selectedSubjectId = signal<string | number>('');

  filteredLessons = computed(() => {
    const subId = this.selectedSubjectId();
    const list = this.lessons();
    if (!subId) return list;
    return list.filter((l) => String(l.subjectId) === String(subId));
  });

  ngOnInit(): void {
    this.loadContent();
  }

  loadContent(): void {
    this.pageState.set('loading');
    const schoolId = this.auth.currentUser()?.schoolId || '';

    forkJoin({
      subjects: this.academic.getSubjects(schoolId).pipe(catchError(() => of([]))),
      lessons: this.academic.getLessons(schoolId).pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.subjects.set(res.subjects);
        const lessonsList = res.lessons && res.lessons.length > 0 ? res.lessons : [
          {
            id: 'les-1',
            schoolId,
            subjectId: res.subjects[0]?.id || 's1',
            standardId: '5',
            academicYearId: '1',
            title: 'Forces & Energy / బలం మరియు శక్తి',
            orderIndex: 1,
            language: 'te,en'
          },
          {
            id: 'les-2',
            schoolId,
            subjectId: res.subjects[0]?.id || 's1',
            standardId: '5',
            academicYearId: '1',
            title: 'Friction and Its Effects / ఘర్షణ మరియు ప్రభావాలు',
            orderIndex: 2,
            language: 'te,en'
          }
        ];
        this.lessons.set(lessonsList);
        this.pageState.set('normal');
      },
      error: () => {
        this.pageState.set('error');
      }
    });
  }

  selectSubject(id: string | number): void {
    this.selectedSubjectId.set(id);
  }

  uploadResource(lessonId: string | number): void {
    this.router.navigate(['/teacher/content/lesson', lessonId, 'upload']);
  }
}
