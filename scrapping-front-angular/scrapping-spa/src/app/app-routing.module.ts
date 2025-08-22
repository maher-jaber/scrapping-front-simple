import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ScrapingComponent } from './scraping/scraping.component';
import { HistoriqueComponent } from './historique/historique.component';
import { AuthGuard } from './core/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'scraping', component: ScrapingComponent, canActivate: [AuthGuard] },
  { path: 'historique', component: HistoriqueComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: 'scraping', pathMatch: 'full' },
  { path: '**', redirectTo: 'scraping' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
