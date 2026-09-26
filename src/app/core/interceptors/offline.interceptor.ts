import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, catchError } from 'rxjs';
import { Router } from '@angular/router';

/**
 * OfflineInterceptor — Handles network errors and 401/403 responses.
 * - Network failure → surfaces offline state (caller uses UxState='offline')
 * - 401 → session expired → redirects to /login (Invariant I6)
 * - 403 → no-access state (caller uses UxState='no-access')
 */
export const offlineInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.warn(`[OfflineInterceptor] HTTP Error on [${req.method}] ${req.url}: Status ${error.status} ${error.statusText}`, error);

      if (!navigator.onLine || error.status === 0) {
        console.warn('[OfflineInterceptor] Detected offline / network error (status 0 or navigator.onLine=false)');
        return throwError(() => ({ ...error, isOffline: true }));
      }

      const isAuthLoginEndpoint = req.url.includes('/api/auth/login');
      if (error.status === 401 && !isAuthLoginEndpoint) {
        console.warn('[OfflineInterceptor] 401 on authenticated endpoint. Session expired -> redirecting to /login');
        const currentUrl = router.url;
        router.navigate(['/login'], {
          queryParams: { returnUrl: currentUrl, reason: 'expired' }
        });
      }

      return throwError(() => error);
    })
  );
};
