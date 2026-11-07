import { Component, OnInit, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { API_URL } from '../../../core/api.config';
import { CATEGORIAS } from '../../../core/categorias';
import { mensajeDeError } from '../../../core/api-error';
import { CategoriaObjeto } from '../../../api/model/categoriaObjeto';
import { EstadoCustodia } from '../../../api/model/estadoCustodia';
import { ObjetoEnCustodiaResponse } from '../../../api/model/objetoEnCustodiaResponse';
import { PuntoEntregaResponse } from '../../../api/model/puntoEntregaResponse';
import { AuthService } from '../../../core/auth.service';
import { SedeAdminService } from '../../../core/sede-admin.service';

@Component({
  selector: 'app-custodia-inventario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="itm-tab-content">

      <!-- Barra de Acciones y Filtros -->
      <div class="itm-filter-bar">
        <form [formGroup]="filterForm" (ngSubmit)="aplicarFiltros()" class="filter-grid">
          <div class="itm-field">
            <label for="filtroEstado" class="itm-label">Estado</label>
            <select id="filtroEstado" formControlName="estado" class="itm-select">
              <option value="">Todos los estados</option>
              <option value="EN_CUSTODIA">En Custodia Oficial</option>
              <option value="POR_VENCER">Por Vencer</option>
              <option value="SIN_DUENO_DEFINITIVO">Sin Dueño Definitivo</option>
              <option value="RECLAMADO">Reclamado / Entregado</option>
            </select>
          </div>

          <div class="itm-field">
            <label for="filtroCategoria" class="itm-label">Categoría</label>
            <select id="filtroCategoria" formControlName="categoria" class="itm-select">
              <option value="">Todas las categorías</option>
              @for (cat of listaCategorias; track cat.id) {
                <option [value]="cat.id">{{ cat.label }}</option>
              }
            </select>
          </div>

          <div class="itm-field">
            <label for="filtroPunto" class="itm-label">Punto de Custodia</label>
            <select id="filtroPunto" formControlName="punto_entrega" class="itm-select">
              <option value="">Todos los puntos</option>
              @for (pto of puntosEntrega(); track pto.puntoEntrega_id) {
                <option [value]="pto.puntoEntrega_id">{{ pto.nombre }}</option>
              }
            </select>
          </div>

          <div class="itm-field">
            <label for="filtroValidacion" class="itm-label">En Validación</label>
            <select id="filtroValidacion" formControlName="en_proceso_validacion" class="itm-select">
              <option value="">Todos</option>
              <option value="true">Sí (Con reclamo activo)</option>
              <option value="false">No (Disponible)</option>
            </select>
          </div>

          <div class="filter-actions">
            <button type="submit" class="itm-btn itm-btn-primary" [disabled]="cargando()">
              <mat-icon>filter_alt</mat-icon>
              <span>Filtrar</span>
            </button>
            <button type="button" (click)="limpiarFiltros()" class="itm-btn itm-btn-ghost">
              <mat-icon>refresh</mat-icon>
              <span>Limpiar</span>
            </button>
          </div>
        </form>

        <div class="top-buttons">
          <button
            type="button"
            (click)="revisarVencimientos()"
            [disabled]="revisandoVencimientos()"
            class="itm-btn itm-btn-outline"
            title="Verificar fechas de alerta y objetos candidatos a archivar">
            <mat-icon [class.spin-icon]="revisandoVencimientos()">schedule</mat-icon>
            <span>Revisar Vencimientos</span>
          </button>

          <button
            type="button"
            (click)="abrirModalCrear()"
            class="itm-btn itm-btn-primary">
            <mat-icon>add_box</mat-icon>
            <span>Ingresar Objeto</span>
          </button>
        </div>
      </div>

      <!-- Mensaje de Error si la API falla -->
      @if (errorMensaje()) {
        <div class="error-banner">
          <mat-icon>error_outline</mat-icon>
          <div class="error-banner-text">
            <h4>Error al consultar el inventario</h4>
            <p>{{ errorMensaje() }}</p>
          </div>
          <button type="button" (click)="cargarObjetos()" class="itm-btn itm-btn-outline" style="border-color: #f3c7c1; color: #7a1f14;">
            Reintentar
          </button>
        </div>
      }

      <!-- Tabla de Objetos en Custodia -->
      <div class="itm-table-card">
        @if (cargando()) {
          <div class="itm-empty-state" style="border: none;">
            <div class="itm-empty-icon">
              <mat-icon class="spin-icon">sync</mat-icon>
            </div>
            <h3 style="margin: 8px 0 0; font-size: 1rem;">Cargando inventario físico...</h3>
            <p style="margin: 0; font-size: 0.82rem; color: #6b7280;">Sincronizando con los puntos de custodia del campus ITM</p>
          </div>
        } @else if (objetos().length === 0) {
          <div class="itm-empty-state" style="border: none;">
            <div class="itm-empty-icon">
              <mat-icon>inventory_2</mat-icon>
            </div>
            <h3 style="margin: 8px 0 0; font-size: 1.05rem;">No hay objetos en custodia</h3>
            <p style="margin: 0; font-size: 0.85rem; color: #6b7280;">No se encontraron artículos físicos con los filtros actuales.</p>
          </div>
        } @else {
          <div class="itm-table-scroll">
            <table class="itm-table">
              <thead>
                <tr>
                  <th>Código / Foto</th>
                  <th>Categoría</th>
                  <th>Descripción del Artículo</th>
                  <th>Punto de Custodia</th>
                  <th>Fecha Ingreso</th>
                  <th>Estado</th>
                  <th style="text-align: center;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (item of objetos(); track item.objetoEnCustodia_id) {
                  <tr>
                    <td>
                      <div class="item-code-cell">
                        @if (item.imagen_url) {
                          <img
                            [src]="item.imagen_url"
                            [alt]="item.descripcion"
                            class="thumb-img"
                            referrerpolicy="no-referrer"
                          />
                        } @else {
                          <div class="thumb-placeholder">
                            <mat-icon>{{ obtenerIconoCategoria(item.categoria) }}</mat-icon>
                          </div>
                        }
                        <div>
                          <span class="itm-badge itm-badge-primary mono">
                            OP-{{ item.objetoEnCustodia_id.slice(-6).toUpperCase() }}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div class="cat-pill">
                        <mat-icon class="cat-icon">{{ obtenerIconoCategoria(item.categoria) }}</mat-icon>
                        <span>{{ obtenerEtiquetaCategoria(item.categoria) }}</span>
                      </div>
                    </td>

                    <td>
                      <div class="desc-text" [title]="item.descripcion">{{ item.descripcion }}</div>
                      @if (item.detalles_internos) {
                        <div class="internal-notes" [title]="item.detalles_internos">
                          <strong>Obs:</strong> {{ item.detalles_internos }}
                        </div>
                      }
                    </td>

                    <td>
                      <div class="location-name">
                        <mat-icon>place</mat-icon>
                        <span>{{ obtenerNombrePunto(item.lugar_origen_id) }}</span>
                      </div>
                    </td>

                    <td style="font-size: 0.82rem; white-space: nowrap; color: #4b5563;">
                      {{ formatearFecha(item.fecha_ingreso) }}
                    </td>

                    <td>
                      <div class="status-stack">
                        @switch (item.estado) {
                          @case ('EN_CUSTODIA') {
                            <span class="itm-badge itm-badge-primary">En Custodia</span>
                          }
                          @case ('POR_VENCER') {
                            <span class="itm-badge itm-badge-warning">Por Vencer</span>
                          }
                          @case ('SIN_DUENO_DEFINITIVO') {
                            <span class="itm-badge itm-badge-danger">Sin Dueño</span>
                          }
                          @case ('RECLAMADO') {
                            <span class="itm-badge itm-badge-success">Reclamado</span>
                          }
                          @default {
                            <span class="itm-badge itm-badge-neutral">{{ item.estado }}</span>
                          }
                        }

                        @if (item.en_proceso_validacion) {
                          <span class="itm-badge itm-badge-cyan" title="Hay un reclamo ciudadano en trámite sobre este objeto">
                            En Validación
                          </span>
                        }
                      </div>
                    </td>

                    <td style="text-align: center;">
                      <div class="action-buttons-cell">
                        <button
                          type="button"
                          (click)="abrirModalEditar(item)"
                          class="itm-btn itm-btn-outline compact"
                          title="Editar información">
                          <mat-icon>edit</mat-icon>
                        </button>

                        <button
                          type="button"
                          (click)="gestionarPreguntas.emit(item.objetoEnCustodia_id)"
                          class="itm-btn itm-btn-outline compact"
                          title="Gestionar preguntas de seguridad">
                          <mat-icon>quiz</mat-icon>
                        </button>

                        @if (item.en_proceso_validacion) {
                          <button
                            type="button"
                            (click)="liberarObjeto(item)"
                            class="itm-btn itm-btn-outline compact"
                            title="Liberar validación">
                            <mat-icon>lock_open</mat-icon>
                          </button>
                        } @else {
                          <button
                            type="button"
                            (click)="bloquearObjeto(item)"
                            class="itm-btn itm-btn-outline compact"
                            title="Bloquear para validación">
                            <mat-icon>lock</mat-icon>
                          </button>
                        }

                        @if (item.estado !== 'RECLAMADO') {
                          <button
                            type="button"
                            (click)="marcarReclamado(item)"
                            class="itm-btn itm-btn-outline compact"
                            title="Marcar como reclamado directamente">
                            <mat-icon>check_circle</mat-icon>
                          </button>
                        }

                        @if (item.estado !== 'SIN_DUENO_DEFINITIVO' && item.estado !== 'RECLAMADO') {
                          <button
                            type="button"
                            (click)="archivarSinDueno(item)"
                            class="itm-btn itm-btn-outline compact itm-btn-danger"
                            title="Archivar sin dueño definitivo">
                            <mat-icon>archive</mat-icon>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Paginación -->
          <div class="itm-pagination">
            <span>
              Página {{ paginaActual() + 1 }} · Mostrando {{ objetos().length }} registros
            </span>
            <div style="display: flex; gap: 8px;">
              <button
                type="button"
                [disabled]="paginaActual() === 0 || cargando()"
                (click)="cambiarPagina(paginaActual() - 1)"
                class="itm-btn itm-btn-outline compact">
                <mat-icon>chevron_left</mat-icon>
                <span>Anterior</span>
              </button>
              <button
                type="button"
                [disabled]="objetos().length < limitePorPagina || cargando()"
                (click)="cambiarPagina(paginaActual() + 1)"
                class="itm-btn itm-btn-outline compact">
                <span>Siguiente</span>
                <mat-icon>chevron_right</mat-icon>
              </button>
            </div>
          </div>
        }
      </div>

    </div>

    <!-- Modal Ingresar Objeto -->
    @if (modalCrearAbierto()) {
      <div class="itm-modal-backdrop">
        <div class="itm-modal-card wide">
          <div class="itm-modal-header">
            <h3>
              <mat-icon>add_box</mat-icon>
              <span>Ingresar Nuevo Objeto a Custodia Oficial</span>
            </h3>
            <button type="button" (click)="cerrarModalCrear()" class="itm-modal-close">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="crearForm" (ngSubmit)="guardarNuevoObjeto()">
            <div class="itm-modal-body">
              <div class="form-row-2">
                <div class="itm-field">
                  <label for="crearCat" class="itm-label">Categoría *</label>
                  <select id="crearCat" formControlName="categoria" class="itm-select">
                    @for (cat of listaCategorias; track cat.id) {
                      <option [value]="cat.id">{{ cat.label }}</option>
                    }
                  </select>
                </div>

                <div class="itm-field">
                  <label for="crearPunto" class="itm-label">Punto de Entrega / Custodia *</label>
                  <select id="crearPunto" formControlName="lugar_origen_id" class="itm-select">
                    <option value="" disabled>Selecciona el punto de custodia</option>
                    @for (pto of puntosEntrega(); track pto.puntoEntrega_id) {
                      <option [value]="pto.puntoEntrega_id">{{ pto.nombre }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="itm-field">
                <label for="crearFecha" class="itm-label">Fecha de Ingreso *</label>
                <input id="crearFecha" type="date" formControlName="fecha_ingreso" class="itm-input" />
              </div>

              <div class="itm-field">
                <label for="crearDesc" class="itm-label">Descripción Pública del Objeto *</label>
                <textarea
                  id="crearDesc"
                  formControlName="descripcion"
                  rows="3"
                  class="itm-textarea"
                  placeholder="Detalles visuales generales para el catálogo institucional..."></textarea>
              </div>

              <div class="itm-field">
                <label for="crearObs" class="itm-label">Detalles Internos / Observaciones Privadas</label>
                <textarea
                  id="crearObs"
                  formControlName="detalles_internos"
                  rows="2"
                  class="itm-textarea"
                  placeholder="Información confidencial solo para el custodio (número de serie, contenido privado)..."></textarea>
              </div>

              <!-- Carga de Foto -->
              <div class="itm-field">
                <label class="itm-label">Fotografía del Objeto (Opcional · JPG o PNG máx. 5 MB)</label>
                <div class="upload-zone">
                  @if (!nuevaFotoUrl()) {
                    <label class="dropzone" [class.disabled]="subiendoFoto()">
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        (change)="seleccionarFoto($event)"
                        [disabled]="subiendoFoto()"
                        hidden
                      />
                      <mat-icon>{{ subiendoFoto() ? 'hourglass_top' : 'add_a_photo' }}</mat-icon>
                      <span>{{ subiendoFoto() ? 'Subiendo fotografía...' : 'Adjuntar fotografía del objeto' }}</span>
                    </label>
                  } @else {
                    <div class="preview-box">
                      <img [src]="nuevaFotoUrl()!" alt="Foto del objeto" class="preview-img" referrerpolicy="no-referrer" />
                      <button type="button" (click)="quitarFoto()" class="itm-btn itm-btn-danger compact">
                        <mat-icon>delete</mat-icon>
                        <span>Quitar Foto</span>
                      </button>
                    </div>
                  }
                </div>
              </div>
            </div>

            <div class="itm-modal-footer">
              <button type="button" (click)="cerrarModalCrear()" class="itm-btn itm-btn-ghost">
                Cancelar
              </button>
              <button
                type="submit"
                class="itm-btn itm-btn-primary"
                [disabled]="crearForm.invalid || guardando() || subiendoFoto()">
                <mat-icon>{{ guardando() ? 'sync' : 'save' }}</mat-icon>
                <span>{{ guardando() ? 'Guardando...' : 'Ingresar a Custodia' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Modal Editar Objeto -->
    @if (modalEditarAbierto() && objetoEditando(); as item) {
      <div class="itm-modal-backdrop">
        <div class="itm-modal-card">
          <div class="itm-modal-header">
            <h3>
              <mat-icon>edit</mat-icon>
              <span>Editar Objeto en Custodia</span>
            </h3>
            <button type="button" (click)="cerrarModalEditar()" class="itm-modal-close">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="editarForm" (ngSubmit)="guardarEdicionObjeto()">
            <div class="itm-modal-body">
              <div class="itm-field">
                <label for="editCat" class="itm-label">Categoría *</label>
                <select id="editCat" formControlName="categoria" class="itm-select">
                  @for (cat of listaCategorias; track cat.id) {
                    <option [value]="cat.id">{{ cat.label }}</option>
                  }
                </select>
              </div>

              <div class="itm-field">
                <label for="editDesc" class="itm-label">Descripción Pública *</label>
                <textarea
                  id="editDesc"
                  formControlName="descripcion"
                  rows="3"
                  class="itm-textarea"></textarea>
              </div>

              <div class="itm-field">
                <label for="editDetalles" class="itm-label">Detalles Internos / Confidenciales</label>
                <textarea
                  id="editDetalles"
                  formControlName="detalles_internos"
                  rows="2"
                  class="itm-textarea"></textarea>
              </div>
            </div>

            <div class="itm-modal-footer">
              <button type="button" (click)="cerrarModalEditar()" class="itm-btn itm-btn-ghost">
                Cancelar
              </button>
              <button
                type="submit"
                class="itm-btn itm-btn-primary"
                [disabled]="editarForm.invalid || guardando()">
                <mat-icon>save</mat-icon>
                <span>Guardar Cambios</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .filter-actions {
      display: flex;
      gap: 8px;
    }

    .top-buttons {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      margin-bottom: 16px;
      background: #fdf1ef;
      border: 1px solid #f3c7c1;
      border-left: 5px solid #b23b24;
      border-radius: 12px;
      color: #7a1f14;
    }

    .error-banner-text {
      flex: 1;
    }

    .error-banner-text h4 {
      margin: 0 0 2px;
      font-size: 0.92rem;
      font-weight: 700;
    }

    .error-banner-text p {
      margin: 0;
      font-size: 0.82rem;
    }

    .item-code-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .thumb-img {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      object-fit: cover;
      border: 1px solid #e5e7eb;
      flex-shrink: 0;
    }

    .thumb-placeholder {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      background: #f1f5f9;
      color: var(--ing-1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .cat-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      font-size: 0.82rem;
      color: var(--ing-1);
    }

    .cat-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      color: var(--ing-2);
    }

    .desc-text {
      font-weight: 600;
      color: #1f2937;
      max-width: 280px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .internal-notes {
      font-size: 0.74rem;
      color: #6b7280;
      max-width: 280px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }

    .location-name {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      font-size: 0.82rem;
      color: #4b5563;
    }

    .location-name mat-icon {
      flex: 0 0 16px;
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      margin-top: 1px;
      color: var(--ing-1);
    }

    .status-stack {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: flex-start;
    }

    .action-buttons-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .itm-btn.compact {
      padding: 6px 10px !important;
      font-size: 0.76rem !important;
      height: 32px !important;
    }

    .itm-btn.compact mat-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
    }

    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    @media (max-width: 600px) {
      .form-row-2 {
        grid-template-columns: 1fr;
      }
    }

    .upload-zone {
      margin-top: 6px;
    }

    .dropzone {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border: 2px dashed #cbd5e1;
      border-radius: 10px;
      background: #f8fafc;
      cursor: pointer;
      color: var(--ing-1);
      font-weight: 600;
      font-size: 0.84rem;
      transition: all 0.2s;
    }

    .dropzone:hover:not(.disabled) {
      border-color: var(--ing-2);
      background: #f0f9fb;
    }

    .dropzone.disabled {
      opacity: 0.6;
      cursor: wait;
    }

    .preview-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .preview-img {
      width: 54px;
      height: 54px;
      border-radius: 8px;
      object-fit: cover;
      border: 1px solid #e5e7eb;
    }

    .mono {
      font-family: monospace;
      letter-spacing: 0.04em;
    }

    .spin-icon {
      animation: itmSpin 1s linear infinite;
    }

    @keyframes itmSpin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class CustodiaInventarioComponent implements OnInit {
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);
  private sedeAdmin = inject(SedeAdminService);

  gestionarPreguntas = output<string>();

  objetos = signal<ObjetoEnCustodiaResponse[]>([]);
  puntosEntrega = signal<PuntoEntregaResponse[]>([]);
  cargando = signal<boolean>(false);
  errorMensaje = signal<string | null>(null);

  paginaActual = signal<number>(0);
  readonly limitePorPagina = 20;

  revisandoVencimientos = signal<boolean>(false);
  guardando = signal<boolean>(false);
  subiendoFoto = signal<boolean>(false);
  nuevaFotoUrl = signal<string | null>(null);

  modalCrearAbierto = signal<boolean>(false);
  modalEditarAbierto = signal<boolean>(false);
  objetoEditando = signal<ObjetoEnCustodiaResponse | null>(null);

  readonly listaCategorias = (Object.keys(CATEGORIAS) as CategoriaObjeto[]).map((key) => ({
    id: key,
    label: CATEGORIAS[key].label,
    icon: CATEGORIAS[key].icon
  }));

  filterForm = new FormGroup({
    estado: new FormControl<string>(''),
    categoria: new FormControl<string>(''),
    punto_entrega: new FormControl<string>(''),
    en_proceso_validacion: new FormControl<string>('')
  });

  crearForm = new FormGroup({
    categoria: new FormControl<CategoriaObjeto>(CategoriaObjeto.Electronicos, [Validators.required]),
    lugar_origen_id: new FormControl<string>('', [Validators.required]),
    fecha_ingreso: new FormControl<string>(new Date().toISOString().substring(0, 10), [Validators.required]),
    descripcion: new FormControl<string>('', [Validators.required, Validators.minLength(3)]),
    detalles_internos: new FormControl<string>('')
  });

  editarForm = new FormGroup({
    categoria: new FormControl<CategoriaObjeto>(CategoriaObjeto.Electronicos, [Validators.required]),
    descripcion: new FormControl<string>('', [Validators.required, Validators.minLength(3)]),
    detalles_internos: new FormControl<string>('')
  });

  ngOnInit(): void {
    this.cargarPuntosEntrega();
    this.cargarObjetos();
  }

  cargarPuntosEntrega(): void {
    const sedeId = this.auth.isSuperAdmin() ? this.sedeAdmin.selectedSedeId() : this.auth.getUserSedeId();
    if (!sedeId) {
      this.puntosEntrega.set([]);
      return;
    }
    this.http.get<PuntoEntregaResponse[]>(`${API_URL}/puntos-entrega/?sede_id=${sedeId}&activa=true`).subscribe({
      next: (ptos) => this.puntosEntrega.set(Array.isArray(ptos) ? ptos : []),
      error: () => this.puntosEntrega.set([])
    });
  }

  cargarObjetos(): void {
    this.cargando.set(true);
    this.errorMensaje.set(null);

    let params = new HttpParams()
      .set('skip', (this.paginaActual() * this.limitePorPagina).toString())
      .set('limit', this.limitePorPagina.toString());

    const { estado, categoria, punto_entrega, en_proceso_validacion } = this.filterForm.value;
    if (estado) params = params.set('estado', estado);
    if (categoria) params = params.set('categoria', categoria);
    if (punto_entrega) params = params.set('punto_entrega', punto_entrega);
    if (en_proceso_validacion !== '' && en_proceso_validacion !== null && en_proceso_validacion !== undefined) {
      params = params.set('en_proceso_validacion', en_proceso_validacion === 'true');
    }

    this.http.get<ObjetoEnCustodiaResponse[]>(`${API_URL}/objetos-custodia/`, { params })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (data) => {
          this.objetos.set(Array.isArray(data) ? data : []);
        },
        error: (err) => {
          this.objetos.set([]);
          this.errorMensaje.set(mensajeDeError(err, 'No se pudo conectar con el inventario de objetos en custodia.'));
        }
      });
  }

  aplicarFiltros(): void {
    this.paginaActual.set(0);
    this.cargarObjetos();
  }

  limpiarFiltros(): void {
    this.filterForm.reset({
      estado: '',
      categoria: '',
      punto_entrega: '',
      en_proceso_validacion: ''
    });
    this.paginaActual.set(0);
    this.cargarObjetos();
  }

  cambiarPagina(nuevaPagina: number): void {
    this.paginaActual.set(nuevaPagina);
    this.cargarObjetos();
  }

  revisarVencimientos(): void {
    this.revisandoVencimientos.set(true);
    this.http.post<{ mensaje?: string }>(`${API_URL}/objetos-custodia/expiracion`, {})
      .pipe(finalize(() => this.revisandoVencimientos.set(false)))
      .subscribe({
        next: (res) => {
          this.snack.open(res.mensaje || 'Revisión de vencimientos procesada correctamente.', 'Cerrar', {
            duration: 5000
          });
          this.cargarObjetos();
        },
        error: (err) => {
          this.snack.open(mensajeDeError(err, 'Error al revisar vencimientos de objetos.'), 'Cerrar', {
            duration: 5000
          });
        }
      });
  }

  abrirModalCrear(): void {
    this.nuevaFotoUrl.set(null);
    this.subiendoFoto.set(false);
    this.crearForm.reset({
      categoria: CategoriaObjeto.Electronicos,
      lugar_origen_id: this.puntosEntrega().length > 0 ? this.puntosEntrega()[0].puntoEntrega_id : '',
      fecha_ingreso: new Date().toISOString().substring(0, 10),
      descripcion: '',
      detalles_internos: ''
    });
    this.modalCrearAbierto.set(true);
  }

  cerrarModalCrear(): void {
    this.modalCrearAbierto.set(false);
  }

  seleccionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      this.snack.open('Formato no válido. Solo se admiten imágenes JPG o PNG.', 'Cerrar', { duration: 4000 });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.snack.open('La fotografía no debe superar 5 MB.', 'Cerrar', { duration: 4000 });
      return;
    }

    const formData = new FormData();
    formData.append('archivo', file);
    this.subiendoFoto.set(true);

    this.http.post<{ url: string }>(`${API_URL}/imagenes`, formData)
      .pipe(finalize(() => this.subiendoFoto.set(false)))
      .subscribe({
        next: (res) => {
          this.nuevaFotoUrl.set(res.url);
          this.snack.open('Fotografía cargada correctamente.', 'Cerrar', { duration: 3000 });
        },
        error: (err) => {
          this.snack.open(mensajeDeError(err, 'No se pudo subir la fotografía.'), 'Cerrar', { duration: 5000 });
        }
      });
  }

  quitarFoto(): void {
    this.nuevaFotoUrl.set(null);
  }

  guardarNuevoObjeto(): void {
    if (this.crearForm.invalid || this.guardando()) return;
    const val = this.crearForm.getRawValue();

    const payload = {
      categoria: val.categoria || CategoriaObjeto.Electronicos,
      descripcion: (val.descripcion || '').trim(),
      lugar_origen_id: val.lugar_origen_id || '',
      fecha_ingreso: val.fecha_ingreso || new Date().toISOString().substring(0, 10),
      imagen_url: this.nuevaFotoUrl() || undefined,
      detalles_internos: val.detalles_internos?.trim() || undefined
    };

    this.guardando.set(true);
    this.http.post(`${API_URL}/objetos-custodia/`, payload)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.snack.open('Objeto ingresado a custodia exitosamente.', 'Entendido', { duration: 4000 });
          this.cerrarModalCrear();
          this.cargarObjetos();
        },
        error: (err) => {
          this.snack.open(mensajeDeError(err, 'No se pudo ingresar el objeto a custodia.'), 'Cerrar', { duration: 5000 });
        }
      });
  }

  abrirModalEditar(item: ObjetoEnCustodiaResponse): void {
    this.objetoEditando.set(item);
    this.editarForm.setValue({
      categoria: item.categoria,
      descripcion: item.descripcion,
      detalles_internos: item.detalles_internos || ''
    });
    this.modalEditarAbierto.set(true);
  }

  cerrarModalEditar(): void {
    this.modalEditarAbierto.set(false);
    this.objetoEditando.set(null);
  }

  guardarEdicionObjeto(): void {
    const item = this.objetoEditando();
    if (!item || this.editarForm.invalid || this.guardando()) return;
    const val = this.editarForm.getRawValue();

    const payload = {
      categoria: val.categoria || CategoriaObjeto.Electronicos,
      descripcion: (val.descripcion || '').trim(),
      detalles_internos: val.detalles_internos?.trim() || undefined
    };

    this.guardando.set(true);
    this.http.put(`${API_URL}/objetos-custodia/${item.objetoEnCustodia_id}`, payload)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.snack.open('Datos del objeto actualizados exitosamente.', 'Cerrar', { duration: 4000 });
          this.cerrarModalEditar();
          this.cargarObjetos();
        },
        error: (err) => {
          this.snack.open(mensajeDeError(err, 'No se pudieron guardar las modificaciones.'), 'Cerrar', { duration: 5000 });
        }
      });
  }

  bloquearObjeto(item: ObjetoEnCustodiaResponse): void {
    this.http.put(`${API_URL}/objetos-custodia/${item.objetoEnCustodia_id}/bloquear`, {}).subscribe({
      next: () => {
        this.snack.open(`Objeto OP-${item.objetoEnCustodia_id.slice(-6).toUpperCase()} bloqueado en validación.`, 'Cerrar', { duration: 3500 });
        this.cargarObjetos();
      },
      error: (err) => {
        this.snack.open(mensajeDeError(err, 'Error al bloquear el objeto.'), 'Cerrar', { duration: 4500 });
      }
    });
  }

  liberarObjeto(item: ObjetoEnCustodiaResponse): void {
    this.http.put(`${API_URL}/objetos-custodia/${item.objetoEnCustodia_id}/liberar`, {}).subscribe({
      next: () => {
        this.snack.open(`Objeto OP-${item.objetoEnCustodia_id.slice(-6).toUpperCase()} liberado exitosamente.`, 'Cerrar', { duration: 3500 });
        this.cargarObjetos();
      },
      error: (err) => {
        this.snack.open(mensajeDeError(err, 'Error al liberar el objeto.'), 'Cerrar', { duration: 4500 });
      }
    });
  }

  marcarReclamado(item: ObjetoEnCustodiaResponse): void {
    const confirmar = confirm(`¿Confirmas que el objeto OP-${item.objetoEnCustodia_id.slice(-6).toUpperCase()} fue entregado y debe marcarse como RECLAMADO?`);
    if (!confirmar) return;

    this.http.put(`${API_URL}/objetos-custodia/${item.objetoEnCustodia_id}/marcar-reclamado`, {}).subscribe({
      next: () => {
        this.snack.open(`Objeto OP-${item.objetoEnCustodia_id.slice(-6).toUpperCase()} marcado como RECLAMADO.`, 'Cerrar', { duration: 4000 });
        this.cargarObjetos();
      },
      error: (err) => {
        this.snack.open(mensajeDeError(err, 'Error al marcar el objeto como reclamado.'), 'Cerrar', { duration: 5000 });
      }
    });
  }

  archivarSinDueno(item: ObjetoEnCustodiaResponse): void {
    const confirmar = confirm(`¿Estás seguro de archivar definitivamente el objeto OP-${item.objetoEnCustodia_id.slice(-6).toUpperCase()} como SIN DUEÑO? Esta acción no se puede revertir.`);
    if (!confirmar) return;

    this.http.put(`${API_URL}/objetos-custodia/${item.objetoEnCustodia_id}/archivar-sin-dueno`, {}).subscribe({
      next: () => {
        this.snack.open(`Objeto OP-${item.objetoEnCustodia_id.slice(-6).toUpperCase()} archivado como SIN DUEÑO DEFINITIVO.`, 'Cerrar', { duration: 4000 });
        this.cargarObjetos();
      },
      error: (err) => {
        this.snack.open(mensajeDeError(err, 'Error al archivar el objeto.'), 'Cerrar', { duration: 5000 });
      }
    });
  }

  obtenerNombrePunto(id: string): string {
    const pto = this.puntosEntrega().find(p => p.puntoEntrega_id === id);
    return pto?.nombre || 'Punto Oficial ITM';
  }

  obtenerEtiquetaCategoria(cat: string): string {
    return CATEGORIAS[cat as CategoriaObjeto]?.label ?? cat;
  }

  obtenerIconoCategoria(cat: string): string {
    return CATEGORIAS[cat as CategoriaObjeto]?.icon ?? 'inventory_2';
  }

  formatearFecha(f: string | undefined): string {
    if (!f) return '';
    const d = new Date(f);
    return isNaN(d.getTime()) ? f : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
