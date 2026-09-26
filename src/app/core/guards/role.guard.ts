import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/models';

/** RoleGuard — checks route.data['roles'] against authenticated user's role */
export const RoleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowedRoles: string[] = (route.data['roles'] ?? []).map((r: string) =>
    r.startsWith('ROLE_') ? r.substring(5) : r
  );
  const rawRole = auth.currentUser()?.role;
  console.log('[RoleGuard] Checking route access. Allowed roles:', allowedRoles, 'Current user raw role:', rawRole);

  if (rawRole) {
    const normalizedRole = rawRole.startsWith('ROLE_') ? rawRole.substring(5) : rawRole;
    if (allowedRoles.includes(rawRole) || allowedRoles.includes(normalizedRole)) {
      console.log('[RoleGuard] Access GRANTED for role:', normalizedRole);
      return true;
    }
  }
  console.warn('[RoleGuard] Access DENIED for role:', rawRole, '-> Redirecting to /login');
  return router.createUrlTree(['/login']);
};
