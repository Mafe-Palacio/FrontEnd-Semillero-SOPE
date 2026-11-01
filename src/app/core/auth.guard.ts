import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Exige sesión iniciada; si no, manda al login. */
export const authGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return auth.isLoggedIn() ? true : router.createUrlTree(['/auth']);
};

/** Exige rol ADMIN o SUPERADMIN; un usuario común vuelve al catálogo. */
export const adminGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isLoggedIn()) return router.createUrlTree(['/auth']);
    return auth.isAdmin() ? true : router.createUrlTree(['/catalogo']);
};
