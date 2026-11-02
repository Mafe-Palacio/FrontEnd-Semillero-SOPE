import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth.service';
import { SedeAdminService } from '../../core/sede-admin.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <div class="admin-shell">
      
      <!-- Menú Lateral Redondeado como Tarjeta Vertical -->
      <aside class="admin-sidebar" [class.sidebar-hidden]="sidebarOculto()">
        
        <div class="sidebar-top">
          <!-- Cabecera del Sidebar: Logo ITM + Título OPE · ITM + Botón Colapsar -->
          <div class="sidebar-header">
            <a routerLink="/admin/dashboard" class="sidebar-brand">
              <img 
                src="/imagenes/LOGO ITM 2020-03.png" 
                alt="Logo ITM" 
                class="sidebar-logo" 
                referrerpolicy="no-referrer" />
              <span class="brand-text">OPE · ITM</span>
            </a>

            <!-- Botón para ocultar/colapsar el sidebar -->
            <button 
              type="button" 
              class="btn-toggle-sidebar" 
              (click)="toggleSidebar()" 
              title="Ocultar menú lateral"
              aria-label="Ocultar menú lateral">
              <mat-icon>menu_open</mat-icon>
            </button>
          </div>

          <!-- Enlaces del Menú -->
          <nav class="sidebar-nav">
            <!-- 1. Dashboard -->
            <a 
              routerLink="/admin/dashboard" 
              routerLinkActive="active" 
              [routerLinkActiveOptions]="{ exact: true }"
              class="nav-item">
              <mat-icon>dashboard</mat-icon>
              <span>Dashboard</span>
            </a>

            <!-- 2. Aprobaciones -->
            <a 
              routerLink="/admin/aprobaciones" 
              routerLinkActive="active"
              class="nav-item">
              <mat-icon>fact_check</mat-icon>
              <span>Aprobaciones</span>
            </a>

            <!-- 3. Custodia -->
            <a 
              routerLink="/admin/custodia" 
              routerLinkActive="active"
              class="nav-item">
              <mat-icon>inventory_2</mat-icon>
              <span>Custodia</span>
            </a>

            <!-- 4. Usuarios -->
            <a 
              routerLink="/admin/usuarios" 
              routerLinkActive="active"
              class="nav-item">
              <mat-icon>manage_accounts</mat-icon>
              <span>Usuarios</span>
            </a>

            <!-- 5. Auditoría -->
            <a 
              routerLink="/admin/auditoria" 
              routerLinkActive="active"
              class="nav-item">
              <mat-icon>policy</mat-icon>
              <span>Auditoría</span>
            </a>

            <!-- 6. Reportes -->
            <a 
              routerLink="/admin/reportes" 
              routerLinkActive="active"
              class="nav-item">
              <mat-icon>table_chart</mat-icon>
              <span>Reportes</span>
            </a>

            <!-- Separador y Módulo SuperAdmin -->
            <hr class="sidebar-divider" />

            <a 
              routerLink="/admin/sedes" 
              routerLinkActive="active"
              class="nav-item">
              <mat-icon>domain_add</mat-icon>
              <span>Sedes y Administradores</span>
            </a>
          </nav>
        </div>

        <!-- Pie del Sidebar: Volver al Catálogo y Cerrar Sesión -->
        <div class="sidebar-footer">
          <a routerLink="/catalogo" class="footer-btn btn-catalog">
            <mat-icon>arrow_back</mat-icon>
            <span>Volver al Catálogo</span>
          </a>

          <button type="button" (click)="logout()" class="footer-btn btn-logout">
            <mat-icon>logout</mat-icon>
            <span>Cerrar Sesión</span>
          </button>
        </div>

      </aside>

      <!-- Área Derecha (Cabecera + Contenido) -->
      <div class="admin-main">
        
        <!-- Barra Superior (Tarjeta Blanca Redondeada) -->
        <header class="admin-topbar">
          <!-- Bloque Izquierdo: Botón Reabrir Menú + Título de Sede -->
          <div class="topbar-left">
            @if (sidebarOculto()) {
              <button 
                type="button" 
                class="btn-open-sidebar" 
                (click)="toggleSidebar()" 
                title="Mostrar menú lateral"
                aria-label="Mostrar menú lateral">
                <mat-icon>menu</mat-icon>
              </button>
            }

            <div class="topbar-title">
              <mat-icon class="title-icon">apartment</mat-icon>
              <span class="title-text">Panel Administrativo · {{ currentSedeNombre() }}</span>
            </div>
          </div>

          <!-- Bloque Derecho: Selector de Sede + Badge de Usuario -->
          <div class="topbar-right">
            @if (isSuperAdmin()) {
              <div class="sede-select-wrapper">
                <select 
                  id="sedeSelectHeader"
                  [value]="selectedSedeId() || ''"
                  (change)="onSedeChange($event)"
                  class="sede-select"
                  aria-label="Conmutar sede activa">
                  <option value="" disabled [selected]="!selectedSedeId()">-- Seleccionar Sede --</option>
                  @for (sede of sedes(); track sede.sede_id) {
                    <option [value]="sede.sede_id">{{ sede.nombre }}</option>
                  }
                </select>
              </div>
            } @else {
              <span class="sede-static-badge">Sede Fraternidad</span>
            }

            <div class="user-pill">
              <mat-icon class="user-icon">account_circle</mat-icon>
              <span class="user-name">{{ userName() }}</span>
              <span class="user-role-badge">{{ userRole() }}</span>
            </div>
          </div>
        </header>

        <!-- Contenedor Principal de la Vista Activa -->
        <main class="admin-content">
          <router-outlet></router-outlet>
        </main>

      </div>

    </div>
  `,
  styles: [`
    .admin-shell {
      display: flex;
      min-height: 100vh;
      background-color: #EEF2F7;
      padding: 16px;
      gap: 20px;
      box-sizing: border-box;
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
    }

    .admin-sidebar {
      width: 260px;
      background-color: #011C5B;
      color: #FFFFFF;
      border-radius: 24px;
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      flex-shrink: 0;
      box-shadow: 0 10px 25px rgba(1, 28, 91, 0.15);
      box-sizing: border-box;
    }

    .admin-sidebar.sidebar-hidden {
      display: none !important;
    }

    .sidebar-top {
      display: flex;
      flex-direction: column;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 28px;
      padding: 0 4px;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #FFFFFF;
      text-decoration: none;
      min-width: 0;
    }

    .sidebar-logo {
      height: 32px;
      width: auto;
      object-fit: contain;
      display: block;
      filter: brightness(0) invert(1);
    }

    .brand-text {
      font-weight: 700;
      font-size: 1.15rem;
      white-space: nowrap;
      letter-spacing: -0.01em;
    }

    .btn-toggle-sidebar {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #FFFFFF;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
      flex-shrink: 0;
    }

    .btn-toggle-sidebar:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .btn-toggle-sidebar:active {
      transform: scale(0.95);
    }

    .btn-toggle-sidebar mat-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
      line-height: 20px !important;
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 14px;
      color: rgba(255, 255, 255, 0.75);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9rem;
      margin-bottom: 4px;
      transition: all 0.2s ease;
      cursor: pointer;
      box-sizing: border-box;
    }

    .nav-item mat-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
      line-height: 20px !important;
      flex-shrink: 0;
      color: inherit;
    }

    .nav-item:hover {
      color: #FFFFFF;
      background-color: rgba(255, 255, 255, 0.1);
    }

    .nav-item.active {
      background-color: #FFFFFF !important;
      color: #011C5B !important;
      font-weight: 700 !important;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
    }

    .nav-item.active mat-icon {
      color: #011C5B !important;
    }

    .sidebar-divider {
      border: 0;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      margin: 14px 4px;
    }

    .sidebar-footer {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
    }

    .footer-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      text-decoration: none;
      transition: all 0.2s ease;
      width: 100%;
      box-sizing: border-box;
    }

    .footer-btn mat-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
      line-height: 18px !important;
      flex-shrink: 0;
    }

    .btn-catalog {
      background: rgba(255, 255, 255, 0.08);
      color: #FFFFFF;
    }

    .btn-catalog:hover {
      background: rgba(255, 255, 255, 0.18);
    }

    .btn-logout {
      background: transparent;
      color: rgba(255, 255, 255, 0.7);
    }

    .btn-logout:hover {
      background: rgba(178, 59, 36, 0.25);
      color: #FFB4A4;
    }

    .admin-main {
      flex: 1;
      width: 100%;
      min-width: 0;
      margin-left: 0;
      display: flex;
      flex-direction: column;
      gap: 20px;
      box-sizing: border-box;
    }

    .admin-topbar {
      height: 64px;
      background-color: #FFFFFF;
      border-radius: 18px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
      border: 1px solid #E5E7EB;
      box-sizing: border-box;
      width: 100%;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      flex: 1 1 auto;
    }

    .btn-open-sidebar {
      background: #011C5B;
      color: #FFFFFF;
      border: none;
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.2s, transform 0.1s;
    }

    .btn-open-sidebar:hover {
      background: #022982;
    }

    .btn-open-sidebar:active {
      transform: scale(0.95);
    }

    .btn-open-sidebar mat-icon {
      font-size: 22px !important;
      width: 22px !important;
      height: 22px !important;
      line-height: 22px !important;
      color: #FFFFFF;
    }

    .topbar-title {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      color: #011C5B;
      font-weight: 700;
      font-size: 1.05rem;
    }

    .title-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
      line-height: 20px !important;
      color: #011C5B;
      flex-shrink: 0;
    }

    .title-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-shrink: 0;
    }

    .sede-select-wrapper {
      position: relative;
    }

    .sede-select {
      background-color: #F8F9FA;
      border: 1px solid #D1D5DB;
      border-radius: 10px;
      padding: 8px 14px;
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      color: #011C5B;
      cursor: pointer;
      outline: none;
      transition: all 0.2s ease;
    }

    .sede-select:focus {
      border-color: #011C5B;
      box-shadow: 0 0 0 3px rgba(1, 28, 91, 0.1);
    }

    .sede-static-badge {
      background-color: #EEF2F7;
      color: #011C5B;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .user-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: #F8F9FA;
      border: 1px solid #E5E7EB;
      padding: 6px 12px;
      border-radius: 9999px;
    }

    .user-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
      line-height: 20px !important;
      color: #011C5B;
    }

    .user-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: #1F2937;
    }

    .user-role-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
      background-color: #011C5B;
      color: #FFFFFF;
      letter-spacing: 0.03em;
    }

    .admin-content {
      flex: 1;
      min-width: 0;
      width: 100%;
    }

    @media (max-width: 900px) {
      .admin-shell {
        flex-direction: column;
        padding: 10px;
      }
      .admin-sidebar {
        width: 100%;
        border-radius: 18px;
      }
      .admin-sidebar.sidebar-hidden {
        display: none !important;
      }
      .admin-topbar {
        padding: 0 16px;
        height: auto;
        min-height: 64px;
        flex-wrap: wrap;
        gap: 12px;
        padding-top: 10px;
        padding-bottom: 10px;
      }
      .topbar-title {
        font-size: 0.9rem;
      }
    }
  `]
})
export class AdminLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private sedeAdmin = inject(SedeAdminService);
  private router = inject(Router);

  sedes = this.sedeAdmin.sedes;
  selectedSedeId = this.sedeAdmin.selectedSedeId;

  // Signal y método para colapsar / ocultar el menú lateral
  sidebarOculto = signal<boolean>(false);

  isSuperAdmin = computed(() => this.auth.isSuperAdmin());
  userRole = computed(() => this.auth.getUserRole() || 'ADMIN');
  userName = computed(() => this.auth.getUserName());
  userEmail = computed(() => this.auth.getUserEmail());

  currentSedeNombre = computed(() => {
    const s = this.sedeAdmin.selectedSede();
    return s ? s.nombre : (this.isSuperAdmin() ? 'Supervisión Global' : 'Sede Fraternidad');
  });

  ngOnInit(): void {
    this.sedeAdmin.cargarSedes().subscribe();
  }

  toggleSidebar(): void {
    this.sidebarOculto.update(v => !v);
  }

  onSedeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target && target.value) {
      this.sedeAdmin.seleccionarSede(target.value);
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/catalogo']);
  }
}
