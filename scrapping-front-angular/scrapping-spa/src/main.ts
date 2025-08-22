import { bootstrapApplication } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { TokenInterceptor } from './app/core/token.interceptor';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';


bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()), // ⚡ essentiel pour que les interceptors fonctionnent
    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true },
  ]
});
