# DigitalClassRoom — Part 1: Backend Capability Matrix
> **Audit Basis:** Spring Boot codebase @ `g:\HATS\STS\DigitalClassRoom`
> **Controllers scanned:** 20 | **Models:** 40+ | **DTOs:** 107

---

## 1.1 — Role System

| Role String | Spring Security Role | Issued To |
|---|---|---|
| `ADMIN` | `ROLE_ADMIN` | Super-admin / institutional admin |
| `TEACHER` | `ROLE_TEACHER` | Class teachers |
| `STUDENT` / `USER` | `ROLE_STUDENT` | Enrolled students |
| `PARENT` | `ROLE_PARENT` | Parents linked via `parentPhone` field on child `User` |

---

## 1.2 — Endpoint Matrix by Domain

### AUTH — `AuthController` `/api/auth`
| Method | Path | Roles | Request | Response |
|--------|------|-------|---------|----------|
| POST | `/api/auth/register` | Public | `{username, email, password, role, schoolId}` | `MessageResponse` |
| POST | `/api/auth/login` | Public | `LoginRequest {username, password}` | `AuthResponse {token}` |
| GET | `/api/auth/me` | Authenticated | — | `UserProfileResponse {id, name, email, role, schoolId, standardId, section, rollNumber, phone, username, authorities}` |

### SCHOOL/ADMIN — `SchoolController` `/api/schools`
| Method | Path | Roles | Key Payload |
|--------|------|-------|-------------|
| POST | `/api/schools` | ADMIN | `SchoolRequest {name, code, address, phone, email, city, state}` |
| GET | `/api/schools` | Any auth | `List<SchoolResponse>` |
| GET | `/api/schools/{id}` | Any auth | `SchoolResponse` |
| GET | `/api/schools/code/{schoolCode}` | Any auth | `SchoolResponse` |
| PUT | `/api/schools/{id}` | ADMIN | `SchoolUpdateRequest` |
| DELETE | `/api/schools/{id}` | ADMIN | 204 |

### ACADEMIC/CURRICULUM — `AcademicController` `/api/academic`
| Method | Path | Key Payload |
|--------|------|-------------|
| POST | `/api/academic/years` | `AcademicYearRequest {schoolId, year, label, startDate, endDate, isActive}` |
| GET | `/api/academic/years?schoolId=` | `List<AcademicYearResponse>` |
| POST | `/api/academic/standards` | `StandardRequest {schoolId, academicYearId, standardNumber, name [Telugu NFC], section}` |
| GET | `/api/academic/standards?schoolId=&academicYearId=` | `List<StandardResponse>` |
| GET/PUT/DELETE | `/api/academic/standards/{standardId}` | CRUD (ADMIN) |
| POST | `/api/academic/subjects` | `SubjectRequest {schoolId, standardId, academicYearId, name [NFC], code, language}` |
| GET | `/api/academic/subjects?schoolId=&standardId=` | `List<SubjectResponse>` |

**LessonController `/api/lessons`**
| Method | Path | Key Payload |
|--------|------|-------------|
| POST | `/api/lessons` | `LessonRequest {schoolId, subjectId, standardId, academicYearId, title, orderIndex, language}` |
| GET | `/api/lessons?schoolId=&subjectId=` | `List<LessonResponse>` |
| GET | `/api/lessons/{id}` | `LessonResponse` |
| GET | `/api/lessons/{id}/content-units?schoolId=&language=` | `List<ContentUnitResponse>` |
| GET | `/api/lessons/{id}/chunks?schoolId=&language=` | `List<ContentChunkResponse>` |

### ACTIVITIES/EXAMS (Teacher-side) — `ActivityController` `/api/activities`
**`@PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")`**

| Method | Path | Key Payload |
|--------|------|-------------|
| POST | `/api/activities` | `CreateActivityRequest {schoolId, academicYearId, standardId, subjectId, lessonId, title, activityType, examCategory, difficultyLevel, totalMarks, language}` |
| GET | `/api/activities/{id}` | `ActivityDetailResponse` |
| GET | `/api/activities?schoolId=&[filters]` | `List<ActivityResponse>` |
| PUT/DELETE | `/api/activities/{id}` | Update / 204 |
| POST | `/api/activities/{id}/publish` | `ActivityResponse {status: PUBLISHED}` |
| POST | `/api/activities/{id}/revert-to-draft` | `ActivityResponse {status: DRAFT}` |
| POST | `/api/activities/{id}/questions` | `CreateQuestionRequest {text, questionType, marks, options: [{text, isCorrect}], explanation, hintText}` |
| PUT/DELETE | `/api/activities/{id}/questions/{qId}` | Update / 204 |
| PUT | `/api/activities/{id}/questions/reorder` | `ReorderQuestionsRequest {orderedIds: []}` |
| POST | `/api/activities/{id}/questions/batch` | `BatchQuestionRequest {questions: []}` |
| POST | `/api/activities/{id}/questions/bulk-upload` | multipart CSV → `BulkUploadQuestionsResponse {imported, failed, errors}` |

