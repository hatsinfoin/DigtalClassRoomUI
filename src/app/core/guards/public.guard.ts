import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/models';

/** PublicGuard — redirects already-authenticated users to their portal */
export const PublicGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isAuth = auth.isAuthenticated();
  console.log('[PublicGuard] Checking public route access. isAuthenticated:', isAuth);

  if (!isAuth) return true;

  const rawRole = auth.currentUser()?.role as string | undefined;
  const role = rawRole ? (rawRole.startsWith('ROLE_') ? rawRole.substring(5) : rawRole) : '';
  console.log('[PublicGuard] User already authenticated. Role:', role, '-> redirecting to portal');

  const destinations: Record<string, string> = {
    ADMIN:   '/admin',
    TEACHER: '/teacher',
    PARENT:  '/parent',
    STUDENT: '/student',
    USER:    '/student'
  };
  return router.createUrlTree([destinations[role] ?? '/student']);
};
