import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { API_URL } from '../../../core/api.config';
import { CATEGORIAS } from '../../../core/categorias';
import { mensajeDeError } from '../../../core/api-error';
import { CategoriaObjeto } from '../../../api/model/categoriaObjeto';
import { ReportesDePrdidaService } from '../../../api/api/reportesDePrdida.service';
import { PublicacionesEncontradasService } from '../../../api/api/publicacionesEncontradas.service';
import { UbicacionesService } from '../../../api/api/ubicaciones.service';
import { PuntosEntregaService } from '../../../api/api/puntosEntrega.service';
import { ReportePerdidaResponse } from '../../../api/model/reportePerdidaResponse';
import { PublicacionEncontradoResponse } from '../../../api/model/publicacionEncontradoResponse';
import { SedeAdminService } from '../../../core/sede-admin.service';

type TabTipo = 'perdidos' | 'encontrados' | 'bajas';

@Component({
  selector: 'app-admin-aprobaciones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="itm-admin-page">
      
      <!-- Encabezado y Pestañas Segmentadas -->
      <div class="itm-admin-header">
        <div>
          <h1 class="itm-admin-title">Aprobación y Moderación de Publicaciones</h1>
          <p class="itm-admin-subtitle">
            Supervisión de reportes ciudadanos y verificación de ingreso a custodia institucional ITM
          </p>
        </div>

        <button type="button" (click)="cargarDatos()" class="itm-btn itm-btn-outline">
          <mat-icon>refresh</mat-icon>
          <span>Actualizar Bandeja</span>
        </button>

        <div class="aprob-tabs-row">
          <div class="itm-tabs">
            <button
              type="button"
              (click)="setTab('perdidos')"
              class="itm-tab-btn"
              [class.active]="activeTab() === 'perdidos'">
              <mat-icon>search</mat-icon>
              <span>Reportes de Pérdida</span>
              <span class="itm-tab-counter">{{ listaPerdidos().length }}</span>
            </button>

            <button
              type="button"
              (click)="setTab('encontrados')"
              class="itm-tab-btn"
              [class.active]="activeTab() === 'encontrados'">
              <mat-icon>inventory_2</mat-icon>
              <span>Objetos Encontrados</span>
              <span class="itm-tab-counter">{{ listaEncontrados().length }}</span>
            </button>

            <button
              type="button"
              (click)="setTab('bajas')"
              class="itm-tab-btn"
              [class.active]="activeTab() === 'bajas'">
              <mat-icon>delete_sweep</mat-icon>
              <span>Solicitudes de Baja</span>
              <span class="itm-tab-counter">{{ listaBajas().length }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Listado Principal -->
      <div class="itm-table-card">
        @if (isLoading()) {
          <div class="itm-empty-state" style="border: none;">
            <div class="itm-empty-icon">
              <mat-icon class="spin-icon">sync</mat-icon>
            </div>
            <h3 style="margin: 8px 0 0; font-size: 1rem;">Cargando bandeja de moderación...</h3>
            <p style="margin: 0; font-size: 0.84rem; color: #6b7280;">Consultando publicaciones pendientes en el servidor ITM</p>
          </div>
        } @else {

          <!-- TAB 1: REPORTES DE PÉRDIDA -->
          @if (activeTab() === 'perdidos') {
            @if (listaPerdidos().length === 0) {
              <div class="itm-empty-state" style="border: none;">
                <div class="itm-empty-icon">
                  <mat-icon>task_alt</mat-icon>
                </div>
                <h3 style="margin: 8px 0 0; font-size: 1.05rem;">No hay reportes de pérdida pendientes</h3>
                <p style="margin: 0; font-size: 0.85rem; color: #6b7280;">Todos los reportes ciudadanos han sido revisados y moderados.</p>
              </div>
            } @else {
              <div class="aprob-list">
                @for (item of listaPerdidos(); track item.reportePerdida_id) {
                  <div class="aprob-item">
                    <div class="aprob-item-main">
                      <div class="aprob-thumb">
                        @if (item.imagen_url) {
                          <img [src]="item.imagen_url" alt="Objeto extraviado" referrerpolicy="no-referrer" />
                        } @else {
                          <mat-icon>{{ obtenerIconoCategoria(item.categoria) }}</mat-icon>
                        }
                      </div>

                      <div class="aprob-info">
                        <div class="aprob-title-row">
                          <span class="itm-badge itm-badge-warning">PENDIENTE</span>
                          <span class="itm-badge itm-badge-primary">{{ formatearCategoria(item.categoria) }}</span>
                          <span class="aprob-date">{{ formatearFecha(item.fecha_publicacion || item.fecha_perdida) }}</span>
                        </div>

                        <h2 class="aprob-desc">{{ item.descripcion }}</h2>

                        <div class="aprob-meta">
                          <span class="aprob-meta-pill">
                            <mat-icon>place</mat-icon>
                            <span>Lugar extravío: <strong>{{ obtenerNombreUbicacion(item.lugar_perdida_id) }}</strong></span>
                          </span>
                          @if (item.detalle_lugar) {
                            <span class="aprob-meta-pill">
                              <mat-icon>meeting_room</mat-icon>
                              <span>Detalle del lugar: <strong>{{ item.detalle_lugar }}</strong></span>
                            </span>
                          }
                          <span class="aprob-meta-pill">
                            <mat-icon>event</mat-icon>
                            <span>Fecha pérdida: <strong>{{ item.fecha_perdida }}</strong></span>
                          </span>
                          @if (item.observaciones) {
                            <span class="aprob-meta-pill">
                              <mat-icon>notes</mat-icon>
                              <span>Observaciones: <strong>{{ item.observaciones }}</strong></span>
                            </span>
                          }
                        </div>
                      </div>
                    </div>

                    <div class="aprob-actions">
                      <button
                        type="button"
                        (click)="abrirModalEditar(item, 'perdido')"
                        class="itm-icon-btn"
                        title="Editar categoría o descripción antes de moderar">
                        <mat-icon>edit</mat-icon>
                      </button>

                      <button
                        type="button"
                        (click)="abrirModalRechazo(item.reportePerdida_id, 'perdido')"
                        class="itm-btn itm-btn-outline-danger">
                        <mat-icon>cancel</mat-icon>
                        <span>Rechazar</span>
                      </button>

                      <button
                        type="button"
                        (click)="aprobarReportePerdida(item.reportePerdida_id)"
                        class="itm-btn itm-btn-success">
                        <mat-icon>check_circle</mat-icon>
                        <span>Aprobar Reporte</span>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          }

          <!-- TAB 2: OBJETOS ENCONTRADOS -->
          @if (activeTab() === 'encontrados') {
            @if (listaEncontrados().length === 0) {
              <div class="itm-empty-state" style="border: none;">
                <div class="itm-empty-icon">
                  <mat-icon>verified</mat-icon>
                </div>
                <h3 style="margin: 8px 0 0; font-size: 1.05rem;">No hay publicaciones de hallazgos pendientes</h3>
                <p style="margin: 0; font-size: 0.85rem; color: #6b7280;">Todos los objetos encontrados han sido verificados e ingresados a custodia.</p>
              </div>
            } @else {
              <div class="aprob-list">
                @for (item of listaEncontrados(); track item.publicacionEncontrado_id) {
                  <div class="aprob-item">
                    <div class="aprob-item-main">
                      <div class="aprob-thumb">
                        @if (item.imagen_url) {
                          <img [src]="item.imagen_url" alt="Objeto encontrado" referrerpolicy="no-referrer" />
                        } @else {
                          <mat-icon>{{ obtenerIconoCategoria(item.categoria) }}</mat-icon>
                        }
                      </div>

                      <div class="aprob-info">
                        <div class="aprob-title-row">
                          <span class="itm-badge itm-badge-cyan">HALLAZGO PENDIENTE</span>
                          <span class="itm-badge itm-badge-primary">{{ formatearCategoria(item.categoria) }}</span>
                          <span class="aprob-date">{{ formatearFecha(item.fecha_publicacion || item.fecha_hallazgo) }}</span>
                        </div>

                        <h2 class="aprob-desc">{{ item.descripcion }}</h2>

                        <div class="aprob-meta">
                          <span class="aprob-meta-pill">
                            <mat-icon>place</mat-icon>
                            <span>Hallazgo: <strong>{{ obtenerNombreUbicacion(item.lugar_hallazgo_id) }}</strong></span>
                          </span>
                          @if (item.detalle_lugar) {
                            <span class="aprob-meta-pill">
                              <mat-icon>meeting_room</mat-icon>
                              <span>Detalle del lugar: <strong>{{ item.detalle_lugar }}</strong></span>
                            </span>
                          }
                          <span class="aprob-meta-pill">
                            <mat-icon>storefront</mat-icon>
                            <span>Punto custodia: <strong>{{ obtenerNombrePuntoEntrega(item.lugar_entrega_fisica_id) }}</strong></span>
                          </span>
                          @if (item.observaciones) {
                            <span class="aprob-meta-pill">
                              <mat-icon>notes</mat-icon>
                              <span>Observaciones: <strong>{{ item.observaciones }}</strong></span>
                            </span>
                          }
                        </div>
                      </div>
                    </div>

                    <div class="aprob-actions">
                      <button
                        type="button"
                        (click)="abrirModalEditar(item, 'encontrado')"
                        class="itm-icon-btn"
                        title="Editar categoría o descripción">
                        <mat-icon>edit</mat-icon>
                      </button>

                      <button
                        type="button"
                        (click)="abrirModalRechazo(item.publicacionEncontrado_id, 'encontrado')"
                        class="itm-btn itm-btn-outline-danger">
                        <mat-icon>cancel</mat-icon>
                        <span>Rechazar</span>
                      </button>

                      <button
                        type="button"
                        (click)="aprobarPublicacionEncontrado(item.publicacionEncontrado_id)"
                        class="itm-btn itm-btn-success">
                        <mat-icon>check_circle</mat-icon>
                        <span>Aprobar e Ingresar a Custodia</span>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          }

          <!-- TAB 3: SOLICITUDES DE BAJA / ELIMINACIÓN -->
          @if (activeTab() === 'bajas') {
            @if (listaBajas().length === 0) {
              <div class="itm-empty-state" style="border: none;">
                <div class="itm-empty-icon">
                  <mat-icon>done_all</mat-icon>
                </div>
                <h3 style="margin: 8px 0 0; font-size: 1.05rem;">No hay solicitudes de baja pendientes</h3>
                <p style="margin: 0; font-size: 0.85rem; color: #6b7280;">No existen peticiones ciudadanas de cancelación por resolver.</p>
              </div>
            } @else {
              <div class="aprob-list">
                @for (baja of listaBajas(); track baja.id) {
                  <div class="aprob-item">
                    <div class="aprob-item-main">
                      <div class="aprob-thumb warning">
                        <mat-icon>warning_amber</mat-icon>
                      </div>

                      <div class="aprob-info">
                        <div class="aprob-title-row">
                          <span class="itm-badge itm-badge-danger">BAJA SOLICITADA</span>
                          <span class="itm-badge itm-badge-neutral">
                            {{ baja.tipo === 'perdido' ? 'Reporte de Pérdida' : 'Objeto Encontrado' }}
                          </span>
                          <span class="itm-badge itm-badge-primary">{{ formatearCategoria(baja.categoria) }}</span>
                        </div>

                        <h2 class="aprob-desc">{{ baja.titulo }}</h2>
                        <p style="margin: 4px 0 0; font-size: 0.82rem; color: #6b7280;">
                          El autor de la publicación solicitó dar de baja este registro del sistema institucional.
                        </p>
                        @if (baja.motivo) {
                          <p style="margin: 6px 0 0; font-size: 0.85rem; color: #011C5B;"><strong>Motivo del autor:</strong> {{ baja.motivo }}</p>
                        }
                      </div>
                    </div>

                    <div class="aprob-actions">
                      <button
                        type="button"
                        (click)="resolverBaja(baja, false)"
                        class="itm-btn itm-btn-outline">
                        <span>Rechazar Solicitud</span>
                      </button>

                      <button
                        type="button"
                        (click)="resolverBaja(baja, true)"
                        class="itm-btn itm-btn-danger">
                        <mat-icon>delete_forever</mat-icon>
                        <span>Aceptar y Dar de Baja</span>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          }

        }
      </div>

      <!-- Modal de Rechazo con Motivo Obligatorio -->
      @if (modalRechazoAbierto()) {
        <div class="itm-modal-backdrop">
          <div class="itm-modal-card">
            <div class="itm-modal-header danger">
              <h3>
                <mat-icon>cancel</mat-icon>
                <span>Rechazar Publicación</span>
              </h3>
              <button type="button" (click)="cerrarModalRechazo()" class="itm-modal-close">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="rechazoForm" (ngSubmit)="confirmarRechazo()">
              <div class="itm-modal-body">
                <p style="margin: 0; font-size: 0.86rem; color: #4b5563; line-height: 1.45;">
                  Indique el motivo institucional de rechazo. Esta justificación quedará registrada y se notificará al ciudadano:
                </p>

                <div class="itm-field">
                  <label for="motivoPredefinido" class="itm-label">Causal frecuente ITM</label>
                  <select
                    id="motivoPredefinido"
                    (change)="seleccionarMotivoFrecuente($event)"
                    class="itm-select">
                    <option value="">-- Seleccionar causal predefinida --</option>
                    <option value="Información insuficiente para identificar el objeto">Información insuficiente</option>
                    <option value="Fotografía borrosa o no corresponde al artículo">Fotografía ilegible o no válida</option>
                    <option value="Artículo restringido según reglamento institucional">Artículo no permitido en custodia</option>
                    <option value="Reporte duplicado previamente registrado">Reporte duplicado</option>
                    <option value="No se presentó el objeto en punto de custodia en el plazo estipulado">No entregado en punto de custodia</option>
                  </select>
                </div>

                <div class="itm-field">
                  <label for="motivoRechazoInput" class="itm-label">Detalle del motivo *</label>
                  <textarea
                    id="motivoRechazoInput"
                    formControlName="motivoRechazo"
                    rows="3"
                    placeholder="Escriba la justificación detallada..."
                    class="itm-textarea"></textarea>
                </div>
              </div>

              <div class="itm-modal-footer">
                <button type="button" (click)="cerrarModalRechazo()" class="itm-btn itm-btn-ghost">
                  Cancelar
                </button>
                <button type="submit" [disabled]="rechazoForm.invalid" class="itm-btn itm-btn-danger">
                  Confirmar Rechazo
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal de Edición Rápida antes de Aprobar -->
      @if (modalEditarAbierto()) {
        <div class="itm-modal-backdrop">
          <div class="itm-modal-card">
            <div class="itm-modal-header">
              <h3>
                <mat-icon>edit_note</mat-icon>
                <span>Editar Publicación Antes de Moderar</span>
              </h3>
              <button type="button" (click)="cerrarModalEditar()" class="itm-modal-close">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="editarForm" (ngSubmit)="guardarEdicion()">
              <div class="itm-modal-body">
                <div class="itm-field">
                  <label for="categoriaEdit" class="itm-label">Categoría oficial ITM *</label>
                  <select id="categoriaEdit" formControlName="categoria" class="itm-select">
                    @for (cat of categoriasOpciones; track cat.id) {
                      <option [value]="cat.id">{{ cat.etiqueta }}</option>
                    }
                  </select>
                </div>

                <div class="itm-field">
                  <label for="descripcionEdit" class="itm-label">Descripción detallada *</label>
                  <textarea
                    id="descripcionEdit"
                    formControlName="descripcion"
                    rows="4"
                    class="itm-textarea"></textarea>
                </div>
              </div>

              <div class="itm-modal-footer">
                <button type="button" (click)="cerrarModalEditar()" class="itm-btn itm-btn-ghost">
                  Cancelar
                </button>
                <button type="submit" [disabled]="editarForm.invalid" class="itm-btn itm-btn-primary">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .aprob-tabs-row {
      width: 100%;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;
    }

    .aprob-list {
      display: flex;
      flex-direction: column;
    }

    .aprob-item {
      padding: 20px 24px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      transition: background-color 0.16s ease;
    }

    .aprob-item:last-child {
      border-bottom: none;
    }

    .aprob-item:hover {
      background-color: #f8fafc;
    }

    .aprob-item-main {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      flex: 1;
      min-width: 280px;
    }

    .aprob-thumb {
      width: 64px;
      height: 64px;
      border-radius: 14px;
      background: #f0f6fc;
      border: 1px solid #dbeafe;
      color: var(--ing-1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }

    .aprob-thumb.warning {
      background: #fffbeb;
      border-color: #fde68a;
      color: #d97706;
    }

    .aprob-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .aprob-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }

    .aprob-title-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .aprob-date {
      font-size: 0.78rem;
      color: #6b7280;
      font-weight: 600;
    }

    .aprob-desc {
      margin: 0;
      font-size: 1rem;
      font-weight: 800;
      color: var(--ing-1);
      line-height: 1.35;
    }

    .aprob-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-top: 2px;
    }

    .aprob-meta-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.8rem;
      color: #4b5563;
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      padding: 4px 10px;
      border-radius: 8px;
    }

    .aprob-meta-pill mat-icon {
      font-size: 15px !important;
      width: 15px !important;
      height: 15px !important;
      color: var(--ing-2);
    }

    .aprob-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      flex-shrink: 0;
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
export class AdminAprobacionesComponent implements OnInit {
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);
  private reportesService = inject(ReportesDePrdidaService);
  private encontradosService = inject(PublicacionesEncontradasService);
  private ubicacionesService = inject(UbicacionesService);
  private puntosService = inject(PuntosEntregaService);
  private sedeAdmin = inject(SedeAdminService);

  activeTab = signal<TabTipo>('perdidos');
  isLoading = signal(false);

  listaPerdidos = signal<ReportePerdidaResponse[]>([]);
  listaEncontrados = signal<PublicacionEncontradoResponse[]>([]);
  listaBajas = signal<Array<{ id: string; titulo: string; categoria: string; tipo: 'perdido' | 'encontrado'; motivo?: string | null }>>([]);

  ubicacionesMapa = signal<Record<string, string>>({});
  puntosMapa = signal<Record<string, string>>({});

  readonly categoriasOpciones = (Object.keys(CATEGORIAS) as CategoriaObjeto[]).map((id) => ({
    id,
    etiqueta: CATEGORIAS[id].label
  }));

  modalRechazoAbierto = signal(false);
  itemRechazoId = signal<string | null>(null);
  itemRechazoTipo = signal<'perdido' | 'encontrado' | null>(null);

  modalEditarAbierto = signal(false);
  itemEditandoId = signal<string | null>(null);
  itemEditandoTipo = signal<'perdido' | 'encontrado' | null>(null);

  rechazoForm = new FormGroup({
    motivoRechazo: new FormControl('', [Validators.required, Validators.minLength(5)])
  });

  editarForm = new FormGroup({
    categoria: new FormControl('', [Validators.required]),
    descripcion: new FormControl('', [Validators.required])
  });

  constructor() {
    effect(() => {
      this.sedeAdmin.selectedSedeId();
      this.cargarDatos();
    });
  }

  ngOnInit(): void {
    this.cargarCatalogosLugares();
    this.cargarDatos();
  }

  setTab(tab: TabTipo): void {
    this.activeTab.set(tab);
  }

  private cargarCatalogosLugares(): void {
    this.ubicacionesService.obtenerTodasUbicacionesUbicacionesGet().subscribe({
      next: (lista) => {
        const mapa: Record<string, string> = {};
        for (const u of lista ?? []) {
          mapa[u.ubicacion_id] = u.nombre;
        }
        this.ubicacionesMapa.set(mapa);
      }
    });

    this.puntosService.obtenerTodosPuntosEntregaPuntosEntregaGet().subscribe({
      next: (lista) => {
        const mapa: Record<string, string> = {};
        for (const p of lista ?? []) {
          mapa[p.puntoEntrega_id] = p.nombre;
        }
        this.puntosMapa.set(mapa);
      }
    });
  }

  obtenerNombreUbicacion(id: string): string {
    return this.ubicacionesMapa()[id] || id;
  }

  obtenerNombrePuntoEntrega(id: string): string {
    return this.puntosMapa()[id] || id;
  }

  cargarDatos(): void {
    this.isLoading.set(true);

    forkJoin({
      perdidos: this.reportesService
        .obtenerReportesPerdidaReportesPerdidaGet(
          undefined, undefined, 'PENDIENTE', undefined, false, undefined, undefined, undefined, undefined, 0, 100
        )
        .pipe(catchError((err) => {
          this.mostrarFeedback(mensajeDeError(err, 'No se pudieron cargar los reportes de pérdida.'));
          return of([] as ReportePerdidaResponse[]);
        })),
      encontrados: this.encontradosService
        .obtenerPublicacionesEncontradasPublicacionesEncontradasGet(
          undefined, undefined, 'PENDIENTE', undefined, undefined, false, undefined, undefined, undefined, undefined, 0, 100
        )
        .pipe(catchError((err) => {
          this.mostrarFeedback(mensajeDeError(err, 'No se pudieron cargar las publicaciones de encontrados.'));
          return of([] as PublicacionEncontradoResponse[]);
        })),
      bajasPerdidos: this.reportesService
        .obtenerReportesPerdidaReportesPerdidaGet(
          undefined, undefined, undefined, undefined, true, undefined, undefined, undefined, undefined, 0, 100
        )
        .pipe(catchError(() => of([] as ReportePerdidaResponse[]))),
      bajasEncontrados: this.encontradosService
        .obtenerPublicacionesEncontradasPublicacionesEncontradasGet(
          undefined, undefined, undefined, undefined, undefined, true, undefined, undefined, undefined, undefined, 0, 100
        )
        .pipe(catchError(() => of([] as PublicacionEncontradoResponse[])))
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe(({ perdidos, encontrados, bajasPerdidos, bajasEncontrados }) => {
        this.listaPerdidos.set((perdidos ?? []).filter((p) => p.estado === 'PENDIENTE'));
        this.listaEncontrados.set((encontrados ?? []).filter((e) => e.estado === 'PENDIENTE'));

        const bajasUnificadas = [
          ...(bajasPerdidos ?? []).map((r) => ({
            id: r.reportePerdida_id,
            titulo: r.descripcion,
            categoria: r.categoria,
            motivo: r.motivo_eliminacion,
            tipo: 'perdido' as const
          })),
          ...(bajasEncontrados ?? []).map((e) => ({
            id: e.publicacionEncontrado_id,
            titulo: e.descripcion,
            categoria: e.categoria,
            motivo: e.motivo_eliminacion,
            tipo: 'encontrado' as const
          }))
        ];
        this.listaBajas.set(bajasUnificadas);
      });
  }

  aprobarReportePerdida(id: string): void {
    this.reportesService.moderarReportePerdidaReportesPerdidaReporteIdModeracionPut(id, {
      estado: 'APROBADA' as any
    }).subscribe({
      next: () => {
        this.mostrarFeedback('Reporte de pérdida aprobado exitosamente.');
        this.listaPerdidos.update((list) => list.filter((item) => item.reportePerdida_id !== id));
      },
      error: (err) => {
        this.mostrarFeedback(mensajeDeError(err, 'Error al aprobar el reporte de pérdida.'));
      }
    });
  }

  aprobarPublicacionEncontrado(id: string): void {
    this.encontradosService.moderarPublicacionEncontradaPublicacionesEncontradasPublicacionIdModeracionPut(id, {
      estado: 'APROBADA' as any
    }).subscribe({
      next: () => {
        this.mostrarFeedback('Objeto verificado e ingresado exitosamente a custodia oficial ITM.');
        this.listaEncontrados.update((list) => list.filter((item) => item.publicacionEncontrado_id !== id));
      },
      error: (err) => {
        this.mostrarFeedback(mensajeDeError(err, 'Error al aprobar la publicación de hallazgo.'));
      }
    });
  }

  abrirModalRechazo(id: string, tipo: 'perdido' | 'encontrado'): void {
    this.itemRechazoId.set(id);
    this.itemRechazoTipo.set(tipo);
    this.rechazoForm.reset();
    this.modalRechazoAbierto.set(true);
  }

  cerrarModalRechazo(): void {
    this.modalRechazoAbierto.set(false);
    this.itemRechazoId.set(null);
  }

  seleccionarMotivoFrecuente(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (val) {
      this.rechazoForm.patchValue({ motivoRechazo: val });
    }
  }

  confirmarRechazo(): void {
    const id = this.itemRechazoId();
    const tipo = this.itemRechazoTipo();
    const motivo = this.rechazoForm.value.motivoRechazo?.trim();
    if (!id || !motivo) return;

    if (tipo === 'perdido') {
      this.reportesService.moderarReportePerdidaReportesPerdidaReporteIdModeracionPut(id, {
        estado: 'RECHAZADA' as any,
        motivo_rechazo: motivo
      } as any).subscribe({
        next: () => {
          this.mostrarFeedback('Reporte de pérdida rechazado con causal informada.');
          this.listaPerdidos.update((list) => list.filter((item) => item.reportePerdida_id !== id));
          this.cerrarModalRechazo();
        },
        error: (err) => {
          this.mostrarFeedback(mensajeDeError(err, 'No se pudo rechazar el reporte de pérdida.'));
        }
      });
    } else {
      this.encontradosService.moderarPublicacionEncontradaPublicacionesEncontradasPublicacionIdModeracionPut(id, {
        estado: 'RECHAZADA' as any,
        motivo_rechazo: motivo
      } as any).subscribe({
        next: () => {
          this.mostrarFeedback('Publicación de hallazgo rechazada.');
          this.listaEncontrados.update((list) => list.filter((item) => item.publicacionEncontrado_id !== id));
          this.cerrarModalRechazo();
        },
        error: (err) => {
          this.mostrarFeedback(mensajeDeError(err, 'No se pudo rechazar la publicación.'));
        }
      });
    }
  }

  abrirModalEditar(item: any, tipo: 'perdido' | 'encontrado'): void {
    const id = item.reportePerdida_id || item.publicacionEncontrado_id;
    this.itemEditandoId.set(id);
    this.itemEditandoTipo.set(tipo);
    this.editarForm.patchValue({
      categoria: item.categoria,
      descripcion: item.descripcion
    });
    this.modalEditarAbierto.set(true);
  }

  cerrarModalEditar(): void {
    this.modalEditarAbierto.set(false);
    this.itemEditandoId.set(null);
  }

  guardarEdicion(): void {
    const id = this.itemEditandoId();
    const tipo = this.itemEditandoTipo();
    if (!id || !tipo || this.editarForm.invalid) return;

    const val = {
      categoria: this.editarForm.value.categoria,
      descripcion: this.editarForm.value.descripcion?.trim()
    };
    const url = `${API_URL}/${tipo === 'perdido' ? 'reportes-perdida' : 'publicaciones-encontradas'}/${id}`;
    
    this.http.put(url, val).subscribe({
      next: () => {
        this.mostrarFeedback('Detalles de la publicación actualizados.');
        this.cerrarModalEditar();
        this.cargarDatos();
      },
      error: (err) => {
        this.mostrarFeedback(mensajeDeError(err, 'No se pudieron guardar los cambios.'));
      }
    });
  }

  resolverBaja(baja: { id: string; tipo: 'perdido' | 'encontrado' }, aceptar: boolean): void {
    const payload = {
      aprobar: aceptar,
      motivo: aceptar
        ? 'Solicitud de baja aprobada por administración ITM'
        : 'Solicitud de baja rechazada por administración ITM'
    };

    if (baja.tipo === 'perdido') {
      this.reportesService.resolverEliminacionReporteReportesPerdidaReporteIdResolverEliminacionPut(
        baja.id,
        payload
      ).subscribe({
        next: () => {
          this.mostrarFeedback(`Solicitud de baja ${aceptar ? 'aprobada y eliminada' : 'rechazada'}.`);
          this.listaBajas.update((list) => list.filter((b) => b.id !== baja.id));
        },
        error: (err) => {
          this.mostrarFeedback(mensajeDeError(err, 'Error al resolver la solicitud de baja.'));
        }
      });
    } else {
      this.encontradosService.resolverEliminacionPublicacionPublicacionesEncontradasPublicacionIdResolverEliminacionPut(
        baja.id,
        payload
      ).subscribe({
        next: () => {
          this.mostrarFeedback(`Solicitud de baja ${aceptar ? 'aprobada y eliminada' : 'rechazada'}.`);
          this.listaBajas.update((list) => list.filter((b) => b.id !== baja.id));
        },
        error: (err) => {
          this.mostrarFeedback(mensajeDeError(err, 'Error al resolver la solicitud de baja.'));
        }
      });
    }
  }

  formatearCategoria(cat: string): string {
    return CATEGORIAS[cat as CategoriaObjeto]?.label ?? cat;
  }

  obtenerIconoCategoria(cat: string): string {
    return CATEGORIAS[cat as CategoriaObjeto]?.icon ?? 'inventory_2';
  }

  formatearFecha(f: string | undefined): string {
    if (!f) return '';
    const d = new Date(f);
    return isNaN(d.getTime()) ? f : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  private mostrarFeedback(msg: string): void {
    this.snack.open(msg, 'Cerrar', { duration: 4000 });
  }
}
