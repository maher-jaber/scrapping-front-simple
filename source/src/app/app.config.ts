import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { TokenInterceptor } from './core/token.interceptor';
import {  withHashLocation } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes, withHashLocation()),provideZoneChangeDetection({ eventCoalescing: true }), provideHttpClient(), { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true } ]
};
