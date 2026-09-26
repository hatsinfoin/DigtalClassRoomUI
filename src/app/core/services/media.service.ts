import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';
import { MediaResourceResponse } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);
  private apiUrl = environment.apiUrl;

  // Active object URLs to revoke on component destroy
  private activeObjectUrls = new Map<string, string>();

  /**
   * Loads media file per Invariant I7:
   * First checks IndexedDB media-blobs store. If cached, creates Object URL.
   * If not cached, fetches blob via HTTP (JwtInterceptor sets responseType='blob'),
   * saves to IndexedDB media-blobs for offline access, and returns Object URL.
   */
  getMediaStreamUrl(resourceId: string): Observable<string> {
    // If we already have a created Object URL in memory, return it
    const existing = this.activeObjectUrls.get(resourceId);
    if (existing) {
      return of(existing);
    }

    return from(this.storage.getMediaBlob(resourceId)).pipe(
      switchMap((cachedBlob) => {
        if (cachedBlob) {
          const url = URL.createObjectURL(cachedBlob);
          this.activeObjectUrls.set(resourceId, url);
          return of(url);
        }

        // Fetch from backend
        return this.http.get(`${this.apiUrl}/api/media/${resourceId}/file`, { responseType: 'blob' }).pipe(
          tap((blob) => {
            // Save to offline storage
            this.storage.putMediaBlob(resourceId, blob).catch((err: unknown) => {
              console.warn('Failed to cache media blob to IndexedDB', err);
            });
          }),
          switchMap((blob) => {
            const url = URL.createObjectURL(blob);
            this.activeObjectUrls.set(resourceId, url);
            return of(url);
          })
        );
      })
    );
  }

  /**
   * Revokes Object URL to prevent memory leaks (Invariant I7).
   */
  revokeMediaUrl(resourceId: string): void {
    const url = this.activeObjectUrls.get(resourceId);
    if (url) {
      URL.revokeObjectURL(url);
      this.activeObjectUrls.delete(resourceId);
    }
  }

  // Media listing endpoints
  getSubjectMedia(schoolId: string, aYrId: string, stdId: string, subjId: string): Observable<MediaResourceResponse[]> {
    return this.http.get<MediaResourceResponse[]>(`${this.apiUrl}/api/media/subject/${schoolId}/${aYrId}/${stdId}/${subjId}`);
  }

  getLessonMedia(schoolId: string, aYrId: string, stdId: string, subjId: string, lessonId: string): Observable<MediaResourceResponse[]> {
    return this.http.get<MediaResourceResponse[]>(`${this.apiUrl}/api/media/lesson/${schoolId}/${aYrId}/${stdId}/${subjId}/${lessonId}`);
  }

  uploadMedia(formData: FormData): Observable<MediaResourceResponse> {
    return this.http.post<MediaResourceResponse>(`${this.apiUrl}/api/media`, formData);
  }
}
