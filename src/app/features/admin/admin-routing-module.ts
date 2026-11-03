import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout.component';

const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'aprobaciones',
        loadComponent: () => import('./aprobaciones/admin-aprobaciones.component').then(m => m.AdminAprobacionesComponent)
      },
      {
        path: 'custodia',
        loadComponent: () => import('./custodia/admin-custodia.component').then(m => m.AdminCustodiaComponent)
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./usuarios/admin-usuarios.component').then(m => m.AdminUsuariosComponent)
      },
      {
        path: 'auditoria',
        loadComponent: () => import('./auditoria/admin-auditoria.component').then(m => m.AdminAuditoriaComponent)
      },
      {
        path: 'reportes',
        loadComponent: () => import('./reportes/admin-reportes.component').then(m => m.AdminReportesComponent)
      },
      {
        path: 'reportes-exportacion',
        redirectTo: 'reportes',
        pathMatch: 'full'
      },
      {
        path: 'sedes',
        loadComponent: () => import('./sedes/admin-sedes.component').then(m => m.AdminSedesComponent)
      },
      {
        path: 'gestion-sedes',
        redirectTo: 'sedes',
        pathMatch: 'full'
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
