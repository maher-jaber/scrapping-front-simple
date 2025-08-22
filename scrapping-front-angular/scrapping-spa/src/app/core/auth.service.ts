import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap, catchError, throwError, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl;
  private accessKey = 'access_token';
  private refreshKey = 'refresh_token';

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string) {
    const body = new URLSearchParams();
    body.set('username', username);
    body.set('password', password);

    return this.http.post<any>(`${this.api}/token`, body.toString(), {
      headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
    }).pipe(tap(tokens => this.storeTokens(tokens)));
  }

  register(username: string, password: string) {
    return this.http.post(`${this.api}/register`, { username, password });
  }

  refresh(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    console.log(refreshToken+"eeeeee")
    if (!refreshToken) return throwError(() => 'No refresh token');

    return this.http.post<any>(`${this.api}/refresh`, {}, {
      headers: new HttpHeaders({ Authorization: `Bearer ${refreshToken}` })
    }).pipe(
      tap(res => localStorage.setItem(this.accessKey, res.access_token)),
      catchError(err => {
        // Si le refresh échoue, logout et redirige
        console.log(err)
        this.logoutAndRedirect();
        return throwError(() => err);
      })
    );
  }

  logout() {
    const token = this.getAccessToken();
    localStorage.removeItem(this.accessKey);
    localStorage.removeItem(this.refreshKey);
    return this.http.post(`${this.api}/logout`, {}, {
      headers: token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined
    });
  }

  logoutAndRedirect() {
    this.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']) // même en cas d'erreur
    });
  }

  storeTokens(tokens: { access_token: string; refresh_token?: string }) {
    localStorage.setItem(this.accessKey, tokens.access_token);
    if (tokens.refresh_token) localStorage.setItem(this.refreshKey, tokens.refresh_token);
  }

  getAccessToken() { return localStorage.getItem(this.accessKey); }
  getRefreshToken() { return localStorage.getItem(this.refreshKey); }
  isLoggedIn(): boolean { return !!this.getAccessToken(); }
}
