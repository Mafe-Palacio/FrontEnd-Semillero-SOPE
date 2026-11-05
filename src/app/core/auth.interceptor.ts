import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, shareReplay, switchMap, throwError } from 'rxjs';
import { API_URL } from './api.config';
import { AuthService } from './auth.service';
import { SedeAdminService } from './sede-admin.service';

let refrescando$: Observable<string> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const sedeAdmin = inject(SedeAdminService);

    const baseLimpia = API_URL.replace(/\/+$/, '');
    const esApi =
        req.url.startsWith(baseLimpia) ||
        req.url.includes('ngrok') ||
        req.url.includes('localhost:8000') ||
        req.url.includes('127.0.0.1:8000');
    const esLogout = req.url.includes('/auth/logout');
    const esAuth = req.url.includes('/auth/') && !esLogout;
    const esPublico = req.url.includes('/catalogo') || req.url.includes('/buscar');

    const preparar = (r: HttpRequest<unknown>, token: string | null) => {
        if (!esApi) return r;
        let headers = r.headers.set('ngrok-skip-browser-warning', 'true');
        if (token && (!esAuth || esLogout)) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }
        const activeSedeId = sedeAdmin.selectedSedeId();
        if (activeSedeId && !esAuth && !esLogout && auth.isSuperAdmin()) {
            headers = headers.set('X-Sede-Id', activeSedeId);
        }
        return r.clone({ headers });
    };

    const cerrarSesion = () => {
        auth.logout();
        router.navigate(['/auth']);
    };

    return next(preparar(req, auth.getToken())).pipe(
        catchError((err: HttpErrorResponse) => {
            if (err.status !== 401 || !esApi || esAuth || esLogout || esPublico) {
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
