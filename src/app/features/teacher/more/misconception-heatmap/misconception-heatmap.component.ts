import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { TeacherService } from '../../../../core/services/teacher.service';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';

interface HeatmapConceptItem {
  conceptName: string;
  subjectName: string;
  errorRate: number; // 0 to 100%
  studentsStrugglingCount: number;
  totalAttempts: number;
  recommendedIntervention: string;
}

@Component({
  selector: 'app-misconception-heatmap',
  standalone: true,
  imports: [CommonModule, UxStateContainerComponent],
  template: `
    <div class="heatmap-container">
      <header class="heatmap-header">
        <button class="back-btn" (click)="goBack()">
          <span>←</span> Back
        </button>
        <div class="header-content">
          <h1 class="page-title">Misconception Heatmap</h1>
          <p class="page-subtitle">Identify class-wide cognitive gaps & error clusters</p>
        </div>
      </header>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="list"
        emptyTitle="No Heatmap Data"
        emptyMessage="Cognitive error patterns will populate as students complete quizzes."
      >
        <div class="concepts-heatmap-list">
          @for (c of concepts(); track c.conceptName) {
            <div class="concept-card glass-card" [ngClass]="getSeverityClass(c.errorRate)">
              <div class="concept-top">
                <div class="title-group">
                  <span class="subject-tag">{{ c.subjectName }}</span>
                  <h3 class="concept-title">{{ c.conceptName }}</h3>
                </div>
                <div class="error-pill" [ngClass]="getSeverityClass(c.errorRate)">
                  {{ c.errorRate }}% Error Rate
                </div>
              </div>

              <div class="concept-stats">
                <span>⚠️ {{ c.studentsStrugglingCount }} Students Struggling</span>
                <span>•</span>
                <span>{{ c.totalAttempts }} Total Attempted Questions</span>
              </div>

              <div class="intervention-box">
                <span class="int-label">💡 Recommended Remediation:</span>
                <p class="int-text">{{ c.recommendedIntervention }}</p>
              </div>
            </div>
          }
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./misconception-heatmap.component.scss']
})
export class MisconceptionHeatmapComponent implements OnInit {
  private location = inject(Location);

  pageState = signal<UxStateType>('normal');

  concepts = signal<HeatmapConceptItem[]>([
    {
      conceptName: 'Newton\'s Third Law: Action-Reaction Pairs',
      subjectName: 'General Science',
      errorRate: 68,
      studentsStrugglingCount: 19,
      totalAttempts: 28,
      recommendedIntervention: 'Conduct practical demonstration of balloon rocket to visualize opposite reaction forces.'
    },
    {
      conceptName: 'Fractions: Unlike Denominator Addition',
      subjectName: 'Mathematics',
      errorRate: 52,
      studentsStrugglingCount: 14,
      totalAttempts: 28,
      recommendedIntervention: 'Assign 5-minute visual fraction strip interactive lesson before next checkpoint.'
    },
    {
      conceptName: 'Telugu Sandhi Rules (సవర్ణదీర్ఘ సంధి)',
      subjectName: 'Telugu',
      errorRate: 35,
      studentsStrugglingCount: 9,
      totalAttempts: 28,
      recommendedIntervention: 'Review vowel elongation charts and root split rules in class.'
    }
  ]);

  ngOnInit(): void {
    this.pageState.set('normal');
  }

  getSeverityClass(rate: number): string {
    if (rate >= 60) return 'severe';
    if (rate >= 40) return 'moderate';
    return 'mild';
  }

  goBack(): void {
    this.location.back();
  }
}
