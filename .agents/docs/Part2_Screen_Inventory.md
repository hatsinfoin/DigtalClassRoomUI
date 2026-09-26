# DigitalClassRoom — Part 2: Production Screen Inventory
> **47+ Standalone Angular Components across 4 Role Portals**

---

## Global Project Architecture

```
src/app/
├── core/
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   ├── role.guard.ts
│   │   ├── public.guard.ts
│   │   └── exam-session.guard.ts
│   ├── interceptors/
│   │   ├── jwt.interceptor.ts
│   │   └── offline.interceptor.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── storage.service.ts
│   │   └── sync-queue.service.ts
│   └── models/              (TypeScript interfaces mirroring all DTOs)
├── shared/
│   ├── components/
│   │   ├── ux-state-container/
│   │   ├── skeleton/
│   │   ├── progress-ring/
│   │   └── mascot/
│   └── pipes/
│       ├── telugu-nfc.pipe.ts   (no-op pass-through — preserves NFC)
│       └── duration.pipe.ts
├── features/
│   ├── auth/                (public routes, no tabs)
│   ├── student/             (bottom-tab shell)
│   ├── teacher/             (bottom-tab shell)
│   ├── parent/              (bottom-tab shell)
│   └── admin/               (side-nav shell, desktop-first)
└── app.routes.ts
```

---

## A. STUDENT JOURNEY

**Tab Shell:** `/student` → `StudentTabsComponent`
Tabs: 🏠 Home · 📚 Learn · 🤖 AI · 📊 Progress · 👤 Me

---

### A.1 — Auth & Onboarding

#### SplashComponent
- **Path:** `/splash` | **Guard:** none (first load only)
- **Purpose:** Brand animation (500ms) → detect JWT → dispatch to `/student`, `/teacher`, `/parent`, `/admin`, or `/login`
- **Feature:** Language toggle chip (Telugu / English) persisted to `localStorage['lang']`
- **Backend:** none

#### LoginComponent
- **Path:** `/login` | **Guard:** `PublicGuard` (redirect if already authenticated)
- **Form Fields:**
  - `identifier` — username / email / phone (required)
  - `password` — string with show/hide toggle (required)
- **Backend:** `POST /api/auth/login`
- **Post-login:** reads `UserProfileResponse.role` → navigate to role portal
- **Error States:** 401 invalid credentials, 403 account disabled, network offline banner

#### ChangePasswordComponent
- **Path:** `/change-password` | **Guard:** `AuthGuard`
- **Trigger:** Interceptor detects first-login indicator or forced-reset condition
- **Form Fields:**
  - `currentPassword` — show/hide toggle (required)
  - `newPassword` — min 8 chars, show/hide (required)
  - `confirmPassword` — match validator (required)
- **Backend:** `POST /api/auth/change-password` *(Gap G5 — ChangePasswordRequest DTO exists)*

---

### A.2 — Student Home (Tab: 🏠)

#### StudentHomeComponent
- **Path:** `/student/home` | **Guards:** `AuthGuard`, `RoleGuard(['STUDENT','USER'])`
- **Backend Calls:**
  1. `GET /api/auth/me` → profile card
  2. `GET /api/student/progress` → "Continue Learning" last-accessed content
  3. `GET /api/academic/subjects?schoolId=&standardId=` → subject carousel
  4. `GET /api/student/activities?lessonId=…&examCategory=QUARTERLY_EXAM` → exam alerts *(Gap G6 for cross-lesson)*
- **UI Sections:**
  - Header: greeting banner + avatar + school logo
  - **Continue Learning Card:** lesson title, chapter, last-position %, resume CTA
  - **Subject Carousel:** horizontal scroll, circular progress ring per subject, Telugu/English name
  - **Exam Alert Cards:** countdown timer, examCategory badge, "Start Now" CTA
  - **Age-Adaptive:** Std 1-2 → large animated "Gyan" owl mascot + large fonts; Std 8-10 → compact card grid
