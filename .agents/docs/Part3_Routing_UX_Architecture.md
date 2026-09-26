# DigitalClassRoom — Part 3: Routing Tree, UX Rules & Architecture

---

## 3.1 — Complete Angular Routing Tree (`app.routes.ts`)

```typescript
// app.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { PublicGuard } from './core/guards/public.guard';
import { ExamSessionGuard } from './core/guards/exam-session.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'splash', pathMatch: 'full' },

  {
    path: 'splash',
    loadComponent: () => import('./features/auth/splash/splash.component')
      .then(m => m.SplashComponent)
    // No guards. Detects JWT → dispatches to role portal or /login
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component')
      .then(m => m.LoginComponent),
    canActivate: [PublicGuard]
    // API: POST /api/auth/login
  },
  {
    path: 'change-password',
    loadComponent: () => import('./features/auth/change-password/change-password.component')
      .then(m => m.ChangePasswordComponent),
    canActivate: [AuthGuard]
    // API: POST /api/auth/change-password (Gap G5)
  },

  // ─────────────────────────────────────────────────────────────
  // STUDENT PORTAL
  // ─────────────────────────────────────────────────────────────
  {
    path: 'student',
    loadComponent: () => import('./features/student/student-tabs/student-tabs.component')
      .then(m => m.StudentTabsComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['STUDENT', 'USER'] },
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('./features/student/home/student-home.component')
          .then(m => m.StudentHomeComponent)
        // GET /api/auth/me, GET /api/student/progress
        // GET /api/academic/subjects?schoolId=&standardId=
        // GET /api/student/activities?examCategory=QUARTERLY_EXAM
      },
      {
        path: 'learn',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/student/learn/subject-list/subject-list.component')
              .then(m => m.SubjectListComponent)
            // GET /api/academic/subjects?schoolId=&standardId=
          },
          {
            path: 'subject/:subjectId',
            loadComponent: () => import('./features/student/learn/subject-hub/subject-hub.component')
              .then(m => m.SubjectHubComponent)
            // GET /api/lessons?schoolId=&subjectId=
            // GET /api/student/progress
          },
          {
            path: 'subject/:subjectId/lesson/:lessonId',
            loadComponent: () => import('./features/student/learn/lesson-detail/lesson-detail.component')
              .then(m => m.LessonDetailComponent)
            // GET /api/lessons/:id
            // GET /api/lessons/:id/content-units?schoolId=&language=
          },
          {
            path: 'subject/:subjectId/lesson/:lessonId/read',
            loadComponent: () => import('./features/student/learn/lesson-reader/lesson-reader.component')
              .then(m => m.LessonReaderComponent)
            // GET /api/lessons/:id/chunks?schoolId=&language=
            // POST /api/student/progress (heartbeat every 30s)
          },
          {
            path: 'subject/:subjectId/lesson/:lessonId/media/:mediaId',
            loadComponent: () => import('./features/student/learn/media-player/media-player.component')
              .then(m => m.MediaPlayerComponent)
            // GET /api/media/:resourceId/file (Object URL via JWT interceptor)
            // POST /api/student/progress (heartbeat every 10s)
          },
          {
            path: 'subject/:subjectId/lesson/:lessonId/practice',
            loadComponent: () => import('./features/student/learn/practice-activities/practice-activities.component')
              .then(m => m.PracticeActivitiesComponent)
            // GET /api/student/activities/lesson/:lessonId?examCategory=DAILY_PRACTICE
          }
        ]
      },
      {
        path: 'ai',
        loadComponent: () => import('./features/student/ai-tutor/ai-tutor.component')
          .then(m => m.AITutorComponent)
        // POST /api/student/sessions
        // GET /api/student/sessions/:id/messages
        // POST /api/student/sessions/:id/action
      },
      {
        path: 'progress',
        loadComponent: () => import('./features/student/progress/progress-dashboard.component')
          .then(m => m.ProgressDashboardComponent)
        // GET /api/student/analytics/my-performance
        // GET /api/student/progress
      },
      {
        path: 'me',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/student/profile/student-profile.component')
              .then(m => m.StudentProfileComponent)
            // GET /api/auth/me
          },
          {
            path: 'downloads',
            loadComponent: () => import('./features/student/profile/offline-downloads.component')
              .then(m => m.OfflineDownloadsComponent)
            // GET /api/files/subject/:subjectId
          }
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // EXAM ENGINE (Outside tabs — Kiosk Mode)
  // ─────────────────────────────────────────────────────────────
  {
    path: 'student/exam/:activityId',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['STUDENT', 'USER'] },
    children: [
      {
        path: 'instructions',
        loadComponent: () => import('./features/student/exam/exam-instructions/exam-instructions.component')
          .then(m => m.ExamInstructionsComponent)
        // GET /api/student/activities/:activityId
      },
      {
        path: 'attempt',
        loadComponent: () => import('./features/student/exam/exam-player/exam-player.component')
          .then(m => m.ExamPlayerComponent),
        canActivate: [ExamSessionGuard]
        // POST /api/student/activities/:activityId/attempts (on submit)
        // IndexedDB: exam-answers offline queue
      },
      {
        path: 'resume',
        loadComponent: () => import('./features/student/exam/exam-resume/exam-resume.component')
          .then(m => m.ExamResumeComponent)
        // Restores state from IndexedDB
      },
      {
        path: 'result/:attemptId',
        loadComponent: () => import('./features/student/exam/exam-result/exam-result.component')
          .then(m => m.ExamResultComponent)
        // GET /api/student/attempts/:attemptId
        // POST /api/student/attempts/:attemptId/questions/:questionId/explain (lazy)
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // TEACHER PORTAL
  // ─────────────────────────────────────────────────────────────
  {
    path: 'teacher',
    loadComponent: () => import('./features/teacher/teacher-tabs/teacher-tabs.component')
      .then(m => m.TeacherTabsComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['TEACHER', 'ADMIN'] },
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('./features/teacher/home/teacher-home.component')
          .then(m => m.TeacherHomeComponent)
        // GET /api/management/analytics/school-summary
        // GET /api/management/analytics/standards/:id/sections/:section
        // GET /api/activities?schoolId=&standardId=&academicYearId=
      },
      {
        path: 'content',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/teacher/content/content-browser/content-browser.component')
              .then(m => m.ContentBrowserComponent)
            // GET /api/academic/subjects, GET /api/lessons
            // GET /api/learning-resources/subject/...
          },
          {
            path: 'lesson/:lessonId/upload',
            loadComponent: () => import('./features/teacher/content/resource-uploader/resource-uploader.component')
              .then(m => m.ResourceUploaderComponent)
            // POST /api/files, POST /api/media
            // POST /api/ingestion (HTTP 202)
            // GET /api/ingestion/status/:fileId (polling)
          }
        ]
      },
      {
        path: 'activities',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/teacher/activities/activities-list/activities-list.component')
              .then(m => m.ActivitiesListComponent)
            // GET /api/activities?schoolId=&standardId=
          },
          {
            path: 'create',
            loadComponent: () => import('./features/teacher/activities/create-activity/create-activity.component')
              .then(m => m.CreateActivityComponent)
            // POST /api/activities
          },
          {
            path: ':activityId/questions',
            loadComponent: () => import('./features/teacher/activities/question-bank-editor/question-bank-editor.component')
              .then(m => m.QuestionBankEditorComponent)
            // GET/POST/PUT/DELETE /api/activities/:id/questions
            // PUT /api/activities/:id/questions/reorder
            // POST /api/activities/:id/publish
          },
          {
            path: ':activityId/questions/bulk-upload',
            loadComponent: () => import('./features/teacher/activities/bulk-upload/bulk-upload.component')
              .then(m => m.BulkUploadComponent)
            // POST /api/activities/:id/questions/bulk-upload
          },
          {
            path: ':activityId/submissions',
            loadComponent: () => import('./features/teacher/activities/submissions-queue/submissions-queue.component')
              .then(m => m.SubmissionsQueueComponent)
            // GET /api/management/analytics/activities/:id/participation
            // GET /api/student/attempts/:attemptId (per-student review)
          }
        ]
      },
      {
        path: 'turnout',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/teacher/turnout/attendance-roll-call/attendance-roll-call.component')
              .then(m => m.AttendanceRollCallComponent)
            // GET /api/management/students?standardId=&section=
            // POST /api/management/attendance (Gap G1)
          },
          {
            path: 'directory',
            loadComponent: () => import('./features/teacher/turnout/student-directory/student-directory.component')
              .then(m => m.StudentDirectoryComponent)
            // GET /api/management/students?standardId=&section=
          },
          {
            path: 'directory/:studentId',
            loadComponent: () => import('./features/teacher/turnout/student-dossier/student-dossier.component')
              .then(m => m.StudentDossierComponent)
            // GET /api/management/analytics/students/:studentId/report-card
          }
        ]
      },
      {
        path: 'more',
        children: [
          {
            path: 'gradebook',
            loadComponent: () => import('./features/teacher/more/gradebook-matrix/gradebook-matrix.component')
              .then(m => m.GradebookMatrixComponent)
            // GET /api/management/gradebook?standardId=&section=&subjectId=
            // GET /api/management/gradebook/csv (streaming download)
          },
          {
            path: 'heatmap',
            loadComponent: () => import('./features/teacher/more/misconception-heatmap/misconception-heatmap.component')
              .then(m => m.MisconceptionHeatmapComponent)
            // GET /api/management/analytics/standards/:id/subjects/:subjId
          },
          {
            path: 'school-overview',
            loadComponent: () => import('./features/teacher/more/school-overview/school-overview.component')
              .then(m => m.SchoolOverviewComponent)
            // GET /api/management/analytics/school-summary
          }
        ]
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // PARENT PORTAL
  // ─────────────────────────────────────────────────────────────
  {
    path: 'parent',
    loadComponent: () => import('./features/parent/parent-tabs/parent-tabs.component')
      .then(m => m.ParentTabsComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['PARENT'] },
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('./features/parent/home/parent-home.component')
          .then(m => m.ParentHomeComponent)
        // GET /api/parent/children
        // GET /api/parent/children/:studentId/overview
      },
      {
        path: 'progress',
        loadComponent: () => import('./features/parent/progress/parent-progress.component')
          .then(m => m.ParentProgressComponent)
        // GET /api/parent/children/:studentId/report-card
      },
      {
        path: 'tests',
        loadComponent: () => import('./features/parent/tests/parent-exam-log.component')
          .then(m => m.ParentExamLogComponent)
        // GET /api/parent/children/:studentId/overview (recentExams)
        // Gap G7: GET /api/parent/children/:id/exam-history
      },
      {
        path: 'alerts',
        loadComponent: () => import('./features/parent/alerts/parent-alerts.component')
          .then(m => m.ParentAlertsComponent)
        // Gap G2: GET /api/school/notices?schoolId=
        // Gap G3: POST /api/parent/children/:id/leave-requests
      },
      {
        path: 'me',
        loadComponent: () => import('./features/parent/profile/parent-profile.component')
          .then(m => m.ParentProfileComponent)
        // GET /api/auth/me
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // ADMIN PANEL (Desktop-First)
  // ─────────────────────────────────────────────────────────────
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin-shell/admin-shell.component')
      .then(m => m.AdminShellComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN'] },
    children: [
      { path: '', redirectTo: 'schools', pathMatch: 'full' },
      {
        path: 'schools',
        loadComponent: () => import('./features/admin/schools/school-list/school-list.component')
          .then(m => m.SchoolListComponent)
        // GET /api/schools, POST /api/schools, PUT /api/schools/:id, DELETE /api/schools/:id
      },
      {
        path: 'academic-years',
        loadComponent: () => import('./features/admin/academic-years/academic-years.component')
          .then(m => m.AcademicYearsComponent)
        // GET/POST /api/academic/years
      },
      {
        path: 'standards',
        loadComponent: () => import('./features/admin/standards/standards-manager/standards-manager.component')
          .then(m => m.StandardsManagerComponent)
        // GET/POST/PUT/DELETE /api/academic/standards
      },
      {
        path: 'subjects',
        loadComponent: () => import('./features/admin/subjects/subject-manager/subject-manager.component')
          .then(m => m.SubjectManagerComponent)
        // GET/POST /api/academic/subjects
      },
      {
        path: 'students',
        loadComponent: () => import('./features/admin/students/student-admissions/student-admissions.component')
          .then(m => m.StudentAdmissionsComponent)
        // GET/POST /api/management/students
        // POST /api/management/students/bulk-upload
      },
      {
        path: 'grading-policy',
        loadComponent: () => import('./features/admin/grading-policy/grading-policy.component')
          .then(m => m.GradingPolicyComponent)
        // GET/PUT /api/management/grading-policy?schoolId=
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/admin/analytics/system-analytics/system-analytics.component')
          .then(m => m.SystemAnalyticsComponent)
        // GET /api/management/analytics/school-summary
        // GET /api/management/analytics/standards/:standardId
      },
      {
        path: 'ingestion',
        loadComponent: () => import('./features/admin/ingestion/ingestion-monitor/ingestion-monitor.component')
          .then(m => m.IngestionMonitorComponent)
        // GET /api/ingestion?schoolCode=&status=
        // POST /api/ingestion/retry/:fileId
      }
    ]
  },

  // Catch-all
  { path: '**', redirectTo: 'splash' }
];
```

