import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, switchMap, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LoginRequest, AuthResponse, UserProfileResponse,
  ChangePasswordRequest, UserRole, AgeGroup, resolveAgeGroup
} from '../models/models';

const TOKEN_KEY = 'dcr_token';
const USER_KEY  = 'dcr_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // Reactive signals for current user state
  private _user = signal<UserProfileResponse | null>(this.loadUser());
  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  // Public computed signals
  readonly currentUser   = this._user.asReadonly();
  readonly isLoggedIn    = computed(() => !!this._token());
  readonly userRole      = computed(() => this._user()?.role as UserRole | undefined);
  readonly ageGroup      = computed<AgeGroup>(() => {
    try {
      const user = this._user();
      if (!user) return 'middle';
      const std = user.standardId;
      if (!std) return 'middle';
      const num = Number(std);
      if (!isNaN(num) && num >= 1 && num <= 12) {
        return resolveAgeGroup(num);
      }
      return 'middle';
    } catch {
      return 'middle';
    }
  });

  /** Map of standardId → standardNumber (populated after login) */
  private standardNumberMap: Record<number, number> = {};

  // ────────────────────────────────────────────────
  // AUTH API CALLS
  // ────────────────────────────────────────────────
  login(req: LoginRequest): Observable<UserProfileResponse> {
    console.log('[AuthService] Sending POST /api/auth/login with username:', req.username);
    return this.http.post<AuthResponse>(`${this.base}/api/auth/login`, req).pipe(
      tap((res: AuthResponse) => {
        console.log('[AuthService] Received response from /api/auth/login:', res.token ? '(token received)' : '(empty token)');
        this.setToken(res.token);
        if (res.profile) {
          console.log('[AuthService] Embedded profile found in login response:', res.profile);
          this.setUser(res.profile);
        }
      }),
      switchMap((res: AuthResponse) => {
        if (res.profile) {
          return of(this._user()!);
        }
        console.log('[AuthService] No embedded profile in login response, fetching /api/auth/me...');
        return this.fetchProfile();
      })
    );
  }

  fetchProfile(): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(`${this.base}/api/auth/me`).pipe(
      tap((profile: UserProfileResponse) => {
        console.log('[AuthService] Profile fetched from /api/auth/me:', profile);
        this.setUser(profile);
      })
    );
  }

  getCurrentProfile(): UserProfileResponse | null {
    return this._user();
  }

  changePassword(req: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/api/auth/change-password`, req);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
  }

  // ────────────────────────────────────────────────
  // HELPERS
  // ────────────────────────────────────────────────
  isAuthenticated(): boolean {
    const token = this._token();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  }

  getToken(): string | null {
    return this._token();
  }

  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this._token.set(token);
  }

  private setUser(user: any): void {
    if (!user) return;
    if (user.role && typeof user.role === 'string' && (user.role as string).startsWith('ROLE_')) {
      user.role = (user.role as string).substring(5) as UserRole;
    }
    if (!user.schoolId && user.school?.id) {
      user.schoolId = user.school.id;
    }
    if (!user.schoolId && user.school_id) {
      user.schoolId = user.school_id;
    }
    if (!user.standardId && user.standard?.id) {
      user.standardId = user.standard.id;
    }
    if (!user.standardId && user.standard_id) {
      user.standardId = user.standard_id;
    }
    console.log('[AuthService] Storing user in localStorage & signal:', user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._user.set(user as UserProfileResponse);
  }

  private loadUser(): UserProfileResponse | null {
    const stored = localStorage.getItem(USER_KEY);
    if (!stored) return null;
    try { return JSON.parse(stored); } catch { return null; }
  }
}

// Fix: Angular inject() must be called directly, not stored
// Remove the inject re-export above
