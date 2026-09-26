import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';

let requestCounter = 0;

/**
 * LoggingInterceptor — Logs detailed information for all outgoing HTTP requests
 * and incoming HTTP responses/errors:
 * - Request Method, Full URL & Query Params
 * - Request Payload / Body (Input)
 * - Response Status, Execution Time & Payload (Response)
 * - Error Status & Error Response Body
 */
export const loggingInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const reqId = ++requestCounter;
  const startTime = performance.now();

  const queryParamsObj: Record<string, string | string[]> = {};
  req.params.keys().forEach((key) => {
    const values = req.params.getAll(key);
    queryParamsObj[key] = values && values.length === 1 ? values[0] : (values ?? '');
  });

  const hasParams = Object.keys(queryParamsObj).length > 0;
  const hasBody = req.body !== null && req.body !== undefined;

  // Log Outgoing Request
  console.groupCollapsed(
    `%c[HTTP OUT #${reqId}] %c${req.method} %c${req.urlWithParams}`,
    'color: #6C63FF; font-weight: bold;',
    'color: #00D9A3; font-weight: bold;',
    'color: #FFFFFF;'
  );
  console.log('📌 URL:', req.url);
  if (hasParams) {
    console.log('🔍 Query Params:', queryParamsObj);
  }
  if (hasBody) {
    console.log('📦 Request Body (Input):', req.body);
  }
  console.log('🔑 Headers:', req.headers.keys().reduce((acc, key) => {
    acc[key] = req.headers.get(key);
    return acc;
  }, {} as Record<string, string | null>));
  console.groupEnd();

  return next(req).pipe(
    tap({
      next: (event: HttpEvent<unknown>) => {
        if (event instanceof HttpResponse) {
          const duration = Math.round(performance.now() - startTime);
          console.groupCollapsed(
            `%c[HTTP IN #${reqId}] %c${event.status} ${event.statusText || 'OK'} %c(${duration}ms) %c${req.method} ${req.url}`,
            'color: #00D9A3; font-weight: bold;',
            'color: #38EF7D; font-weight: bold;',
            'color: #94A3B8;',
            'color: #FFFFFF;'
          );
          console.log('⏱️ Duration:', `${duration}ms`);
          console.log('📥 Response Body:', event.body);
          console.groupEnd();
        }
      },
      error: (err: HttpErrorResponse) => {
        const duration = Math.round(performance.now() - startTime);
        console.groupCollapsed(
          `%c[HTTP ERROR #${reqId}] %c${err.status} ${err.statusText || 'Error'} %c(${duration}ms) %c${req.method} ${req.url}`,
          'color: #FF6B6B; font-weight: bold;',
          'color: #FF4757; font-weight: bold;',
          'color: #94A3B8;',
          'color: #FFFFFF;'
        );
        console.log('⏱️ Duration:', `${duration}ms`);
        console.log('❌ Error Object:', err);
        console.log('📥 Error Response Body:', err.error);
        console.groupEnd();
      }
    })
  );
};