---

## 3.2 — Guard Implementations

```typescript
// core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const AuthGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};

// core/guards/role.guard.ts
export const RoleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowedRoles: string[] = route.data['roles'] ?? [];
  const userRole = auth.currentUser()?.role;
  if (userRole && allowedRoles.includes(userRole)) return true;
  return router.createUrlTree(['/login']);
};

// core/guards/public.guard.ts
export const PublicGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return true;
  // Already logged in — dispatch to their portal
  const role = auth.currentUser()?.role;
  const dest = role === 'ADMIN' ? '/admin'
    : role === 'TEACHER' ? '/teacher'
    : role === 'PARENT' ? '/parent'
    : '/student';
  return router.createUrlTree([dest]);
};

// core/guards/exam-session.guard.ts
export const ExamSessionGuard: CanActivateFn = (route) => {
  // Checks IndexedDB for in-progress exam session
  // If found → restore; if not found → allow fresh start
  return true; // resolved asynchronously in real implementation
};
```

---

## 3.3 — The 8 Mandatory UX States

Every page wraps its content in `<app-ux-state [state]="pageState">`:

| State | Trigger | UX Treatment |
|-------|---------|-------------|
| **Normal** | Data loaded, actions available | Standard content layout |
| **Loading** | HTTP in-flight | Animated shimmer skeleton matching layout shape |
| **Empty** | 200 OK, empty array/null | Illustrated empty state: mascot + message + primary CTA |
| **Error** | 4xx/5xx response | Error card: sanitized message + Retry button |
| **Offline** | `navigator.onLine === false` or interceptor timeout | Top banner 🔌, cached data shown, write ops queued |
| **Expired** | 401 on any request | Auto-redirect to `/login?returnUrl=…`, toast: "Session expired" |
| **No-Access** | 403 or RoleGuard fail | Friendly illustration + Back button; no error details leaked |
| **Success** | POST/PUT/DELETE completes | Green success toast (3s auto-dismiss); confetti on exam submission |