- **8 UX States:** Normal | Loading (shimmer skeleton) | Empty (no lessons yet) | Error (retry) | Offline (cached + 🔌 badge) | Expired (session modal → /login) | No-Access (wrong role) | Success (green flash on resume)

---

### A.3 — Subject & Learning View (Tab: 📚)

#### SubjectListComponent
- **Path:** `/student/learn`
- **Backend:** `GET /api/academic/subjects?schoolId=&standardId=`
- **UI:** Grid of subject cards with circular progress rings; tap → SubjectHub

#### SubjectHubComponent
- **Path:** `/student/learn/subject/:subjectId`
- **Backend:**
  - `GET /api/lessons?schoolId=&subjectId=` → lesson list
  - `GET /api/student/progress` → progress overlay per lesson
- **UI:**
  - Overall syllabus progress bar (% of lessons completed)
  - Lesson cards: chapter number, title (Telugu + English), status badge (Not Started / In Progress / Completed), unit count
  - Pull-to-refresh
- **8 UX States:** Normal | Loading (skeleton list) | Empty | Error | Offline | Expired | No-Access | Success

#### LessonDetailComponent
- **Path:** `/student/learn/subject/:subjectId/lesson/:lessonId`
- **Backend:**
  - `GET /api/lessons/:id`
  - `GET /api/lessons/:id/content-units?schoolId=&language=`
  - `GET /api/student/activities/lesson/:lessonId?examCategory=NONE`
- **UI:** Segmented tabs:
  - 📖 **Read** → LessonReaderComponent
  - 🎧 **Listen** → MediaPlayerComponent (audio)
  - ▶️ **Watch** → MediaPlayerComponent (video)
  - ✏️ **Practice** → PracticeActivitiesComponent
  - 🤖 **Ask AI** → AITutorComponent (lesson-scoped session)
  - Offline cache download button

#### LessonReaderComponent
- **Path:** `/student/learn/subject/:subjectId/lesson/:lessonId/read`
- **Backend:**
  - `GET /api/lessons/:id/chunks?schoolId=&language=` → `ContentChunkResponse` list
  - `POST /api/student/progress` heartbeat every 30s `{contentUnitId, completionPercent, lastPosition}`
- **UI Features:**
  - Telugu Unicode rendering (`font-family: Noto Sans Telugu`)
  - Font-size slider (14px–24px, +/- buttons)
  - TTS audio bar (browser `SpeechSynthesis` API with Telugu voice)
  - Reading progress bar at top
  - Highlight + Note (saved to `localStorage`)
  - Night mode toggle

#### MediaPlayerComponent (Audio/Video)
- **Path:** `/student/learn/subject/:subjectId/lesson/:lessonId/media/:mediaId`
- **Backend:**
  - `GET /api/media/{resourceId}/file` (binary stream; Object URL via JWT interceptor)
  - `POST /api/student/progress` heartbeat every 10s (video: `lastPosition = currentTime`)
- **UI:**
  - Custom `<video>` / `<audio>` with Ionic-styled controls
  - Playback speed selector (0.75x, 1x, 1.25x, 1.5x, 2x)
  - Background play (Audio) via Media Session API
  - Picture-in-Picture button (Video)
  - Offline download toggle (saves blob to IndexedDB)

#### PracticeActivitiesComponent
- **Path:** `/student/learn/subject/:subjectId/lesson/:lessonId/practice`
- **Backend:** `GET /api/student/activities/lesson/:lessonId?examCategory=DAILY_PRACTICE`
- **UI:** Card list of QUIZ/FLASHCARD/EXERCISE activities; tap → ExamInstructions (practice mode, hints enabled)

---

### A.4 — Assessment & Exam Engine (Kiosk Mode)

#### ExamInstructionsComponent
- **Path:** `/student/exam/:activityId/instructions`
- **Backend:** `GET /api/student/activities/:activityId`
- **UI:**
  - Total questions, total marks, time limit, examCategory badge
  - Instructions (Telugu/English)
  - Anti-cheat rules listed
  - START button → full-screen lock + ExamPlayerComponent

