import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, switchMap, from } from 'rxjs';
import { AuthService } from '../services/auth.service';

const MEDIA_BLOB_PATTERN = /\/api\/media\/\d+\/file/;

/**
 * JwtInterceptor — Adds Authorization header to all API requests.
 * For binary media endpoints (Invariant I7), response is handled as blob
 * and the caller converts to Object URL via URL.createObjectURL().
 */
export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  if (!token) return next(req);

  // For media streaming endpoints — request blob response type
  const isMediaEndpoint = MEDIA_BLOB_PATTERN.test(req.url);

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
    ...(isMediaEndpoint && { responseType: 'blob' as const })
  });

  return next(authReq);
};