### UxStateContainerComponent Contract

```typescript
// shared/components/ux-state-container/ux-state-container.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ErrorStateComponent } from '../error-state/error-state.component';
import { OfflineBannerComponent } from '../offline-banner/offline-banner.component';
import { NoAccessComponent } from '../no-access/no-access.component';

@Component({
  selector: 'app-ux-state',
  standalone: true,
  imports: [CommonModule, SkeletonComponent, EmptyStateComponent,
            ErrorStateComponent, OfflineBannerComponent, NoAccessComponent],
  template: `
    @switch (state) {
      @case ('loading') {
        <app-skeleton [layout]="skeletonLayout" />
      }
      @case ('empty') {
        <app-empty-state [message]="emptyMessage" [showMascot]="showMascot" />
      }
      @case ('error') {
        <app-error-state [message]="errorMessage" (retry)="onRetry.emit()" />
      }
      @case ('offline') {
        <app-offline-banner />
        <ng-content />
      }
      @case ('no-access') {
        <app-no-access />
      }
      @default {
        <ng-content />
      }
    }
  `
})
export class UxStateContainerComponent {
  @Input() state: 'normal'|'loading'|'empty'|'error'|'offline'|'expired'|'no-access'|'success' = 'loading';
  @Input() skeletonLayout: 'list' | 'card' | 'grid' | 'table' = 'list';
  @Input() emptyMessage = 'No data yet';
  @Input() errorMessage = 'Something went wrong';
  @Input() showMascot = false;
  @Output() onRetry = new EventEmitter<void>();
}
```