#### ExamPlayerComponent *(Kiosk Mode)*
- **Path:** `/student/exam/:activityId/attempt`
- **Guards:** `AuthGuard`, `ExamSessionGuard` (checks IndexedDB for pending session)
- **Backend:**
  - Questions cached from instructions screen
  - `POST /api/student/activities/:activityId/attempts` on submit
  - **Offline queue:** every answer tap saved to IndexedDB, synced on submit
- **UI:**
  - Full-screen `IonModal` (`backdropDismiss: false`)
  - Header: countdown timer (red < 10%), Question X of N
  - Question area: text (NFC-safe), options (MCQ radio / T-F toggle / text input)
  - Bottom toolbar: ⬅ Prev | ⚑ Flag | ➡ Next | Grid 🔲
  - Auto-save each answer to IndexedDB offline queue
  - Tab-switch detection (`document.visibilitychange`) → warning toast
  - Anti-cheat: `contextmenu` disabled

#### QuestionGridComponent *(modal overlay)*
- **UI:**
  - Grid bubbles: 🟢 Answered / 🔴 Unanswered / 🟠 Flagged
  - Summary: "18 Answered · 2 Unanswered · 3 Flagged"
  - Submit button with confirmation dialog

#### ExamResumeComponent
- **Path:** `/student/exam/:activityId/resume`
- **Trigger:** App returns from background (Page Visibility API)
- **UI:**
  - Interruption reason banner
  - "Your answers have been auto-saved"
  - Resume button → restores from IndexedDB
  - Elapsed time display

#### ExamResultComponent
- **Path:** `/student/exam/:activityId/result/:attemptId`
- **Backend:**
  - `POST` response held in memory from attempt submission
  - `GET /api/student/attempts/:attemptId` for full review
  - `POST /api/student/attempts/:attemptId/questions/:questionId/explain` (lazy per wrong answer)
- **UI Sections:**
  - Score Dossier: animated score ring, `scoreEarned / totalMarks`, %, PASS/FAIL badge
  - Time stat: `timeSpentSeconds` formatted
  - Subject breakdown chart (bar)
  - Answer Review List: student answer (red/green), correct answer revealed, "Ask AI Why?" CTA
  - AI Misconception Card: `ExplainMistakeResponse.textbookExcerpt`

---

### A.5 — AI Tutor (Tab: 🤖)

#### AITutorComponent
- **Path:** `/student/ai`
- **Backend:**
  - `POST /api/student/sessions` (context: active lesson if navigated from LessonDetail)
  - `GET /api/student/sessions/:sessionId/messages` (history)
  - `POST /api/student/sessions/:sessionId/action`
- **UI:**
  - Chat bubbles: user right, AI left, timestamps
  - Session context bar: current lesson/subject (collapsible)
  - **Quick-Prompt Chips:** "📖 Explain Simply" | "💡 Give Hint" | "🔄 Summarize" | "📝 Revision Plan"
  - Text input + Send button
  - Typing dots indicator during LLM response
  - Language selector (Telugu / English)
  - Session history drawer (past sessions list)
- **Offline State:** Queue message to `ai-message-queue` IndexedDB store, sync on reconnect

---

### A.6 — Progress & Storage (Tab: 📊)

#### ProgressDashboardComponent
- **Path:** `/student/progress`
- **Backend:**
  - `GET /api/student/analytics/my-performance` → `StudentReportCardResponse`
  - `GET /api/student/progress` → lesson-level detail
- **UI:**
  - Overall Grade Card: letter grade, cumulativePercentage arc, overallStatusDescriptor
  - Subject Mastery Breakdown: horizontal bar per subject (SubjectGradeItem.averageScore)
  - Exam Cadence Panel: timeline DAILY_PRACTICE → WEEKLY → MONTHLY → QUARTERLY → ANNUAL
  - Recent Exams List: pass/fail badge, score, date
  - Attendance Ring: attendanceRate % circular gauge

