import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateActivityRequest,
  ActivityResponse,
  ActivityDetailResponse,
  CreateQuestionRequest,
  QuestionResponse,
  ReorderQuestionsRequest,
  BatchQuestionRequest,
  BulkUploadQuestionsResponse,
  StudentEnrollmentResponse,
  SectionGradebookResponse,
  SchoolOverviewResponse,
  StandardAnalyticsResponse,
  SectionAnalyticsResponse,
  SubjectAnalyticsResponse,
  ExamParticipationSummaryResponse,
  StudentReportCardResponse
} from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Activities CRUD
  createActivity(request: CreateActivityRequest): Observable<ActivityResponse> {
    return this.http.post<ActivityResponse>(`${this.apiUrl}/api/activities`, request);
  }

  getActivities(schoolId?: string | number, standardId?: string | number, subjectId?: string | number, lessonId?: string | number, status?: string): Observable<ActivityResponse[]> {
    let params = new HttpParams();
    if (schoolId) params = params.set('schoolId', String(schoolId));
    if (standardId) params = params.set('standardId', String(standardId));
    if (subjectId) params = params.set('subjectId', String(subjectId));
    if (lessonId) params = params.set('lessonId', String(lessonId));
    if (status) params = params.set('status', status);
    return this.http.get<ActivityResponse[]>(`${this.apiUrl}/api/activities`, { params });
  }

  getActivity(activityId: string | number): Observable<ActivityDetailResponse> {
    return this.http.get<ActivityDetailResponse>(`${this.apiUrl}/api/activities/${activityId}`);
  }

  updateActivity(activityId: string | number, request: Partial<CreateActivityRequest>): Observable<ActivityResponse> {
    return this.http.put<ActivityResponse>(`${this.apiUrl}/api/activities/${activityId}`, request);
  }

  deleteActivity(activityId: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/activities/${activityId}`);
  }

  publishActivity(activityId: string | number): Observable<ActivityResponse> {
    return this.http.post<ActivityResponse>(`${this.apiUrl}/api/activities/${activityId}/publish`, {});
  }

  revertActivityToDraft(activityId: string | number): Observable<ActivityResponse> {
    return this.http.post<ActivityResponse>(`${this.apiUrl}/api/activities/${activityId}/revert-to-draft`, {});
  }

  // Question Bank Editor
  createQuestion(activityId: string | number, request: CreateQuestionRequest): Observable<QuestionResponse> {
    return this.http.post<QuestionResponse>(`${this.apiUrl}/api/activities/${activityId}/questions`, request);
  }

  updateQuestion(activityId: string | number, questionId: string | number, request: CreateQuestionRequest): Observable<QuestionResponse> {
    return this.http.put<QuestionResponse>(`${this.apiUrl}/api/activities/${activityId}/questions/${questionId}`, request);
  }

  deleteQuestion(activityId: string | number, questionId: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/activities/${activityId}/questions/${questionId}`);
  }

  reorderQuestions(activityId: string | number, request: ReorderQuestionsRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/api/activities/${activityId}/questions/reorder`, request);
  }

  batchAddQuestions(activityId: string | number, request: BatchQuestionRequest): Observable<QuestionResponse[]> {
    return this.http.post<QuestionResponse[]>(`${this.apiUrl}/api/activities/${activityId}/questions/batch`, request);
  }

  bulkUploadQuestions(activityId: string | number, formData: FormData): Observable<BulkUploadQuestionsResponse> {
    return this.http.post<BulkUploadQuestionsResponse>(`${this.apiUrl}/api/activities/${activityId}/questions/bulk-upload`, formData);
  }

  // Student Directory & Attendance
  getStudents(standardId?: string | number, section?: string): Observable<StudentEnrollmentResponse[]> {
    let params = new HttpParams();
    if (standardId) params = params.set('standardId', String(standardId));
    if (section) params = params.set('section', section);
    return this.http.get<StudentEnrollmentResponse[]>(`${this.apiUrl}/api/management/students`, { params });
  }

  // Attendance Submission (Gap G1)
  submitAttendance(attendanceData: {
    schoolId: string | number;
    standardId: string | number;
    section: string;
    date: string;
    attendanceRecords: { studentId: string | number; status: 'PRESENT' | 'ABSENT' | 'LATE'; remarks?: string }[];
  }): Observable<{ message: string; recordedCount: number }> {
    return this.http.post<{ message: string; recordedCount: number }>(`${this.apiUrl}/api/management/attendance`, attendanceData);
  }

  // Analytics & Gradebook
  getGradebook(standardId: string | number, section: string, subjectId: string | number): Observable<SectionGradebookResponse> {
    const params = new HttpParams()
      .set('standardId', String(standardId))
      .set('section', section)
      .set('subjectId', String(subjectId));
    return this.http.get<SectionGradebookResponse>(`${this.apiUrl}/api/management/gradebook`, { params });
  }

  getSchoolSummary(): Observable<SchoolOverviewResponse> {
    return this.http.get<SchoolOverviewResponse>(`${this.apiUrl}/api/management/analytics/school-summary`);
  }

  getStandardAnalytics(standardId: string | number): Observable<StandardAnalyticsResponse> {
    return this.http.get<StandardAnalyticsResponse>(`${this.apiUrl}/api/management/analytics/standards/${standardId}`);
  }

  getSectionAnalytics(standardId: string | number, section: string): Observable<SectionAnalyticsResponse> {
    return this.http.get<SectionAnalyticsResponse>(`${this.apiUrl}/api/management/analytics/standards/${standardId}/sections/${section}`);
  }

  getSubjectAnalytics(standardId: string | number, subjectId: string | number): Observable<SubjectAnalyticsResponse> {
    return this.http.get<SubjectAnalyticsResponse>(`${this.apiUrl}/api/management/analytics/standards/${standardId}/subjects/${subjectId}`);
  }

  getActivityParticipation(activityId: string | number, section?: string): Observable<ExamParticipationSummaryResponse> {
    let params = new HttpParams();
    if (section) params = params.set('section', section);
    return this.http.get<ExamParticipationSummaryResponse>(`${this.apiUrl}/api/management/analytics/activities/${activityId}/participation`, { params });
  }

  getStudentReportCard(studentId: string | number): Observable<StudentReportCardResponse> {
    return this.http.get<StudentReportCardResponse>(`${this.apiUrl}/api/management/analytics/students/${studentId}/report-card`);
  }

  // Teacher score override (Gap G4)
  overrideAttemptScore(attemptId: string | number, override: { scoreEarned: number; remarks: string }): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/api/student/attempts/${attemptId}/override`, override);
  }
}