---

## 3.4 — Age-Adaptive Style System

```typescript
// core/models/age-group.model.ts
export type AgeGroup = 'early' | 'middle' | 'upper' | 'senior';

export function resolveAgeGroup(standardNumber: number): AgeGroup {
  if (standardNumber <= 2) return 'early';   // Std 1-2
  if (standardNumber <= 5) return 'middle';  // Std 3-5
  if (standardNumber <= 7) return 'upper';   // Std 6-7
  return 'senior';                           // Std 8-10
}
```

| Property | 🐣 Early (Std 1-2) | 🦋 Middle (Std 3-5) | 🦅 Upper (Std 6-7) | 🦁 Senior (Std 8-10) |
|---|---|---|---|---|
| **Base font size** | 20px | 18px | 16px | 15px |
| **Heading size** | 28px | 24px | 22px | 20px |
| **Min tap target** | 56px | 48px | 44px | 40px |
| **Mascot "Gyan"** | Animated, all screens | Empty states + achievements | Empty states only | None |
| **Color Tone** | Warm pastels (coral, sky blue, sunshine yellow) | Bright primary palette (vibrant) | Cool blues + greens | Neutral professional (near-dark) |
| **Layout density** | Max 2 per row, large cards | 2-3 items | 3 items, standard | 4-col grids, dense tables |
| **Animations** | Bouncy spring animations | Smooth fade/slide | Standard ease curves | Minimal (performance priority) |
| **Language default** | Telugu priority + phonetic English | Telugu + English side-by-side | Toggle (user preference) | English default, Telugu toggle |
| **Gamification** | Stars + badges + streak flames on every action | Points + level progress bar | Leaderboard widget | Pure performance metrics |