#### OfflineDownloadsComponent
- **Path:** `/student/me/downloads`
- **Backend:** `GET /api/files/subject/:subjectId` (enumerate downloadable files)
- **UI:**
  - Storage meter: used / available (IndexedDB quota)
  - Cached lessons/media list: size, date cached
  - Swipe-to-delete
  - Per-lesson auto-cache toggle
  - Download status indicators

---

### A.7 — Profile (Tab: 👤)

#### StudentProfileComponent
- **Path:** `/student/me`
- **Backend:** `GET /api/auth/me`
- **UI:** Avatar, name, roll, class, section, school | Language toggle | Change Password CTA | Downloads CTA | Logout

---

## B. TEACHER WORKSPACE

**Tab Shell:** `/teacher` → `TeacherTabsComponent`
Tabs: 🏠 Home · 📁 Content · ✏️ Activities · 👥 Turnout · ⋯ More

---

### B.1 — Teacher Dashboard (Tab: 🏠)

#### TeacherHomeComponent
- **Path:** `/teacher/home` | **Guards:** `AuthGuard`, `RoleGuard(['TEACHER','ADMIN'])`
- **Backend:**
  1. `GET /api/auth/me` → profile + standardId, section
  2. `GET /api/management/analytics/school-summary`
  3. `GET /api/management/analytics/standards/:standardId/sections/:section`
  4. `GET /api/activities?schoolId=&standardId=&academicYearId=`
- **UI:**
  - Class/Standard switcher dropdown
  - Today's KPI Card: Total | Present | Absent | % Turnout (color-coded)
  - Absentee Flash List (from SectionAnalyticsResponse.absenteeList)
  - Activity Status Panel: upcoming exams, draft activities
  - Quick Actions: + New Activity | Take Attendance | View Gradebook

---

### B.2 — Classroom & Student Management (Tab: 👥 Turnout)

#### AttendanceRollCallComponent
- **Path:** `/teacher/turnout`
- **Backend:**
  - `GET /api/management/students?standardId=&section=` → roster
  - `GET /api/management/analytics/standards/:standardId/sections/:section` → absentee snapshot
- **UI:**
  - Date picker (defaults to today)
  - Alphabetical student list with roll + name
  - 1-tap status toggle: 🟢 Present | 🔴 Absent | 🟡 Late
  - Bulk actions: "Mark All Present" | "Invert"
  - Submit → *(Gap G1: POST /api/management/attendance)*
  - Offline-queue support

#### StudentDirectoryComponent
- **Path:** `/teacher/turnout/directory`
- **Backend:** `GET /api/management/students?standardId=&section=`
- **UI:**
  - Search bar + section filter
  - Student cards: initials avatar, name, roll, phone
  - Tap → StudentDossierComponent

#### StudentDossierComponent
- **Path:** `/teacher/turnout/directory/:studentId`
- **Backend:**
  - `GET /api/management/analytics/students/:studentId/report-card`
- **UI:**
  - Student header: name, roll, standard, section, GPA badge
  - Subject grade table: subjectGrades[]
  - Exam history: recentExams[]
  - Cadence progress timeline
  - **Parent Contact button:** `tel:{parentPhone}`
  - **Reset Password CTA:** `POST /api/management/students/:id/reset-password`

---

### B.3 — Curriculum & Resource Authoring (Tab: 📁 Content)

#### ContentBrowserComponent
- **Path:** `/teacher/content`
- **Backend:**
  - `GET /api/academic/subjects?schoolId=&standardId=`
  - `GET /api/lessons?schoolId=&subjectId=`
  - `GET /api/learning-resources/subject/:schoolId/:aYrId/:stdId/:subjId`
