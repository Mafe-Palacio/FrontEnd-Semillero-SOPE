import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  provideClientHydration,
  withEventReplay
} from '@angular/platform-browser';

import { routes } from './app.routes';
import { provideApi } from './api/provide-api';
import { API_URL } from './core/api.config';
import { authInterceptor } from './core/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),

    provideApi({
      basePath: API_URL,
      accessToken: () =>
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('access_token') ?? ''
          : ''
    })
  ]
};