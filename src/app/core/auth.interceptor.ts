import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from './api.config';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!req.url.startsWith(API_URL) || req.headers.has('Authorization')) {
        return next(req);
    }

    const token = auth.getToken();
    const peticion = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;

    return next(peticion).pipe(
        catchError((err: HttpErrorResponse) => {
            if (err.status === 401 && !req.url.includes('/auth/login')) {
                auth.logout();
                router.navigate(['/auth']);
            }
            return throwError(() => err);
        })
    );
};