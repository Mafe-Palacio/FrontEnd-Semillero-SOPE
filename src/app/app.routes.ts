import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        // Ruta pública para el Login/Registro
        path: 'auth',
        loadChildren: () => import('./features/auth/auth-module').then(m => m.AuthModule)
    },
    {
        // Rutas protegidas (El panel principal)
        path: 'admin',
        loadChildren: () => import('./features/admin/admin-module').then(m => m.AdminModule)
    },
    {
        path: 'reportes',
        loadChildren: () => import('./features/reportes/reportes-module').then(m => m.ReportesModule)
    },
    {
        path: 'reclamaciones',
        loadChildren: () => import('./features/reclamaciones/reclamaciones-module').then(m => m.ReclamacionesModule)
    },
    {
        path: 'chat',
        loadChildren: () => import('./features/chat/chat-module').then(m => m.ChatModule)
    },
    {
        path: 'notificaciones',
        loadChildren: () => import('./features/notificaciones/notificaciones-module').then(m => m.NotificacionesModule)
    },
    {
        // Por defecto redirige al login
        path: '',
        redirectTo: 'auth',
        pathMatch: 'full'
    },
    {
        // Si escriben una URL que no existe, redirige al login
        path: '**',
        redirectTo: 'auth'
    }
];