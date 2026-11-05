import { Component, OnInit, OnDestroy, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_URL } from '../../../core/api.config';
import { mensajeDeError } from '../../../core/api-error';
import { SedeAdminService } from '../../../core/sede-admin.service';
import { AdminExportacionesService, FormatoExportacion } from '../../../core/admin-exportaciones.service';

export interface AuditLogDetalle {
  auditLog_id: string;
  entidad: string;
  entidad_id: string;
  accion: string;
  usuario_id: string;
  detalle?: string | null;
  fecha: string;
  usuario_nombre?: string | null;
  usuario_rol?: string | null;
  modulo?: string | null;
  resumen?: string | null;
}

@Component({
  selector: 'app-admin-auditoria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSnackBarModule, MatMenuModule],
  template: `
    <div class="itm-admin-page">
      
      <!-- Encabezado y Controles de Tiempo Real -->
      <div class="itm-admin-header">
        <div>
          <h1 class="itm-admin-title">Bitácora de Auditoría del Sistema</h1>
          <p class="itm-admin-subtitle">
            Trazabilidad inmutable de eventos, modificaciones y operaciones administrativas ITM
          </p>
        </div>

        <div class="aud-header-controls">
          <label class="aud-live-toggle">
            <input
              type="checkbox"
              [checked]="autoRefreshActivo()"
              (change)="toggleAutoRefresh()"
            />
            <span class="aud-live-dot" [class.active]="autoRefreshActivo()"></span>
            <span>Tiempo real (10s)</span>
          </label>

          <!-- Botón de Exportar Auditoría con Menú CSV / Excel -->
          <button
            type="button"
            [matMenuTriggerFor]="exportMenu"
            [disabled]="exportando()"
            class="itm-btn itm-btn-outline">
            <mat-icon [class.spin-icon]="exportando()">file_download</mat-icon>
            <span>{{ exportando() ? 'Exportando...' : 'Exportar' }}</span>
          </button>
          <mat-menu #exportMenu="matMenu">
            <button mat-menu-item (click)="exportarAuditoria('csv')">
              <mat-icon>description</mat-icon>
              <span>Exportar en formato CSV</span>
            </button>
            <button mat-menu-item (click)="exportarAuditoria('xlsx')">
              <mat-icon>table_view</mat-icon>
              <span>Exportar en formato Excel (.xlsx)</span>
            </button>
          </mat-menu>

          <button
            type="button"
            (click)="cargarLogs()"
            [disabled]="isLoading()"
            class="itm-btn itm-btn-primary">
            <mat-icon [class.spin-icon]="isLoading()">refresh</mat-icon>
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      <!-- Banner de Error de Exportación o Servidor -->
      @if (errorExportacion()) {
        <div class="aud-error-banner" role="alert">
          <div class="aud-error-content">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorExportacion() }}</span>
          </div>
          <button type="button" class="aud-error-close" (click)="errorExportacion.set(null)" aria-label="Cerrar advertencia">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }

      <!-- Barra de Filtros -->
      <form [formGroup]="filterForm" (ngSubmit)="filtrar()" class="itm-filter-bar aud-filter-grid">
        <div class="itm-field">
          <label for="filtroEntidad" class="itm-label">Entidad afectada</label>
          <select id="filtroEntidad" formControlName="entidad" class="itm-select">
            <option value="">Todas las entidades</option>
            <option value="ReportePerdida">Reporte de Pérdida</option>
            <option value="PublicacionEncontrado">Publicación de Hallazgo</option>
            <option value="ObjetoEnCustodia">Objeto en Custodia</option>
            <option value="Reclamo">Reclamo</option>
            <option value="ActaEntrega">Acta de Entrega</option>
            <option value="Usuario">Usuario / Cuenta</option>
          </select>
        </div>

        <div class="itm-field">
          <label for="filtroAccion" class="itm-label">Acción ejecutada</label>
          <select id="filtroAccion" formControlName="accion" class="itm-select">
            <option value="">Todas las acciones</option>
            <option value="CREAR">Creación (CREAR)</option>
            <option value="APROBAR">Aprobación (APROBAR)</option>
            <option value="RECHAZAR">Rechazo (RECHAZAR)</option>
            <option value="EDITAR">Edición (EDITAR)</option>
            <option value="ELIMINAR">Eliminación / Baja (ELIMINAR)</option>
            <option value="BLOQUEAR">Bloqueo (BLOQUEAR)</option>
            <option value="DESBLOQUEAR">Desbloqueo (DESBLOQUEAR)</option>
            <option value="CAMBIO_ESTADO">Cambio de Estado</option>
          </select>
        </div>

        <div class="itm-field">
          <label for="filtroFechaDesde" class="itm-label">Fecha desde</label>
          <input
            id="filtroFechaDesde"
            type="date"
            formControlName="fechaDesde"
            class="itm-input"
          />
        </div>

        <div class="itm-field">
          <label for="filtroFechaHasta" class="itm-label">Fecha hasta</label>
          <input
            id="filtroFechaHasta"
            type="date"
            formControlName="fechaHasta"
            class="itm-input"
          />
        </div>

        <div class="aud-filter-actions">
          <button type="submit" class="itm-btn itm-btn-primary" style="flex: 1;">
            <mat-icon>filter_alt</mat-icon>
            <span>Aplicar</span>
          </button>
          <button
            type="button"
            (click)="limpiarFiltros()"
            class="itm-icon-btn"
            title="Limpiar filtros">
            <mat-icon>restart_alt</mat-icon>
          </button>
        </div>
      </form>

      <!-- Tabla de Auditoría Paginada -->
      <div class="itm-table-card">
        <div class="aud-summary-bar">
          <span>Mostrando bitácora oficial de eventos del sistema</span>
          <span class="itm-badge itm-badge-primary">Total: {{ totalLogs() }} registros</span>
        </div>

        @if (isLoading()) {
          <div class="itm-empty-state" style="border: none;">
            <div class="itm-empty-icon">
              <mat-icon class="spin-icon">sync</mat-icon>
            </div>
            <h3 style="margin: 8px 0 0; font-size: 1rem;">Consultando bitácora de auditoría...</h3>
            <p style="margin: 0; font-size: 0.84rem; color: #6b7280;">Recuperando registros inmutables del servidor</p>
          </div>
        } @else if (logs().length === 0) {
          <div class="itm-empty-state" style="border: none;">
            <div class="itm-empty-icon">
              <mat-icon>history_toggle_off</mat-icon>
            </div>
            <h3 style="margin: 8px 0 0; font-size: 1.05rem;">No hay registros de auditoría</h3>
            <p style="margin: 0; font-size: 0.85rem; color: #6b7280;">No se encontraron eventos con los criterios aplicados.</p>
          </div>
        } @else {
          <div class="itm-table-scroll">
            <table class="itm-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Acción</th>
                  <th>Módulo / Entidad</th>
                  <th>Resumen de la Operación</th>
                  <th>Actor Responsable</th>
                  <th style="text-align: center;">Inspección</th>
                </tr>
              </thead>
              <tbody>
                @for (log of logs(); track log.auditLog_id) {
                  <tr>
                    <td class="aud-date-cell">
                      {{ formatearFecha(log.fecha) }}
                    </td>

                    <td>
                      <span
                        class="itm-badge"
                        [class.itm-badge-success]="esAccionPositiva(log.accion)"
                        [class.itm-badge-primary]="esAccionEdicion(log.accion)"
                        [class.itm-badge-danger]="esAccionCritica(log.accion)"
                        [class.itm-badge-neutral]="!esAccionPositiva(log.accion) && !esAccionEdicion(log.accion) && !esAccionCritica(log.accion)">
                        {{ log.accion }}
                      </span>
                    </td>

                    <td>
                      <div class="aud-mod-title">{{ log.modulo || log.entidad }}</div>
                      <div class="aud-mod-sub">{{ log.entidad }}</div>
                    </td>

                    <td>
                      <div class="aud-resumen">
                        {{ log.resumen || log.detalle || ('Operación ' + log.accion + ' sobre ' + log.entidad) }}
                      </div>
                    </td>

                    <td>
                      <div class="aud-actor-name">{{ log.usuario_nombre || 'Sistema ITM' }}</div>
                      <div class="aud-actor-sub">
                        @if (log.usuario_rol) {
                          <span>{{ log.usuario_rol }} · </span>
                        }
                        <span>ID: {{ cortarUuid(log.entidad_id) }}</span>
                      </div>
                    </td>

                    <td style="text-align: center;">
                      <button
                        type="button"
                        (click)="verDetalle(log)"
                        class="itm-icon-btn"
                        title="Inspeccionar registro completo">
                        <mat-icon>data_object</mat-icon>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="itm-pagination">
            <div>
              Página <strong>{{ paginaActual() }}</strong> de <strong>{{ totalPaginas() }}</strong>
            </div>
            <div class="aud-page-btns">
              <button
                type="button"
                [disabled]="paginaActual() <= 1"
                (click)="cambiarPagina(paginaActual() - 1)"
                class="itm-btn itm-btn-outline">
                <mat-icon>chevron_left</mat-icon>
                <span>Anterior</span>
              </button>
              <button
                type="button"
                [disabled]="paginaActual() >= totalPaginas()"
                (click)="cambiarPagina(paginaActual() + 1)"
                class="itm-btn itm-btn-outline">
                <span>Siguiente</span>
                <mat-icon>chevron_right</mat-icon>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Modal Detalle de Registro de Auditoría -->
      @if (modalDetalleAbierto()) {
        <div class="itm-modal-backdrop">
          <div class="itm-modal-card wide">
            <div class="itm-modal-header">
              <h3>
                <mat-icon>policy</mat-icon>
                <span>Inspección de Registro de Auditoría</span>
              </h3>
              <button type="button" (click)="modalDetalleAbierto.set(false)" class="itm-modal-close">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            @if (logSeleccionado(); as l) {
              <div class="itm-modal-body">
                <div class="aud-detail-banner">
                  <div class="aud-detail-resumen">
                    {{ l.resumen || l.detalle || l.accion }}
                  </div>
                  <div class="aud-detail-meta">
                    ID Log: <code>{{ l.auditLog_id }}</code> · Fecha: {{ formatearFecha(l.fecha) }}
                  </div>
                </div>

                <div class="aud-detail-grid">
                  <div>
                    <span class="itm-label">Módulo Administrativo</span>
                    <div class="aud-detail-val">{{ l.modulo || l.entidad }}</div>
                  </div>
                  <div>
                    <span class="itm-label">Entidad Técnica</span>
                    <div class="aud-detail-val">{{ l.entidad }}</div>
                  </div>
                  <div>
                    <span class="itm-label">Acción Ejecutada</span>
                    <div class="aud-detail-val">{{ l.accion }}</div>
                  </div>
                  <div>
                    <span class="itm-label">ID de la Entidad Afectada</span>
                    <div class="aud-detail-val mono">{{ l.entidad_id }}</div>
                  </div>
                  <div>
                    <span class="itm-label">Actor Responsable</span>
                    <div class="aud-detail-val">{{ l.usuario_nombre || 'Usuario / Sistema' }} ({{ l.usuario_rol || 'N/A' }})</div>
                  </div>
                  <div>
                    <span class="itm-label">UUID del Actor</span>
                    <div class="aud-detail-val mono">{{ l.usuario_id }}</div>
                  </div>
                </div>

                @if (l.detalle) {
                  <div class="itm-field">
                    <span class="itm-label">Detalle Técnico Registrado</span>
                    <pre class="aud-code-box">{{ l.detalle }}</pre>
                  </div>
                }
              </div>
            }

            <div class="itm-modal-footer">
              <button type="button" (click)="modalDetalleAbierto.set(false)" class="itm-btn itm-btn-primary">
                Cerrar Inspección
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .aud-header-controls {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }

    .aud-live-toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 10px;
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      font-size: 0.82rem;
      font-weight: 700;
      color: #374151;
      cursor: pointer;
    }

    .aud-live-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #9ca3af;
    }

    .aud-live-dot.active {
      background: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
    }

    .aud-filter-grid {
      grid-template-columns: repeat(5, minmax(0, 1fr));
      align-items: end;
    }

    @media (max-width: 1100px) {
      .aud-filter-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .aud-filter-grid {
        grid-template-columns: 1fr;
      }
    }

    .aud-filter-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .aud-summary-bar {
      padding: 12px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.82rem;
      font-weight: 600;
      color: #4b5563;
    }

    .aud-date-cell {
      white-space: nowrap;
      font-family: monospace;
      font-size: 0.8rem;
      color: #4b5563;
    }

    .aud-mod-title {
      font-weight: 800;
      color: var(--ing-1);
      font-size: 0.85rem;
    }

    .aud-mod-sub {
      font-size: 0.74rem;
      color: #6b7280;
      font-family: monospace;
    }

    .aud-resumen {
      font-weight: 600;
      color: #1f2937;
      line-height: 1.4;
      max-width: 480px;
    }

    .aud-actor-name {
      font-weight: 700;
      color: #1f2937;
      font-size: 0.84rem;
    }

    .aud-actor-sub {
      font-size: 0.74rem;
      color: #6b7280;
      font-family: monospace;
    }

    .aud-page-btns {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .aud-detail-banner {
      background: #f0f6fc;
      border: 1px solid #dbeafe;
      border-radius: 14px;
      padding: 16px;
    }

    .aud-detail-resumen {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--ing-1);
      line-height: 1.4;
    }

    .aud-detail-meta {
      margin-top: 6px;
      font-size: 0.78rem;
      color: #4b5563;
    }

    .aud-detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 16px;
    }

    @media (max-width: 600px) {
      .aud-detail-grid {
        grid-template-columns: 1fr;
      }
    }

    .aud-detail-val {
      font-size: 0.86rem;
      font-weight: 700;
      color: #1f2937;
      margin-top: 3px;
      word-break: break-all;
    }

    .aud-detail-val.mono {
      font-family: monospace;
      font-size: 0.8rem;
    }

    .aud-code-box {
      margin: 0;
      padding: 12px 14px;
      background: #111827;
      color: #f9fafb;
      border-radius: 10px;
      font-family: monospace;
      font-size: 0.8rem;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .aud-error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      color: #991b1b;
      font-size: 0.88rem;
      font-weight: 600;
    }

    .aud-error-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .aud-error-close {
      background: transparent;
      border: none;
      color: #991b1b;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease;
    }

    .aud-error-close:hover {
      background: rgba(153, 27, 27, 0.1);
    }

    .spin-icon {
      animation: itmSpin 1.1s linear infinite;
    }

    @keyframes itmSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class AdminAuditoriaComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);
  private sedeAdmin = inject(SedeAdminService);
  private exportacionesService = inject(AdminExportacionesService);

  logs = signal<AuditLogDetalle[]>([]);
  totalLogs = signal<number>(0);
  totalPaginas = signal<number>(1);
  isLoading = signal(false);
  paginaActual = signal(1);

  exportando = signal(false);
  errorExportacion = signal<string | null>(null);

  autoRefreshActivo = signal(false);
  private pollingTimer: any = null;

  modalDetalleAbierto = signal(false);
  logSeleccionado = signal<AuditLogDetalle | null>(null);

  filterForm = new FormGroup({
    entidad: new FormControl(''),
    accion: new FormControl(''),
    fechaDesde: new FormControl(''),
    fechaHasta: new FormControl('')
  });

  constructor() {
    effect(() => {
      this.sedeAdmin.selectedSedeId();
      this.paginaActual.set(1);
      this.cargarLogs();
    });
  }

  ngOnInit(): void {
    this.cargarLogs();
  }

  ngOnDestroy(): void {
    this.detenerAutoRefresh();
  }

  esAccionPositiva(accion: string): boolean {
    return accion === 'CREAR' || accion === 'APROBAR' || accion === 'DESBLOQUEAR';
  }

  esAccionEdicion(accion: string): boolean {
    return accion === 'EDITAR' || accion === 'CAMBIO_ESTADO';
  }

  esAccionCritica(accion: string): boolean {
    return accion === 'BLOQUEAR' || accion === 'ELIMINAR' || accion === 'RECHAZAR';
  }

  cortarUuid(id: string | undefined): string {
    if (!id) return '';
    return id.length > 12 ? `${id.slice(0, 8)}…` : id;
  }

  cargarLogs(): void {
    this.isLoading.set(true);

    let params = new HttpParams().set('pagina', String(this.paginaActual()));
    const { entidad, accion, fechaDesde, fechaHasta } = this.filterForm.value;

    if (entidad) params = params.set('entidad', entidad);
    if (accion) params = params.set('accion', accion);
    if (fechaDesde) params = params.set('fecha_desde', fechaDesde);
    if (fechaHasta) params = params.set('fecha_hasta', fechaHasta);

    this.http
      .get<AuditLogDetalle[]>(`${API_URL}/auditoria`, { params, observe: 'response' })
      .subscribe({
        next: (resp) => {
          const totalHeader = resp.headers.get('X-Total-Count');
          const paginasHeader = resp.headers.get('X-Total-Paginas');

          const body = resp.body ?? [];
          this.logs.set(body);
          this.totalLogs.set(totalHeader ? parseInt(totalHeader, 10) : body.length);
          this.totalPaginas.set(paginasHeader ? Math.max(1, parseInt(paginasHeader, 10)) : 1);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.snack.open(mensajeDeError(err, 'No se pudo consultar la bitácora de auditoría.'), 'Cerrar', {
            duration: 4000
          });
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
    this.filterForm.reset({ entidad: '', accion: '', fechaDesde: '', fechaHasta: '' });
    this.paginaActual.set(1);
    this.cargarLogs();
  }

  verDetalle(log: AuditLogDetalle): void {
    this.logSeleccionado.set(log);
    this.modalDetalleAbierto.set(true);
  }

  exportarAuditoria(formato: FormatoExportacion): void {
    this.exportando.set(true);
    this.errorExportacion.set(null);

    const { entidad, accion, fechaDesde, fechaHasta } = this.filterForm.value;

    this.exportacionesService
      .exportarAuditoria(formato, {
        entidad: entidad || undefined,
        accion: accion || undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined
      })
      .subscribe({
        next: (res) => {
          this.exportando.set(false);
          this.snack.open(res.mensaje || 'Bitácora exportada exitosamente.', 'Cerrar', {
            duration: 4000
          });
        },
        error: (err) => {
          this.exportando.set(false);
          const errorMsg = mensajeDeError(
            err,
            'No se pudo exportar la bitácora de auditoría. El servidor reportó un error al procesar el archivo.'
          );
          this.errorExportacion.set(errorMsg);
          this.snack.open(errorMsg, 'Cerrar', {
            duration: 5000
          });
        }
      });
  }

  formatearFecha(ts: string | undefined): string {
    if (!ts) return '';
    const d = new Date(ts);
    return isNaN(d.getTime())
      ? ts
      : d.toLocaleString('es-CO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
  }
}
