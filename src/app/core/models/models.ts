// ──────────────────────────────────────────────────────────────
//  Core TypeScript Models — Mirror of ALL backend DTOs
//  DigitalClassRoom | Part1_Backend_Matrix.md
// ──────────────────────────────────────────────────────────────

// ============================================================
// AUTH
// ============================================================
export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  tokenType?: string;
  username?: string;
  roles?: string[];
  profile?: UserProfileResponse;
}

export interface BaseUserProfile {
  id?: string | number;
  userId?: string | number;
  username: string;
  name?: string;
  email?: string;
  role?: UserRole | string;
  schoolId?: string | number;
  schoolName?: string;
  phone?: string;
  phoneNumber?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  authorities?: string[];
}

export interface StudentProfile extends BaseUserProfile {
  standardId?: string | number;
  standardName?: string;
  section?: string;
  rollNumber?: string;
  parentPhone?: string;
  parentUserId?: string | number;
  gender?: string;
  dob?: string | Date;
}

export interface TeacherProfile extends BaseUserProfile {
  assignedSubjectIds?: (string | number)[];
  assignedStandardIds?: (string | number)[];
  qualification?: string;
  designation?: string;
}

export interface StaffProfile extends BaseUserProfile {
  department?: string;
  designation?: string;
}

export interface UserProfileResponse extends StudentProfile, TeacherProfile, StaffProfile {
  id: string | number;
  username: string;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  oldPassword?: string;
  newPassword?: string;
}

export type UserRole = 'ADMIN' | 'DIGITAL_CLASS_ADMIN' | 'TEACHER' | 'STUDENT' | 'USER' | 'PARENT';
export type AgeGroup = 'early' | 'middle' | 'upper' | 'senior';

export function resolveAgeGroup(standardNumber: number): AgeGroup {
  if (standardNumber <= 2) return 'early';
  if (standardNumber <= 5) return 'middle';
  if (standardNumber <= 7) return 'upper';
  return 'senior';
}

// ============================================================
// SCHOOL
// ============================================================
export interface SchoolRequest {
  name: string; // NFC Telugu-safe
  schoolName?: string;
  code?: string;
  schoolCode: string;
  address: string;
  city: string;
  state: string;
  country?: string;
  phone?: string;
  contactPhone?: string;
  email?: string;
  contactEmail?: string;
}

export interface SchoolUpdateRequest extends Partial<SchoolRequest> {}

export interface SchoolResponse {
  id: number | string;
  name: string;
  schoolName?: string;
  code?: string;
  schoolCode: string;
  address: string;
  city: string;
  state: string;
  country?: string;
  enabled?: boolean;
  createdAt?: string;
  phone?: string;
  contactPhone?: string;
  email?: string;
  contactEmail?: string;
}

// ============================================================
// ACADEMIC YEAR
// ============================================================
export interface AcademicYearRequest {
  schoolId: number | string;
  schoolName?: string;
  schoolCode?: string;
  year: string;
  label?: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  active?: boolean;
}

export interface AcademicYearResponse {
  id: number | string;
  schoolId: number | string;
  schoolName?: string;
  schoolCode?: string;
  year: string;
  label?: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  active?: boolean;
}

// ============================================================
// STANDARDS & SUBJECTS
// ============================================================
export interface StandardRequest {
  schoolId: number | string;
  schoolName?: string;
  schoolCode?: string;
  academicYearId: number | string;
  academicYearName?: string;
  standardNumber: number;
  name: string;
  section: string;
}

export interface StandardResponse {
  id: number | string;
  schoolId: number | string;
  schoolName?: string;
  schoolCode?: string;
  academicYearId: number | string;
  academicYearName?: string;
  standardNumber: number;
  name: string; // Telugu NFC — never normalize
  section: string;
}

export interface SubjectRequest {
  schoolId: number | string;
  standardId: number | string;
  academicYearId: number | string;
  name: string;
  code: string;
  language: string;
}

export interface SubjectResponse {
  id: number | string;
  schoolId: number | string;
  standardId: number | string;
  academicYearId?: number | string;
  name: string; // Telugu NFC
  code: string;
  language?: string;
  gradientClass?: string; // client-side derived
}

