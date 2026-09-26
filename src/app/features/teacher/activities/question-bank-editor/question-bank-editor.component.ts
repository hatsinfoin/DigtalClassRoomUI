import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TeacherService } from '../../../../core/services/teacher.service';
import { ActivityDetailResponse, QuestionResponse } from '../../../../core/models/models';
import { TeluguNfcPipe } from '../../../../shared/pipes/telugu-nfc.pipe';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';

@Component({
  selector: 'app-question-bank-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TeluguNfcPipe,
    UxStateContainerComponent
  ],
  template: `
    <div class="qbank-container">
      <header class="qbank-header">
        <button class="back-btn" (click)="goBack()">
          <span>←</span> Back
        </button>
        <div class="header-main">
          <h1 class="page-title">Question Bank Editor</h1>
          <p class="page-subtitle">{{ activity()?.title }} ({{ questions().length }} Questions)</p>
        </div>
        <div class="header-actions">
          <button class="bulk-btn" (click)="goToBulkUpload()">
            <span>📂 Bulk CSV Upload</span>
          </button>
        </div>
      </header>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="list"
        emptyTitle="No Questions in Bank"
        emptyMessage="Add questions manually below or import via CSV."
      >
        <!-- Existing Questions List -->
        <div class="questions-list">
          @for (q of questions(); track q.id; let idx = $index) {
            <div class="q-card glass-card">
              <div class="q-card-top">
                <span class="q-idx">Q{{ idx + 1 }} • {{ q.marks }} Marks</span>
                <button class="del-btn" (click)="deleteQuestion(q.id)">🗑️</button>
              </div>

              <p class="q-text text-telugu">{{ q.text | teluguNfc }}</p>

              <!-- Options with Teacher Answer Indicators -->
              <div class="options-grid">
                @for (opt of q.options; track opt.id || $index) {
                  <div class="opt-chip" [class.correct]="opt.isCorrect">
                    <span class="opt-indicator">{{ opt.isCorrect ? '✓ Correct' : 'Option' }}</span>
                    <span class="opt-txt text-telugu">{{ opt.text | teluguNfc }}</span>
                  </div>
                }
              </div>

              @if (q.explanation) {
                <div class="explanation-tag">
                  <span class="lbl">Explanation:</span> {{ q.explanation }}
                </div>
              }
            </div>
          }
        </div>

        <!-- Add New Question Form -->
        <div class="add-q-card glass-card">
          <h3 class="form-heading">➕ Add New Question</h3>

          <form [formGroup]="qForm" (ngSubmit)="addQuestion()">
            <div class="form-group">
              <label class="form-label" for="qText">Question Text (Telugu or English)</label>
              <textarea
                id="qText"
                formControlName="text"
                rows="3"
                placeholder="Enter question prompt..."
                class="form-textarea"
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Marks</label>
                <input type="number" formControlName="marks" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label" for="hint">AI Hint Text (Shown in practice)</label>
                <input id="hint" type="text" formControlName="hintText" placeholder="Hint prompt..." class="form-input" />
              </div>
            </div>

            <!-- Options Array -->
            <div class="options-form-section">
              <label class="form-label">Answer Options (Select the correct radio button)</label>
              <div formArrayName="options" class="options-inputs-list">
                @for (optGroup of optionsArray.controls; track $index; let i = $index) {
                  <div [formGroupName]="i" class="option-input-row">
                    <input
                      type="radio"
                      name="correctOptionRadio"
                      [checked]="optGroup.get('isCorrect')?.value"
                      (change)="setCorrectOption(i)"
                      class="radio-input"
                    />
                    <input
                      type="text"
                      formControlName="text"
                      placeholder="Option {{ i + 1 }} text..."
                      class="form-input opt-text-input"
                    />
                  </div>
                }
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="exp">Explanation / Solution</label>
              <input id="exp" type="text" formControlName="explanation" placeholder="Why this is the correct answer..." class="form-input" />
            </div>

            <button
              type="submit"
              class="add-btn"
              [disabled]="qForm.invalid || isSaving()"
            >
              <span>Save Question to Bank</span>
            </button>
          </form>
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./question-bank-editor.component.scss']
})
export class QuestionBankEditorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private teacher = inject(TeacherService);
  private fb = inject(FormBuilder);

  activityId = '';
  pageState = signal<UxStateType>('loading');
  activity = signal<ActivityDetailResponse | null>(null);
  questions = signal<QuestionResponse[]>([]);
  isSaving = signal<boolean>(false);

  qForm: FormGroup = this.fb.group({
    text: ['', [Validators.required]],
    marks: [2, [Validators.required, Validators.min(1)]],
    hintText: [''],
    explanation: [''],
    options: this.fb.array([
      this.fb.group({ text: ['', Validators.required], isCorrect: [true] }),
      this.fb.group({ text: ['', Validators.required], isCorrect: [false] }),
      this.fb.group({ text: ['', Validators.required], isCorrect: [false] }),
      this.fb.group({ text: ['', Validators.required], isCorrect: [false] })
    ])
  });

  get optionsArray(): FormArray {
    return this.qForm.get('options') as FormArray;
  }

  ngOnInit(): void {
    this.activityId = this.route.snapshot.paramMap.get('activityId') || '';
    this.loadQuestions();
  }

  loadQuestions(): void {
    this.pageState.set('loading');

    this.teacher.getActivity(this.activityId).pipe(
      catchError(() => {
        return of({
          id: this.activityId,
          schoolId: 'SCH001',
          title: 'Physics & Forces Quiz',
          questions: [
            {
              id: 'q1',
              text: 'కింది వాటిలో ఏది సంపర్క బలం (Contact Force)?',
              marks: 2,
              questionType: 'MULTIPLE_CHOICE',
              explanation: 'ఘర్షణ బలం రెండు వస్తువులు స్పర్శించినప్పుడు పనిచేస్తుంది.',
              options: [
                { id: 'o1', text: 'గురుత్వాకర్షణ బలం', isCorrect: false },
                { id: 'o2', text: 'ఘర్షణ బలం', isCorrect: true },
                { id: 'o3', text: 'అయస్కాంత బలం', isCorrect: false },
                { id: 'o4', text: 'స్థిర విద్యుత్ బలం', isCorrect: false }
              ]
            }
          ]
        } as ActivityDetailResponse);
      })
    ).subscribe((data) => {
      this.activity.set(data);
      this.questions.set(data.questions || []);
      this.pageState.set('normal');
    });
  }

  setCorrectOption(idx: number): void {
    this.optionsArray.controls.forEach((ctrl, i) => {
      ctrl.patchValue({ isCorrect: i === idx });
    });
  }

  addQuestion(): void {
    if (this.qForm.invalid) return;

    this.isSaving.set(true);
    const val = this.qForm.value;
    const req = {
      text: val.text,
      questionType: 'MULTIPLE_CHOICE' as const,
      marks: val.marks,
      hintText: val.hintText,
      explanation: val.explanation,
      options: val.options
    };

    this.teacher.createQuestion(this.activityId, req).pipe(
      catchError(() => {
        return of({
          id: 'q-new-' + Date.now(),
          ...req
        } as QuestionResponse);
      })
    ).subscribe((newQ) => {
      this.isSaving.set(false);
      this.questions.update((list) => [...list, newQ]);
      this.qForm.patchValue({ text: '', hintText: '', explanation: '' });
      this.optionsArray.controls.forEach((ctrl) => ctrl.patchValue({ text: '' }));
      this.setCorrectOption(0);
    });
  }

  deleteQuestion(qId: string | number): void {
    if (confirm('Delete this question from question bank?')) {
      this.teacher.deleteQuestion(this.activityId, String(qId)).pipe(
        catchError(() => of(undefined))
      ).subscribe(() => {
        this.questions.update((list) => list.filter((q) => String(q.id) !== String(qId)));
      });
    }
  }

  goToBulkUpload(): void {
    this.router.navigate(['/teacher/activities', this.activityId, 'questions', 'bulk-upload']);
  }

  goBack(): void {
    this.location.back();
  }
}