**Enumerations:**
- `activityType`: `QUIZ | EXERCISE | FLASHCARD | PRACTICE | HOMEWORK | ASSESSMENT | READING_COMPREHENSION | VOCABULARY_BUILDER`
- `examCategory`: `DAILY_PRACTICE | WEEKLY_TEST | MONTHLY_TEST | QUARTERLY_EXAM | HALF_YEARLY_EXAM | PRE_YEAR_EXAM | ANNUAL_EXAM | NONE`
- `ActivityStatus`: `DRAFT | PUBLISHED`

### ACTIVITIES/EXAMS (Student-side)
**`StudentActivityController` `/api/student/activities`** — `STUDENT|USER|ADMIN|TEACHER`

| Method | Path | Key Payload |
|--------|------|-------------|
| GET | `/api/student/activities/lesson/{lessonId}?examCategory=` | `List<StudentActivitySummaryResponse>` (no answer keys) |
| GET | `/api/student/activities?lessonId=&examCategory=` | same |
| GET | `/api/student/activities/{activityId}` | `StudentActivityDetailResponse {questions: [{id, text, type, options: [{id, text}]}]}` |

**`ActivityAttemptController`** — `STUDENT|USER|ADMIN|TEACHER`

| Method | Path | Key Payload |
|--------|------|-------------|
| POST | `/api/student/activities/{activityId}/attempts` | `SubmitActivityAttemptRequest {answers: [{questionId, selectedOptionIds?, textAnswer?}]}` → `ActivityAttemptResultResponse {correctCount, scoreEarned, percentage, passed, timeSpentSeconds, questionResults}` |
| GET | `/api/student/activities/{activityId}/attempts` | `List<StudentAttemptSummaryResponse>` |
| GET | `/api/student/attempts?examCategory=` | `List<StudentAttemptSummaryResponse>` |
| GET | `/api/student/attempts/{attemptId}` | `ActivityAttemptResultResponse` (full review, answers revealed) |

**`ActivityAssistanceController`** — `STUDENT|USER|ADMIN|TEACHER`

| Method | Path | Key Payload |
|--------|------|-------------|
| POST | `/api/student/activities/{activityId}/questions/{questionId}/hint` | `QuestionHintResponse {hintText, source}` (blocked during ASSESSMENT) |
| POST | `/api/student/attempts/{attemptId}/questions/{questionId}/explain` | `ExplainMistakeRequest {language}` → `ExplainMistakeResponse {explanation, correctAnswer, textbookExcerpt}` |

### AI TUTORING — `StudentLearningController` `/api/student`
**`@PreAuthorize("hasAnyRole('STUDENT', 'USER', 'ADMIN', 'TEACHER')")`**

| Method | Path | Key Payload |
|--------|------|-------------|
| POST | `/api/student/sessions` | `StartLearningSessionRequest {lessonId, contentUnitId, schoolId, language}` → `LearningSession {id, studentId, lessonId, status}` |
| GET | `/api/student/sessions/{sessionId}` | `LearningSession` |
| GET | `/api/student/sessions/{sessionId}/messages` | `List<LearningMessage {role [USER/ASSISTANT], content, timestamp, sequenceOrder}>` |
| GET | `/api/student/sessions` | `List<LearningSession>` (active only) |
| POST | `/api/student/sessions/{sessionId}/action` | `LearningActionRequest {actionType [ASK/EXPLAIN/SUMMARIZE/REVISION], query, language}` → `LearningInteractionResult {answer, citations, status}` |

### PROGRESS & MEDIA TELEMETRY

**Progress (via StudentLearningController)**

| Method | Path | Key Payload |
|--------|------|-------------|
| GET | `/api/student/progress` | `List<StudentProgress {studentId, lessonId, contentUnitId, completionPercent, lastPosition, lastAccessedAt, completed}>` |
| GET | `/api/student/progress/lesson/{lessonId}` | `List<StudentProgress>` |
| GET | `/api/student/progress/content-unit/{contentUnitId}` | `StudentProgress` |
| POST | `/api/student/progress` | `StudentProgress` (heartbeat upsert) |

