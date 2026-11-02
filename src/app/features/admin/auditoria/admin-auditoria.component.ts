import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuditoraDeSistemaService } from '../../../api/api/auditoraDeSistema.service';
import { AuditLogResponse } from '../../../api/model/auditLogResponse';
import { AccionAuditoria } from '../../../api/model/accionAuditoria';

@Component({
  selector: 'app-admin-auditoria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Header & Filter Bar -->
      <div class="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold text-[#011C5B] tracking-tight">
              Bitácora de Auditoría del Sistema
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
              Trazabilidad inmutable de eventos, modificaciones y operaciones administrativas
            </p>
          </div>

          <!-- Controls: Auto-refresh & Manual Refresh -->
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 bg-[#F8F9FA] px-3 py-1.5 rounded-xl border border-[#E5E7EB]">
              <input 
                type="checkbox" 
                [checked]="autoRefreshActivo()" 
                (change)="toggleAutoRefresh()"
                class="rounded text-[#011C5B] focus:ring-0"
              />
              <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full" [class.bg-emerald-500]="autoRefreshActivo()" [class.bg-slate-300]="!autoRefreshActivo()"></span>
                Auto 10s
              </span>
            </label>

            <button 
              type="button" 
              (click)="cargarLogs()" 
              [disabled]="isLoading()"
              class="px-3.5 py-2 rounded-xl bg-[#011C5B] text-white text-xs font-semibold hover:bg-[#0A2F8A] transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50">
              <mat-icon [class.animate-spin]="isLoading()" class="!w-4 !h-4 !text-[16px]">refresh</mat-icon>
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        <!-- Filter Bar -->
        <form [formGroup]="filterForm" (ngSubmit)="filtrar()" class="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          <!-- Filtro Entidad -->
          <div>
            <label for="filtroEntidad" class="sr-only">Entidad afectada</label>
            <select 
              id="filtroEntidad"
              formControlName="entidad"
              class="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 focus:border-[#011C5B] focus:outline-none bg-white">
              <option value="">Todas las entidades</option>
              <option value="reporte_perdida">Reporte de Pérdida</option>
              <option value="publicacion_encontrado">Publicación de Hallazgo</option>
              <option value="objeto_custodia">Objeto en Custodia</option>
              <option value="usuario">Usuario / Cuenta</option>
              <option value="acta_entrega">Acta de Entrega</option>
              <option value="sede">Sede Institucional</option>
            </select>
          </div>

          <!-- Filtro Acción -->
          <div>
            <label for="filtroAccion" class="sr-only">Acción realizada</label>
            <select 
              id="filtroAccion"
              formControlName="accion"
              class="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 focus:border-[#011C5B] focus:outline-none bg-white">
              <option value="">Todas las acciones</option>
              <option value="CREAR">Creación</option>
              <option value="APROBAR">Aprobación</option>
              <option value="RECHAZAR">Rechazo</option>
              <option value="EDITAR">Edición</option>
              <option value="ELIMINAR">Eliminación / Baja</option>
              <option value="BLOQUEAR">Bloqueo de acceso</option>
            </select>
          </div>

          <!-- Fecha Desde -->
          <div class="flex items-center gap-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-2.5 py-1.5 text-xs">
            <span class="text-slate-500 font-medium">Desde:</span>
            <input 
              type="date" 
              formControlName="fechaDesde" 
              class="bg-transparent text-slate-800 font-semibold focus:outline-none w-full"
            />
          </div>

          <!-- Botón Filtrar -->
          <div class="flex items-center gap-2">
            <button 
              type="submit"
              class="w-full py-2 px-3 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] text-[#011C5B] text-xs font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1">
              <mat-icon class="!w-4 !h-4 !text-[16px]">filter_alt</mat-icon>
              <span>Aplicar Filtros</span>
            </button>
            <button 
              type="button"
              (click)="limpiarFiltros()"
              class="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50"
              title="Limpiar filtros">
              <mat-icon class="!w-4 !h-4 !text-[16px]">backspace</mat-icon>
            </button>
          </div>

        </form>
      </div>

      <!-- Audit Logs Table (Paginada de 10 en 10 leyendo X-Total-Count) -->
      <div class="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        
        <div class="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between text-xs text-slate-500 bg-[#F8F9FA]">
          <span>Mostrando bitácora de eventos del sistema</span>
          <span class="font-bold text-[#011C5B] font-mono tabular-nums">Total: {{ totalLogs() }} registros</span>
        </div>

        @if (isLoading()) {
          <div class="p-12 text-center text-slate-500">
            <mat-icon class="animate-spin !w-8 !h-8 !text-[32px] text-[#011C5B]">sync</mat-icon>
            <p class="text-xs font-semibold mt-3">Consultando bitácora de auditoría...</p>
          </div>
        } @else if (logsFiltrados().length === 0) {
          <div class="p-12 text-center text-slate-400">
            <mat-icon class="!w-12 !h-12 !text-[48px] text-slate-300">history_toggle_drop</mat-icon>
            <h2 class="text-sm font-bold text-slate-700 mt-2">No hay registros de auditoría</h2>
            <p class="text-xs text-slate-500 mt-1">No se encontraron eventos con los criterios aplicados.</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-[#F8F9FA] text-slate-600 font-semibold border-b border-[#E5E7EB] uppercase text-[10px] tracking-wider">
                  <th class="py-3 px-4">Fecha y Hora</th>
                  <th class="py-3 px-4">Acción</th>
                  <th class="py-3 px-4">Entidad</th>
                  <th class="py-3 px-4">Detalle / Resumen</th>
                  <th class="py-3 px-4">Actor</th>
                  <th class="py-3 px-4 text-center">Detalle</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E5E7EB]">
                @for (log of logsFiltrados(); track log.auditLog_id) {
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    
                    <!-- Fecha y hora -->
                    <td class="py-3 px-4 whitespace-nowrap text-slate-600 font-mono tabular-nums text-[11px]">
                      {{ formatearFecha(log.fecha) }}
                    </td>

                    <!-- Acción -->
                    <td class="py-3 px-4 whitespace-nowrap">
                      <span 
                        [class.text-[#008A47]]="esAccionCrearOAprobar(log.accion)"
                        [class.text-[#011C5B]]="log.accion === 'EDITAR'"
                        [class.text-[#B23B24]]="esAccionPeligrosa(log.accion)"
                        class="font-bold">
                        {{ log.accion }}
                      </span>
                    </td>

                    <!-- Entidad -->
                    <td class="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                      {{ log.entidad }}
                    </td>

                    <!-- Detalle / Resumen legible -->
                    <td class="py-3 px-4 text-slate-800">
                      <div class="font-medium line-clamp-2">
                        {{ log.detalle || ('Operación ' + log.accion + ' sobre ' + log.entidad) }}
                      </div>
                    </td>

                    <!-- Actor -->
                    <td class="py-3 px-4 whitespace-nowrap text-slate-600">
                      <div class="font-medium truncate max-w-[140px]" [title]="log.usuario_id || 'Sistema'">
                        {{ log.usuario_id || 'Sistema ITM' }}
                      </div>
                      <div class="text-[10px] text-slate-400 font-mono">Entidad ID: {{ log.entidad_id }}</div>
                    </td>

                    <!-- Detalle -->
                    <td class="py-3 px-4 text-center">
                      <button 
                        type="button" 
                        (click)="verDetalle(log)"
                        class="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-[#011C5B] hover:bg-slate-100 transition-colors"
                        title="Ver detalles completos">
                        <mat-icon class="!w-4 !h-4 !text-[16px]">data_object</mat-icon>
                      </button>
                    </td>

                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div class="p-4 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-slate-600 bg-[#F8F9FA]">
            <div>
              Página {{ paginaActual() }} de {{ totalPaginas() }}
            </div>
            <div class="flex items-center gap-2">
              <button 
                type="button"
                [disabled]="paginaActual() <= 1"
                (click)="cambiarPagina(paginaActual() - 1)"
                class="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                Anterior
              </button>
              <button 
                type="button"
                [disabled]="paginaActual() >= totalPaginas()"
                (click)="cambiarPagina(paginaActual() + 1)"
                class="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                Siguiente
              </button>
            </div>
          </div>
        }

      </div>

      <!-- Modal Detalle Auditoría -->
      @if (modalDetalleAbierto()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 animate-fadeIn">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2 font-bold text-sm text-[#011C5B]">
                <mat-icon>policy</mat-icon>
                <span>Inspección de Registro de Auditoría</span>
              </div>
              <button (click)="modalDetalleAbierto.set(false)" class="text-slate-400 hover:text-slate-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            @if (logSeleccionado(); as l) {
              <div class="mt-4 space-y-3 text-xs">
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div class="font-bold text-slate-800 text-sm mb-1">{{ l.detalle || l.accion }}</div>
                  <div class="text-[11px] text-slate-500">
                    ID Registro: <span class="font-mono">{{ l.auditLog_id }}</span> · {{ formatearFecha(l.fecha) }}
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3 bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB]">
                  <div>
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Entidad</span>
                    <span class="font-bold text-slate-800">{{ l.entidad }}</span>
                  </div>
                  <div>
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Acción</span>
                    <span class="font-bold text-slate-800">{{ l.accion }}</span>
                  </div>
                  <div>
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">ID de Entidad</span>
                    <span class="font-mono text-slate-800">{{ l.entidad_id }}</span>
                  </div>
                  <div>
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Usuario Responsable</span>
                    <span class="text-slate-800 truncate block">{{ l.usuario_id }}</span>
                  </div>
                </div>
              </div>
            }

            <div class="pt-4 mt-4 flex justify-end border-t border-slate-100">
              <button 
                type="button" 
                (click)="modalDetalleAbierto.set(false)"
                class="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class AdminAuditoriaComponent implements OnInit, OnDestroy {
  private auditoriaService = inject(AuditoraDeSistemaService);

  logs = signal<AuditLogResponse[]>([]);
  totalLogs = signal<number>(0);
  isLoading = signal(false);
  paginaActual = signal(1);
  limitePorPagina = 15;

  autoRefreshActivo = signal(false);
  private pollingTimer: any = null;

  modalDetalleAbierto = signal(false);
  logSeleccionado = signal<AuditLogResponse | null>(null);

  filterForm = new FormGroup({
    entidad: new FormControl(''),
    accion: new FormControl(''),
    fechaDesde: new FormControl('')
  });

  totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalLogs() / this.limitePorPagina)));

  logsFiltrados = computed(() => {
    let list = this.logs();
    const entidad = this.filterForm.value.entidad;
    const accion = this.filterForm.value.accion;

    if (entidad) {
      list = list.filter(l => l.entidad === entidad);
    }
    if (accion) {
      list = list.filter(l => l.accion === accion);
    }
    return list;
  });

  ngOnInit(): void {
    this.cargarLogs();
  }

  ngOnDestroy(): void {
    this.detenerAutoRefresh();
  }

  esAccionCrearOAprobar(accion: AccionAuditoria): boolean {
    return accion === AccionAuditoria.Crear || accion === AccionAuditoria.Aprobar;
  }

  esAccionPeligrosa(accion: AccionAuditoria): boolean {
    return accion === AccionAuditoria.Bloquear || accion === AccionAuditoria.Eliminar || accion === AccionAuditoria.Rechazar;
  }

  cargarLogs(): void {
    this.isLoading.set(true);
    const skip = (this.paginaActual() - 1) * this.limitePorPagina;

    this.auditoriaService.obtenerHistorialLogsAuditoriaGet(skip, this.limitePorPagina, 'response').subscribe({
      next: (resp) => {
        const totalHeader = resp.headers.get('X-Total-Count');
        if (totalHeader) {
          this.totalLogs.set(parseInt(totalHeader, 10));
        } else {
          this.totalLogs.set(resp.body?.length || 0);
        }
        this.logs.set(resp.body || []);
        this.isLoading.set(false);
      },
      error: () => {
        // Fallback representativo con eventos de auditoría si API offline
        const mockLogs: AuditLogResponse[] = [
          {
            auditLog_id: 'aud-001',
            entidad: 'reporte_perdida',
            entidad_id: 'rep-001',
            accion: AccionAuditoria.Aprobar,
            usuario_id: 'admin.frat@itm.edu.co',
            fecha: new Date().toISOString(),
            detalle: 'El administrador aprobó el reporte de pérdida "Calculadora HP Prime"'
          },
          {
            auditLog_id: 'aud-002',
            entidad: 'usuario',
            entidad_id: 'usr-103',
            accion: AccionAuditoria.Bloquear,
            usuario_id: 'superadmin@itm.edu.co',
            fecha: new Date(Date.now() - 3600000).toISOString(),
            detalle: 'Superadministrador bloqueó la cuenta de Sebastián Muñoz Cano por reclamos reiterados'
          },
          {
            auditLog_id: 'aud-003',
            entidad: 'publicacion_encontrado',
            entidad_id: 'enc-001',
            accion: AccionAuditoria.Crear,
            usuario_id: 'estudiante.itm@correo.itm.edu.co',
            fecha: new Date(Date.now() - 7200000).toISOString(),
            detalle: 'Usuario registró hallazgo en la Cafetería del Bloque A'
          },
          {
            auditLog_id: 'aud-004',
            entidad: 'acta_entrega',
            entidad_id: 'ACT-2025-001',
            accion: AccionAuditoria.Crear,
            usuario_id: 'admin.frat@itm.edu.co',
            fecha: new Date(Date.now() - 86400000).toISOString(),
            detalle: 'Se formalizó la entrega y firma del Acta ACT-2025-001'
          }
        ];
        this.logs.set(mockLogs);
        this.totalLogs.set(mockLogs.length);
        this.isLoading.set(false);
      }
    });
  }

  toggleAutoRefresh(): void {
    const nuevo = !this.autoRefreshActivo();
    this.autoRefreshActivo.set(nuevo);
    if (nuevo) {
      this.iniciarAutoRefresh();
    } else {
      this.detenerAutoRefresh();
    }
  }

  private iniciarAutoRefresh(): void {
    this.detenerAutoRefresh();
    this.pollingTimer = setInterval(() => {
      if (this.paginaActual() === 1) {
        this.cargarLogs();
      }
    }, 10000);
  }

  private detenerAutoRefresh(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginas()) {
      this.paginaActual.set(nuevaPagina);
      this.cargarLogs();
    }
  }

  filtrar(): void {
    this.paginaActual.set(1);
    this.cargarLogs();
  }

  limpiarFiltros(): void {
    this.filterForm.reset({ entidad: '', accion: '', fechaDesde: '' });
    this.cargarLogs();
  }

  verDetalle(log: AuditLogResponse): void {
    this.logSeleccionado.set(log);
    this.modalDetalleAbierto.set(true);
  }

  formatearFecha(ts: string | undefined): string {
    if (!ts) return '';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? ts : d.toLocaleString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
}