// ============================================================
// LESSONS & CONTENT
// ============================================================
export interface LessonRequest {
  schoolId: number | string;
  subjectId: number | string;
  standardId: number | string;
  academicYearId?: number | string;
  title: string;
  orderIndex?: number;
  language?: string;
}

export interface LessonResponse {
  id: number | string;
  schoolId: number | string;
  subjectId: number | string;
  standardId: number | string;
  academicYearId?: number | string;
  title: string | any;
  orderIndex?: number;
  language?: string;
}

export interface ContentUnitResponse {
  id: number | string;
  lessonId: number | string;
  title: string | any;
  unitType?: string;
  orderIndex?: number;
  language?: string;
}

export interface ContentChunkResponse {
  id: number | string;
  lessonId: number | string;
  contentUnitId?: number | string;
  text?: string; // Telugu NFC preserved
  content?: string;
  teluguContent?: string;
  englishContent?: string;
  sectionHeader?: string;
  orderIndex?: number;
  sequenceOrder?: number;
  language?: string;
}

// ============================================================
// ACTIVITIES & QUESTIONS
// ============================================================
export type ActivityType =
  | 'QUIZ' | 'EXERCISE' | 'FLASHCARD' | 'PRACTICE'
  | 'HOMEWORK' | 'ASSESSMENT' | 'READING_COMPREHENSION' | 'VOCABULARY_BUILDER';

export type ExamCategory =
  | 'DAILY_PRACTICE' | 'WEEKLY_TEST' | 'MONTHLY_TEST'
  | 'QUARTERLY_EXAM' | 'HALF_YEARLY_EXAM' | 'PRE_YEAR_EXAM'
  | 'ANNUAL_EXAM' | 'NONE';

export type ActivityStatus = 'DRAFT' | 'PUBLISHED';
export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_BLANK';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface ActivityResponse {
  id: number | string;
  schoolId?: number | string;
  title: string;
  activityType: ActivityType;
  examCategory: ExamCategory;
  difficultyLevel: DifficultyLevel;
  totalMarks: number;
  status?: ActivityStatus;
  language?: string;
  questionCount?: number;
  totalQuestions?: number;
  subjectId?: number | string;
  lessonId?: number | string;
  standardId?: number | string;
  academicYearId?: number | string;
  createdAt?: string;
}

export interface QuestionOption {
  id: number | string;
  text: string;
  isCorrect?: boolean; // stripped for student-facing API
}

export interface Question {
  id: number | string;
  text: string; // NFC-safe
  questionType?: QuestionType | string;
  type?: string;
  marks: number;
  options: QuestionOption[];
  explanation?: string; // stripped for student-facing API
  hintText?: string;
  difficultyLevel?: DifficultyLevel;
  orderIndex?: number;
}

export interface StudentActivityDetailResponse {
  id: number | string;
  schoolId?: number | string;
  title: string;
  activityType?: ActivityType;
  examCategory?: ExamCategory;
  totalMarks?: number;
  difficultyLevel?: DifficultyLevel | string;
  language?: string;
  questions: (Omit<Question, 'explanation'> | Question)[];
}

export type ActivityDetailResponse = StudentActivityDetailResponse;
export type QuestionResponse = Question;
export type StudentQuestionResponse = Question;

export interface BulkUploadQuestionsResponse {
  totalUploaded?: number;
  imported?: number;
  successCount?: number;
  failed?: number;
  failedCount?: number;
  failureCount?: number;
  errors?: string[];
}

export interface CreateActivityRequest {
  schoolId: number | string;
  standardId: number | string;
  subjectId: number | string;
  lessonId?: number | string;
  title: string;
  activityType: ActivityType;
  examCategory: ExamCategory;
  difficultyLevel: DifficultyLevel;
  totalMarks: number;
  language: string;
}

export interface CreateQuestionRequest {
  text: string;
  questionType: QuestionType | string;
  marks: number;
  explanation?: string;
  hintText?: string;
  difficultyLevel?: DifficultyLevel;
  orderIndex?: number;
  options: { text: string; isCorrect: boolean }[];
}

export interface ReorderQuestionsRequest {
  questionIds: (number | string)[];
}

