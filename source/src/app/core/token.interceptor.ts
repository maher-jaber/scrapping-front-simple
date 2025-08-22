import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getAccessToken();
  
    // Vérifier si c’est l’endpoint de refresh
    const isRefresh = req.url.includes('/refresh');
  
    // N’ajouter le header que si ce n’est pas un refresh
    const authReq = (token && !isRefresh)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;
  
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !isRefresh) {
          // On tente un refresh seulement si ce n’est pas déjà le /refresh
          return this.handle401(authReq, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handle401(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
   
    if (!this.isRefreshing) {
      this.isRefreshing = true;
  
      this.refreshSubject.next(null);

      return this.auth.refresh().pipe(
        switchMap((res: any) => {
          
          this.isRefreshing = false;
          this.refreshSubject.next(res.access_token);
          const retried = req.clone({ setHeaders: { Authorization: `Bearer ${res.access_token}` } });
          return next.handle(retried);
        }),
        catchError(err => {
          this.isRefreshing = false;
          // échec refresh ⇒ déconnexion propre
          this.auth.logout().subscribe({ error: () => {} });
          return throwError(() => err);
        })
      );
    } else {
      // Attendre que le refresh finisse, puis rejouer la requête
      return this.refreshSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => {
          const retried = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
          return next.handle(retried);
        })
      );
    }
  }
}
