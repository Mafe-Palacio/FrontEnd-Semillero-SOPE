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
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';

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
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: {
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        duration: 4500
      }
    },

    provideApi({
      basePath: API_URL,
      accessToken: () =>
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('access_token') ?? ''
          : ''
    })
  ]
};
