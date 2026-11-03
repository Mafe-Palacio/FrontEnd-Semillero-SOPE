import { Component, OnInit, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { API_URL } from '../../../core/api.config';
import { mensajeDeError } from '../../../core/api-error';
import { EstadoReclamo } from '../../../api/model/estadoReclamo';
import { ReclamoResponse } from '../../../api/model/reclamoResponse';
import { RespuestaSeguridadResponse } from '../../../api/model/respuestaSeguridadResponse';
import { PreguntaSeguridadResponse } from '../../../api/model/preguntaSeguridadResponse';
import { ActaEntregaCreate } from '../../../api/model/actaEntregaCreate';

export interface ComparacionRespuesta {
  preguntaTexto: string;
  respuestaUsuario: string;
  respuestaCorrecta: string;
}

@Component({
  selector: 'app-custodia-reclamos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="itm-tab-content">

      <!-- Filtros de Reclamos -->
      <div class="itm-filter-bar">
        <form [formGroup]="filterForm" (ngSubmit)="aplicarFiltros()" class="filter-grid">
          <div class="itm-field">
            <label for="filtroEstadoReclamo" class="itm-label">Estado del Reclamo</label>
            <select id="filtroEstadoReclamo" formControlName="estado" class="itm-select">
              <option value="">Todos los estados</option>
              <option value="ENVIADO">Enviado (Nuevo)</option>
              <option value="EN_REVISION">En Revisión</option>
              <option value="APROBADO">Aprobado</option>
              <option value="LISTO_PARA_RECOGER">Listo para Recoger (Con Cita)</option>
              <option value="RECLAMADO">Reclamado (Entregado con Acta)</option>
              <option value="RECHAZADO">Rechazado</option>
              <option value="CANCELADO_POR_USUARIO">Cancelado por Usuario</option>
            </select>
          </div>

          <div class="itm-field">
            <label for="filtroFechaDesde" class="itm-label">Desde</label>
            <input id="filtroFechaDesde" type="date" formControlName="fecha_desde" class="itm-input" />
          </div>

          <div class="itm-field">
            <label for="filtroFechaHasta" class="itm-label">Hasta</label>
            <input id="filtroFechaHasta" type="date" formControlName="fecha_hasta" class="itm-input" />
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
          <button type="button" (click)="cargarReclamos()" class="itm-btn itm-btn-outline">
            <mat-icon>refresh</mat-icon>
            <span>Actualizar Bandeja</span>
          </button>
        </div>
      </div>

      <!-- Error Banner -->
      @if (errorMensaje()) {
        <div class="error-banner">
          <mat-icon>error_outline</mat-icon>
          <div class="error-banner-text">
            <h4>No fue posible consultar los reclamos</h4>
            <p>{{ errorMensaje() }}</p>
          </div>
          <button type="button" (click)="cargarReclamos()" class="itm-btn itm-btn-outline" style="border-color: #f3c7c1; color: #7a1f14;">
            Reintentar
          </button>
        </div>
      }

      <!-- Tabla de Reclamos -->
      <div class="itm-table-card">
        @if (cargando()) {
          <div class="itm-empty-state" style="border: none;">
            <div class="itm-empty-icon">
              <mat-icon class="spin-icon">sync</mat-icon>
            </div>
            <h3 style="margin: 8px 0 0; font-size: 1rem;">Cargando solicitudes de reclamación...</h3>
            <p style="margin: 0; font-size: 0.82rem; color: #6b7280;">Consultando expedientes de titularidad en el servidor ITM</p>
          </div>
        } @else if (reclamos().length === 0) {
          <div class="itm-empty-state" style="border: none;">
            <div class="itm-empty-icon">
              <mat-icon>folder_open</mat-icon>
            </div>
            <h3 style="margin: 8px 0 0; font-size: 1.05rem;">No hay reclamos registrados</h3>
            <p style="margin: 0; font-size: 0.85rem; color: #6b7280;">No se encontraron solicitudes con los filtros aplicados.</p>
          </div>
        } @else {
          <div class="itm-table-scroll">
            <table class="itm-table">
              <thead>
                <tr>
                  <th>Código Reclamo</th>
                  <th>Objeto Asociado</th>
                  <th>Modalidad</th>
                  <th>Fecha de Envío</th>
                  <th>Estado</th>
                  <th style="text-align: center;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (r of reclamos(); track r.reclamo_id) {
                  <tr>
                    <td>
                      <span class="itm-badge itm-badge-primary mono">
                        REC-{{ r.reclamo_id.slice(-6).toUpperCase() }}
                      </span>
                    </td>

                    <td>
                      <div class="object-cell">
                        <mat-icon class="object-icon">inventory_2</mat-icon>
                        <span class="mono">OP-{{ r.objetoEnCustodia_id.slice(-6).toUpperCase() }}</span>
                      </div>
                    </td>

                    <td>
                      @if (r.es_presencial) {
                        <span class="itm-badge itm-badge-neutral">
                          <mat-icon style="font-size: 14px; width: 14px; height: 14px;">storefront</mat-icon>
                          Presencial
                        </span>
                      } @else {
                        <span class="itm-badge itm-badge-cyan">
                          <mat-icon style="font-size: 14px; width: 14px; height: 14px;">quiz</mat-icon>
                          Virtual (Preguntas)
                        </span>
                      }
                    </td>

                    <td style="font-size: 0.82rem; color: #4b5563; white-space: nowrap;">
                      {{ formatearFecha(r.fecha_envio) }}
                    </td>

                    <td>
                      @switch (r.estado) {
                        @case ('ENVIADO') {
                          <span class="itm-badge itm-badge-warning">Enviado (Nuevo)</span>
                        }
                        @case ('EN_REVISION') {
                          <span class="itm-badge itm-badge-cyan">En Revisión</span>
                        }
                        @case ('APROBADO') {
                          <span class="itm-badge itm-badge-success">Aprobado</span>
                        }
                        @case ('LISTO_PARA_RECOGER') {
                          <span class="itm-badge itm-badge-primary">Listo p/ Recoger</span>
                        }
                        @case ('RECLAMADO') {
                          <span class="itm-badge itm-badge-success">Entregado</span>
                        }
                        @case ('RECHAZADO') {
                          <span class="itm-badge itm-badge-danger">Rechazado</span>
                        }
                        @case ('CANCELADO_POR_USUARIO') {
                          <span class="itm-badge itm-badge-neutral">Cancelado Usuario</span>
                        }
                        @default {
                          <span class="itm-badge itm-badge-neutral">{{ r.estado }}</span>
                        }
                      }
                    </td>

                    <td style="text-align: center;">
                      <button
                        type="button"
                        (click)="abrirDetalleReclamo(r)"
                        class="itm-btn itm-btn-primary compact">
                        <mat-icon>description</mat-icon>
                        <span>Ver Expediente</span>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Paginación -->
          <div class="itm-pagination">
            <span>
              Página {{ paginaActual() + 1 }} · Mostrando {{ reclamos().length }} reclamos
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
                [disabled]="reclamos().length < limitePorPagina || cargando()"
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

    <!-- Modal Detalle y Gestión del Reclamo -->
    @if (modalDetalleAbierto() && reclamoSeleccionado(); as rec) {
      <div class="itm-modal-backdrop">
        <div class="itm-modal-card wide">
          <div class="itm-modal-header">
            <h3>
              <mat-icon>verified_user</mat-icon>
              <span>Expediente de Reclamo · REC-{{ rec.reclamo_id.slice(-6).toUpperCase() }}</span>
            </h3>
            <button type="button" (click)="cerrarDetalleReclamo()" class="itm-modal-close">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="itm-modal-body">
            <!-- Barra de Resumen del Reclamo -->
            <div class="claim-meta-grid">
              <div>
                <span class="itm-label">Objeto en Custodia</span>
                <div class="meta-val mono">OP-{{ rec.objetoEnCustodia_id.slice(-6).toUpperCase() }}</div>
              </div>
              <div>
                <span class="itm-label">Modalidad</span>
                <div class="meta-val">{{ rec.es_presencial ? 'Presencial en Sede' : 'Virtual con Cuestionario' }}</div>
              </div>
              <div>
                <span class="itm-label">Fecha de Envío</span>
                <div class="meta-val">{{ formatearFecha(rec.fecha_envio) }}</div>
              </div>
              <div>
                <span class="itm-label">Estado Actual</span>
                <div class="meta-val">
                  <span class="itm-badge itm-badge-primary">{{ rec.estado }}</span>
                </div>
              </div>
            </div>

            <!-- Evidencia Adjunta si existe -->
            @if (rec.evidencia_url) {
              <div class="evidence-box">
                <span class="itm-label">Soporte / Fotografía de Propiedad Adjunta por el Usuario:</span>
                <div style="margin-top: 8px;">
                  <a [href]="rec.evidencia_url" target="_blank" rel="noopener noreferrer">
                    <img [src]="rec.evidencia_url" alt="Evidencia" class="evidence-thumb" referrerpolicy="no-referrer" />
                  </a>
                </div>
              </div>
            }

            <!-- Cuestionario Virtual de Seguridad -->
            @if (!rec.es_presencial) {
              <div class="answers-section">
                <div class="answers-header">
                  <h4 style="margin: 0; font-size: 0.95rem; color: #102d69;">Cotejo de Preguntas de Seguridad</h4>
                  <button
                    type="button"
                    (click)="validarRespuestasAutomaticamente(rec.reclamo_id)"
                    [disabled]="validando()"
                    class="itm-btn itm-btn-outline compact">
                    <mat-icon [class.spin-icon]="validando()">auto_fix_high</mat-icon>
                    <span>Validar Respuestas Automáticamente</span>
                  </button>
                </div>

                @if (cargandoRespuestas()) {
                  <p style="font-size: 0.82rem; color: #6b7280;">Cargando respuestas del usuario...</p>
                } @else if (comparacionesRespuestas().length === 0) {
                  <p style="font-size: 0.82rem; color: #6b7280;">No se registraron respuestas virtuales para este reclamo.</p>
                } @else {
                  <div class="answers-cards">
                    @for (comp of comparacionesRespuestas(); track $index; let idx = $index) {
                      <div class="answer-card">
                        <strong class="answer-q">Pregunta {{ idx + 1 }}: {{ comp.preguntaTexto }}</strong>
                        <div class="answer-compare-grid">
                          <div class="user-ans">
                            <span class="ans-label">Respuesta del Usuario:</span>
                            <p>{{ comp.respuestaUsuario || '(Sin respuesta)' }}</p>
                          </div>
                          <div class="correct-ans">
                            <span class="ans-label">Respuesta Esperada (Admin):</span>
                            <p>{{ comp.respuestaCorrecta }}</p>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <!-- Acciones de Gestión según el Estado -->
            @if (rec.estado === 'ENVIADO' || rec.estado === 'EN_REVISION') {
              <div class="management-section">
                <h4 style="margin: 0 0 10px; font-size: 0.95rem; color: #102d69;">Gestión del Reclamo</h4>

                <div class="management-actions">
                  <button
                    type="button"
                    (click)="aprobarReclamo(rec.reclamo_id)"
                    [disabled]="guardando()"
                    class="itm-btn itm-btn-primary">
                    <mat-icon>check</mat-icon>
                    <span>Aprobar Reclamo</span>
                  </button>

                  <button
                    type="button"
                    (click)="mostrarFormCita.set(!mostrarFormCita())"
                    class="itm-btn itm-btn-outline">
                    <mat-icon>event</mat-icon>
                    <span>Agendar Cita de Retiro</span>
                  </button>

                  <button
                    type="button"
                    (click)="mostrarFormRechazo.set(!mostrarFormRechazo())"
                    class="itm-btn itm-btn-outline itm-btn-danger">
                    <mat-icon>close</mat-icon>
                    <span>Rechazar</span>
                  </button>
                </div>

                <!-- Formulario Agendar Cita -->
                @if (mostrarFormCita()) {
                  <div class="sub-form-card">
                    <h5 style="margin: 0 0 8px; font-size: 0.88rem; color: #102d69;">Programar Cita en Sede (Estado LISTO_PARA_RECOGER)</h5>
                    <div class="form-row-2">
                      <div class="itm-field">
                        <label class="itm-label">Fecha de Cita *</label>
                        <input type="date" [formControl]="fechaCitaControl" class="itm-input" />
                      </div>
                      <div class="itm-field">
                        <label class="itm-label">Horario (HH:mm) *</label>
                        <input type="time" [formControl]="horarioCitaControl" class="itm-input" />
                      </div>
                    </div>
                    <button
                      type="button"
                      (click)="confirmarCita(rec.reclamo_id)"
                      [disabled]="fechaCitaControl.invalid || horarioCitaControl.invalid || guardando()"
                      class="itm-btn itm-btn-primary"
                      style="margin-top: 10px;">
                      <mat-icon>save</mat-icon>
                      <span>Guardar Cita y Notificar</span>
                    </button>
                  </div>
                }

                <!-- Formulario Rechazo -->
                @if (mostrarFormRechazo()) {
                  <div class="sub-form-card danger">
                    <h5 style="margin: 0 0 8px; font-size: 0.88rem; color: #991b1b;">Rechazar Solicitud de Titularidad</h5>
                    <div class="itm-field">
                      <label class="itm-label">Motivo de Rechazo (Obligatorio) *</label>
                      <textarea
                        [formControl]="motivoRechazoControl"
                        rows="3"
                        class="itm-textarea"
                        placeholder="Explica la inconsistencia en las respuestas o la falta de soportes..."></textarea>
                    </div>
                    <button
                      type="button"
                      (click)="confirmarRechazo(rec.reclamo_id)"
                      [disabled]="motivoRechazoControl.invalid || guardando()"
                      class="itm-btn itm-btn-danger"
                      style="margin-top: 10px;">
                      <mat-icon>cancel</mat-icon>
                      <span>Confirmar Rechazo</span>
                    </button>
                  </div>
                }
              </div>
            }

            <!-- Botón de Generar Acta de Entrega si está APROBADO o LISTO_PARA_RECOGER -->
            @if (rec.estado === 'APROBADO' || rec.estado === 'LISTO_PARA_RECOGER') {
              <div class="acta-cta-banner">
                <div>
                  <h4 style="margin: 0 0 4px; color: #047857; font-size: 0.96rem;">
                    Reclamo Aprobado · Listo para Legalizar Entrega
                  </h4>
                  <p style="margin: 0; font-size: 0.82rem; color: #065f46;">
                    Al formalizar el acta se registrará la firma del reclamante y el objeto pasará a estado RECLAMADO.
                  </p>
                </div>
                <button
                  type="button"
                  (click)="abrirModalActa(rec)"
                  class="itm-btn itm-btn-primary"
                  style="background: #059669;">
                  <mat-icon>assignment_turned_in</mat-icon>
                  <span>Generar Acta de Entrega</span>
                </button>
              </div>
            }

            @if (rec.estado === 'RECHAZADO') {
              <div class="rejection-box">
                <strong>Motivo de rechazo:</strong>
                <p style="margin: 4px 0 0;">{{ rec.motivo_rechazo || 'No se especificó motivo.' }}</p>
              </div>
            }
          </div>

          <div class="itm-modal-footer">
            <button type="button" (click)="cerrarDetalleReclamo()" class="itm-btn itm-btn-ghost">
              Cerrar Expediente
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Modal Acta de Entrega (POST /actas-entrega) -->
    @if (modalActaAbierto()) {
      <div class="itm-modal-backdrop">
        <div class="itm-modal-card wide">
          <div class="itm-modal-header">
            <h3>
              <mat-icon>assignment_turned_in</mat-icon>
              <span>Generar Acta Oficial de Entrega ITM</span>
            </h3>
            <button type="button" (click)="cerrarModalActa()" class="itm-modal-close">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="actaForm" (ngSubmit)="guardarActaEntrega()">
            <div class="itm-modal-body">
              <p style="margin: 0; font-size: 0.84rem; color: #4b5563;">
                Todos los campos son estrictamente <strong>obligatorios</strong> para la legalización del acta institucional:
              </p>

              <div class="form-row-2">
                <div class="itm-field">
                  <label class="itm-label">Nombre Completo del Reclamante *</label>
                  <input type="text" formControlName="nombre_reclamante" class="itm-input" placeholder="Ej. Juan Pérez Gómez" />
                </div>

                <div class="itm-field">
                  <label class="itm-label">Cédula de Ciudadanía / Documento *</label>
                  <input type="text" formControlName="cedula_reclamante" class="itm-input" placeholder="Ej. 1020304050" />
                </div>
              </div>

              <div class="form-row-2">
                <div class="itm-field">
                  <label class="itm-label">Correo Institucional *</label>
                  <input type="email" formControlName="correo_reclamante" class="itm-input" placeholder="usuario@correo.itm.edu.co" />
                </div>

                <div class="itm-field">
                  <label class="itm-label">Celular de Contacto *</label>
                  <input type="text" formControlName="celular_reclamante" class="itm-input" placeholder="Ej. 3001234567" />
                </div>
              </div>

              <div class="itm-field">
                <label class="itm-label">Carnet Estudiantil / Funcionario ITM *</label>
                <input type="text" formControlName="carnet_reclamante" class="itm-input" placeholder="Ej. 1000123456" />
              </div>

              <!-- Firma del Reclamante (Upload) -->
              <div class="itm-field">
                <label class="itm-label">Soporte de Firma o Fotografía de Acta Física Firmada *</label>
                <div class="upload-zone">
                  @if (!firmaUrl()) {
                    <label class="dropzone" [class.disabled]="subiendoFirma()">
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        (change)="seleccionarFirma($event)"
                        [disabled]="subiendoFirma()"
                        hidden
                      />
                      <mat-icon>{{ subiendoFirma() ? 'hourglass_top' : 'draw' }}</mat-icon>
                      <span>{{ subiendoFirma() ? 'Subiendo firma digital...' : 'Adjuntar fotografía o escaneo de la firma' }}</span>
                    </label>
                  } @else {
                    <div class="preview-box">
                      <img [src]="firmaUrl()!" alt="Firma registrada" class="preview-img" referrerpolicy="no-referrer" />
                      <button type="button" (click)="quitarFirma()" class="itm-btn itm-btn-danger compact">
                        <mat-icon>delete</mat-icon>
                        <span>Cambiar Firma</span>
                      </button>
                    </div>
                  }
                </div>
              </div>

              <!-- Checkbox Validación Verbal -->
              <div class="checkbox-field">
                <input type="checkbox" id="checkVerbal" formControlName="validacion_verbal" />
                <label for="checkVerbal">
                  <strong>Validación Verbal Verificada:</strong> El custodio comprobó directamente en la oficina la titularidad y coincidencia de señas del artículo.
                </label>
              </div>
            </div>

            <div class="itm-modal-footer">
              <button type="button" (click)="cerrarModalActa()" class="itm-btn itm-btn-ghost">
                Cancelar
              </button>
              <button
                type="submit"
                class="itm-btn itm-btn-primary"
                [disabled]="actaForm.invalid || !firmaUrl() || guardando() || subiendoFirma()">
                <mat-icon>{{ guardando() ? 'sync' : 'check_circle' }}</mat-icon>
                <span>{{ guardando() ? 'Registrando Acta...' : 'Firmar y Entregar Objeto' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    }

  `,
  styles: [`
    .filter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) auto;
      gap: 12px;
      align-items: end;
      width: 100%;
    }

    .filter-actions {
      display: flex;
      gap: 8px;
    }

    .top-buttons {
      display: flex;
      gap: 10px;
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

    .object-cell {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      color: #102d69;
    }

    .object-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      color: #00a0b7;
    }

    .claim-meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px;
    }

    @media (max-width: 768px) {
      .claim-meta-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .meta-val {
      margin-top: 4px;
      font-weight: 700;
      font-size: 0.88rem;
      color: #1f2937;
    }

    .evidence-box {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px;
    }

    .evidence-thumb {
      max-height: 120px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      cursor: pointer;
    }

    .answers-section {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .answers-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .answers-cards {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .answer-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 12px 14px;
    }

    .answer-q {
      font-size: 0.86rem;
      color: #102d69;
    }

    .answer-compare-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 8px;
    }

    @media (max-width: 600px) {
      .answer-compare-grid {
        grid-template-columns: 1fr;
      }
    }

    .ans-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: #6b7280;
      text-transform: uppercase;
    }

    .user-ans p {
      margin: 2px 0 0;
      font-size: 0.85rem;
      font-weight: 700;
      color: #1f2937;
    }

    .correct-ans p {
      margin: 2px 0 0;
      font-size: 0.85rem;
      font-weight: 700;
      color: #047857;
    }

    .management-section {
      border: 1px solid #dbeafe;
      background: #f0f7ff;
      border-radius: 12px;
      padding: 16px;
    }

    .management-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .sub-form-card {
      margin-top: 14px;
      background: #ffffff;
      border: 1px solid #dbeafe;
      border-radius: 10px;
      padding: 14px;
    }

    .sub-form-card.danger {
      border-color: #fecaca;
      background: #fff5f5;
    }

    .acta-cta-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background: #ecfdf5;
      border: 1.5px solid #a7f3d0;
      border-radius: 12px;
      padding: 16px 20px;
      flex-wrap: wrap;
    }

    .rejection-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 0.85rem;
      color: #991b1b;
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

    .dropzone {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border: 2px dashed #cbd5e1;
      border-radius: 10px;
      background: #f8fafc;
      cursor: pointer;
      color: #102d69;
      font-weight: 600;
      font-size: 0.84rem;
      transition: all 0.2s;
    }

    .dropzone:hover:not(.disabled) {
      border-color: #00a0b7;
      background: #f0f9fb;
    }

    .preview-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .preview-img {
      max-height: 60px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }

    .checkbox-field {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 0.84rem;
      color: #374151;
      margin-top: 6px;
    }

    .checkbox-field input[type="checkbox"] {
      margin-top: 3px;
      cursor: pointer;
    }

    .mono {
      font-family: monospace;
    }

    .spin-icon {
      animation: itmSpin 1s linear infinite;
    }

    @keyframes itmSpin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class CustodiaReclamosComponent implements OnInit {
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);

  actaGenerada = output<void>();

  reclamos = signal<ReclamoResponse[]>([]);
  cargando = signal<boolean>(false);
  errorMensaje = signal<string | null>(null);

  paginaActual = signal<number>(0);
  readonly limitePorPagina = 20;

  modalDetalleAbierto = signal<boolean>(false);
  reclamoSeleccionado = signal<ReclamoResponse | null>(null);
  comparacionesRespuestas = signal<ComparacionRespuesta[]>([]);
  cargandoRespuestas = signal<boolean>(false);
  validando = signal<boolean>(false);
  guardando = signal<boolean>(false);

  mostrarFormCita = signal<boolean>(false);
  mostrarFormRechazo = signal<boolean>(false);
  fechaCitaControl = new FormControl<string>('', [Validators.required]);
  horarioCitaControl = new FormControl<string>('', [Validators.required]);
  motivoRechazoControl = new FormControl<string>('', [Validators.required, Validators.minLength(5)]);

  // Modal Acta
  modalActaAbierto = signal<boolean>(false);
  firmaUrl = signal<string | null>(null);
  subiendoFirma = signal<boolean>(false);

  filterForm = new FormGroup({
    estado: new FormControl<string>(''),
    fecha_desde: new FormControl<string>(''),
    fecha_hasta: new FormControl<string>('')
  });

  actaForm = new FormGroup({
    reclamo_id: new FormControl<string>('', [Validators.required]),
    nombre_reclamante: new FormControl<string>('', [Validators.required, Validators.minLength(3)]),
    cedula_reclamante: new FormControl<string>('', [Validators.required, Validators.minLength(4)]),
    correo_reclamante: new FormControl<string>('', [Validators.required, Validators.email]),
    celular_reclamante: new FormControl<string>('', [Validators.required, Validators.minLength(7)]),
    carnet_reclamante: new FormControl<string>('', [Validators.required, Validators.minLength(3)]),
    validacion_verbal: new FormControl<boolean>(true, [Validators.requiredTrue])
  });

  ngOnInit(): void {
    this.cargarReclamos();
  }

  cargarReclamos(): void {
    this.cargando.set(true);
    this.errorMensaje.set(null);

    let params = new HttpParams()
      .set('skip', (this.paginaActual() * this.limitePorPagina).toString())
      .set('limit', this.limitePorPagina.toString());

    const { estado, fecha_desde, fecha_hasta } = this.filterForm.value;
    if (estado) params = params.set('estado', estado);
    if (fecha_desde) params = params.set('fecha_desde', fecha_desde);
    if (fecha_hasta) params = params.set('fecha_hasta', fecha_hasta);

    this.http.get<ReclamoResponse[]>(`${API_URL}/reclamos`, { params })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (items) => {
          this.reclamos.set(Array.isArray(items) ? items : []);
        },
        error: (err) => {
          this.reclamos.set([]);
          this.errorMensaje.set(mensajeDeError(err, 'No se pudo cargar el listado de reclamos.'));
        }
      });
  }

  aplicarFiltros(): void {
    this.paginaActual.set(0);
    this.cargarReclamos();
  }

  limpiarFiltros(): void {
    this.filterForm.reset({
      estado: '',
      fecha_desde: '',
      fecha_hasta: ''
    });
    this.paginaActual.set(0);
    this.cargarReclamos();
  }

  cambiarPagina(nuevaPagina: number): void {
    this.paginaActual.set(nuevaPagina);
    this.cargarReclamos();
  }

  abrirDetalleReclamo(rec: ReclamoResponse): void {
    this.reclamoSeleccionado.set(rec);
    this.mostrarFormCita.set(false);
    this.mostrarFormRechazo.set(false);
    this.modalDetalleAbierto.set(true);

    if (!rec.es_presencial) {
      this.cargarComparativaRespuestas(rec);
    }
  }

  cerrarDetalleReclamo(): void {
    this.modalDetalleAbierto.set(false);
    this.reclamoSeleccionado.set(null);
    this.comparacionesRespuestas.set([]);
  }

  private cargarComparativaRespuestas(rec: ReclamoResponse): void {
    this.cargandoRespuestas.set(true);
    this.comparacionesRespuestas.set([]);

    // Cargar respuestas del usuario y preguntas del objeto
    this.http.get<RespuestaSeguridadResponse[]>(`${API_URL}/respuestas-seguridad/reclamo/${rec.reclamo_id}`)
      .subscribe({
        next: (respuestasUsuario) => {
          this.http.get<PreguntaSeguridadResponse[]>(`${API_URL}/preguntas-seguridad/objeto/${rec.objetoEnCustodia_id}`)
            .pipe(finalize(() => this.cargandoRespuestas.set(false)))
            .subscribe({
              next: (preguntas) => {
                const mapaPreguntas = new Map(preguntas.map(p => [p.preguntaSeguridad_id, p]));
                const comps: ComparacionRespuesta[] = (respuestasUsuario ?? []).map(r => {
                  const preg = mapaPreguntas.get(r.preguntaSeguridad_id);
                  return {
                    preguntaTexto: preg?.pregunta || 'Pregunta de seguridad',
                    respuestaUsuario: r.respuesta_usuario,
                    respuestaCorrecta: preg?.respuesta_correcta || '(No disponible)'
                  };
                });
                this.comparacionesRespuestas.set(comps);
              },
              error: () => this.cargandoRespuestas.set(false)
            });
        },
        error: () => this.cargandoRespuestas.set(false)
      });
  }

  validarRespuestasAutomaticamente(reclamoId: string): void {
    this.validando.set(true);
    this.http.post<ReclamoResponse>(`${API_URL}/reclamos/${reclamoId}/validar-respuestas`, {})
      .pipe(finalize(() => this.validando.set(false)))
      .subscribe({
        next: (recActualizado) => {
          this.reclamoSeleccionado.set(recActualizado);
          this.snack.open(`Validación ejecutada. Estado actualizado a: ${recActualizado.estado}`, 'Cerrar', { duration: 4500 });
          this.cargarReclamos();
        },
        error: (err) => {
          this.snack.open(mensajeDeError(err, 'Error al validar respuestas automáticamente.'), 'Cerrar', { duration: 5000 });
        }
      });
  }

  aprobarReclamo(reclamoId: string): void {
    this.guardando.set(true);
    this.http.put<ReclamoResponse>(`${API_URL}/reclamos/${reclamoId}`, { estado: 'APROBADO' })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (actualizado) => {
          this.reclamoSeleccionado.set(actualizado);
          this.snack.open('Reclamo aprobado exitosamente.', 'Cerrar', { duration: 4000 });
          this.cargarReclamos();
        },
        error: (err) => {
          this.snack.open(mensajeDeError(err, 'No fue posible aprobar el reclamo.'), 'Cerrar', { duration: 5000 });
        }
      });
  }

  confirmarCita(reclamoId: string): void {
    const fecha = this.fechaCitaControl.value;
    const hora = this.horarioCitaControl.value;
    if (!fecha || !hora) return;

    this.guardando.set(true);
    this.http.put<ReclamoResponse>(`${API_URL}/reclamos/${reclamoId}`, {
      estado: 'LISTO_PARA_RECOGER',
      fecha_cita: fecha,
      horario_cita: hora
    })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (actualizado) => {
          this.reclamoSeleccionado.set(actualizado);
          this.mostrarFormCita.set(false);
          this.snack.open('Cita programada. Estado cambiado a LISTO PARA RECOGER.', 'Cerrar', { duration: 4500 });
          this.cargarReclamos();
        },
        error: (err) => {
          this.snack.open(mensajeDeError(err, 'Error al agendar la cita.'), 'Cerrar', { duration: 5000 });
        }
      });
  }

  confirmarRechazo(reclamoId: string): void {
    const motivo = this.motivoRechazoControl.value?.trim();
    if (!motivo) return;

    this.guardando.set(true);
    this.http.put<ReclamoResponse>(`${API_URL}/reclamos/${reclamoId}`, {
      estado: 'RECHAZADO',
      motivo_rechazo: motivo
    })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (actualizado) => {
          this.reclamoSeleccionado.set(actualizado);
          this.mostrarFormRechazo.set(false);
          this.snack.open('Reclamo rechazado con causal informada.', 'Cerrar', { duration: 4000 });
          this.cargarReclamos();
        },
        error: (err) => {
          this.snack.open(mensajeDeError(err, 'Error al rechazar el reclamo.'), 'Cerrar', { duration: 5000 });
        }
      });
  }

  abrirModalActa(rec: ReclamoResponse): void {
    this.firmaUrl.set(null);
    this.subiendoFirma.set(false);
    this.actaForm.reset({
      reclamo_id: rec.reclamo_id,
      nombre_reclamante: '',
      cedula_reclamante: '',
      correo_reclamante: '',
      celular_reclamante: '',
      carnet_reclamante: '',
      validacion_verbal: true
    });
    this.modalActaAbierto.set(true);
  }

  cerrarModalActa(): void {
    this.modalActaAbierto.set(false);
  }

  seleccionarFirma(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      this.snack.open('Formato no válido. Solo se admiten imágenes JPG o PNG.', 'Cerrar', { duration: 4000 });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.snack.open('La firma no debe superar 5 MB.', 'Cerrar', { duration: 4000 });
      return;
    }

    const formData = new FormData();
    formData.append('archivo', file);
    this.subiendoFirma.set(true);

    this.http.post<{ url: string }>(`${API_URL}/imagenes`, formData)
      .pipe(finalize(() => this.subiendoFirma.set(false)))
      .subscribe({
        next: (res) => {
          this.firmaUrl.set(res.url);
          this.snack.open('Soporte de firma cargado correctamente.', 'Cerrar', { duration: 3000 });
        },
        error: (err) => {
          this.snack.open(mensajeDeError(err, 'No fue posible subir la firma.'), 'Cerrar', { duration: 5000 });
        }
      });
  }

  quitarFirma(): void {
    this.firmaUrl.set(null);
  }

  guardarActaEntrega(): void {
    const url = this.firmaUrl();
    if (this.actaForm.invalid || !url || this.guardando()) return;
    const f = this.actaForm.getRawValue();

    const payload: ActaEntregaCreate = {
      reclamo_id: f.reclamo_id || '',
      nombre_reclamante: (f.nombre_reclamante || '').trim(),
      cedula_reclamante: (f.cedula_reclamante || '').trim(),
      correo_reclamante: (f.correo_reclamante || '').trim(),
      celular_reclamante: (f.celular_reclamante || '').trim(),
      carnet_reclamante: (f.carnet_reclamante || '').trim(),
      firma_url: url,
      validacion_verbal: Boolean(f.validacion_verbal)
    };

    this.guardando.set(true);
    this.http.post(`${API_URL}/actas-entrega`, payload)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.snack.open('¡Acta formalizada con éxito! El objeto y el reclamo quedaron como RECLAMADO.', 'Entendido', { duration: 6000 });
          this.cerrarModalActa();
          this.cerrarDetalleReclamo();
          this.cargarReclamos();
          this.actaGenerada.emit();
        },
        error: (err) => {
          this.snack.open(mensajeDeError(err, 'Error 422: Asegúrate de completar todos los campos del acta y subir la firma.'), 'Cerrar', { duration: 6000 });
        }
      });
  }

  formatearFecha(ts: string | undefined): string {
    if (!ts) return '';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? ts : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