export interface BatchQuestionRequest {
  questions: CreateQuestionRequest[];
}

// ============================================================
// EXAM ATTEMPTS
// ============================================================
export interface StudentAnswer {
  questionId: number | string;
  selectedOptionIds?: (number | string)[];
  textAnswer?: string;
  timestamp?: number;
}

export interface SubmitActivityAttemptRequest {
  answers: StudentAnswer[];
}

export interface QuestionResult {
  questionId: number | string;
  correct?: boolean;
  isCorrect?: boolean;
  selectedOptionIds?: (number | string)[];
  correctOptionIds?: (number | string)[];
  marksEarned?: number;
  marksAwarded?: number;
  questionText?: string;
  studentAnswerText?: string;
  correctAnswerText?: string;
}

export interface ExplainMistakeResponse {
  explanation: string;
  correctAnswer?: string;
  citations?: string[];
}

export interface ActivityAttemptResultResponse {
  id?: number | string;
  attemptId?: number | string;
  activityId: number | string;
  correctCount: number;
  scoreEarned: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  timeSpentSeconds: number;
  questionResults: QuestionResult[];
}

export type StudentActivitySummaryResponse = ActivityResponse;

export interface StudentAttemptSummaryResponse {
  id: number | string;
  activityId: number | string;
  activityTitle?: string;
  title?: string;
  examCategory: ExamCategory;
  scoreEarned: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  timeSpentSeconds?: number;
  attemptedAt?: string;
  date?: string;
}

// ============================================================
// AI TUTORING / LEARNING SESSIONS
// ============================================================
export type LearningActionType = 'ASK' | 'EXPLAIN' | 'SUMMARIZE' | 'REVISION';

export interface LearningSession {
  id: string;
  studentId: number | string;
  lessonId: number | string;
  schoolId?: number | string;
  contentUnitId?: number | string;
  status: 'ACTIVE' | 'CLOSED';
  language: string;
  createdAt?: string;
}

export interface LearningMessage {
  id?: string;
  sessionId?: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  timestamp: string;
  sequenceOrder?: number;
}

export interface LearningActionRequest {
  actionType: LearningActionType;
  query: string;
  language: string;
}

export interface LearningInteractionResult {
  answer: string;
  citations?: string[];
  status: 'SUCCESS' | 'ERROR';
}

export interface QuestionHintResponse {
  hintText: string;
}

export interface ExplainMistakeRequest {
  language?: string;
}

export interface StartLearningSessionRequest {
  schoolId?: number | string;
  lessonId?: number | string;
  contentUnitId?: number | string;
  language: string;
}

// ============================================================
// PROGRESS
// ============================================================
export interface StudentProgress {
  id?: string;
  studentId: number | string;
  lessonId: number | string;
  contentUnitId?: number | string;
  completionPercent: number;
  lastPosition: number;
  lastAccessedAt: string;
  completed: boolean;
}

// ============================================================
// ANALYTICS & GRADEBOOK
// ============================================================
export interface SchoolOverviewResponse {
  totalStudents: number;
  totalTeachers: number;
  totalStandards: number;
  activeActivities: number;
  schoolName?: string;
  averagePassRate?: number;
}

export interface GradebookColumn {
  activityId: string | number;
  activityTitle: string;
  totalMarks: number;
}

export interface GradebookRow {
  studentId: string | number;
  rollNumber: string;
  studentName: string;
  scores: number[];
  overallPercentage: number;
}

export interface SectionGradebookResponse {
  standardId?: number | string;
  section?: string;
  columns?: GradebookColumn[];
  rows?: GradebookRow[];
  students?: {
    studentId: number | string;
    studentName: string;
    rollNumber: string;
    grades: { [subjectId: string]: { score: number; grade: string } };
    averageScore: number;
  }[];
  subjectAverages?: { [subjectId: string]: number };
}

export interface ExamParticipationSummaryResponse {
  activityId: number | string;
  attempted: number;
  notAttempted: number;
  averageScore: number;
  passRate: number;
  absenteeList: AbsenteeItem[];
}

export interface AbsenteeItem {
  studentId: number | string;
  name: string;
  rollNumber: string;
}

