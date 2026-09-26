import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TeacherService } from '../../../../core/services/teacher.service';
import { StudentEnrollmentResponse } from '../../../../core/models/models';
import { UxStateContainerComponent, UxStateType } from '../../../../shared/components/ux-state-container/ux-state-container.component';

@Component({
  selector: 'app-student-directory',
  standalone: true,
  imports: [CommonModule, FormsModule, UxStateContainerComponent],
  template: `
    <div class="directory-container">
      <header class="directory-header">
        <button class="back-btn" (click)="goBack()">
          <span>←</span> Back
        </button>
        <div class="header-text">
          <h1 class="page-title">Student Directory</h1>
          <p class="page-subtitle">Class Roster & Student Performance Dossiers</p>
        </div>

        <div class="search-bar glass-card">
          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            placeholder="Search by student name or roll number..."
            class="search-input"
          />
        </div>
      </header>

      <app-ux-state
        [state]="pageState()"
        skeletonLayout="list"
        emptyTitle="No Students Found"
        emptyMessage="No students match your search criteria."
      >
        <div class="students-grid">
          @for (s of filteredStudents(); track s.id) {
            <div class="student-card glass-card" (click)="openDossier(s.id)">
              <div class="card-left">
                <div class="avatar-circle">
                  <span>{{ getInitials(s.name) }}</span>
                </div>
                <div class="student-info">
                  <h3 class="student-name">{{ s.name }}</h3>
                  <span class="student-sub">Roll No: {{ s.rollNumber }} • Class {{ s.standardId }}th</span>
                </div>
              </div>

              <div class="card-right">
                <span class="parent-contact">📞 {{ s.parentPhone }}</span>
                <span class="arrow">→</span>
              </div>
            </div>
          }
        </div>
      </app-ux-state>
    </div>
  `,
  styleUrls: ['./student-directory.component.scss']
})
export class StudentDirectoryComponent implements OnInit {
  private teacher = inject(TeacherService);
  private router = inject(Router);
  private location = inject(Location);

  pageState = signal<UxStateType>('loading');
  students = signal<StudentEnrollmentResponse[]>([]);
  searchQuery = signal<string>('');

  filteredStudents = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.students();
    if (!q) return list;
    return list.filter(
      (s) => s.name.toLowerCase().includes(q) || s.rollNumber.includes(q)
    );
  });

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    this.pageState.set('loading');

    this.teacher.getStudents('5', 'A').pipe(
      catchError(() => of([]))
    ).subscribe((list) => {
      if (list && list.length > 0) {
        this.students.set(list);
      } else {
        this.students.set([
          { id: 'st-1', schoolId: 'SCH001', standardId: '5', section: 'A', name: 'Aarav Reddy', rollNumber: '01', parentPhone: '9876543210', gender: 'M', dob: '2015-05-10' },
          { id: 'st-2', schoolId: 'SCH001', standardId: '5', section: 'A', name: 'Bhavya Sri', rollNumber: '02', parentPhone: '9876543211', gender: 'F', dob: '2015-06-12' },
          { id: 'st-3', schoolId: 'SCH001', standardId: '5', section: 'A', name: 'Chaitanya Varma', rollNumber: '03', parentPhone: '9876543212', gender: 'M', dob: '2015-04-18' },
          { id: 'st-4', schoolId: 'SCH001', standardId: '5', section: 'A', name: 'Deepika Rao', rollNumber: '04', parentPhone: '9876543213', gender: 'F', dob: '2015-08-22' }
        ]);
      }
      this.pageState.set('normal');
    });
  }

  getInitials(name: string): string {
    return (name || 'S').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  }

  openDossier(studentId: string | number): void {
    this.router.navigate(['/teacher/turnout/directory', String(studentId)]);
  }

  goBack(): void {
    this.location.back();
  }
}
