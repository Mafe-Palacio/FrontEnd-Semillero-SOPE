import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from './api.config';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    let headers = req.headers;
    if (req.url.startsWith(API_URL) || req.url.includes('ngrok')) {
        headers = headers.set('ngrok-skip-browser-warning', 'true');
    }

    const token = auth.getToken();
    if (token && !headers.has('Authorization') && (req.url.startsWith(API_URL) || req.url.includes('ngrok'))) {
        headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const peticion = req.clone({ headers });

    return next(peticion).pipe(
        catchError((err: HttpErrorResponse) => {
            const isPublicEndpoint =
                req.url.includes('/catalogo') ||
                req.url.includes('/buscar') ||
                req.url.includes('/publicaciones-encontradas') ||
                req.url.includes('/auth/login');

            if (err.status === 401 && !isPublicEndpoint && auth.isLoggedIn()) {
                auth.logout();
                router.navigate(['/auth']);
            }
            return throwError(() => err);
        })
    );
};