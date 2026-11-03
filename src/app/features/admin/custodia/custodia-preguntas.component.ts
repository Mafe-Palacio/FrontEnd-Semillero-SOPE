import { Component, OnInit, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { API_URL } from '../../../core/api.config';
import { mensajeDeError } from '../../../core/api-error';
import { PreguntaSeguridadResponse } from '../../../api/model/preguntaSeguridadResponse';

@Component({
  selector: 'app-custodia-preguntas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="itm-tab-content">

      <!-- Barra de Selección de Objeto -->
      <div class="itm-filter-bar questions-top-bar">
        <div class="object-picker-form">
          <div class="itm-field" style="flex: 1; max-width: 480px;">
            <label for="inputObjId" class="itm-label">Identificador del Objeto en Custodia (UUID)</label>
            <div style="display: flex; gap: 8px;">
              <input
                id="inputObjId"
                type="text"
                [value]="objetoIdActual()"
                (input)="actualizarInputId($any($event.target).value)"
                placeholder="Ej. a0b1c2d3-e4f5-..."
                class="itm-input mono"
              />
              <button
                type="button"
                (click)="cargarPreguntas()"
                [disabled]="!objetoIdActual() || cargando()"
                class="itm-btn itm-btn-primary">
                <mat-icon>search</mat-icon>
                <span>Consultar</span>
              </button>
            </div>
          </div>
        </div>

        @if (objetoIdActual() && preguntas().length > 0) {
          <div class="top-actions">
            @if (preguntas().length < 3) {
              <button
                type="button"
                (click)="abrirModalCrearPregunta()"
                class="itm-btn itm-btn-primary">
                <mat-icon>add</mat-icon>
                <span>Añadir Pregunta</span>
              </button>
            }

            <button
              type="button"
              (click)="borrarTodasPreguntas()"
              class="itm-btn itm-btn-danger">
              <mat-icon>delete_sweep</mat-icon>
              <span>Borrar Todas</span>
            </button>
          </div>
        }
      </div>

      <!-- Aviso Confidencial Institucional -->
      <div class="notice-card">
        <mat-icon class="notice-icon">admin_panel_settings</mat-icon>
        <div class="notice-body">
          <h4>Cuestionario de Validación de Titularidad (HU08, HU20, HU21)</h4>
          <p>
            Las <strong>respuestas correctas</strong> registradas son de uso <strong>estrictamente confidencial del administrador</strong> para evaluar reclamaciones. Los usuarios en el catálogo público solo verán las preguntas sin ninguna pista de respuesta.
          </p>
        </div>
      </div>

      <!-- Banner de Error si falla la API -->
      @if (errorMensaje()) {
        <div class="error-banner">
          <mat-icon>error_outline</mat-icon>
          <div class="error-banner-text">
            <h4>No se pudieron consultar las preguntas</h4>
            <p>{{ errorMensaje() }}</p>
          </div>
          <button type="button" (click)="cargarPreguntas()" class="itm-btn itm-btn-outline" style="border-color: #f3c7c1; color: #7a1f14;">
            Reintentar
          </button>
        </div>
      }

      <!-- Contenedor Principal de Preguntas -->
      <div class="itm-table-card">
        @if (!objetoIdActual()) {
          <div class="itm-empty-state" style="border: none;">
            <div class="itm-empty-icon">
              <mat-icon>quiz</mat-icon>
            </div>
            <h3 style="margin: 8px 0 0; font-size: 1.05rem;">Ingresa el ID del objeto para ver su cuestionario</h3>
            <p style="margin: 0; font-size: 0.85rem; color: #6b7280;">
              También puedes pulsar el botón de preguntas en cualquier fila de la pestaña de Inventario.
            </p>
          </div>
        } @else if (cargando()) {
          <div class="itm-empty-state" style="border: none;">
            <div class="itm-empty-icon">
              <mat-icon class="spin-icon">sync</mat-icon>
            </div>
            <h3 style="margin: 8px 0 0; font-size: 1rem;">Cargando preguntas de seguridad...</h3>
            <p style="margin: 0; font-size: 0.82rem; color: #6b7280;">Consultando parámetros de cotejo para el objeto seleccionado</p>
          </div>
        } @else if (preguntas().length === 0) {
          <div class="itm-empty-state" style="border: none;">
            <div class="itm-empty-icon">
              <mat-icon>help_outline</mat-icon>
            </div>
            <h3 style="margin: 8px 0 0; font-size: 1.05rem;">Este objeto no tiene preguntas de seguridad configuradas</h3>
            <p style="margin: 0; font-size: 0.85rem; color: #6b7280; max-width: 440px;">
              Los reclamos para este artículo se resolverán únicamente de forma presencial a menos que definas de 1 a 3 preguntas de validación.
            </p>
            <button
              type="button"
              (click)="abrirModalCrearPregunta()"
              class="itm-btn itm-btn-primary"
              style="margin-top: 14px;">
              <mat-icon>add</mat-icon>
              <span>Configurar Preguntas (1 a 3)</span>
            </button>
          </div>
        } @else {
          <!-- Lista de Preguntas Configuradas -->
          <div class="questions-list">
            @for (p of preguntas(); track p.preguntaSeguridad_id; let idx = $index) {
              <div class="question-item-card">
                <div class="q-header">
                  <div class="q-order-badge">Pregunta {{ idx + 1 }}</div>
                  <div class="q-actions">
                    <button
                      type="button"
                      (click)="abrirModalEditar(p)"
                      class="itm-btn itm-btn-outline compact"
                      title="Modificar pregunta">
                      <mat-icon>edit</mat-icon>
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      (click)="borrarPregunta(p)"
                      class="itm-btn itm-btn-outline compact itm-btn-danger"
                      title="Eliminar esta pregunta">
                      <mat-icon>delete</mat-icon>
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>

                <div class="q-body">
                  <div class="q-text">
                    <span class="q-label">Pregunta formulada al usuario:</span>
                    <p class="q-content">{{ p.pregunta }}</p>
                  </div>

                  <div class="q-answer-box">
                    <span class="q-label-answer">
                      <mat-icon>lock</mat-icon>
                      <span>Respuesta Correcta Esperada (Solo Administrador):</span>
                    </span>
                    <p class="q-answer-content">{{ p.respuesta_correcta }}</p>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>

    </div>

    <!-- Modal Crear Preguntas (1 a 3) -->
    @if (modalCrearAbierto()) {
      <div class="itm-modal-backdrop">
        <div class="itm-modal-card wide">
          <div class="itm-modal-header">
            <h3>
              <mat-icon>quiz</mat-icon>
              <span>Configurar Preguntas de Seguridad</span>
            </h3>
            <button type="button" (click)="cerrarModalCrear()" class="itm-modal-close">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="formCrear" (ngSubmit)="guardarPreguntas()">
            <div class="itm-modal-body">
              <p style="margin: 0; font-size: 0.84rem; color: #4b5563;">
                Define entre 1 y 3 preguntas clave (color exacto, contenido interior, contraseña o seña particular no visible en la foto pública):
              </p>

              <div formArrayName="preguntas" class="preguntas-form-list">
                @for (grupo of preguntasFormArray.controls; track $index; let idx = $index) {
                  <div [formGroupName]="idx" class="pregunta-form-card">
                    <div class="pregunta-form-header">
                      <strong>Pregunta #{{ idx + 1 }}</strong>
                      @if (preguntasFormArray.length > 1) {
                        <button type="button" (click)="quitarFilaPregunta(idx)" class="btn-remove-row">
                          <mat-icon>remove_circle_outline</mat-icon>
                          <span>Quitar</span>
                        </button>
                      }
                    </div>

                    <div class="itm-field">
                      <label class="itm-label">Pregunta pública para el reclamante *</label>
                      <input
                        type="text"
                        formControlName="pregunta"
                        placeholder="Ej: ¿Qué adhesivo tiene pegado en la parte trasera?"
                        class="itm-input"
                      />
                    </div>

                    <div class="itm-field">
                      <label class="itm-label">Respuesta correcta esperada (Confidencial Admin) *</label>
                      <input
                        type="text"
                        formControlName="respuesta_correcta"
                        placeholder="Ej: Logo de Batman en color negro con fondo amarillo"
                        class="itm-input"
                      />
                    </div>
                  </div>
                }
              </div>

              @if (preguntasFormArray.length < 3) {
                <button
                  type="button"
                  (click)="agregarFilaPregunta()"
                  class="itm-btn itm-btn-outline"
                  style="align-self: flex-start;">
                  <mat-icon>add</mat-icon>
                  <span>Agregar otra pregunta (Máx. 3)</span>
                </button>
              }
            </div>

            <div class="itm-modal-footer">
              <button type="button" (click)="cerrarModalCrear()" class="itm-btn itm-btn-ghost">
                Cancelar
              </button>
              <button
                type="submit"
                class="itm-btn itm-btn-primary"
                [disabled]="formCrear.invalid || guardando()">
                <mat-icon>{{ guardando() ? 'sync' : 'save' }}</mat-icon>
                <span>{{ guardando() ? 'Guardando...' : 'Guardar Preguntas' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Modal Editar Pregunta Individual -->
    @if (modalEditarAbierto() && preguntaEditando(); as p) {
      <div class="itm-modal-backdrop">
        <div class="itm-modal-card">
          <div class="itm-modal-header">
            <h3>
              <mat-icon>edit</mat-icon>
              <span>Editar Pregunta de Seguridad</span>
            </h3>
            <button type="button" (click)="cerrarModalEditar()" class="itm-modal-close">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="formEditar" (ngSubmit)="guardarEdicionPregunta()">
            <div class="itm-modal-body">
              <div class="itm-field">
                <label for="editPregunta" class="itm-label">Pregunta pública para el reclamante *</label>
                <textarea
                  id="editPregunta"
                  formControlName="pregunta"
                  rows="2"
                  class="itm-textarea"></textarea>
              </div>

              <div class="itm-field">
                <label for="editRespuesta" class="itm-label">Respuesta correcta esperada *</label>
                <textarea
                  id="editRespuesta"
                  formControlName="respuesta_correcta"
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
                [disabled]="formEditar.invalid || guardando()">
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
    .questions-top-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
    }

    .top-actions {
      display: flex;
      gap: 8px;
    }

    .notice-card {
      display: flex;
      gap: 14px;
      padding: 14px 18px;
      margin-bottom: 16px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-left: 5px solid #29abe2;
      border-radius: 12px;
      color: #1e3a8a;
    }

    .notice-icon {
      font-size: 26px !important;
      width: 26px !important;
      height: 26px !important;
      color: #29abe2;
      flex-shrink: 0;
    }

    .notice-body h4 {
      margin: 0 0 2px;
      font-size: 0.92rem;
      font-weight: 800;
      color: #102d69;
    }

    .notice-body p {
      margin: 0;
      font-size: 0.83rem;
      line-height: 1.45;
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

    .questions-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 20px;
    }

    .question-item-card {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .q-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }

    .q-order-badge {
      background: #102d69;
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.76rem;
      font-weight: 800;
      letter-spacing: 0.03em;
    }

    .q-actions {
      display: flex;
      gap: 8px;
    }

    .q-body {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 16px;
    }

    @media (max-width: 720px) {
      .q-body {
        grid-template-columns: 1fr;
      }
    }

    .q-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .q-content {
      margin: 4px 0 0;
      font-size: 0.92rem;
      font-weight: 700;
      color: #1f2937;
    }

    .q-answer-box {
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      padding: 10px 14px;
    }

    .q-label-answer {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.72rem;
      font-weight: 800;
      color: #b45309;
      text-transform: uppercase;
    }

    .q-label-answer mat-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
    }

    .q-answer-content {
      margin: 4px 0 0;
      font-size: 0.88rem;
      font-weight: 700;
      color: #047857;
    }

    .preguntas-form-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .pregunta-form-card {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .pregunta-form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.86rem;
      color: #102d69;
    }

    .btn-remove-row {
      background: transparent;
      border: none;
      color: #b91c1c;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      font-size: 0.78rem;
      font-weight: 700;
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
export class CustodiaPreguntasComponent implements OnInit {
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);

  objetoIdExterno = input<string | null>(null);

  objetoIdActual = signal<string>('');
  preguntas = signal<PreguntaSeguridadResponse[]>([]);
  cargando = signal<boolean>(false);
  errorMensaje = signal<string | null>(null);
  guardando = signal<boolean>(false);

  modalCrearAbierto = signal<boolean>(false);
  modalEditarAbierto = signal<boolean>(false);
  preguntaEditando = signal<PreguntaSeguridadResponse | null>(null);

  formCrear = new FormGroup({
    preguntas: new FormArray<FormGroup>([])
  });

  formEditar = new FormGroup({
    pregunta: new FormControl<string>('', [Validators.required, Validators.minLength(4)]),
    respuesta_correcta: new FormControl<string>('', [Validators.required, Validators.minLength(2)])
  });

  get preguntasFormArray(): FormArray<FormGroup> {
    return this.formCrear.controls.preguntas as FormArray<FormGroup>;
  }

  ngOnInit(): void {
    const extId = this.objetoIdExterno();
    if (extId) {
      this.objetoIdActual.set(extId);
      this.cargarPreguntas();
    }
  }

  seleccionarObjeto(id: string): void {
    this.objetoIdActual.set(id.trim());
    this.cargarPreguntas();
  }

  actualizarInputId(val: string): void {
    this.objetoIdActual.set(val.trim());
  }

  cargarPreguntas(): void {
    const id = this.objetoIdActual();
    if (!id) return;

    this.cargando.set(true);
    this.errorMensaje.set(null);

    this.http.get<PreguntaSeguridadResponse[]>(`${API_URL}/preguntas-seguridad/objeto/${id}`)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (items) => {
          this.preguntas.set(Array.isArray(items) ? items : []);
        },
        error: (err) => {
          this.preguntas.set([]);
          if (err.status !== 404) {
            this.errorMensaje.set(mensajeDeError(err, 'No fue posible obtener las preguntas de seguridad del objeto.'));
          }
        }
      });
  }

  abrirModalCrearPregunta(): void {
    this.preguntasFormArray.clear();
    this.agregarFilaPregunta();
    this.modalCrearAbierto.set(true);
  }

  cerrarModalCrear(): void {
    this.modalCrearAbierto.set(false);
  }

  agregarFilaPregunta(): void {
    if (this.preguntasFormArray.length >= 3) return;
    this.preguntasFormArray.push(
      new FormGroup({
        pregunta: new FormControl<string>('', [Validators.required, Validators.minLength(4)]),
        respuesta_correcta: new FormControl<string>('', [Validators.required, Validators.minLength(2)])
      })
    );
  }

  quitarFilaPregunta(idx: number): void {
    if (this.preguntasFormArray.length > 1) {
      this.preguntasFormArray.removeAt(idx);
    }
  }

  guardarPreguntas(): void {
    const id = this.objetoIdActual();
    if (!id || this.formCrear.invalid || this.guardando()) return;

    const filas = (this.preguntasFormArray.getRawValue() as any[]).map(f => ({
      pregunta: String(f['pregunta'] || '').trim(),
      respuesta_correcta: String(f['respuesta_correcta'] || '').trim()
    }));

    const payload = {
      objetoEnCustodia_id: id,
      preguntas: filas
    };

    this.guardando.set(true);
    this.http.post(`${API_URL}/preguntas-seguridad/objeto/${id}`, payload)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.snack.open('Preguntas de seguridad configuradas exitosamente.', 'Cerrar', { duration: 4000 });
          this.cerrarModalCrear();
          this.cargarPreguntas();
        },
        error: (err) => {
          this.snack.open(mensajeDeError(err, 'Error al guardar las preguntas de seguridad.'), 'Cerrar', { duration: 5000 });
        }
      });
  }

  abrirModalEditar(p: PreguntaSeguridadResponse): void {
    this.preguntaEditando.set(p);
    this.formEditar.setValue({
      pregunta: p.pregunta,
      respuesta_correcta: p.respuesta_correcta
    });
    this.modalEditarAbierto.set(true);
  }

  cerrarModalEditar(): void {
    this.modalEditarAbierto.set(false);
    this.preguntaEditando.set(null);
  }

  guardarEdicionPregunta(): void {
    const p = this.preguntaEditando();
    if (!p || this.formEditar.invalid || this.guardando()) return;

    const payload = {
      pregunta: this.formEditar.value.pregunta?.trim(),
      respuesta_correcta: this.formEditar.value.respuesta_correcta?.trim()
    };

    this.guardando.set(true);
    this.http.put(`${API_URL}/preguntas-seguridad/${p.preguntaSeguridad_id}`, payload)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.snack.open('Pregunta actualizada correctamente.', 'Cerrar', { duration: 3500 });
          this.cerrarModalEditar();
          this.cargarPreguntas();
        },
        error: (err) => {
          this.snack.open(mensajeDeError(err, 'Error al actualizar la pregunta.'), 'Cerrar', { duration: 5000 });
        }
      });
  }

  borrarPregunta(p: PreguntaSeguridadResponse): void {
    const confirmar = confirm(`¿Deseas eliminar la pregunta "${p.pregunta}"?`);
    if (!confirmar) return;

    this.http.delete(`${API_URL}/preguntas-seguridad/${p.preguntaSeguridad_id}`).subscribe({
      next: () => {
        this.snack.open('Pregunta eliminada.', 'Cerrar', { duration: 3000 });
        this.cargarPreguntas();
      },
      error: (err) => {
        this.snack.open(mensajeDeError(err, 'No fue posible eliminar la pregunta.'), 'Cerrar', { duration: 4500 });
      }
    });
  }

  borrarTodasPreguntas(): void {
    const id = this.objetoIdActual();
    if (!id) return;

    const confirmar = confirm('¿Confirmas eliminar TODAS las preguntas de seguridad asociadas a este objeto?');
    if (!confirmar) return;

    this.http.delete(`${API_URL}/preguntas-seguridad/objeto/${id}`).subscribe({
      next: () => {
        this.snack.open('Todas las preguntas fueron eliminadas.', 'Cerrar', { duration: 4000 });
        this.cargarPreguntas();
      },
      error: (err) => {
        this.snack.open(mensajeDeError(err, 'Error al eliminar las preguntas del objeto.'), 'Cerrar', { duration: 5000 });
      }
    });
  }
}
