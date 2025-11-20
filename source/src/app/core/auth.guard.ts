import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
      // 1️⃣ Vérification de connexion
      if (!this.auth.isLoggedIn()) {
        this.router.navigate(['/login']);
        return false;
      }
  
      // 2️⃣ Vérification du rôle
      const roles = route.data['roles'] as Array<string>;
      if (roles && roles.length > 0) {
        const userRole = this.auth.getRole() ?? '';
        if (!roles.includes(userRole)) {
          // Accès refusé → on peut rediriger vers une page d'erreur ou historique
          this.router.navigate(['/historique']);
          return false;
        }
      }
  
      return true;

  }
}
