import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, shareReplay, switchMap, throwError } from 'rxjs';
import { API_URL } from './api.config';
import { AuthService } from './auth.service';

let refrescando$: Observable<string> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const esApi = req.url.startsWith(API_URL) || req.url.includes('ngrok');
    const esAuth = req.url.includes('/auth/');
    const esPublico = req.url.includes('/catalogo') || req.url.includes('/buscar');

    const preparar = (r: HttpRequest<unknown>, token: string | null) => {
        if (!esApi) return r;
        let headers = r.headers.set('ngrok-skip-browser-warning', 'true');
        if (token && !esAuth) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }
        return r.clone({ headers });
    };

    const cerrarSesion = () => {
        auth.logout();
        router.navigate(['/auth']);
    };

    return next(preparar(req, auth.getToken())).pipe(
        catchError((err: HttpErrorResponse) => {
            if (err.status !== 401 || !esApi || esAuth || esPublico) {
                return throwError(() => err);
            }

            if (!auth.getRefreshToken()) {
                if (auth.isLoggedIn()) cerrarSesion();
                return throwError(() => err);
            }

            if (!refrescando$) {
                refrescando$ = auth.refresh().pipe(
                    map((res) => res.access_token),
                    finalize(() => (refrescando$ = null)),
                    shareReplay(1)
                );
            }

            return refrescando$.pipe(
                catchError((e) => {
                    cerrarSesion();
                    return throwError(() => e);
                }),
                switchMap((token) => next(preparar(req, token)))
            );
        })
    );
};