- **UI:**
  - 3-level accordion: Standard → Subject → Lesson
  - Each lesson row: title, resource count badge, ingestion status icon
  - FAB: + New Lesson | + Upload Resource

#### ResourceUploaderComponent
- **Path:** `/teacher/content/lesson/:lessonId/upload`
- **Backend:**
  - `POST /api/files` (PDF textbooks)
  - `POST /api/media` (audio/video)
  - `POST /api/ingestion` (PDF → RAG pipeline, **HTTP 202**)
  - `GET /api/ingestion/status/:fileId` (poll every 3s with exponential backoff)
- **UI:**
  - File picker: PDF / MP3 / MP4
  - Metadata form: title, description, language, resourceType
  - Upload progress bar
  - **Ingestion Step Tracker:**
    - UPLOADED → EXTRACTING → EXTRACTED → CHUNKING → EMBEDDING → COMPLETED (icons + spinner)
  - Retry button on FAILED
  - Uploaded files list (swipe to delete)

---

### B.4 — Activity & Exam Management (Tab: ✏️ Activities)

#### ActivitiesListComponent
- **Path:** `/teacher/activities`
- **Backend:** `GET /api/activities?schoolId=&standardId=&academicYearId=`
- **UI:**
  - Filter chips: ALL | DRAFT | PUBLISHED | by examCategory
  - Activity cards: title, type badge, question count, status, date
  - Swipe actions: Edit | Publish | Delete
  - FAB → CreateActivityComponent