export interface SubjectGradeItem {
  subjectId?: number | string;
  subjectName: string;
  averageScore: number;
  grade: string;
  remarks?: string;
  percentage?: number;
  testsAttempted?: number;
}

export interface StudentReportCardResponse {
  studentId?: number | string;
  studentName: string;
  standardNumber?: number;
  section?: string;
  overallGrade: string;
  cumulativePercentage: number;
  termGpa?: number;
  subjectGrades: SubjectGradeItem[];
  recentExams: StudentAttemptSummaryResponse[];
  attendanceRate?: number;
  testsAttempted?: number;
  testsMissed?: number;
}

export interface StudentPerformanceDossierResponse {
  studentId?: number | string;
  studentName?: string;
  name?: string;
  rollNumber?: string;
  section?: string;
  standardNumber?: number;
  overallGrade?: string;
  overallGpa?: number;
  cumulativePercentage?: number;
  attendancePercent?: number;
  attendanceRate?: number;
  recentExams?: StudentAttemptSummaryResponse[];
  subjectGrades?: SubjectGradeItem[];
  subjectStrengths?: { subject: string; score: number }[];
  subjectWeaknesses?: { subject: string; score: number }[];
}

// ============================================================
// PARENT PORTAL
// ============================================================
export interface ParentChildSummaryResponse {
  studentId: number | string;
  fullName: string;
  standardId: number | string;
  standardNumber?: number;
  section: string;
  rollNumber: string;
}

export interface ParentChildOverviewResponse {
  termGpa: number;
  overallGrade: string;
  attendanceRate: number;
  testsAttempted: number;
  testsMissed: number;
}

export interface NoticeResponse {
  id: number | string;
  schoolId?: number | string;
  title: string;
  body?: string;
  content?: string;
  publishedAt: string;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  author?: string;
}

export interface LeaveRequestDto {
  studentId: number | string;
  fromDate: string;
  toDate: string;
  reason: string;
}

export interface ExamHistoryItem {
  id?: number | string;
  attemptId?: number | string;
  activityId?: number | string;
  title?: string;
  activityTitle?: string;
  subjectName?: string;
  examCategory?: ExamCategory;
  scoreEarned: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  date?: string;
  attemptedAt?: string;
}

// ============================================================
// STUDENT ENROLLMENT
// ============================================================
export interface StudentEnrollmentRequest {
  schoolId: number | string;
  standardId: number | string;
  section: string;
  name: string;
  rollNumber: string;
  parentPhone: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string;
  email?: string;
  parentName?: string;
  parentRelation?: 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'PARENT' | string;
  alternatePhone?: string;
  occupation?: string;
  address?: string;
  preferredLanguage?: 'TELUGU' | 'ENGLISH' | 'HINDI' | string;
}


export interface NextRollNumberResponse {
  schoolId: string;
  academicYear: string;
  yearCode: string;
  standardId: string;
  standardCode: string;
  section: string;
  nextSequence: number;
  suggestedRollNumber: string;
}
export interface BulkEnrollmentResult {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  errors?: string[];
}

export interface StudentEnrollmentResponse {
  id: number | string;
  schoolId?: number | string;
  name: string;
  rollNumber: string;
  section: string;
  standardId: number | string;
  email?: string;
  parentPhone: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'M' | 'F';
  dob?: string;
  username?: string;
  tempPassword?: string;
  siblingCount?: number;
}

export interface StudentUpdateRequest {
  name: string;
  rollNumber: string;
  standardId: number | string;
  section: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string;
  parentPhone: string;
  email?: string;
}

export interface LinkedSiblingSummary {
  id: string | number;
  name: string;
  rollNumber: string;
  standardNumber: number;
  standardId?: string | number;
  section: string;
  gender?: string;
  status?: string;
}

export interface ParentProfileResponse {
  id?: string | number;
  schoolId: string | number;
  name: string;
  relation: 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'OTHER' | string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  occupation?: string;
  address?: string;
  preferredLanguage?: 'TELUGU' | 'ENGLISH' | string;
  linkedStudents?: LinkedSiblingSummary[];
}

export interface ParentUpdateRequest {
  schoolId: string | number;
  name: string;
  relation: 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'OTHER' | string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  occupation?: string;
  address?: string;
  preferredLanguage?: 'TELUGU' | 'ENGLISH' | string;
}

