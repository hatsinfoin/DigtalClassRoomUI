import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  SchoolRequest,
  SchoolResponse,
  SchoolUpdateRequest,
  StudentEnrollmentRequest,
  StudentEnrollmentResponse,
  StudentUpdateRequest,
  BulkEnrollmentResult,
  NextRollNumberResponse,
  ParentProfileResponse,
  ParentUpdateRequest,
  GradingPolicyResponse,
  UpdateGradingPolicyRequest,
  IngestionRequest,
  IngestionJobResponse,
  SchoolOverviewResponse,
  StandardAnalyticsResponse,
  SectionAnalyticsResponse,
  SubjectAnalyticsResponse
} from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Schools CRUD
  getSchools(): Observable<SchoolResponse[]> {
    return this.http.get<SchoolResponse[]>(`${this.apiUrl}/api/schools`);
  }

  getSchool(id: string | number): Observable<SchoolResponse> {
    return this.http.get<SchoolResponse>(`${this.apiUrl}/api/schools/${encodeURIComponent(String(id))}`);
  }

  getSchoolByCode(code: string): Observable<SchoolResponse> {
    return this.http.get<SchoolResponse>(`${this.apiUrl}/api/schools/code/${encodeURIComponent(code)}`);
  }

  createSchool(request: SchoolRequest): Observable<SchoolResponse> {
    return this.http.post<SchoolResponse>(`${this.apiUrl}/api/schools`, request);
  }

  updateSchool(id: string | number, request: SchoolUpdateRequest): Observable<SchoolResponse> {
    return this.http.put<SchoolResponse>(`${this.apiUrl}/api/schools/${encodeURIComponent(String(id))}`, request);
  }

  deleteSchool(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/schools/${encodeURIComponent(String(id))}`);
  }

  // Student Admissions & Roster
  getStudents(standardId?: string | number, section?: string, schoolId?: string | number): Observable<StudentEnrollmentResponse[]> {
    let params = new HttpParams();
    if (standardId) params = params.set('standardId', String(standardId));
    if (section) params = params.set('section', section);
    if (schoolId) params = params.set('schoolId', String(schoolId));
    return this.http.get<StudentEnrollmentResponse[]>(`${this.apiUrl}/api/management/students`, { params });
  }

  getNextRollNumber(standardId: string | number, section: string, academicYear: string = '2026-2027', schoolId?: string | number): Observable<NextRollNumberResponse> {
    let params = new HttpParams()
      .set('standardId', String(standardId))
      .set('section', section)
      .set('academicYear', academicYear);
    if (schoolId) params = params.set('schoolId', String(schoolId));
    return this.http.get<NextRollNumberResponse>(`${this.apiUrl}/api/management/students/next-roll-number`, { params });
  }

  enrollStudent(request: StudentEnrollmentRequest): Observable<{ id: string | number; username: string; tempPassword?: string }> {
    return this.http.post<{ id: string | number; username: string; tempPassword?: string }>(
      `${this.apiUrl}/api/management/students`,
      request
    );
  }

  updateStudent(id: string | number, request: StudentUpdateRequest, schoolId?: string | number): Observable<StudentEnrollmentResponse> {
    let params = new HttpParams();
    if (schoolId) params = params.set('schoolId', String(schoolId));
    return this.http.put<StudentEnrollmentResponse>(
      `${this.apiUrl}/api/management/students/${encodeURIComponent(String(id))}`,
      request,
      { params }
    );
  }

  bulkEnrollStudents(formData: FormData): Observable<BulkEnrollmentResult> {
    return this.http.post<BulkEnrollmentResult>(`${this.apiUrl}/api/management/students/bulk-upload`, formData);
  }

  resetStudentPassword(id: string | number, newPassword?: string): Observable<{ message: string; tempPassword?: string }> {
    return this.http.post<{ message: string; tempPassword?: string }>(
      `${this.apiUrl}/api/management/students/${encodeURIComponent(String(id))}/reset-password`,
      { newPassword }
    );
  }

  deleteStudent(id: string | number, schoolId?: string | number): Observable<void> {
    let params = new HttpParams();
    if (schoolId) params = params.set('schoolId', String(schoolId));
    return this.http.delete<void>(
      `${this.apiUrl}/api/management/students/${encodeURIComponent(String(id))}`,
      { params }
    );
  }

  // Parent Management (1:N Siblings, IDOR Key, Admin Edit)
  getParentProfile(parentPhone: string, schoolId?: string | number): Observable<ParentProfileResponse> {
    let params = new HttpParams();
    if (schoolId) params = params.set('schoolId', String(schoolId));
    return this.http.get<ParentProfileResponse>(
      `${this.apiUrl}/api/management/parents/${encodeURIComponent(parentPhone)}`,
      { params }
    );
  }

  updateParentProfile(parentPhone: string, request: ParentUpdateRequest): Observable<ParentProfileResponse> {
    return this.http.put<ParentProfileResponse>(
      `${this.apiUrl}/api/management/parents/${encodeURIComponent(parentPhone)}`,
      request
    );
  }

  linkSiblingToParent(parentPhone: string, studentId: string | number, schoolId?: string | number): Observable<ParentProfileResponse> {
    return this.http.post<ParentProfileResponse>(
      `${this.apiUrl}/api/management/parents/${encodeURIComponent(parentPhone)}/link-student`,
      { studentId, schoolId }
    );
  }

  unlinkSiblingFromParent(parentPhone: string, studentId: string | number, schoolId?: string | number): Observable<ParentProfileResponse> {
    return this.http.post<ParentProfileResponse>(
      `${this.apiUrl}/api/management/parents/${encodeURIComponent(parentPhone)}/unlink-student`,
      { studentId, schoolId }
    );
  }

  // Grading Policy
  getGradingPolicy(schoolId: string | number): Observable<GradingPolicyResponse> {
    const params = new HttpParams().set('schoolId', String(schoolId));
    return this.http.get<GradingPolicyResponse>(`${this.apiUrl}/api/management/grading-policy`, { params });
  }

  updateGradingPolicy(schoolId: string | number, request: UpdateGradingPolicyRequest): Observable<GradingPolicyResponse> {
    const params = new HttpParams().set('schoolId', String(schoolId));
    return this.http.put<GradingPolicyResponse>(`${this.apiUrl}/api/management/grading-policy`, request, { params });
  }

  // Academic Performance & System Analytics (Phase 10A & 10C)
  getSchoolOverview(schoolId?: string | number): Observable<SchoolOverviewResponse> {
    let params = new HttpParams();
    if (schoolId) params = params.set('schoolId', String(schoolId));
    return this.http.get<SchoolOverviewResponse>(`${this.apiUrl}/api/management/analytics/school-summary`, { params });
  }

  getStandardAnalytics(standardId: string): Observable<StandardAnalyticsResponse> {
    return this.http.get<StandardAnalyticsResponse>(`${this.apiUrl}/api/management/analytics/standards/${encodeURIComponent(standardId)}`);
  }

  getSectionAnalytics(standardId: string, section: string): Observable<SectionAnalyticsResponse> {
    return this.http.get<SectionAnalyticsResponse>(`${this.apiUrl}/api/management/analytics/standards/${encodeURIComponent(standardId)}/sections/${encodeURIComponent(section)}`);
  }

  getSubjectAnalytics(standardId: string, subjectId: string): Observable<SubjectAnalyticsResponse> {
    return this.http.get<SubjectAnalyticsResponse>(`${this.apiUrl}/api/management/analytics/standards/${encodeURIComponent(standardId)}/subjects/${encodeURIComponent(subjectId)}`);
  }

  // Async Ingestion Pipeline (Invariant I5)
  startIngestion(request: IngestionRequest): Observable<IngestionJobResponse> {
    return this.http.post<IngestionJobResponse>(`${this.apiUrl}/api/ingestion`, request);
  }

  getIngestionJob(jobId: string): Observable<IngestionJobResponse> {
    return this.http.get<IngestionJobResponse>(`${this.apiUrl}/api/ingestion/${encodeURIComponent(jobId)}`);
  }

  listIngestionJobs(schoolCode?: string, status?: string): Observable<IngestionJobResponse[]> {
    let params = new HttpParams();
    if (schoolCode) params = params.set('schoolCode', schoolCode);
    if (status) params = params.set('status', status);
    return this.http.get<IngestionJobResponse[]>(`${this.apiUrl}/api/ingestion`, { params });
  }

  getIngestionStatusByFile(fileId: string | number): Observable<IngestionJobResponse> {
    return this.http.get<IngestionJobResponse>(`${this.apiUrl}/api/ingestion/status/${encodeURIComponent(String(fileId))}`);
  }

  retryIngestion(fileId: string | number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/api/ingestion/retry/${encodeURIComponent(String(fileId))}`, {});
  }
}
