import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ScrapingComponent } from './scraping/scraping.component';
import { AuthGuard } from './core/auth.guard';
import { HistoriqueComponent } from './historique/historique.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent, canActivate: [AuthGuard] },
    { path: 'scraping', component: ScrapingComponent, canActivate: [AuthGuard] },
    { path: 'historique', component: HistoriqueComponent, canActivate: [AuthGuard] },
    { path: '', redirectTo: 'scraping', pathMatch: 'full' },
    { path: '**', redirectTo: 'scraping' }


];
