import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentService } from '../../../../core/services/student.service';
import { StudentActivitySummaryResponse } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';

@Component({
  selector: 'app-practice-activities',
  standalone: true,
  imports: [
    CommonModule,
    UxStateContainerComponent
  ],
  template: `
    <div class="practice-container">
      <header class="practice-header">
        <button class="back-btn" (click)="goBack()">
          <span>←</span> Back to Lesson
        </button>
        <div class="practice-title-card glass-card">
          <span class="practice-badge">Self-Paced Practice</span>
          <h1 class="practice-title">Quizzes & Exercises</h1>
          <p class="practice-subtitle">Practice makes perfect! AI hints available during practice mode.</p>
        </div>
      </header>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="list"
        emptyTitle="No Practice Quizzes Yet"
        emptyMessage="Practice activities for this lesson will appear here once published."
        (onRetry)="loadActivities()"
      >
        <div class="activities-list">
          @for (act of activities(); track act.id) {
            <div class="activity-card glass-card">
              <div class="activity-type-icon">
                <span>{{ getActivityIcon(act.activityType) }}</span>
              </div>

              <div class="activity-info">
                <span class="type-tag">{{ act.activityType }}</span>
                <h3 class="activity-title">{{ act.title }}</h3>
                <span class="activity-meta">
                  {{ act.totalQuestions }} Questions • {{ act.totalMarks }} Marks • {{ act.difficultyLevel }}
                </span>
              </div>

              <button class="start-btn" (click)="startPractice(act.id)">
                <span>Start</span>
                <span>→</span>
              </button>
            </div>
          }
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./practice-activities.component.scss']
})
export class PracticeActivitiesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private student = inject(StudentService);

  lessonId = '';
  subjectId = '';
  pageState = signal<UxStateType>('loading');
  activities = signal<StudentActivitySummaryResponse[]>([]);

  ngOnInit(): void {
    this.lessonId = this.route.snapshot.paramMap.get('lessonId') || '';
    this.subjectId = this.route.snapshot.paramMap.get('subjectId') || '';
    this.loadActivities();
  }

  loadActivities(): void {
    this.pageState.set('loading');

    this.student.getActivitiesByLesson(this.lessonId).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.activities.set(data);
          this.pageState.set('normal');
        } else {
          // Provide demo activities for testing
          this.activities.set([
            {
              id: 'act-practice-1',
              title: 'Chapter Quick Concept Quiz',
              activityType: 'QUIZ',
              examCategory: 'DAILY_PRACTICE',
              difficultyLevel: 'MEDIUM',
              totalQuestions: 5,
              totalMarks: 10,
              language: 'te,en'
            },
            {
              id: 'act-practice-2',
              title: 'Vocabulary & Definitions Builder',
              activityType: 'VOCABULARY_BUILDER',
              examCategory: 'DAILY_PRACTICE',
              difficultyLevel: 'EASY',
              totalQuestions: 4,
              totalMarks: 8,
              language: 'te,en'
            }
          ]);
          this.pageState.set('normal');
        }
      },
      error: () => {
        this.pageState.set('error');
      }
    });
  }

  getActivityIcon(type: string): string {
    if (type === 'QUIZ') return '❓';
    if (type === 'FLASHCARD') return '🗂️';
    if (type === 'VOCABULARY_BUILDER') return '🔤';
    if (type === 'READING_COMPREHENSION') return '📖';
    return '📝';
  }

  startPractice(activityId: string | number): void {
    this.router.navigate(['/student/exam', activityId, 'instructions']);
  }

  goBack(): void {
    this.location.back();
  }
}