export interface UpdateGradingPolicyRequest {
  tiers?: GradeTier[];
  gradeTiers?: GradeTier[];
}

// ============================================================
// INGESTION JOB
// ============================================================
export interface IngestionRequest {
  schoolCode: string;
  subjectCode: string;
  standardNumber: number;
  fileId: string | number;
  fileName?: string;
}

// ============================================================
// MEDIA
// ============================================================
export interface MediaResourceResponse {
  id: number;
  title: string;
  resourceType: string;
  lessonId?: number;
  subjectId: number;
  language?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
}

// ============================================================
// INGESTION JOB
// ============================================================
export type IngestionStatus =
  | 'UPLOADED' | 'EXTRACTING' | 'EXTRACTED'
  | 'CHUNKING' | 'EMBEDDING' | 'COMPLETED' | 'FAILED'
  | 'PROCESSING';

export interface IngestionJobResponse {
  jobId: string;
  fileId: string | number;
  fileName?: string;
  status: IngestionStatus;
  step?: string;
  progress: number;
  errorMessage?: string;
  error?: string;
  schoolCode?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// GRADING POLICY
// ============================================================
export interface GradeTier {
  minScore: number;
  maxScore: number;
  grade: string;
  label: string;
}
export type GradeTierDto = GradeTier;

export interface GradingPolicyResponse {
  schoolId?: number | string;
  gradeTiers?: GradeTierDto[];
  tiers?: GradeTier[];
}

// ============================================================
// UX STATE TYPE (8 mandatory states)
// ============================================================
export type UxState =
  | 'normal' | 'loading' | 'empty' | 'error'
  | 'offline' | 'expired' | 'no-access' | 'success';

// ============================================================
// ACADEMIC PERFORMANCE & ANALYTICS (Phase 10A & 10C)
// ============================================================
export interface StandardMetricItem {
  standardId: string | number;
  totalEnrolledStudents: number;
  distinctStudentsAttempted: number;
  participationRate: number;
  avgPercentage: number;
  passPercentage: number;
}

export interface SectionMetricItem {
  section: string;
  totalAttempts?: number;
  studentCount?: number;
  avgPercentage?: number;
  averageScore?: number;
  passPercentage?: number;
  passRate?: number;
}

export interface SubjectMetricItem {
  subjectId: string | number;
  subjectName?: string;
  totalAttempts?: number;
  avgPercentage?: number;
  averageScore?: number;
  passPercentage?: number;
  passRate?: number;
}

export interface SchoolOverviewResponse {
  schoolId: string | number;
  totalEnrolledStudents: number;
  totalTeachers: number;
  totalStandards: number;
  totalAttempts: number;
  schoolAveragePercentage: number;
  schoolPassPercentage: number;
  standardMetrics: StandardMetricItem[];
  subjectMetrics: SubjectMetricItem[];
}

export interface StandardAnalyticsResponse {
  standardId: string | number;
  totalEnrolledStudents?: number;
  distinctStudentsAttempted?: number;
  participationRate?: number;
  inactiveStudentsCount?: number;
  totalAttempts?: number;
  averageScore?: number;
  standardAveragePercentage?: number;
  passRate?: number;
  standardPassPercentage?: number;
  sections?: SectionMetricItem[];
  sectionMetrics?: SectionMetricItem[];
  subjectMetrics?: SubjectMetricItem[];
}

export interface SectionAnalyticsResponse {
  standardId: string | number;
  section: string;
  totalEnrolledStudents?: number;
  distinctStudentsAttempted?: number;
  participationRate?: number;
  inactiveStudentsCount?: number;
  totalAttempts?: number;
  averageScore?: number;
  sectionAveragePercentage?: number;
  passRate?: number;
  sectionPassPercentage?: number;
  subjectMetrics?: SubjectMetricItem[];
}

export interface SubjectAnalyticsResponse {
  standardId: string | number;
  subjectId: string | number;
  totalAttempts?: number;
  averageScore?: number;
  subjectAveragePercentage?: number;
  passRate?: number;
  subjectPassPercentage?: number;
  highestScore?: number;
  lowestScore?: number;
}
