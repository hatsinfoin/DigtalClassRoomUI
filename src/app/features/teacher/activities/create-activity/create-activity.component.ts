import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TeacherService } from '../../../../core/services/teacher.service';
import { AcademicService } from '../../../../core/services/academic.service';
import { AuthService } from '../../../../core/services/auth.service';
import { StandardResponse, SubjectResponse, LessonResponse } from '../../../../core/models/models';

@Component({
  selector: 'app-create-activity',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="create-activity-container">
      <header class="create-header">
        <button class="back-btn" (click)="goBack()">
          <span>←</span> Back
        </button>
        <h1 class="page-title">Create Activity or Exam</h1>
      </header>

      @if (errorMessage) {
        <div class="error-box glass-card">
          <span>⚠️ {{ errorMessage }}</span>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-card glass-card">
        <!-- Title -->
        <div class="form-group">
          <label class="form-label" for="title">Activity Title</label>
          <input
            id="title"
            type="text"
            formControlName="title"
            placeholder="e.g. Physics Chapter 1 Quiz"
            class="form-input"
          />
        </div>

        <!-- Standard & Subject Selection -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Standard / Grade</label>
            <select formControlName="standardId" class="form-select" (change)="onStandardChange()">
              @for (std of standards; track std.id) {
                <option [value]="std.id">Class {{ std.standardNumber }}th</option>
              }
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Subject</label>
            <select formControlName="subjectId" class="form-select" (change)="onSubjectChange()">
              @for (subj of subjects; track subj.id) {
                <option [value]="subj.id">{{ subj.name }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Activity Type & Exam Category -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Activity Type</label>
            <select formControlName="activityType" class="form-select">
              <option value="QUIZ">QUIZ</option>
              <option value="ASSESSMENT">ASSESSMENT (Formal Exam)</option>
              <option value="PRACTICE">PRACTICE</option>
              <option value="FLASHCARD">FLASHCARD</option>
              <option value="VOCABULARY_BUILDER">VOCABULARY BUILDER</option>
              <option value="READING_COMPREHENSION">READING COMPREHENSION</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Exam Category</label>
            <select formControlName="examCategory" class="form-select">
              <option value="DAILY_PRACTICE">DAILY PRACTICE</option>
              <option value="WEEKLY_TEST">WEEKLY TEST</option>
              <option value="MONTHLY_TEST">MONTHLY TEST</option>
              <option value="QUARTERLY_EXAM">QUARTERLY EXAM</option>
              <option value="HALF_YEARLY_EXAM">HALF YEARLY EXAM</option>
              <option value="ANNUAL_EXAM">ANNUAL EXAM</option>
              <option value="NONE">NONE</option>
            </select>
          </div>
        </div>

        <!-- Difficulty Level & Total Marks -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Difficulty Level</label>
            <select formControlName="difficultyLevel" class="form-select">
              <option value="EASY">EASY</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HARD">HARD</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="marks">Total Marks</label>
            <input
              id="marks"
              type="number"
              formControlName="totalMarks"
              class="form-input"
            />
          </div>
        </div>

        <!-- Language Mode -->
        <div class="form-group">
          <label class="form-label">Language Mode</label>
          <select formControlName="language" class="form-select">
            <option value="te,en">Bilingual (Telugu & English)</option>
            <option value="te">Telugu Only</option>
            <option value="en">English Only</option>
          </select>
        </div>

        <button
          type="submit"
          class="submit-btn"
          [disabled]="form.invalid || isSubmitting"
        >
          @if (isSubmitting) {
            <span>Creating Activity...</span>
          } @else {
            <span>Create & Add Questions →</span>
          }
        </button>
      </form>
    </div>
  `,
  styleUrls: ['./create-activity.component.scss']
})
export class CreateActivityComponent implements OnInit {
  private fb = inject(FormBuilder);
  private teacher = inject(TeacherService);
  private academic = inject(AcademicService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private location = inject(Location);

  standards: StandardResponse[] = [];
  subjects: SubjectResponse[] = [];
  lessons: LessonResponse[] = [];
  isSubmitting = false;
  errorMessage = '';

  form: FormGroup = this.fb.group({
    title: ['', [Validators.required]],
    standardId: ['5', [Validators.required]],
    subjectId: ['', [Validators.required]],
    lessonId: [''],
    activityType: ['QUIZ', [Validators.required]],
    examCategory: ['WEEKLY_TEST', [Validators.required]],
    difficultyLevel: ['MEDIUM', [Validators.required]],
    totalMarks: [20, [Validators.required, Validators.min(1)]],
    language: ['te,en', [Validators.required]]
  });

  ngOnInit(): void {
    const schoolId = this.auth.currentUser()?.schoolId || '';
    forkJoin({
      standards: this.academic.getStandards(schoolId).pipe(catchError(() => of([]))),
      subjects: this.academic.getSubjects(schoolId).pipe(catchError(() => of([])))
    }).subscribe((res) => {
      this.standards = res.standards.length > 0 ? res.standards : [
        { id: '5', schoolId, academicYearId: '1', standardNumber: 5, name: 'Class 5', section: 'A' }
      ];
      this.subjects = res.subjects.length > 0 ? res.subjects : [
        { id: 'subj-1', schoolId, standardId: '5', academicYearId: '1', name: 'Science', code: 'SCI' },
        { id: 'subj-2', schoolId, standardId: '5', academicYearId: '1', name: 'Mathematics', code: 'MATH' }
      ];
      if (this.subjects.length > 0) {
        this.form.patchValue({ subjectId: this.subjects[0].id });
      }
    });
  }

  onStandardChange(): void {}
  onSubjectChange(): void {}

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const schoolId = this.auth.currentUser()?.schoolId || '';
    const payload = {
      ...this.form.value,
      schoolId,
      academicYearId: '1'
    };

    this.teacher.createActivity(payload).subscribe({
      next: (created) => {
        this.isSubmitting = false;
        this.router.navigate(['/teacher/activities', created.id, 'questions']);
      },
      error: () => {
        // Mock navigate to questions for demo
        this.isSubmitting = false;
        this.router.navigate(['/teacher/activities', 'act-demo-1', 'questions']);
      }
    });
  }

  goBack(): void {
    this.location.back();
  }
}
