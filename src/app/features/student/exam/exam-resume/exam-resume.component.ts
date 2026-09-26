import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { StorageService } from '../../../../core/services/storage.service';
import { MascotComponent } from '../../../../shared/components/mascot/mascot.component';

@Component({
  selector: 'app-exam-resume',
  standalone: true,
  imports: [CommonModule, MascotComponent],
  template: `
    <div class="resume-container">
      <div class="resume-card glass-card">
        <app-mascot size="lg" expression="thinking" [animated]="true" />
        <span class="session-badge">Saved Session Found</span>
        <h1 class="resume-title">Resume Examination?</h1>
        <p class="resume-desc">
          We found an in-progress exam attempt with {{ savedAnswerCount }} saved answers.
          You can seamlessly continue from where you left off.
        </p>

        <div class="actions-row">
          <button class="resume-btn" (click)="resume()">
            <span>Resume Attempt</span>
            <span>→</span>
          </button>
          <button class="discard-btn" (click)="discardAndRestart()">
            <span>Discard & Start Fresh</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./exam-resume.component.scss']
})
export class ExamResumeComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private storage = inject(StorageService);

  activityId = '';
  savedAnswerCount = 0;

  ngOnInit(): void {
    this.activityId = this.route.snapshot.paramMap.get('activityId') || '';
    this.storage.getExamAnswers(this.activityId).then((ans) => {
      this.savedAnswerCount = ans.length;
    }).catch(() => {});
  }

  resume(): void {
    this.router.navigate(['/student/exam', this.activityId, 'attempt']);
  }

  discardAndRestart(): void {
    if (confirm('Are you sure you want to discard your saved answers and start fresh?')) {
      this.storage.clearExamAnswers(this.activityId).then(() => {
        this.router.navigate(['/student/exam', this.activityId, 'attempt']);
      });
    }
  }
}
