import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth.service';
import { SedeAdminService } from '../../core/sede-admin.service';
import { AdminMetricasService } from '../../core/admin-metricas.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-[#F8F9FA] flex flex-col font-['Montserrat',sans-serif]">
      
      <!-- 1. Barra Superior Institucional (64px de altura, Fondo #011C5B) -->
      <header class="bg-[#011C5B] text-white sticky top-0 z-40 border-b border-[#0A2F8A] shadow-sm h-16">
        <div class="px-4 sm:px-6 h-full flex items-center justify-between gap-3">
          
          <!-- Izquierda: Toggle móvil y Logotipo institucional blanco -->
          <div class="flex items-center gap-3 min-w-0">
            <button 
              type="button" 
              (click)="toggleSidebar()" 
              class="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              aria-label="Abrir menú de navegación">
              <mat-icon>menu</mat-icon>
            </button>

            <a routerLink="/admin/dashboard" class="flex items-center gap-3 min-w-0 hover:opacity-95 transition-opacity">
              <!-- Logotipo ITM Institucional Blanco -->
              <div class="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
                <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-sm sm:text-base tracking-tight truncate">Plataforma OPE · ITM</span>
                  <span class="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded bg-white/15 text-white uppercase shrink-0">
                    {{ userRole() }}
                  </span>
                </div>
                <div class="text-[11px] text-white/70 hidden sm:block truncate">
                  Gestión y Custodia de Objetos Perdidos y Encontrados
                </div>
              </div>
            </a>
          </div>

          <!-- Centro / Derecha: Selector Global de Sede (SUPERADMIN) y Perfil del Usuario Activo -->
          <div class="flex items-center gap-2 sm:gap-4 shrink-0">
            
            @if (isSuperAdmin()) {
              <!-- Selector Global de Sede (Exclusivo SUPERADMIN, con borde redondeado de 8px) -->
              <div class="relative flex items-center">
                <label for="sedeSelectorHeader" class="sr-only">Seleccionar Sede Institucional Activa</label>
                <div class="flex items-center gap-1.5 bg-white/10 border border-white/25 rounded-lg px-3 py-1.5 text-xs text-white">
                  <mat-icon class="!w-4 !h-4 !text-[16px] text-amber-300">domain</mat-icon>
                  <span class="font-medium hidden md:inline text-white/80">Sede Activa:</span>
                  <select 
                    id="sedeSelectorHeader"
                    [value]="selectedSedeId() || ''"
                    (change)="onSedeChange($event)"
                    class="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer pr-1">
                    <option value="" disabled [selected]="!selectedSedeId()" class="text-slate-800">
                      -- Seleccionar Sede ITM --
                    </option>
                    @for (sede of sedes(); track sede.sede_id) {
                      <option [value]="sede.sede_id" class="text-slate-800">
                        {{ sede.nombre }}
                      </option>
                    }
                  </select>
                </div>
              </div>
            } @else {
              <!-- Sede Asignada Fija para ADMIN Regular -->
              <div class="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white">
                <mat-icon class="!w-4 !h-4 !text-[16px] text-[#008A47]">place</mat-icon>
                <span class="text-white/80 hidden sm:inline">Sede:</span>
                <span class="font-semibold">{{ currentSedeNombre() }}</span>
              </div>
            }

            <!-- Enlace rápido hacia el Catálogo Público -->
            <a 
              routerLink="/catalogo" 
              class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/15"
              title="Ir al catálogo público institucional">
              <mat-icon class="!w-4 !h-4 !text-[16px]">visibility</mat-icon>
              <span>Catálogo</span>
            </a>

            <!-- Perfil del usuario activo y Cierre de Sesión Seguro -->
            <div class="flex items-center gap-2.5 pl-2 border-l border-white/20">
              <div class="hidden md:block text-right">
                <div class="text-xs font-semibold text-white leading-tight truncate max-w-[140px]">{{ userName() }}</div>
                <div class="text-[10px] text-white/70">{{ userEmail() }}</div>
              </div>
              <button 
                type="button"
                (click)="logout()" 
                class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#B23B24] hover:bg-red-700 text-white transition-colors shadow-xs"
                title="Cerrar sesión de forma segura">
                <mat-icon class="!w-4 !h-4 !text-[16px]">logout</mat-icon>
                <span class="hidden sm:inline">Salir</span>
              </button>
            </div>

          </div>

        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">
        
        <!-- 2. Sidebar de Navegación (Fondo Blanco, Divisor Sutil a la derecha) -->
        <aside 
          [class.translate-x-0]="isSidebarOpen()"
          [class.-translate-x-full]="!isSidebarOpen()"
          class="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#E5E7EB] flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:z-0 shadow-lg lg:shadow-none">
          
          <!-- Encabezado Móvil del Sidebar -->
          <div class="p-4 border-b border-[#E5E7EB] flex items-center justify-between lg:hidden bg-[#011C5B] text-white">
            <span class="font-bold text-sm">Menú Administrativo</span>
            <button (click)="closeSidebar()" class="p-1 rounded text-white hover:bg-white/10">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- Jurisdicción / Sede Activa en el Sidebar -->
          <div class="p-3.5 m-3 bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl">
            <div class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <mat-icon class="!w-3.5 !h-3.5 !text-[14px] text-[#011C5B]">apartment</mat-icon>
              Jurisdicción Operativa
            </div>
            <div class="font-bold text-xs text-[#011C5B] truncate">
              {{ currentSedeNombre() }}
            </div>
            @if (isSuperAdmin()) {
              <div class="text-[10px] text-amber-700 font-medium mt-0.5">
                Supervisión Global Multisede
              </div>
            }
          </div>

          <!-- Enlaces de Navegación: Íconos lineales, peso 500 inactivo, activo con bg rgba(1,28,91,0.08) y texto #011C5B peso 600 -->
          <nav class="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            
            <!-- 1. Dashboard -->
            <a 
              routerLink="/admin/dashboard" 
              routerLinkActive="active-nav-link"
              [routerLinkActiveOptions]="{ exact: true }"
              (click)="closeSidebar()"
              class="nav-link-base group">
              <mat-icon class="nav-icon">dashboard</mat-icon>
              <span class="flex-1">Panel y Métricas</span>
            </a>

            <!-- 2. Aprobaciones -->
            <a 
              routerLink="/admin/aprobaciones" 
              routerLinkActive="active-nav-link"
              (click)="closeSidebar()"
              class="nav-link-base group">
              <mat-icon class="nav-icon">fact_check</mat-icon>
              <span class="flex-1">Aprobación de Objetos</span>
              @if (totalPendientes() > 0) {
                <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#F19800] text-white">
                  {{ totalPendientes() }}
                </span>
              }
            </a>

            <!-- 3. Usuarios -->
            <a 
              routerLink="/admin/usuarios" 
              routerLinkActive="active-nav-link"
              (click)="closeSidebar()"
              class="nav-link-base group">
              <mat-icon class="nav-icon">manage_accounts</mat-icon>
              <span class="flex-1">Gestión de Usuarios</span>
            </a>

            <!-- 4. Auditoría -->
            <a 
              routerLink="/admin/auditoria" 
              routerLinkActive="active-nav-link"
              (click)="closeSidebar()"
              class="nav-link-base group">
              <mat-icon class="nav-icon">policy</mat-icon>
              <span class="flex-1">Auditoría del Sistema</span>
            </a>

            <!-- 5. Reportes y Exportación -->
            <a 
              routerLink="/admin/reportes" 
              routerLinkActive="active-nav-link"
              (click)="closeSidebar()"
              class="nav-link-base group">
              <mat-icon class="nav-icon">table_chart</mat-icon>
              <span class="flex-1">Actas y Exportación</span>
            </a>

            <!-- Divisor y Sección inferior exclusiva para Superadmin -->
            @if (isSuperAdmin()) {
              <div class="pt-2 pb-1">
                <hr class="border-[#E5E7EB] my-2" />
                <div class="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Módulos Superadministrador
                </div>
              </div>

              <!-- 6. Sedes y Administradores -->
              <a 
                routerLink="/admin/sedes" 
                routerLinkActive="active-nav-link"
                (click)="closeSidebar()"
                class="nav-link-base group">
                <mat-icon class="nav-icon">domain_add</mat-icon>
                <span class="flex-1">Sedes y Administradores</span>
              </a>
            }

          </nav>

          <!-- Footer del Sidebar con créditos institucionales ITM -->
          <div class="p-3 border-t border-[#E5E7EB] bg-[#F8F9FA] text-[11px] text-slate-500">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded bg-[#011C5B] text-white flex items-center justify-center font-bold text-[10px]">
                ITM
              </div>
              <div class="truncate leading-tight">
                <span class="font-semibold text-slate-700 block">ITM · Vicerrectoría</span>
                <span class="text-[10px] text-slate-400">Plataforma OPE Institucional</span>
              </div>
            </div>
          </div>

        </aside>

        <!-- Fondo difuminado en móvil al abrir el drawer -->
        @if (isSidebarOpen()) {
          <div 
            (click)="closeSidebar()" 
            class="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs">
          </div>
        }

        <!-- 3. Contenedor Principal (Fondo #F8F9FA) -->
        <main class="flex-1 overflow-y-auto">
          
          <!-- Banner de Advertencia si el SUPERADMIN no ha seleccionado Sede -->
          @if (requiereSeleccionSede()) {
            <div class="m-4 sm:m-6 p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-xs">
              <div class="flex items-start gap-3">
                <mat-icon class="!w-6 !h-6 !text-[24px] text-[#F19800] shrink-0 mt-0.5">warning</mat-icon>
                <div class="flex-1">
                  <h2 class="text-sm sm:text-base font-bold text-amber-900">
                    Atención: Selección de sede obligatoria
                  </h2>
                  <p class="text-xs text-amber-800 mt-1">
                    Como Superadministrador institucional, debe especificar la sede que desea supervisar para cargar los inventarios, solicitudes y registros correspondientes.
                  </p>
                  
                  <div class="mt-3 flex flex-wrap gap-2 items-center">
                    <span class="text-xs font-semibold text-amber-900">Selección directa:</span>
                    @for (sede of sedes(); track sede.sede_id) {
                      <button 
                        type="button" 
                        (click)="seleccionarSede(sede.sede_id)"
                        class="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-bold text-[#011C5B] hover:bg-amber-100 hover:border-amber-400 transition-colors shadow-xs">
                        {{ sede.nombre }}
                      </button>
                    }
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- Vista enrutada activa -->
          <div class="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <router-outlet></router-outlet>
          </div>

        </main>

      </div>

    </div>
  `,
  styles: [`
    .nav-link-base {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      color: #4B5563;
      transition: all 0.15s ease;
      cursor: pointer;
      text-decoration: none;
    }
    .nav-link-base:hover {
      background-color: #F8F9FA;
      color: #011C5B;
    }
    .nav-link-base:hover .nav-icon {
      color: #011C5B;
    }
    .active-nav-link {
      background-color: rgba(1, 28, 91, 0.08) !important;
      color: #011C5B !important;
      font-weight: 600 !important;
    }
    .active-nav-link .nav-icon {
      color: #011C5B !important;
    }
    .nav-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #6B7280;
      transition: color 0.15s ease;
    }
  `]
})
export class AdminLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private sedeAdmin = inject(SedeAdminService);
  private metricasService = inject(AdminMetricasService);
  private router = inject(Router);

  isSidebarOpen = signal(false);
  totalPendientes = signal(0);

  sedes = this.sedeAdmin.sedes;
  selectedSedeId = this.sedeAdmin.selectedSedeId;
  requiereSeleccionSede = this.sedeAdmin.requiereSeleccionSede;

  isSuperAdmin = computed(() => this.auth.isSuperAdmin());
  userRole = computed(() => this.auth.getUserRole() || 'ADMIN');
  userName = computed(() => this.auth.getUserName());
  userEmail = computed(() => this.auth.getUserEmail());

  currentSedeNombre = computed(() => {
    const s = this.sedeAdmin.selectedSede();
    return s ? s.nombre : (this.isSuperAdmin() ? 'Sin sede seleccionada' : 'Sede Fraternidad');
  });

  ngOnInit(): void {
    this.sedeAdmin.cargarSedes().subscribe();
    this.metricasService.obtenerResumen().subscribe((m) => {
      if (m && m.pendientes_moderacion) {
        this.totalPendientes.set(
          (m.pendientes_moderacion.perdidos || 0) +
          (m.pendientes_moderacion.encontrados || 0) +
          (m.pendientes_moderacion.eliminaciones || 0)
        );
      }
    });
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update(v => !v);
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  onSedeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target && target.value) {
      this.seleccionarSede(target.value);
    }
  }

  seleccionarSede(id: string): void {
    this.sedeAdmin.seleccionarSede(id);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/catalogo']);
  }
}
