import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  StudentActivitySummaryResponse,
  StudentActivityDetailResponse,
  SubmitActivityAttemptRequest,
  ActivityAttemptResultResponse,
  StudentAttemptSummaryResponse,
  QuestionHintResponse,
  ExplainMistakeRequest,
  ExplainMistakeResponse,
  StartLearningSessionRequest,
  LearningSession,
  LearningMessage,
  LearningActionRequest,
  LearningInteractionResult,
  StudentProgress,
  StudentReportCardResponse
} from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Activities & Exams
  getActivities(lessonId?: string | number, examCategory?: string): Observable<StudentActivitySummaryResponse[]> {
    if (!lessonId) {
      console.warn('[StudentService] getActivities: lessonId is required by the backend API. Skipping call to prevent HTTP 400.');
      return of([]);
    }
    let params = new HttpParams().set('lessonId', String(lessonId));
    if (examCategory) params = params.set('examCategory', examCategory);
    return this.http.get<StudentActivitySummaryResponse[]>(`${this.apiUrl}/api/student/activities`, { params });
  }

  getActivitiesByLesson(lessonId: string, examCategory?: string): Observable<StudentActivitySummaryResponse[]> {
    let params = new HttpParams();
    if (examCategory) params = params.set('examCategory', examCategory);
    return this.http.get<StudentActivitySummaryResponse[]>(`${this.apiUrl}/api/student/activities/lesson/${lessonId}`, { params });
  }

  getActivityDetail(activityId: string): Observable<StudentActivityDetailResponse> {
    return this.http.get<StudentActivityDetailResponse>(`${this.apiUrl}/api/student/activities/${activityId}`);
  }

  // Attempts
  submitAttempt(activityId: string, request: SubmitActivityAttemptRequest): Observable<ActivityAttemptResultResponse> {
    return this.http.post<ActivityAttemptResultResponse>(`${this.apiUrl}/api/student/activities/${activityId}/attempts`, request);
  }

  getAttempts(examCategory?: string): Observable<StudentAttemptSummaryResponse[]> {
    let params = new HttpParams();
    if (examCategory) params = params.set('examCategory', examCategory);
    return this.http.get<StudentAttemptSummaryResponse[]>(`${this.apiUrl}/api/student/attempts`, { params });
  }

  getActivityAttempts(activityId: string): Observable<StudentAttemptSummaryResponse[]> {
    return this.http.get<StudentAttemptSummaryResponse[]>(`${this.apiUrl}/api/student/activities/${activityId}/attempts`);
  }

  getAttemptResult(attemptId: string): Observable<ActivityAttemptResultResponse> {
    return this.http.get<ActivityAttemptResultResponse>(`${this.apiUrl}/api/student/attempts/${attemptId}`);
  }

  // Assistance & Hints (Blocked during formal ASSESSMENT)
  getQuestionHint(activityId: string | number, questionId: string | number): Observable<QuestionHintResponse> {
    return this.http.post<QuestionHintResponse>(
      `${this.apiUrl}/api/student/activities/${activityId}/questions/${questionId}/hint`,
      {}
    );
  }

  explainMistake(attemptId: string | number, questionId: string | number, request: ExplainMistakeRequest): Observable<ExplainMistakeResponse> {
    return this.http.post<ExplainMistakeResponse>(
      `${this.apiUrl}/api/student/attempts/${attemptId}/questions/${questionId}/explain`,
      request
    );
  }

  // AI Tutoring & Sessions
  startLearningSession(request: StartLearningSessionRequest): Observable<LearningSession> {
    return this.http.post<LearningSession>(`${this.apiUrl}/api/student/sessions`, request);
  }

  getActiveLearningSessions(): Observable<LearningSession[]> {
    return this.http.get<LearningSession[]>(`${this.apiUrl}/api/student/sessions`);
  }

  getLearningSession(sessionId: string): Observable<LearningSession> {
    return this.http.get<LearningSession>(`${this.apiUrl}/api/student/sessions/${sessionId}`);
  }

  getSessionMessages(sessionId: string): Observable<LearningMessage[]> {
    return this.http.get<LearningMessage[]>(`${this.apiUrl}/api/student/sessions/${sessionId}/messages`);
  }

  sendLearningAction(sessionId: string, request: LearningActionRequest): Observable<LearningInteractionResult> {
    return this.http.post<LearningInteractionResult>(`${this.apiUrl}/api/student/sessions/${sessionId}/action`, request);
  }

  // Progress Telemetry
  getProgress(): Observable<StudentProgress[]> {
    return this.http.get<StudentProgress[]>(`${this.apiUrl}/api/student/progress`);
  }

  getLessonProgress(lessonId: string): Observable<StudentProgress[]> {
    return this.http.get<StudentProgress[]>(`${this.apiUrl}/api/student/progress/lesson/${lessonId}`);
  }

  getContentUnitProgress(contentUnitId: string): Observable<StudentProgress> {
    return this.http.get<StudentProgress>(`${this.apiUrl}/api/student/progress/content-unit/${contentUnitId}`);
  }

  saveProgress(progress: StudentProgress): Observable<StudentProgress> {
    return this.http.post<StudentProgress>(`${this.apiUrl}/api/student/progress`, progress);
  }

  // Analytics
  getMyPerformance(): Observable<StudentReportCardResponse> {
    return this.http.get<StudentReportCardResponse>(`${this.apiUrl}/api/student/analytics/my-performance`);
  }
}
