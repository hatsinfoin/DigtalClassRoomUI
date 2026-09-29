import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { PublicGuard } from './core/guards/public.guard';
import { ExamSessionGuard } from './core/guards/exam-session.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'splash', pathMatch: 'full' },

  // ──────────────────────────────────────────────────────────────
  // AUTH (Public routes — no tabs)
  // ──────────────────────────────────────────────────────────────
  {
    path: 'splash',
    loadComponent: () => import('./features/auth/splash/splash.component')
      .then(m => m.SplashComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component')
      .then(m => m.LoginComponent),
    canActivate: [PublicGuard]
  },
  {
    path: 'change-password',
    loadComponent: () => import('./features/auth/change-password/change-password.component')
      .then(m => m.ChangePasswordComponent),
    canActivate: [AuthGuard]
  },

  // ──────────────────────────────────────────────────────────────
  // STUDENT PORTAL — Bottom tabs (5)
  // ──────────────────────────────────────────────────────────────
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
      },
      {
        path: 'learn',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/student/learn/subject-list/subject-list.component')
              .then(m => m.SubjectListComponent)
          },
          {
            path: 'subject/:subjectId',
            loadComponent: () => import('./features/student/learn/subject-hub/subject-hub.component')
              .then(m => m.SubjectHubComponent)
          },
          {
            path: 'subject/:subjectId/lesson/:lessonId',
            loadComponent: () => import('./features/student/learn/lesson-detail/lesson-detail.component')
              .then(m => m.LessonDetailComponent)
          },
          {
            path: 'subject/:subjectId/lesson/:lessonId/read',
            loadComponent: () => import('./features/student/learn/lesson-reader/lesson-reader.component')
              .then(m => m.LessonReaderComponent)
          },
          {
            path: 'subject/:subjectId/lesson/:lessonId/media/:mediaId',
            loadComponent: () => import('./features/student/learn/media-player/media-player.component')
              .then(m => m.MediaPlayerComponent)
          },
          {
            path: 'subject/:subjectId/lesson/:lessonId/practice',
            loadComponent: () => import('./features/student/learn/practice-activities/practice-activities.component')
              .then(m => m.PracticeActivitiesComponent)
          }
        ]
      },
      {
        path: 'ai',
        loadComponent: () => import('./features/student/ai-tutor/ai-tutor.component')
          .then(m => m.AITutorComponent)
      },
      {
        path: 'progress',
        loadComponent: () => import('./features/student/progress/progress-dashboard.component')
          .then(m => m.ProgressDashboardComponent)
      },
      {
        path: 'me',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/student/profile/student-profile.component')
              .then(m => m.StudentProfileComponent)
          },
          {
            path: 'downloads',
            loadComponent: () => import('./features/student/profile/offline-downloads.component')
              .then(m => m.OfflineDownloadsComponent)
          }
        ]
      }
    ]
  },

  // ──────────────────────────────────────────────────────────────
  // EXAM ENGINE — Kiosk Mode (outside tabs)
  // ──────────────────────────────────────────────────────────────
  {
    path: 'student/exam/:activityId',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['STUDENT', 'USER'] },
    children: [
      {
        path: 'instructions',
        loadComponent: () => import('./features/student/exam/exam-instructions/exam-instructions.component')
          .then(m => m.ExamInstructionsComponent)
      },
      {
        path: 'attempt',
        loadComponent: () => import('./features/student/exam/exam-player/exam-player.component')
          .then(m => m.ExamPlayerComponent),
        canActivate: [ExamSessionGuard]
      },
      {
        path: 'resume',
        loadComponent: () => import('./features/student/exam/exam-resume/exam-resume.component')
          .then(m => m.ExamResumeComponent)
      },
      {
        path: 'result/:attemptId',
        loadComponent: () => import('./features/student/exam/exam-result/exam-result.component')
          .then(m => m.ExamResultComponent)
      }
    ]
  },

  // ──────────────────────────────────────────────────────────────
  // TEACHER PORTAL — Bottom tabs (5)
  // ──────────────────────────────────────────────────────────────
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
      },
      {
        path: 'content',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/teacher/content/content-browser/content-browser.component')
              .then(m => m.ContentBrowserComponent)
          },
          {
            path: 'lesson/:lessonId/upload',
            loadComponent: () => import('./features/teacher/content/resource-uploader/resource-uploader.component')
              .then(m => m.ResourceUploaderComponent)
          },
          {
            path: 'chapter/create',
            loadComponent: () => import('./features/teacher/content/chapter-editor/chapter-editor.component')
              .then(m => m.ChapterEditorComponent)
          },
          {
            path: 'chapter/:lessonId/edit',
            loadComponent: () => import('./features/teacher/content/chapter-editor/chapter-editor.component')
              .then(m => m.ChapterEditorComponent)
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
          },
          {
            path: 'create',
            loadComponent: () => import('./features/teacher/activities/create-activity/create-activity.component')
              .then(m => m.CreateActivityComponent)
          },
          {
            path: ':activityId/questions',
            loadComponent: () => import('./features/teacher/activities/question-bank-editor/question-bank-editor.component')
              .then(m => m.QuestionBankEditorComponent)
          },
          {
            path: ':activityId/questions/bulk-upload',
            loadComponent: () => import('./features/teacher/activities/bulk-upload/bulk-upload.component')
              .then(m => m.BulkUploadComponent)
          },
          {
            path: ':activityId/submissions',
            loadComponent: () => import('./features/teacher/activities/submissions-queue/submissions-queue.component')
              .then(m => m.SubmissionsQueueComponent)
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
          },
          {
            path: 'directory',
            loadComponent: () => import('./features/teacher/turnout/student-directory/student-directory.component')
              .then(m => m.StudentDirectoryComponent)
          },
          {
            path: 'directory/:studentId',
            loadComponent: () => import('./features/teacher/turnout/student-dossier/student-dossier.component')
              .then(m => m.StudentDossierComponent)
          }
        ]
      },
      {
        path: 'more',
        children: [
          { path: '', redirectTo: 'gradebook', pathMatch: 'full' },
          {
            path: 'gradebook',
            loadComponent: () => import('./features/teacher/more/gradebook-matrix/gradebook-matrix.component')
              .then(m => m.GradebookMatrixComponent)
          },
          {
            path: 'heatmap',
            loadComponent: () => import('./features/teacher/more/misconception-heatmap/misconception-heatmap.component')
              .then(m => m.MisconceptionHeatmapComponent)
          },
          {
            path: 'school-overview',
            loadComponent: () => import('./features/teacher/more/school-overview/school-overview.component')
              .then(m => m.SchoolOverviewComponent)
          }
        ]
      }
    ]
  },

  // ──────────────────────────────────────────────────────────────
  // PARENT PORTAL — Bottom tabs (5)
  // ──────────────────────────────────────────────────────────────
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
      },
      {
        path: 'progress',
        loadComponent: () => import('./features/parent/progress/parent-progress.component')
          .then(m => m.ParentProgressComponent)
      },
      {
        path: 'tests',
        loadComponent: () => import('./features/parent/tests/parent-exam-log.component')
          .then(m => m.ParentExamLogComponent)
      },
      {
        path: 'alerts',
        loadComponent: () => import('./features/parent/alerts/parent-alerts.component')
          .then(m => m.ParentAlertsComponent)
      },
      {
        path: 'me',
        loadComponent: () => import('./features/parent/profile/parent-profile.component')
          .then(m => m.ParentProfileComponent)
      }
    ]
  },

  // ──────────────────────────────────────────────────────────────
  // ADMIN PANEL — Side-nav, Desktop-first
  // ──────────────────────────────────────────────────────────────
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin-shell/admin-shell.component')
      .then(m => m.AdminShellComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMIN', 'DIGITAL_CLASS_ADMIN'] },
    children: [
      { path: '', redirectTo: 'schools', pathMatch: 'full' },
      {
        path: 'schools',
        loadComponent: () => import('./features/admin/schools/school-list/school-list.component')
          .then(m => m.SchoolListComponent)
      },
      {
        path: 'academic-years',
        loadComponent: () => import('./features/admin/academic-years/academic-years.component')
          .then(m => m.AcademicYearsComponent)
      },
      {
        path: 'standards',
        loadComponent: () => import('./features/admin/standards/standards-manager/standards-manager.component')
          .then(m => m.StandardsManagerComponent)
      },
      {
        path: 'subjects',
        loadComponent: () => import('./features/admin/subjects/subject-manager/subject-manager.component')
          .then(m => m.SubjectManagerComponent)
      },
      {
        path: 'students',
        loadComponent: () => import('./features/admin/students/student-admissions/student-admissions.component')
          .then(m => m.StudentAdmissionsComponent)
      },
      {
        path: 'grading-policy',
        loadComponent: () => import('./features/admin/grading-policy/grading-policy.component')
          .then(m => m.GradingPolicyComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/admin/analytics/system-analytics/system-analytics.component')
          .then(m => m.SystemAnalyticsComponent)
      },
      {
        path: 'ingestion',
        loadComponent: () => import('./features/admin/ingestion/ingestion-monitor/ingestion-monitor.component')
          .then(m => m.IngestionMonitorComponent)
      }
    ]
  },

  // Catch-all
  { path: '**', redirectTo: 'splash' }
];