#### CreateActivityComponent
- **Path:** `/teacher/activities/create`
- **Backend:** `POST /api/activities`
- **Form Fields:**
  - `title` — required
  - `description` / `instruction` / `concept` — optional text (Telugu NFC safe)
  - `activityType` — select enum
  - `examCategory` — select enum
  - `difficultyLevel` — select enum
  - `totalMarks` — number
  - `language` — select `[te|en]`
  - `subjectId` — select (from user's standard)
  - `lessonId` — select (from chosen subject)
- **Post-create:** navigate to QuestionBankEditorComponent

#### QuestionBankEditorComponent
- **Path:** `/teacher/activities/:activityId/questions`
- **Backend:**
  - `GET /api/activities/:id` → existing questions
  - `POST/PUT/DELETE /api/activities/:id/questions[/:qId]`
  - `PUT /api/activities/:id/questions/reorder`
  - `POST /api/activities/:id/publish`
  - `POST /api/activities/:id/revert-to-draft`
- **UI:**
  - Question list with drag handle for reorder
  - Question Form (action sheet):
    - `questionType` — MCQ / TRUE_FALSE / SHORT_ANSWER / FILL_BLANK
    - `text` — textarea (Telugu NFC preserved)
    - `marks` — number
    - `options` — dynamic list with isCorrect checkbox (MCQ)
    - `explanation` / `hintText` — textarea
    - `difficultyLevel` — select
  - Publish / Revert-to-Draft in header
  - Bulk Upload tab → BulkUploadComponent

#### BulkUploadComponent
- **Path:** `/teacher/activities/:activityId/questions/bulk-upload`
- **Backend:** `POST /api/activities/:id/questions/bulk-upload` (multipart CSV)
- **UI:**
  - CSV format guide with downloadable template
  - `.csv` file picker
  - Validation preview table (first 5 rows)
  - Result: `BulkUploadQuestionsResponse {imported, failed, errors}` → result card
  - Error list with row numbers

#### SubmissionsQueueComponent
- **Path:** `/teacher/activities/:activityId/submissions`
- **Backend:**
  - `GET /api/management/analytics/activities/:activityId/participation?section=`
  - `GET /api/student/attempts/{attemptId}` (deep-dive per student)
- **UI:**
  - Participation KPIs: Attempted / Total, Average Score, Pass Rate %
  - Student table: name, score, %, passed/failed, time spent
  - Tap row → full attempt review modal
  - Mark Override *(Gap G4)*
  - Absentee list (did not attempt)

---

### B.5 — Analytics & Gradebook (Tab: ⋯ More)

#### GradebookMatrixComponent
- **Path:** `/teacher/more/gradebook`
- **Backend:**
  - `GET /api/management/gradebook?standardId=&section=&subjectId=`
  - `GET /api/management/gradebook/csv?…` (streaming download)
- **UI:**
  - Standard + Section + Subject filter bar
  - 2D scrollable matrix: Rows = students, Columns = exams
  - Cell colors: green ≥75%, amber 50-74%, red <50%
  - Row totals + column averages (sticky header/footer)
  - 📥 Export CSV button (UTF-8 BOM streaming)

#### MisconceptionHeatmapComponent
- **Path:** `/teacher/more/heatmap`
- **Backend:** `GET /api/management/analytics/standards/:standardId/subjects/:subjectId`
- **UI:**
  - Subject selector
  - Heatmap grid: Lessons (rows) × Exam cadences (columns)
  - Color: red <50%, yellow 50-75%, green >75%
  - Drill-down tap → ExamParticipationSummaryResponse overlay
  - Export as PNG (html2canvas)

#### SchoolOverviewComponent
- **Path:** `/teacher/more/school-overview`
- **Backend:** `GET /api/management/analytics/school-summary`
- **UI:** KPI cards — Total Students, Total Teachers, Standards, Active Activities, Average Pass Rate

---

## C. PARENT PORTAL

**Tab Shell:** `/parent` → `ParentTabsComponent`
Tabs: 🏠 Home · 📊 Progress · 📝 Tests · 🔔 Alerts · 👤 Me

---

### C.1 — Parent Dashboard (Tab: 🏠)

#### ParentHomeComponent
- **Path:** `/parent/home` | **Guards:** `AuthGuard`, `RoleGuard(['PARENT'])`
- **Backend:**
  - `GET /api/parent/children`
  - `GET /api/parent/children/:studentId/overview`
- **UI:**
  - Multi-Child Switcher Bottom Sheet (if >1 child): avatar, name, class
  - GPA Card: termGpa, overallGrade letter, trend arrow
  - Attendance Ring: attendanceRate % circular gauge
  - Tests Summary: attempted / missed
  - IDOR note: only shows children returned by server

---

### C.2 — Progress & Reports (Tab: 📊)

#### ParentProgressComponent
- **Path:** `/parent/progress`
- **Backend:** `GET /api/parent/children/:studentId/report-card`
- **UI:**
  - Digital Report Card: student header (name, roll, class, GPA badge)
  - Subject grades table: subject, grade, %, remarks
  - Cumulative GPA + overall status descriptor
  - KPIs: total attempted / passed / failed

#### ParentExamLogComponent
- **Path:** `/parent/tests`
- **Backend:** `GET /api/parent/children/:studentId/overview` (recentExams) *(Gap G7 for detailed history)*
- **UI:**
  - Exam timeline: date, subject, score, pass/fail
  - Filter by examCategory

---

### C.3 — School Communication (Tab: 🔔 Alerts)

#### ParentAlertsComponent
- **Path:** `/parent/alerts`
- **Backend:** *(Gap G2: GET /api/school/notices?schoolId=)* — mocked initially
- **UI:**
  - Notification list (from push notification store)
  - School circulars placeholder
  - **Leave Request Form:**
    - `fromDate` — date (required)
    - `toDate` — date (required)
    - `reason` — textarea (required)
    - `studentId` — hidden (from active child selector)
  - *(Gap G3: POST /api/parent/children/:id/leave-requests)*

---

### C.4 — Profile (Tab: 👤)

#### ParentProfileComponent
- **Path:** `/parent/me`
- **Backend:** `GET /api/auth/me`
- **UI:** Name, phone (masked), linked children list, language toggle, change password, logout

---

## D. INSTITUTIONAL ADMIN PANEL (Desktop-First Responsive)

**Shell:** `/admin` → `AdminShellComponent` (responsive side-nav)
Sidebar: 🏫 Schools · 📐 Standards · 📅 Academic Years · 👥 Students · 🎓 Grading Policy · 📊 Analytics · 🔧 Ingestion

---

### D.1 — School Management

#### SchoolListComponent
- **Path:** `/admin/schools` | **Guards:** `AuthGuard`, `RoleGuard(['ADMIN'])`
- **Backend:** `GET /api/schools`
- **UI:** Data table (Name / Code / City / Phone / Actions), search bar, + Add School → SchoolFormComponent

#### SchoolFormComponent *(modal, reused for Create/Edit)*
- **Backend:** `POST /api/schools` | `PUT /api/schools/:id`
- **Form Fields:** `name [NFC]`, `code`, `address`, `city`, `state`, `phone`, `email`
- **Guarded Delete:** `DELETE /api/schools/:id` → confirmation dialog with school name re-entry

---

### D.2 — Standards & Class Hierarchy

#### StandardsManagerComponent
- **Path:** `/admin/standards`
- **Backend:** `GET/POST/PUT/DELETE /api/academic/standards`
- **Form Fields:** `schoolId [select]`, `academicYearId [select]`, `standardNumber [1-10]`, `name [Telugu NFC]`, `section [A|B|C]`
- **UI:** Grouped accordion: school → academic year → standard cards

#### SubjectManagerComponent
- **Path:** `/admin/subjects`
- **Backend:** `GET/POST /api/academic/subjects`
- **Form Fields:** `name [Telugu NFC]`, `code`, `standardId [select]`, `academicYearId [select]`, `language [te|en|both]`

---

### D.3 — Academic Year Configuration

#### AcademicYearsComponent
- **Path:** `/admin/academic-years`
- **Backend:** `GET/POST /api/academic/years`
- **Form Fields:** `schoolId [select]`, `year [e.g. 2026-27]`, `label`, `startDate`, `endDate`, `isActive [boolean]`

---

### D.4 — Student Admissions & Intake

#### StudentAdmissionsComponent
- **Path:** `/admin/students`
- **Backend:** `GET/POST /api/management/students`, `POST /api/management/students/bulk-upload`
- **UI:**
  - Filter: school → standard → section → roster table
  - + Individual Enrollment → modal form
  - 📥 Bulk CSV Upload → progress + `BulkEnrollmentResult` card
  - Reset Password action per row
- **Individual Enrollment Form Fields:**
  - `schoolId [select]`, `standardId [select]`, `section`, `name [NFC]`, `rollNumber`
  - `parentPhone` — required (IDOR key, verified server-side)
  - `gender [MALE|FEMALE|OTHER]`, `dob [date]`, `email [optional]`

---

### D.5 — Grading Policy Editor

#### GradingPolicyComponent
- **Path:** `/admin/grading-policy`
- **Backend:** `GET/PUT /api/management/grading-policy?schoolId=`
- **UI:**
  - School selector (super-admin only)
  - Grade Tier Editor table (dynamic rows):
    - `minScore`, `maxScore`, `grade [A+/A/B/C/D/F]`, `label [Excellent/Good/Pass/Fail]`
  - Add row / delete row
  - Save → success toast

---

### D.6 — System Analytics & Audit

#### SystemAnalyticsComponent
- **Path:** `/admin/analytics`
- **Backend:** `GET /api/management/analytics/school-summary`, `/standards/:standardId`
- **UI:**
  - School selector
  - Institution-wide KPI cards
  - Standard-by-standard performance bar chart
  - Subject-level drill-down

#### IngestionMonitorComponent
- **Path:** `/admin/ingestion`
- **Backend:** `GET /api/ingestion?schoolCode=&status=`, `POST /api/ingestion/retry/:fileId`
- **UI:**
  - Filter: school / status
  - Job table: fileId, school, subject, status badge, progress %, last updated
  - Retry button for FAILED jobs
  - Auto-refresh toggle (polls every 15s)
