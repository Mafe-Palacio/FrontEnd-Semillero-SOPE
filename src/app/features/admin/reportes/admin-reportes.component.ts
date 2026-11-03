import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/api.config';
import { mensajeDeError } from '../../../core/api-error';
import {
  AdminExportacionesService,
  RecursoExportacion,
  FormatoExportacion
} from '../../../core/admin-exportaciones.service';
import { SedeAdminService } from '../../../core/sede-admin.service';

export interface ActaEntregaBackend {
  actaEntrega_id: string;
  reclamo_id: string;
  nombre_reclamante: string;
  cedula_reclamante: string;
  correo_reclamante: string;
  celular_reclamante: string;
  carnet_reclamante: string;
  firma_url: string;
  validacion_verbal: boolean;
  fecha_hora_entrega: string;
  procesada_por_admin_id: string;
}

@Component({
  selector: 'app-admin-reportes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="itm-admin-page">
      
      <!-- Encabezado y Pestañas -->
      <div class="itm-admin-header">
        <div>
          <h1 class="itm-admin-title">Actas de Entrega y Centro de Exportación</h1>
          <p class="itm-admin-subtitle">
            Descarga de bases de datos oficiales en formatos CSV / Excel y consulta de actas de restitución firmadas
          </p>
        </div>

        <div class="itm-tabs">
          <button
            type="button"
            (click)="seccionActiva.set('exportar')"
            class="itm-tab-btn"
            [class.active]="seccionActiva() === 'exportar'">
            <mat-icon>file_download</mat-icon>
            <span>Descarga de Reportes</span>
          </button>

          <button
            type="button"
            (click)="seccionActiva.set('actas')"
            class="itm-tab-btn"
            [class.active]="seccionActiva() === 'actas'">
            <mat-icon>description</mat-icon>
            <span>Historial de Actas</span>
            <span class="itm-tab-counter">{{ actas().length }}</span>
          </button>
        </div>
      </div>

      <!-- SECCIÓN 1: CENTRO DE EXPORTACIÓN -->
      @if (seccionActiva() === 'exportar') {
        <form [formGroup]="filterForm" class="itm-filter-bar rep-filter-grid">
          <div class="rep-filter-info">
            <h2 class="rep-filter-title">Parámetros de Descarga Masiva</h2>
            <p class="rep-filter-sub">
              Jurisdicción activa: <strong>{{ sedeNombre() }}</strong>
            </p>
          </div>

          <div class="itm-field">
            <label for="repFechaDesde" class="itm-label">Fecha inicial</label>
            <input id="repFechaDesde" type="date" formControlName="fechaDesde" class="itm-input" />
          </div>

          <div class="itm-field">
            <label for="repFechaHasta" class="itm-label">Fecha final</label>
            <input id="repFechaHasta" type="date" formControlName="fechaHasta" class="itm-input" />
          </div>

          <div class="itm-field">
            <label for="repFormato" class="itm-label">Formato de archivo</label>
            <select id="repFormato" formControlName="formato" class="itm-select">
              <option value="xlsx">Excel Institucional (.xlsx)</option>
              <option value="csv">Valores separados por coma (.csv)</option>
            </select>
          </div>
        </form>

        <div class="rep-export-grid">
          <!-- Recurso 1: Entregas y Actas -->
          <div class="rep-export-card">
            <div class="rep-export-top">
              <div class="rep-export-icon green">
                <mat-icon>assignment_turned_in</mat-icon>
              </div>
              <div>
                <h3 class="rep-export-name">Actas y Entregas Formalizadas</h3>
                <p class="rep-export-desc">
                  Relación oficial de objetos restituidos exitosamente con datos del reclamante, documento, carnet y administrador responsable.
                </p>
              </div>
            </div>

            <div class="rep-export-footer">
              <span class="itm-badge itm-badge-success">Con firma de recibido</span>
              <button
                type="button"
                [disabled]="descargandoRecurso() === 'entregas'"
                (click)="exportar('entregas')"
                class="itm-btn itm-btn-primary">
                <mat-icon [class.spin-icon]="descargandoRecurso() === 'entregas'">file_download</mat-icon>
                <span>Descargar</span>
              </button>
            </div>
          </div>

          <!-- Recurso 2: Objetos en Custodia -->
          <div class="rep-export-card">
            <div class="rep-export-top">
              <div class="rep-export-icon blue">
                <mat-icon>inventory_2</mat-icon>
              </div>
              <div>
                <h3 class="rep-export-name">Inventario Físico en Custodia</h3>
                <p class="rep-export-desc">
                  Catálogo completo de objetos físicos almacenados en los puntos de custodia de la sede con estados y tiempos de retención.
                </p>
              </div>
            </div>

            <div class="rep-export-footer">
              <span class="itm-badge itm-badge-primary">Inventario oficial</span>
              <button
                type="button"
                [disabled]="descargandoRecurso() === 'objetos-custodia'"
                (click)="exportar('objetos-custodia')"
                class="itm-btn itm-btn-primary">
                <mat-icon [class.spin-icon]="descargandoRecurso() === 'objetos-custodia'">file_download</mat-icon>
                <span>Descargar</span>
              </button>
            </div>
          </div>

          <!-- Recurso 3: Reportes de Pérdida -->
          <div class="rep-export-card">
            <div class="rep-export-top">
              <div class="rep-export-icon amber">
                <mat-icon>search</mat-icon>
              </div>
              <div>
                <h3 class="rep-export-name">Reportes de Extravío Ciudadano</h3>
                <p class="rep-export-desc">
                  Historial de artículos perdidos reportados por estudiantes, profesores, administrativos y personal del ITM.
                </p>
              </div>
            </div>

            <div class="rep-export-footer">
              <span class="itm-badge itm-badge-warning">Pendientes y aprobados</span>
              <button
                type="button"
                [disabled]="descargandoRecurso() === 'reportes-perdida'"
                (click)="exportar('reportes-perdida')"
                class="itm-btn itm-btn-primary">
                <mat-icon [class.spin-icon]="descargandoRecurso() === 'reportes-perdida'">file_download</mat-icon>
                <span>Descargar</span>
              </button>
            </div>
          </div>

          <!-- Recurso 4: Publicaciones de Hallazgo -->
          <div class="rep-export-card">
            <div class="rep-export-top">
              <div class="rep-export-icon cyan">
                <mat-icon>volunteer_activism</mat-icon>
              </div>
              <div>
                <h3 class="rep-export-name">Publicaciones de Objetos Encontrados</h3>
                <p class="rep-export-desc">
                  Registro de hallazgos ciudadanos reportados en el campus y cotejo con los puntos de recepción autorizados.
                </p>
              </div>
            </div>

            <div class="rep-export-footer">
              <span class="itm-badge itm-badge-cyan">Con lugar de hallazgo</span>
              <button
                type="button"
                [disabled]="descargandoRecurso() === 'publicaciones-encontradas'"
                (click)="exportar('publicaciones-encontradas')"
                class="itm-btn itm-btn-primary">
                <mat-icon [class.spin-icon]="descargandoRecurso() === 'publicaciones-encontradas'">file_download</mat-icon>
                <span>Descargar</span>
              </button>
            </div>
          </div>
        </div>
      } @else {

        <!-- SECCIÓN 2: HISTORIAL DE ACTAS DE ENTREGA -->
        <div class="itm-table-card">
          <div class="rep-actas-header">
            <div>
              <h2 style="margin: 0; font-size: 1rem; color: var(--ing-1);">Actas de Entrega Legalizadas</h2>
              <p style="margin: 2px 0 0; font-size: 0.8rem; color: #6b7280;">
                Expedientes de restitución formal de pertenencias en custodia
              </p>
            </div>

            <button type="button" (click)="cargarActas()" class="itm-btn itm-btn-outline">
              <mat-icon>refresh</mat-icon>
              <span>Actualizar Actas</span>
            </button>
          </div>

          @if (cargandoActas()) {
            <div class="itm-empty-state" style="border: none;">
              <div class="itm-empty-icon">
                <mat-icon class="spin-icon">sync</mat-icon>
              </div>
              <h3 style="margin: 8px 0 0; font-size: 1rem;">Cargando actas de entrega...</h3>
            </div>
          } @else if (actas().length === 0) {
            <div class="itm-empty-state" style="border: none;">
              <div class="itm-empty-icon">
                <mat-icon>description</mat-icon>
              </div>
              <h3 style="margin: 8px 0 0; font-size: 1.05rem;">No hay actas de entrega registradas</h3>
              <p style="margin: 0; font-size: 0.85rem; color: #6b7280;">
                Cuando se formalice la restitución de un objeto en custodia, el acta firmada aparecerá aquí.
              </p>
            </div>
          } @else {
            <div class="itm-table-scroll">
              <table class="itm-table">
                <thead>
                  <tr>
                    <th>Código Acta</th>
                    <th>Fecha y Hora</th>
                    <th>Reclamante</th>
                    <th>Contacto / Carnet</th>
                    <th>Validación</th>
                    <th style="text-align: center;">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (acta of actas(); track acta.actaEntrega_id) {
                    <tr>
                      <td>
                        <span class="itm-badge itm-badge-primary">
                          ACT-{{ cortarUuid(acta.actaEntrega_id) }}
                        </span>
                      </td>

                      <td style="font-family: monospace; font-size: 0.82rem; color: #4b5563;">
                        {{ formatearFecha(acta.fecha_hora_entrega) }}
                      </td>

                      <td>
                        <div style="font-weight: 800; color: var(--ing-1);">{{ acta.nombre_reclamante }}</div>
                        <div style="font-size: 0.76rem; color: #6b7280; font-family: monospace;">
                          C.C. {{ acta.cedula_reclamante }}
                        </div>
                      </td>

                      <td>
                        <div style="font-size: 0.82rem; color: #1f2937;">{{ acta.correo_reclamante }}</div>
                        <div style="font-size: 0.75rem; color: #6b7280;">
                          Tel: {{ acta.celular_reclamante }} · Carnet: {{ acta.carnet_reclamante }}
                        </div>
                      </td>

                      <td>
                        @if (acta.validacion_verbal) {
                          <span class="itm-badge itm-badge-success">Verbal y Documental</span>
                        } @else {
                          <span class="itm-badge itm-badge-neutral">Documental</span>
                        }
                      </td>

                      <td style="text-align: center;">
                        <button
                          type="button"
                          (click)="verActa(acta)"
                          class="itm-btn itm-btn-outline"
                          style="padding: 6px 12px !important; font-size: 0.78rem !important;">
                          <mat-icon style="font-size: 16px; width: 16px; height: 16px;">visibility</mat-icon>
                          <span>Ver Acta</span>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- Modal Visualizar Acta Digital -->
      @if (modalActaAbierto()) {
        <div class="itm-modal-backdrop">
          <div class="itm-modal-card wide">
            <div class="itm-modal-header">
              <h3>
                <mat-icon>verified_user</mat-icon>
                <span>Acta Formal de Restitución y Custodia ITM</span>
              </h3>
              <button type="button" (click)="modalActaAbierto.set(false)" class="itm-modal-close">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            @if (actaSeleccionada(); as a) {
              <div class="itm-modal-body">
                <div class="rep-acta-code-bar">
                  <span>Identificador Oficial de Acta:</span>
                  <strong>{{ a.actaEntrega_id }}</strong>
                </div>

                <div class="rep-acta-grid">
                  <div>
                    <span class="itm-label">Fecha y Hora de Entrega</span>
                    <div class="rep-acta-val">{{ formatearFecha(a.fecha_hora_entrega) }}</div>
                  </div>
                  <div>
                    <span class="itm-label">Sede de Custodia</span>
                    <div class="rep-acta-val">{{ sedeNombre() }}</div>
                  </div>
                  <div>
                    <span class="itm-label">Beneficiario / Reclamante</span>
                    <div class="rep-acta-val">{{ a.nombre_reclamante }}</div>
                  </div>
                  <div>
                    <span class="itm-label">Documento y Carnet</span>
                    <div class="rep-acta-val">C.C. {{ a.cedula_reclamante }} · Carnet {{ a.carnet_reclamante }}</div>
                  </div>
                  <div>
                    <span class="itm-label">Correo Electrónico</span>
                    <div class="rep-acta-val">{{ a.correo_reclamante }}</div>
                  </div>
                  <div>
                    <span class="itm-label">Teléfono de Contacto</span>
                    <div class="rep-acta-val">{{ a.celular_reclamante }}</div>
                  </div>
                  <div>
                    <span class="itm-label">ID Reclamo Asociado</span>
                    <div class="rep-acta-val mono">{{ a.reclamo_id }}</div>
                  </div>
                  <div>
                    <span class="itm-label">ID Funcionario Custodio</span>
                    <div class="rep-acta-val mono">{{ a.procesada_por_admin_id }}</div>
                  </div>
                </div>

                @if (a.firma_url) {
                  <div class="rep-firma-box">
                    <span class="itm-label">Soporte / Firma Registrada</span>
                    <div style="margin-top: 8px;">
                      <img
                        [src]="a.firma_url"
                        alt="Firma del reclamante"
                        style="max-height: 110px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; padding: 6px;"
                        referrerpolicy="no-referrer"
                      />
                    </div>
                  </div>
                }

                <div class="rep-signatures">
                  <div class="rep-sig-line">Firma del Reclamante ({{ a.nombre_reclamante }})</div>
                  <div class="rep-sig-line">Firma del Custodio Institucional ITM</div>
                </div>
              </div>
            }

            <div class="itm-modal-footer">
              <button type="button" (click)="modalActaAbierto.set(false)" class="itm-btn itm-btn-ghost">
                Cerrar
              </button>
              <button type="button" (click)="imprimirActa()" class="itm-btn itm-btn-primary">
                <mat-icon>print</mat-icon>
                <span>Imprimir Copia</span>
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .rep-filter-grid {
      grid-template-columns: 1.4fr repeat(3, minmax(0, 1fr));
      align-items: end;
    }

    @media (max-width: 1024px) {
      .rep-filter-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .rep-filter-grid {
        grid-template-columns: 1fr;
      }
    }

    .rep-filter-title {
      margin: 0;
      font-size: 0.98rem;
      font-weight: 800;
      color: var(--ing-1);
    }

    .rep-filter-sub {
      margin: 4px 0 0;
      font-size: 0.82rem;
      color: #4b5563;
    }

    .rep-export-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px;
    }

    @media (max-width: 820px) {
      .rep-export-grid {
        grid-template-columns: 1fr;
      }
    }

    .rep-export-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 18px;
      box-shadow: 0 2px 10px rgba(1, 28, 91, 0.04);
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }

    .rep-export-card:hover {
      transform: translateY(-2px);
      border-color: var(--ing-3);
      box-shadow: 0 10px 24px rgba(1, 28, 91, 0.08);
    }

    .rep-export-top {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .rep-export-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .rep-export-icon.green {
      background: #ecfdf5;
      color: #059669;
    }

    .rep-export-icon.blue {
      background: #f0f6fc;
      color: var(--ing-1);
    }

    .rep-export-icon.amber {
      background: #fffbeb;
      color: #d97706;
    }

    .rep-export-icon.cyan {
      background: rgba(0, 160, 183, 0.12);
      color: var(--ing-2);
    }

    .rep-export-name {
      margin: 0;
      font-size: 1rem;
      font-weight: 800;
      color: var(--ing-1);
    }

    .rep-export-desc {
      margin: 6px 0 0;
      font-size: 0.84rem;
      color: #4b5563;
      line-height: 1.45;
    }

    .rep-export-footer {
      padding-top: 14px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .rep-actas-header {
      padding: 18px 22px;
      background: #f8fafc;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .rep-acta-code-bar {
      background: #f0f6fc;
      border: 1px solid #dbeafe;
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 0.84rem;
      color: var(--ing-1);
    }

    .rep-acta-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 16px;
    }

    @media (max-width: 600px) {
      .rep-acta-grid {
        grid-template-columns: 1fr;
      }
    }

    .rep-acta-val {
      font-size: 0.86rem;
      font-weight: 700;
      color: #1f2937;
      margin-top: 3px;
      word-break: break-word;
    }

    .rep-acta-val.mono {
      font-family: monospace;
      font-size: 0.78rem;
    }

    .rep-firma-box {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px;
    }

    .rep-signatures {
      margin-top: 18px;
      padding-top: 24px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 24px;
      text-align: center;
    }

    .rep-sig-line {
      border-top: 1.5px solid #9ca3af;
      padding-top: 8px;
      font-size: 0.78rem;
      font-weight: 700;
      color: #4b5563;
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
export class AdminReportesComponent implements OnInit {
  private exportacionesService = inject(AdminExportacionesService);
  private sedeAdmin = inject(SedeAdminService);
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);

  seccionActiva = signal<'exportar' | 'actas'>('exportar');
  descargandoRecurso = signal<RecursoExportacion | null>(null);
  cargandoActas = signal(false);

  actas = signal<ActaEntregaBackend[]>([]);
  actaSeleccionada = signal<ActaEntregaBackend | null>(null);
  modalActaAbierto = signal(false);

  filterForm = new FormGroup({
    fechaDesde: new FormControl(''),
    fechaHasta: new FormControl(''),
    formato: new FormControl<FormatoExportacion>('xlsx')
  });

  sedeNombre = () => this.sedeAdmin.selectedSede()?.nombre || 'Todas las sedes ITM';

  constructor() {
    effect(() => {
      this.sedeAdmin.selectedSedeId();
      this.cargarActas();
    });
  }

  ngOnInit(): void {
    this.cargarActas();
  }

  cortarUuid(id: string | undefined): string {
    if (!id) return '';
    return id.slice(0, 8).toUpperCase();
  }

  exportar(recurso: RecursoExportacion): void {
    this.descargandoRecurso.set(recurso);
    const { fechaDesde, fechaHasta, formato } = this.filterForm.value;
    const fmt = formato || 'xlsx';

    this.exportacionesService
      .descargarExportacion(recurso, fmt, fechaDesde || undefined, fechaHasta || undefined)
      .subscribe({
        next: (res) => {
          this.descargandoRecurso.set(null);
          this.snack.open(res.mensaje || 'Reporte generado y descargado exitosamente.', 'Cerrar', {
            duration: 4000
          });
        },
        error: (err) => {
          this.descargandoRecurso.set(null);
          this.snack.open(mensajeDeError(err, 'Error al exportar los datos desde el servidor.'), 'Cerrar', {
            duration: 4500
          });
        }
      });
  }

  cargarActas(): void {
    this.cargandoActas.set(true);
    this.http.get<ActaEntregaBackend[]>(`${API_URL}/actas-entrega/`).subscribe({
      next: (data) => {
        this.actas.set(Array.isArray(data) ? data : []);
        this.cargandoActas.set(false);
      },
      error: (err) => {
        this.cargandoActas.set(false);
        this.snack.open(mensajeDeError(err, 'No se pudieron consultar las actas de entrega.'), 'Cerrar', {
          duration: 4000
        });
      }
    });
  }

  verActa(acta: ActaEntregaBackend): void {
    this.actaSeleccionada.set(acta);
    this.modalActaAbierto.set(true);
  }

  imprimirActa(): void {
    window.print();
  }

  formatearFecha(ts: string | undefined): string {
    if (!ts) return '';
    const d = new Date(ts);
    return isNaN(d.getTime())
      ? ts
      : d.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
  }
}
