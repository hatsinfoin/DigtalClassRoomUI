import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import {
  AcademicYearResponse,
  AcademicYearRequest,
  StandardResponse,
  StandardRequest,
  SubjectResponse,
  SubjectRequest,
  LessonResponse,
  LessonRequest,
  ContentUnitResponse,
  ContentChunkResponse,
  SchoolResponse
} from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AcademicService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private apiUrl = environment.apiUrl;

  // School
  getSchool(schoolId: string | number): Observable<SchoolResponse> {
    return this.http.get<SchoolResponse>(`${this.apiUrl}/api/schools/${schoolId}`);
  }

  // Academic Years
  getAcademicYears(schoolId?: string | number): Observable<AcademicYearResponse[]> {
    const sId = schoolId || this.auth.currentUser()?.schoolId;
    let params = new HttpParams();
    if (sId) params = params.set('schoolId', String(sId));
    return this.http.get<AcademicYearResponse[]>(`${this.apiUrl}/api/academic/years`, { params });
  }

  createAcademicYear(request: AcademicYearRequest): Observable<AcademicYearResponse> {
    return this.http.post<AcademicYearResponse>(`${this.apiUrl}/api/academic/years`, request);
  }

  updateAcademicYear(id: string | number, request: Partial<AcademicYearRequest>): Observable<AcademicYearResponse> {
    return this.http.put<AcademicYearResponse>(`${this.apiUrl}/api/academic/years/${encodeURIComponent(String(id))}`, request);
  }

  setActiveAcademicYear(id: string | number, schoolId?: string | number): Observable<AcademicYearResponse> {
    let params = new HttpParams();
    if (schoolId) params = params.set('schoolId', String(schoolId));
    return this.http.put<AcademicYearResponse>(`${this.apiUrl}/api/academic/years/${encodeURIComponent(String(id))}/set-active`, {}, { params });
  }

  // Standards
  getStandards(schoolId?: string | number, academicYearId?: string | number): Observable<StandardResponse[]> {
    const sId = schoolId || this.auth.currentUser()?.schoolId;
    let params = new HttpParams();
    if (sId) params = params.set('schoolId', String(sId));
    if (academicYearId) params = params.set('academicYearId', String(academicYearId));
    return this.http.get<StandardResponse[]>(`${this.apiUrl}/api/academic/standards`, { params });
  }

  getStandard(standardId: string | number): Observable<StandardResponse> {
    return this.http.get<StandardResponse>(`${this.apiUrl}/api/academic/standards/${standardId}`);
  }

  createStandard(request: StandardRequest): Observable<StandardResponse> {
    return this.http.post<StandardResponse>(`${this.apiUrl}/api/academic/standards`, request);
  }

  updateStandard(standardId: string | number, request: StandardRequest): Observable<StandardResponse> {
    return this.http.put<StandardResponse>(`${this.apiUrl}/api/academic/standards/${standardId}`, request);
  }

  deleteStandard(standardId: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/academic/standards/${standardId}`);
  }

  // Subjects
  getSubjects(schoolId?: string | number, standardId?: string | number): Observable<SubjectResponse[]> {
    const user = this.auth.currentUser();
    const sId = schoolId || user?.schoolId;
    const stdId = standardId || user?.standardId;

    let params = new HttpParams();
    if (sId) params = params.set('schoolId', String(sId));
    if (stdId) params = params.set('standardId', String(stdId));

    if (!sId) {
      console.warn('[AcademicService] getSubjects: schoolId is missing. Skipping API call to prevent HTTP 400.');
      return of([]);
    }

    return this.http.get<SubjectResponse[]>(`${this.apiUrl}/api/academic/subjects`, { params });
  }

  createSubject(request: SubjectRequest): Observable<SubjectResponse> {
    return this.http.post<SubjectResponse>(`${this.apiUrl}/api/academic/subjects`, request);
  }

  updateSubject(id: string | number, request: Partial<SubjectRequest>): Observable<SubjectResponse> {
    return this.http.put<SubjectResponse>(`${this.apiUrl}/api/academic/subjects/${encodeURIComponent(String(id))}`, request);
  }

  deleteSubject(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/academic/subjects/${encodeURIComponent(String(id))}`);
  }

  // Lessons
  getLessons(schoolId?: string | number, subjectId?: string | number): Observable<LessonResponse[]> {
    const sId = schoolId || this.auth.currentUser()?.schoolId;
    if (!sId || !subjectId) {
      return of([]);
    }
    const params = new HttpParams()
      .set('schoolId', String(sId))
      .set('subjectId', String(subjectId));
    return this.http.get<LessonResponse[]>(`${this.apiUrl}/api/lessons`, { params });
  }

  getLesson(lessonId: string | number): Observable<LessonResponse> {
    return this.http.get<LessonResponse>(`${this.apiUrl}/api/lessons/${lessonId}`);
  }

  createLesson(request: LessonRequest): Observable<LessonResponse> {
    return this.http.post<LessonResponse>(`${this.apiUrl}/api/lessons`, request);
  }

  updateLesson(id: string | number, request: Partial<LessonRequest>): Observable<LessonResponse> {
    return this.http.put<LessonResponse>(`${this.apiUrl}/api/lessons/${encodeURIComponent(String(id))}`, request);
  }

  deleteLesson(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/lessons/${encodeURIComponent(String(id))}`);
  }

  getContentUnits(lessonId: string | number, schoolId?: string | number, language?: string): Observable<ContentUnitResponse[]> {
    let params = new HttpParams();
    if (schoolId) params = params.set('schoolId', String(schoolId));
    if (language) params = params.set('language', language);
    return this.http.get<ContentUnitResponse[]>(`${this.apiUrl}/api/lessons/${lessonId}/content-units`, { params });
  }

  getContentChunks(lessonId: string | number, schoolId?: string | number, language?: string): Observable<ContentChunkResponse[]> {
    let params = new HttpParams();
    if (schoolId) params = params.set('schoolId', String(schoolId));
    if (language) params = params.set('language', language);
    return this.http.get<ContentChunkResponse[]>(`${this.apiUrl}/api/lessons/${lessonId}/chunks`, { params });
  }
}