---

## 3.5 — Offline & Sync Architecture

### IndexedDB Store Definitions

```
IndexedDB: digitalclassroom-offline
├── exam-answers      { key: activityId+questionId, value: { questionId, selectedOptionIds?, textAnswer?, timestamp } }
├── progress-queue    { key: contentUnitId+timestamp, value: StudentProgress heartbeat payload }
├── ai-message-queue  { key: sessionId+timestamp, value: LearningActionRequest }
├── lesson-cache      { key: lessonId+language, value: ContentChunkResponse[] }
└── media-blobs       { key: resourceId, value: Blob (video/audio) }
```

### SyncQueueService Flush Strategy

```typescript
// On network reconnect (navigator.onLine event):
// 1. Flush exam-answers → POST /api/student/activities/:activityId/attempts
// 2. Flush progress-queue → POST /api/student/progress (batched)
// 3. Flush ai-message-queue → POST /api/student/sessions/:id/action (sequential)
// On cache miss: fetch from server, store in lesson-cache / media-blobs
```

### JwtInterceptor (Media streaming)

```typescript
// For binary endpoints (/api/media/:id/file):
// - Interceptor adds Authorization: Bearer {token} header
// - Response blob converted to Object URL via URL.createObjectURL()
// - Object URL assigned to <video src> or <audio src>
// - Revoke URL on component destroy (memory leak prevention)
```

---

## 3.6 — Backend Gaps Summary

| Gap # | Endpoint | Affected Screen | Priority |
|-------|----------|----------------|----------|
| G1 | `POST /api/management/attendance` | AttendanceRollCallComponent | HIGH |
| G2 | `GET /api/school/notices?schoolId=` | ParentAlertsComponent | MEDIUM |
| G3 | `POST /api/parent/children/:id/leave-requests` | ParentAlertsComponent | MEDIUM |
| G4 | `PUT /api/student/attempts/:id/override` | SubmissionsQueueComponent | LOW |
| G5 | `POST /api/auth/change-password` | ChangePasswordComponent | HIGH (DTO exists) |
| G6 | `GET /api/student/activities?standardId=&upcoming=true` | StudentHomeComponent | MEDIUM |
| G7 | `GET /api/parent/children/:id/exam-history` | ParentExamLogComponent | MEDIUM |

---

## 3.7 — Component Count Summary

| Portal | Tab/Shell | Screens |
|--------|-----------|---------|
| Student | Bottom tabs (5) | 19 screens + 4 exam engine screens |
| Teacher | Bottom tabs (5) | 12 screens |
| Parent | Bottom tabs (5) | 5 screens |
| Admin | Side-nav | 9 screens |
| Shared/Auth | None | 3 screens (Splash, Login, ChangePassword) |
| **Total** | | **52 standalone components** |