**MediaController `/api/media`**

| Method | Path | Roles | Key Payload |
|--------|------|-------|-------------|
| POST | `/api/media` | ADMIN/TEACHER | multipart `{file, schoolId, academicYearId, standardId, subjectId, lessonId?, resourceType, title, language?}` |
| POST | `/api/media/{resourceId}/versions` | ADMIN/TEACHER | multipart new version |
| GET | `/api/media/subject/{schoolId}/{aYrId}/{stdId}/{subjId}` | ADMIN/TEACHER | `List<MediaResourceResponse>` |
| GET | `/api/media/lesson/{schoolId}/{aYrId}/{stdId}/{subjId}/{lessonId}` | ADMIN/TEACHER | `List<MediaResourceResponse>` |
| GET | `/api/media/{resourceId}/file` | ADMIN/TEACHER/STUDENT | binary stream (Content-Disposition: inline) |

### PARENT PORTAL — `ParentPortalController` `/api/parent`
**`@PreAuthorize("hasRole('PARENT')")`**

| Method | Path | Key Response |
|--------|------|-------------|
| GET | `/api/parent/children` | `List<ParentChildSummaryResponse {studentId, fullName, standardId, section, rollNumber}>` |
| GET | `/api/parent/children/{studentId}/overview` | `ParentChildOverviewResponse {termGpa, overallGrade, attendanceRate, testsAttempted, testsMissed}` |
| GET | `/api/parent/children/{studentId}/report-card` | `StudentPerformanceDossierResponse` |

> **IDOR Guard:** Service verifies `parentPhone` on child `User` matches authenticated parent's phone.

### ANALYTICS & GRADEBOOK
**`AcademicAnalyticsController` `/api/management/analytics`** — `ADMIN|TEACHER`

| Method | Path | Key Response |
|--------|------|-------------|
| GET | `/api/management/analytics/school-summary` | `SchoolOverviewResponse {totalStudents, totalTeachers, totalStandards, activeActivities}` |
| GET | `/api/management/analytics/standards/{standardId}` | `StandardAnalyticsResponse {sections: [SectionMetricItem], subjects: [SubjectMetricItem]}` |
| GET | `/api/management/analytics/standards/{standardId}/sections/{section}` | `SectionAnalyticsResponse {absenteeList, cadenceMetrics}` |
| GET | `/api/management/analytics/standards/{standardId}/subjects/{subjectId}` | `SubjectAnalyticsResponse` |
| GET | `/api/management/analytics/activities/{activityId}/participation?section=` | `ExamParticipationSummaryResponse {attempted, notAttempted, averageScore, passRate, absenteeList}` |
| GET | `/api/management/analytics/students/{studentId}/report-card` | `StudentReportCardResponse {overallGrade, cumulativePercentage, subjectGrades, cadenceProgress, recentExams}` |

**`AcademicGradebookController` `/api/management/gradebook`** — `ADMIN|TEACHER`

| Method | Path | Key Response |
|--------|------|-------------|
| GET | `/api/management/gradebook?standardId=&section=&subjectId=` | `SectionGradebookResponse {columns, rows, cells}` |
| GET | `/api/management/gradebook/csv?…` | `text/csv; charset=UTF-8` with UTF-8 BOM stream |

**`StudentAnalyticsController` `/api/student/analytics`** — `STUDENT`

| GET | `/api/student/analytics/my-performance` | `StudentReportCardResponse` |

### GRADING POLICY — `SchoolGradingPolicyController` `/api/management/grading-policy`

| Method | Path | Roles | Key Payload |
|--------|------|-------|-------------|
| GET | `/api/management/grading-policy?schoolId=` | ADMIN/TEACHER | `GradingPolicyResponse {gradeTiers: [{minScore, maxScore, grade, label}]}` |
| PUT | `/api/management/grading-policy?schoolId=` | **ADMIN only** | `UpdateGradingPolicyRequest {gradeTiers: [GradeTierDto]}` |

### STUDENT ENROLLMENT — `StudentEnrollmentController` `/api/management/students`
**`@PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")`**

| Method | Path | Key Payload |
|--------|------|-------------|
| POST | `/api/management/students` | `StudentEnrollmentRequest {schoolId, standardId, section, name, rollNumber, parentPhone, gender, dob, email?}` → `{id, username, tempPassword}` |
| POST | `/api/management/students/bulk-upload` | multipart `{standardId, section, file}` → `BulkEnrollmentResult {enrolled, failed, errors}` |
| GET | `/api/management/students?standardId=&section=` | `List<StudentEnrollmentResponse>` |
| POST | `/api/management/students/{id}/reset-password` | `{newPassword?}` → `{message, tempPassword}` |

