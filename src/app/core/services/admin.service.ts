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
  BulkEnrollmentResult,
  GradingPolicyResponse,
  UpdateGradingPolicyRequest,
  IngestionRequest,
  IngestionJobResponse
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
    return this.http.get<SchoolResponse>(`${this.apiUrl}/api/schools/${id}`);
  }

  getSchoolByCode(code: string): Observable<SchoolResponse> {
    return this.http.get<SchoolResponse>(`${this.apiUrl}/api/schools/code/${code}`);
  }

  createSchool(request: SchoolRequest): Observable<SchoolResponse> {
    return this.http.post<SchoolResponse>(`${this.apiUrl}/api/schools`, request);
  }

  updateSchool(id: string | number, request: SchoolUpdateRequest): Observable<SchoolResponse> {
    return this.http.put<SchoolResponse>(`${this.apiUrl}/api/schools/${id}`, request);
  }

  deleteSchool(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/schools/${id}`);
  }

  // Student Admissions
  enrollStudent(request: StudentEnrollmentRequest): Observable<{ id: string | number; username: string; tempPassword?: string }> {
    return this.http.post<{ id: string | number; username: string; tempPassword?: string }>(
      `${this.apiUrl}/api/management/students`,
      request
    );
  }

  bulkEnrollStudents(formData: FormData): Observable<BulkEnrollmentResult> {
    return this.http.post<BulkEnrollmentResult>(`${this.apiUrl}/api/management/students/bulk-upload`, formData);
  }

  resetStudentPassword(id: string | number, newPassword?: string): Observable<{ message: string; tempPassword?: string }> {
    return this.http.post<{ message: string; tempPassword?: string }>(
      `${this.apiUrl}/api/management/students/${id}/reset-password`,
      { newPassword }
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

  // Async Ingestion Pipeline (Invariant I5)
  startIngestion(request: IngestionRequest): Observable<IngestionJobResponse> {
    return this.http.post<IngestionJobResponse>(`${this.apiUrl}/api/ingestion`, request);
  }

  getIngestionJob(jobId: string): Observable<IngestionJobResponse> {
    return this.http.get<IngestionJobResponse>(`${this.apiUrl}/api/ingestion/${jobId}`);
  }

  listIngestionJobs(schoolCode?: string, status?: string): Observable<IngestionJobResponse[]> {
    let params = new HttpParams();
    if (schoolCode) params = params.set('schoolCode', schoolCode);
    if (status) params = params.set('status', status);
    return this.http.get<IngestionJobResponse[]>(`${this.apiUrl}/api/ingestion`, { params });
  }

  getIngestionStatusByFile(fileId: string | number): Observable<IngestionJobResponse> {
    return this.http.get<IngestionJobResponse>(`${this.apiUrl}/api/ingestion/status/${fileId}`);
  }

  retryIngestion(fileId: string | number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/api/ingestion/retry/${fileId}`, {});
  }
}
