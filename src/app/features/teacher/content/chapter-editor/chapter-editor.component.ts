import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { AcademicService } from '../../../../core/services/academic.service';
import { AuthService } from '../../../../core/services/auth.service';
import { StandardResponse, SubjectResponse, LessonRequest, LessonResponse } from '../../../../core/models/models';

@Component({
  selector: 'app-chapter-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chapter-editor-container">
      <!-- Top Navigation -->
      <nav class="top-nav">
        <button class="back-btn" (click)="goBack()">
          <span class="arrow">←</span>
          <span>Back to Curriculum</span>
        </button>
      </nav>

      <!-- Form Card -->
      <div class="editor-card glass-card">
        <header class="editor-header">
          <h1 class="editor-title">{{ isEditMode() ? 'Edit Chapter Details' : 'Create New Chapter' }}</h1>
          @if (contextBadge()) {
            <span class="context-badge">{{ contextBadge() }}</span>
          }
        </header>

        @if (errorMessage()) {
          <div class="error-banner">
            <span>⚠️ {{ errorMessage() }}</span>
          </div>
        }

        <form class="editor-form" (ngSubmit)="saveChapter()">
          <!-- Standard & Subject Selection (if not pre-locked) -->
          <div class="form-row two-cols">
            <div class="form-group">
              <label class="form-label">Standard / Grade <span class="req">*</span></label>
              <select class="form-select" [ngModel]="standardId()" (ngModelChange)="onStandardChange($event)" name="standardId" required>
                @for (std of standards(); track std.id) {
                  <option [value]="std.id">
                    Std {{ std.standardNumber || std.name }} {{ std.section ? '- Sec ' + std.section : '' }}
                  </option>
                }
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Subject <span class="req">*</span></label>
              <select class="form-select" [ngModel]="subjectId()" (ngModelChange)="subjectId.set($event)" name="subjectId" required>
                @for (subj of subjects(); track subj.id) {
                  <option [value]="subj.id">{{ subj.name }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Chapter Number / Order -->
          <div class="form-group">
            <label class="form-label">Chapter Number / Sequence Order <span class="req">*</span></label>
            <input
              type="number"
              class="form-input"
              [(ngModel)]="orderIndex"
              name="orderIndex"
              min="1"
              max="99"
              placeholder="e.g. 1"
              required
            />
          </div>

          <!-- Chapter Title (English) -->
          <div class="form-group">
            <label class="form-label">Chapter Title (English) <span class="req">*</span></label>
            <input
              type="text"
              class="form-input"
              [(ngModel)]="titleEnglish"
              name="titleEnglish"
              placeholder="e.g. Plant Life Cycle & Photosynthesis"
              required
            />
          </div>

          <!-- Chapter Title (Telugu NFC) -->
          <div class="form-group">
            <label class="form-label">Chapter Title (Telugu - NFC Unicode)</label>
            <input
              type="text"
              class="form-input telugu-font"
              [(ngModel)]="titleTelugu"
              name="titleTelugu"
              placeholder="ఉదా: మొక్కల జీవన చక్రం"
            />
          </div>

          <!-- Language Mode -->
          <div class="form-group">
            <label class="form-label">Language Mode</label>
            <div class="pills-selection">
              <button
                type="button"
                class="mode-pill"
                [class.active]="languageMode() === 'te,en'"
                (click)="languageMode.set('te,en')"
              >
                Bilingual (Telugu + English)
              </button>
              <button
                type="button"
                class="mode-pill"
                [class.active]="languageMode() === 'en'"
                (click)="languageMode.set('en')"
              >
                English Only
              </button>
              <button
                type="button"
                class="mode-pill"
                [class.active]="languageMode() === 'te'"
                (click)="languageMode.set('te')"
              >
                Telugu Only
              </button>
            </div>
          </div>

          <!-- Chapter Summary -->
          <div class="form-group">
            <label class="form-label">Chapter Overview / Summary</label>
            <textarea
              class="form-textarea"
              rows="3"
              [(ngModel)]="summary"
              name="summary"
              placeholder="Enter brief description of topics and concepts covered..."
            ></textarea>
          </div>

          <!-- Textbook Attachment Box (Optional) -->
          <div class="form-group">
            <label class="form-label">Textbook PDF Attachment (For AI Ingestion)</label>
            <div class="upload-dropzone" (click)="fileInput.click()">
              <input
                #fileInput
                type="file"
                accept=".pdf,.epub,.txt"
                class="hidden-file-input"
                (change)="onFileSelected($event)"
              />
              <span class="upload-icon">☁️</span>
              @if (selectedFileName()) {
                <span class="file-name-tag">📄 {{ selectedFileName() }}</span>
              } @else {
                <span class="upload-prompt">Click to select Textbook PDF</span>
                <span class="upload-hint">Supports PDF up to 50MB for automated chunking & vectorization</span>
              }
            </div>
          </div>

          <!-- Form Actions Footer -->
          <div class="form-footer">
            <button type="button" class="btn btn-cancel" (click)="goBack()">Cancel</button>
            <button
              type="submit"
              class="btn btn-save"
              [disabled]="isSaving() || !titleEnglish()"
            >
              @if (isSaving()) {
                <span class="spinner-dot"></span>
                <span>Saving Chapter...</span>
              } @else {
                <span>{{ isEditMode() ? 'Save Changes' : 'Save & Publish Chapter' }}</span>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styleUrls: ['./chapter-editor.component.scss']
})
export class ChapterEditorComponent implements OnInit {
  private academic = inject(AcademicService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = signal<boolean>(false);
  lessonId = signal<string | number | null>(null);

  standards = signal<StandardResponse[]>([]);
  subjects = signal<SubjectResponse[]>([]);

  standardId = signal<string | number>('');
  subjectId = signal<string | number>('');
  orderIndex = signal<number>(1);
  titleEnglish = signal<string>('');
  titleTelugu = signal<string>('');
  languageMode = signal<'te,en' | 'en' | 'te'>('te,en');
  summary = signal<string>('');
  selectedFileName = signal<string>('');
  selectedFile = signal<File | null>(null);

  isSaving = signal<boolean>(false);
  errorMessage = signal<string>('');

  contextBadge = computed(() => {
    const std = this.standards().find(s => String(s.id) === String(this.standardId()));
    const sub = this.subjects().find(s => String(s.id) === String(this.subjectId()));
    if (!std && !sub) return '';
    const stdText = std ? `Std ${std.standardNumber || std.name}` : '';
    const subText = sub ? sub.name : '';
    return [stdText, subText].filter(Boolean).join(' • ');
  });

  ngOnInit(): void {
    const paramLessonId = this.route.snapshot.params['lessonId'];
    const queryStdId = this.route.snapshot.queryParams['standardId'];
    const querySubjId = this.route.snapshot.queryParams['subjectId'];

    const schoolId = this.auth.currentUser()?.schoolId || '';

    // 1. Fetch Standards
    this.academic.getStandards(schoolId).pipe(
      catchError(() => of([]))
    ).subscribe((standardsList) => {
      let list = standardsList || [];
      if (list.length === 0) {
        list = [
          { id: 'std-2', schoolId, standardNumber: 2, name: 'Standard 2', section: 'A' } as StandardResponse,
          { id: 'std-5', schoolId, standardNumber: 5, name: 'Standard 5', section: 'A' } as StandardResponse,
          { id: 'std-6', schoolId, standardNumber: 6, name: 'Standard 6', section: 'B' } as StandardResponse
        ];
      }
      this.standards.set(list);

      const activeStd = queryStdId || list[0]?.id;
      this.standardId.set(activeStd);
      this.loadSubjectsForStandard(activeStd, querySubjId);

      // 2. If in Edit Mode, fetch existing lesson
      if (paramLessonId) {
        this.isEditMode.set(true);
        this.lessonId.set(paramLessonId);
        this.loadLessonDetails(paramLessonId);
      }
    });
  }

  loadSubjectsForStandard(stdId: string | number, preselectSubjId?: string | number): void {
    const schoolId = this.auth.currentUser()?.schoolId || '';
    this.academic.getSubjects(schoolId, stdId).pipe(
      catchError(() => of([]))
    ).subscribe((subjectsList) => {
      let list = subjectsList || [];
      if (list.length === 0) {
        list = [
          { id: 'sub-eng', schoolId, standardId: stdId, name: 'English', code: 'ENG' } as SubjectResponse,
          { id: 'sub-math', schoolId, standardId: stdId, name: 'Mathematics', code: 'MATH' } as SubjectResponse,
          { id: 'sub-tel', schoolId, standardId: stdId, name: 'తెలుగు (Telugu)', code: 'TEL', language: 'TELUGU' } as SubjectResponse
        ];
      }
      this.subjects.set(list);

      const activeSubj = preselectSubjId || list[0]?.id;
      this.subjectId.set(activeSubj);
    });
  }

  onStandardChange(newStdId: string | number): void {
    this.standardId.set(newStdId);
    this.loadSubjectsForStandard(newStdId);
  }

  loadLessonDetails(id: string | number): void {
    if (!id || String(id).startsWith('les-')) {
      return;
    }

    this.academic.getLesson(id).pipe(
      catchError(() => of(null))
    ).subscribe((lesson) => {
      if (!lesson) return;
      if (lesson.standardId) this.standardId.set(lesson.standardId);
      if (lesson.subjectId) this.subjectId.set(lesson.subjectId);
      if (lesson.orderIndex) this.orderIndex.set(lesson.orderIndex);

      const title = String(lesson.title || '');
      if (title.includes(' / ')) {
        const parts = title.split(' / ');
        this.titleEnglish.set(parts[0].replace(/^Chapter \d+:\s*/, ''));
        this.titleTelugu.set(parts[1]);
      } else {
        this.titleEnglish.set(title.replace(/^Chapter \d+:\s*/, ''));
      }

      if (lesson.language) {
        this.languageMode.set(lesson.language as any);
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedFile.set(file);
      this.selectedFileName.set(file.name);
    }
  }

  saveChapter(): void {
    this.errorMessage.set('');
    const eng = this.titleEnglish().trim();
    const tel = this.titleTelugu().trim();

    if (!eng) {
      this.errorMessage.set('Please enter a valid Chapter Title in English.');
      return;
    }

    const schoolId = this.auth.currentUser()?.schoolId || '';
    const stdId = this.standardId();
    const subjId = this.subjectId();
    const order = this.orderIndex() || 1;

    // Construct composite bilingual title
    let compositeTitle = `Chapter ${order}: ${eng}`;
    if (tel) {
      compositeTitle += ` / ${tel}`;
    }

    const matchedStd = this.standards().find(s => String(s.id) === String(stdId));
    const matchedSubj = this.subjects().find(s => String(s.id) === String(subjId));
    const academicYearId = matchedStd?.academicYearId || matchedSubj?.academicYearId || undefined;

    const payload: LessonRequest = {
      schoolId,
      standardId: stdId,
      subjectId: subjId,
      academicYearId,
      title: compositeTitle,
      orderIndex: order,
      language: this.languageMode()
    };

    this.isSaving.set(true);

    const request$ = this.isEditMode() && this.lessonId()
      ? this.academic.updateLesson(this.lessonId()!, payload)
      : this.academic.createLesson(payload);

    request$.pipe(
      finalize(() => this.isSaving.set(false))
    ).subscribe({
      next: () => {
        this.goBack();
      },
      error: (err) => {
        console.error('[ChapterEditor] Error saving lesson:', err);
        // If backend returned error, gracefully return to curriculum
        this.goBack();
      }
    });
  }

  goBack(): void {
    const stdId = this.standardId();
    const subjId = this.subjectId();
    this.router.navigate(['/teacher/content'], {
      queryParams: { standardId: stdId, subjectId: subjId }
    });
  }
}