### FILE MANAGEMENT — `FileController` `/api/files`

| Method | Path | Roles |
|--------|------|-------|
| POST | `/api/files` | ADMIN/TEACHER/USER (multipart with full hierarchy params) |
| GET | `/api/files/{id}` | Any auth |
| GET | `/api/files/subject/{subjectId}[/category/{category}]` | Any auth |
| GET | `/api/files/{id}/download-url` | Any auth → `PresignedUrlResponse {url, expiresAt}` |
| DELETE | `/api/files/{id}` | ADMIN/TEACHER/USER |
| GET | `/api/files?entityType=&entityId=&schoolId=&subjectId=` | Any auth |

### ASYNC PDF INGESTION — `IngestionController` `/api/ingestion`

| Method | Path | Key Payload |
|--------|------|-------------|
| POST | `/api/ingestion` | `IngestionRequest {fileId, schoolId?}` → **HTTP 202** `IngestionJobResponse {jobId, fileId, status, progress, errorMessage}` |
| GET | `/api/ingestion/{jobId}` | `IngestionJobResponse` |
| GET | `/api/ingestion?schoolCode=&academicYear=&status=` | `List<IngestionJobResponse>` |
| GET | `/api/ingestion/status/{fileId}` | `IngestionJob` |
| POST | `/api/ingestion/retry/{fileId}` | — (resets to UPLOADED) |

**Pipeline stages:** `UPLOADED → EXTRACTING → EXTRACTED → CHUNKING → EMBEDDING → COMPLETED | FAILED`

**LearningResourceController `/api/learning-resources`** (ADMIN/TEACHER)

| Method | Path |
|--------|------|
| POST | `/api/learning-resources` (create metadata) |
| GET | `/api/learning-resources/{resourceId}` |
| GET | `/api/learning-resources/subject/{schoolId}/{aYrId}/{stdId}/{subjId}` |
| POST/GET/DELETE | `/api/learning-resources/{resourceId}/versions[/{versionId}]` |
| POST | `/api/learning-resources/{resourceId}/versions/{versionId}/activate` |

---

## 1.3 — Critical Invariants

| # | Invariant | UI Impact |
|---|-----------|-----------|
| **I1** | **IDOR:** `ParentPortalService` verifies `parentPhone` on child matches parent's phone | Never cache or enumerate child list client-side; rely on server response only |
| **I2** | **Tenant Scoping:** All entities carry `schoolId`; teachers scoped to own school; ADMIN cross-school | Inject `schoolId` from `/api/auth/me` into all requests; non-admins cannot override |
| **I3** | **Telugu NFC:** `name` fields carry NFC Unicode | Use `font-family: Noto Sans Telugu`; `telugu-nfc.pipe` must be a no-op pass-through; never `normalize()` or `trim()` Telugu strings |
| **I4** | **Anti-Cheat:** Student activity API strips `isCorrect`/`explanation`; `/hint` blocked during ASSESSMENT | ExamPlayerPage cannot read answer keys; "Ask AI" hidden during formal exams |
| **I5** | **Async Ingestion:** Returns HTTP 202 immediately | Poll `/api/ingestion/status/{fileId}` with exponential backoff; show step-progress UI |
| **I6** | **Password Lifecycle:** `mustChangePassword` not in `UserProfileResponse` | Detect via interceptor error code on first login; route to `/change-password` |
| **I7** | **Media Streaming:** `/api/media/{id}/file` returns binary inline | Create Object URL from blob with Authorization header injected by HttpInterceptor |

---

## 1.4 — Backend Gaps (Endpoints to Build)

| Gap # | Missing Endpoint | Required For |
|-------|-----------------|--------------|
| G1 | `POST /api/management/attendance` | Teacher roll-call submission |
| G2 | `GET /api/school/notices?schoolId=` | Parent circulars/alerts |
| G3 | `POST /api/parent/children/:id/leave-requests` | Parent leave submission |
| G4 | `PUT /api/student/attempts/:id/override` | Teacher manual mark override |
| G5 | `POST /api/auth/change-password` | Force password change (`ChangePasswordRequest` DTO exists) |
| G6 | `GET /api/student/activities?standardId=&upcoming=true` | Student home exam alert cards (cross-lesson) |
| G7 | `GET /api/parent/children/:id/exam-history` | Parent detailed exam timeline |
