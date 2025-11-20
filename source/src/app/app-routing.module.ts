import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { UserManagementComponent } from './auth/user-management/user-management.component';
import { ScrapingComponent } from './scraping/scraping.component';
import { HistoriqueComponent } from './historique/historique.component';
import { AuthGuard } from './core/auth.guard';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';

const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: 'register',
    component: UserManagementComponent,
    canActivate: [AuthGuard],
    data: { roles: ['admin'] }   // Seul admin peut créer des comptes
  },
  {
    path: 'scraping',
    component: ScrapingComponent,
    canActivate: [AuthGuard],
    data: { roles: ['admin', 'supervisor'] } // accessible à admin et supervisor
  },
  {
    path: 'historique',
    component: HistoriqueComponent,
    canActivate: [AuthGuard],
    data: { roles: ['admin', 'supervisor', 'user'] } // accessible à tous les connectés
  },

  { path: '', redirectTo: 'scraping', pathMatch: 'full' },
  { path: '**', redirectTo: 'scraping' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule],
  providers: [{ provide: LocationStrategy, useClass: HashLocationStrategy }]
})
export class AppRoutingModule {}
