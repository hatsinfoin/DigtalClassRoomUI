import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  APP_INITIALIZER
} from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules, RouteReuseStrategy } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideIonicAngular, IonicRouteStrategy } from '@ionic/angular';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { loggingInterceptor } from './core/interceptors/logging.interceptor';
import { offlineInterceptor } from './core/interceptors/offline.interceptor';

function initializeApp(auth: AuthService) {
  return () => {
    if (auth.isAuthenticated()) {
      return auth.fetchProfile().pipe(catchError(() => of(null)));
    }
    return of(null);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({ mode: 'md', animated: true }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(
      withInterceptors([jwtInterceptor, loggingInterceptor, offlineInterceptor])
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true
    }
  ]
};
