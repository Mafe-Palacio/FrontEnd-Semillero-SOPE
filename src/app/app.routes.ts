import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/auth.guard';

export const routes: Routes = [
    {
        // Muro y Catálogo Público (HU01, HU08, HU21, HU22)
        // Permite acceso público a la comunidad ITM; la autenticación se exige al reclamar o gestionar.
        path: 'catalogo',
        loadComponent: () => import('./features/catalogo-publico/catalogo.component').then(m => m.CatalogoComponent)
    },
    {
        // Ruta pública para el Login/Registro
        path: 'auth',
        loadChildren: () => import('./features/auth/auth-module').then(m => m.AuthModule)
    },
    {
        // Panel administrativo: solo ADMIN / SUPERADMIN
        path: 'admin',
        canActivate: [adminGuard],
        loadChildren: () => import('./features/admin/admin-module').then(m => m.AdminModule)
    },
    {
        // Módulo de Reportes: exige sesión activa
        path: 'reportes',
        canActivate: [authGuard],
        loadChildren: () => import('./features/reportes/reportes-module').then(m => m.ReportesModule)
    },
    {
        // Módulo de Reclamaciones: exige sesión activa
        path: 'reclamaciones',
        canActivate: [authGuard],
        loadChildren: () => import('./features/reclamaciones/reclamaciones-module').then(m => m.ReclamacionesModule)
    },
    {
        // Perfil Institucional del usuario: exige sesión activa
        path: 'perfil',
        canActivate: [authGuard],
        loadComponent: () => import('./features/perfil/perfil.component').then(m => m.PerfilComponent)
    },

    {
        // Por defecto redirige al catálogo público
        path: '',
        redirectTo: 'catalogo',
        pathMatch: 'full'
    },
    {
        // Si ingresan una URL inexistente, redirige al catálogo
        path: '**',
        redirectTo: 'catalogo'
    }
];