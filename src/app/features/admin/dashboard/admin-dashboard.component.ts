import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminMetricasService, MetricasResumen } from '../../../core/admin-metricas.service';
import { SedeAdminService } from '../../../core/sede-admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6 font-['Montserrat',sans-serif]">
      
      <!-- Top Title & Filter Bar -->
      <div class="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-[#011C5B] tracking-tight">
            Tablero Institucional de Métricas
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
            Supervisión y control de inventario en <strong class="text-slate-700 font-semibold">{{ sedeNombre() }}</strong>
          </p>
        </div>

        <!-- Date Range Filter Form -->
        <form [formGroup]="filterForm" (ngSubmit)="filtrar()" class="flex flex-wrap items-center gap-2">
          <div class="flex items-center gap-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs">
            <span class="text-slate-500 font-medium">Desde:</span>
            <input 
              type="date" 
              formControlName="fechaDesde" 
              class="bg-transparent text-slate-800 font-semibold focus:outline-none"
            />
          </div>
          <div class="flex items-center gap-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs">
            <span class="text-slate-500 font-medium">Hasta:</span>
            <input 
              type="date" 
              formControlName="fechaHasta" 
              class="bg-transparent text-slate-800 font-semibold focus:outline-none"
            />
          </div>
          <button 
            type="submit"
            class="px-3 py-1.5 rounded-lg bg-[#011C5B] text-white text-xs font-semibold hover:bg-[#0A2F8A] transition-colors flex items-center gap-1 shadow-xs">
            <mat-icon class="!w-4 !h-4 !text-[16px]">filter_list</mat-icon>
            <span>Filtrar</span>
          </button>
        </form>
      </div>

      <!-- Key Metric Cards Grid (KPI cards de métricas en tiempo real con border-radius 12px y tabular-nums) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- Card 1: Total en Custodia -->
        <div class="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs hover:border-[#011C5B]/40 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500">Objetos en Custodia</span>
            <div class="w-9 h-9 rounded-lg bg-blue-50 text-[#011C5B] flex items-center justify-center">
              <mat-icon class="!w-5 !h-5 !text-[20px]">inventory_2</mat-icon>
            </div>
          </div>
          <div class="text-3xl font-bold text-[#011C5B] mt-2 font-mono tabular-nums">
            {{ metricas()?.total_custodia ?? 0 }}
          </div>
          <div class="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <span class="text-[#008A47] font-semibold flex items-center">
              <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">check_circle</mat-icon>
              {{ metricas()?.reclamados ?? 0 }} entregados
            </span>
            <span>·</span>
            <span>{{ metricas()?.no_reclamados ?? 0 }} activos</span>
          </div>
        </div>

        <!-- Card 2: Tasa de Éxito / Restitución -->
        <div class="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs hover:border-[#011C5B]/40 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500">Tasa de Restitución</span>
            <div class="w-9 h-9 rounded-lg bg-emerald-50 text-[#008A47] flex items-center justify-center">
              <mat-icon class="!w-5 !h-5 !text-[20px]">trending_up</mat-icon>
            </div>
          </div>
          <div class="text-3xl font-bold text-[#008A47] mt-2 font-mono tabular-nums">
            {{ metricas()?.tasa_exito_porcentaje ?? 0 }}%
          </div>
          <div class="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div 
              class="bg-[#008A47] h-full rounded-full transition-all duration-500"
              [style.width.%]="metricas()?.tasa_exito_porcentaje ?? 0">
            </div>
          </div>
        </div>

        <!-- Card 3: Tiempo promedio en custodia -->
        <div class="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs hover:border-[#011C5B]/40 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500">Permanencia Media</span>
            <div class="w-9 h-9 rounded-lg bg-indigo-50 text-[#011C5B] flex items-center justify-center">
              <mat-icon class="!w-5 !h-5 !text-[20px]">schedule</mat-icon>
            </div>
          </div>
          <div class="text-3xl font-bold text-slate-800 mt-2 font-mono tabular-nums">
            {{ metricas()?.dias_promedio_custodia ?? 0 }} <span class="text-sm font-semibold text-slate-500">días</span>
          </div>
          <div class="text-xs text-slate-500 mt-2">
            Tiempo promedio hasta la restitución
          </div>
        </div>

        <!-- Card 4: Pendientes de Moderación -->
        <div class="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs hover:border-[#011C5B]/40 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500">Pendientes de Moderar</span>
            <div class="w-9 h-9 rounded-lg bg-amber-50 text-[#F19800] flex items-center justify-center">
              <mat-icon class="!w-5 !h-5 !text-[20px]">fact_check</mat-icon>
            </div>
          </div>
          <div class="text-3xl font-bold text-[#F19800] mt-2 font-mono tabular-nums">
            {{ totalPendientes() }}
          </div>
          <div class="mt-2 flex items-center gap-2">
            <a 
              routerLink="/admin/aprobaciones"
              class="text-xs font-semibold text-[#011C5B] hover:underline flex items-center gap-1">
              <span>Revisar solicitudes</span>
              <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">arrow_forward</mat-icon>
            </a>
          </div>
        </div>

      </div>

      <!-- Top Categorías & Gráficos Planos -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Top 5 Categorías Extraviadas (Gráfico Plano con barras institucionales) -->
        <div class="lg:col-span-2 bg-white rounded-xl p-6 border border-[#E5E7EB] shadow-xs">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-base font-bold text-[#011C5B]">Distribución por Categorías</h2>
              <p class="text-xs text-slate-500">Incidencia de objetos registrados en la sede actual</p>
            </div>
            <mat-icon class="text-slate-400">bar_chart</mat-icon>
          </div>

          <div class="space-y-4">
            @for (cat of metricas()?.top_categorias ?? []; track cat.categoria) {
              <div>
                <div class="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <div class="flex items-center gap-2">
                    <mat-icon class="!w-4 !h-4 !text-[16px] text-[#011C5B]">{{ cat.icono }}</mat-icon>
                    <span>{{ cat.nombre }}</span>
                  </div>
                  <span class="font-mono tabular-nums text-slate-600">{{ cat.cantidad }} reportes ({{ cat.porcentaje }}%)</span>
                </div>
                <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    class="bg-[#011C5B] h-full rounded-full transition-all duration-500"
                    [style.width.%]="cat.porcentaje">
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Acciones Rápidas del Administrador -->
        <div class="bg-white rounded-xl p-6 border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div>
            <h2 class="text-base font-bold text-[#011C5B] mb-1">Acciones Operativas</h2>
            <p class="text-xs text-slate-500 mb-4">Flujos prioritarios de la sede</p>

            <div class="space-y-2.5">
              <a 
                routerLink="/admin/aprobaciones" 
                class="flex items-center justify-between p-3 rounded-lg border border-[#E5E7EB] hover:bg-slate-50 transition-colors group">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-amber-50 text-[#F19800] flex items-center justify-center">
                    <mat-icon class="!w-4 !h-4 !text-[18px]">verified</mat-icon>
                  </div>
                  <div>
                    <div class="text-xs font-bold text-slate-800">Moderar Solicitudes</div>
                    <div class="text-[11px] text-slate-500">Aprobar o rechazar reportes</div>
                  </div>
                </div>
                <mat-icon class="text-slate-400 group-hover:translate-x-0.5 transition-transform">chevron_right</mat-icon>
              </a>

              <a 
                routerLink="/admin/usuarios" 
                class="flex items-center justify-between p-3 rounded-lg border border-[#E5E7EB] hover:bg-slate-50 transition-colors group">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-blue-50 text-[#011C5B] flex items-center justify-center">
                    <mat-icon class="!w-4 !h-4 !text-[18px]">group</mat-icon>
                  </div>
                  <div>
                    <div class="text-xs font-bold text-slate-800">Directorio de Usuarios</div>
                    <div class="text-[11px] text-slate-500">Verificación y control de accesos</div>
                  </div>
                </div>
                <mat-icon class="text-slate-400 group-hover:translate-x-0.5 transition-transform">chevron_right</mat-icon>
              </a>

              <a 
                routerLink="/admin/reportes" 
                class="flex items-center justify-between p-3 rounded-lg border border-[#E5E7EB] hover:bg-slate-50 transition-colors group">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-emerald-50 text-[#008A47] flex items-center justify-center">
                    <mat-icon class="!w-4 !h-4 !text-[18px]">file_download</mat-icon>
                  </div>
                  <div>
                    <div class="text-xs font-bold text-slate-800">Exportar Reportes</div>
                    <div class="text-[11px] text-slate-500">Descargar CSV / Excel y actas</div>
                  </div>
                </div>
                <mat-icon class="text-slate-400 group-hover:translate-x-0.5 transition-transform">chevron_right</mat-icon>
              </a>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-slate-500">
            <span>Sede Activa:</span>
            <span class="font-bold text-[#011C5B]">{{ sedeNombre() }}</span>
          </div>
        </div>

      </div>

    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  private metricasService = inject(AdminMetricasService);
  private sedeAdmin = inject(SedeAdminService);

  metricas = signal<MetricasResumen | null>(null);
  isLoading = signal(false);

  filterForm = new FormGroup({
    fechaDesde: new FormControl(''),
    fechaHasta: new FormControl('')
  });

  sedeNombre = () => this.sedeAdmin.selectedSede()?.nombre || 'Sede Fraternidad ITM';

  totalPendientes = () => {
    const m = this.metricas();
    if (!m) return 0;
    return (m.pendientes_moderacion.perdidos || 0) +
      (m.pendientes_moderacion.encontrados || 0) +
      (m.pendientes_moderacion.eliminaciones || 0);
  };

  ngOnInit(): void {
    this.cargarMetricas();
  }

  cargarMetricas(): void {
    this.isLoading.set(true);
    const { fechaDesde, fechaHasta } = this.filterForm.value;
    this.metricasService.obtenerResumen(fechaDesde || undefined, fechaHasta || undefined).subscribe({
      next: (data) => {
        this.metricas.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  filtrar(): void {
    this.cargarMetricas();
  }
}
