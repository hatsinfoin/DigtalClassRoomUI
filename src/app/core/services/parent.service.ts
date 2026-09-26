import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ParentChildSummaryResponse,
  ParentChildOverviewResponse,
  StudentPerformanceDossierResponse,
  NoticeResponse,
  LeaveRequestDto,
  ExamHistoryItem
} from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class ParentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Invariant I1: Never cache children client-side, rely strictly on server response
  getChildren(): Observable<ParentChildSummaryResponse[]> {
    return this.http.get<ParentChildSummaryResponse[]>(`${this.apiUrl}/api/parent/children`);
  }

  getChildOverview(studentId: string | number): Observable<ParentChildOverviewResponse> {
    return this.http.get<ParentChildOverviewResponse>(`${this.apiUrl}/api/parent/children/${studentId}/overview`);
  }

  getChildReportCard(studentId: string | number): Observable<StudentPerformanceDossierResponse> {
    return this.http.get<StudentPerformanceDossierResponse>(`${this.apiUrl}/api/parent/children/${studentId}/report-card`);
  }

  // School Notices & Circulars (Gap G2)
  getSchoolNotices(schoolId: string | number): Observable<NoticeResponse[]> {
    const params = new HttpParams().set('schoolId', String(schoolId));
    return this.http.get<NoticeResponse[]>(`${this.apiUrl}/api/school/notices`, { params });
  }

  // Leave Requests (Gap G3)
  submitLeaveRequest(studentId: string | number, request: LeaveRequestDto): Observable<{ message: string; requestId: string }> {
    return this.http.post<{ message: string; requestId: string }>(
      `${this.apiUrl}/api/parent/children/${studentId}/leave-requests`,
      request
    );
  }

  // Exam History (Gap G7)
  getChildExamHistory(studentId: string | number): Observable<ExamHistoryItem[]> {
    return this.http.get<ExamHistoryItem[]>(`${this.apiUrl}/api/parent/children/${studentId}/exam-history`);
  }
}
