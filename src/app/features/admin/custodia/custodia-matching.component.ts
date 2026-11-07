import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { API_URL } from '../../../core/api.config';
import { mensajeDeError } from '../../../core/api-error';

export interface PosibleCoincidenciaItem {
  posibleCoincidencia_id: string;
  score: number;
  notificado?: boolean;
  fecha_deteccion: string;
  objetoEnCustodia_id: string;
  reportePerdida_id: string;
  usuario_id?: string;
  objeto_descripcion?: string;
  objeto_categoria?: string;
  reporte_descripcion?: string;
  usuario_nombre?: string;
}

@Component({
  selector: 'app-custodia-matching',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="itm-tab-content">

      <!-- Barra de Filtros y Acción de Smart Match -->
      <div class="itm-filter-bar">
        <form [formGroup]="filterForm" (ngSubmit)="aplicarFiltros()" class="filter-grid dos-columnas">
          <div class="itm-field">
            <label for="filtroScore" class="itm-label">Score Mínimo (%)</label>
            <select id="filtroScore" formControlName="score_minimo" class="itm-select">
              <option value="">Cualquier afinidad (50%+)</option>
              <option value="50">Media o superior (50%+)</option>
              <option value="65">Buena afinidad (65%+)</option>
              <option value="80">Alta afinidad (80%+)</option>
              <option value="100">Exacta / Muy alta (100%)</option>
            </select>
          </div>

          <div class="itm-field">
            <label for="filtroNotificado" class="itm-label">Estado Notificación</label>
            <select id="filtroNotificado" formControlName="notificado" class="itm-select">
              <option value="">Todos</option>
              <option value="true">Notificados</option>
              <option value="false">Pendientes por Notificar</option>
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
            (click)="ejecutarMatching()"
            [disabled]="ejecutando()"
            class="itm-btn itm-btn-primary"
            style="background: #102d69;">
            <mat-icon [class.spin-icon]="ejecutando()">auto_fix_high</mat-icon>
            <span>{{ ejecutando() ? 'Analizando Coincidencias...' : 'Ejecutar Smart Matching' }}</span>
          </button>
        </div>
      </div>

      <!-- Banner Informativo -->
      <div class="match-info-card">
        <mat-icon class="match-info-icon">psychology</mat-icon>
        <div>
          <h4>Coincidencias automáticas</h4>
          <p>
            Compara los objetos en custodia con los reportes de pérdida aprobados para avisar a sus posibles dueños.
          </p>
        </div>
      </div>

      <!-- Error Banner -->
      @if (errorMensaje()) {
        <div class="error-banner">
          <mat-icon>error_outline</mat-icon>
          <div class="error-banner-text">
            <h4>No fue posible consultar las coincidencias</h4>
            <p>{{ errorMensaje() }}</p>
          </div>
          <button type="button" (click)="cargarCoincidencias()" class="itm-btn itm-btn-outline" style="border-color: #f3c7c1; color: #7a1f14;">
            Reintentar
          </button>
        </div>
      }

      <!-- Grid de Coincidencias -->
      <div class="itm-table-card" style="padding: 20px;">
        @if (cargando()) {
          <div class="itm-empty-state" style="border: none;">
            <div class="itm-empty-icon">
              <mat-icon class="spin-icon">sync</mat-icon>
            </div>
            <h3 style="margin: 8px 0 0; font-size: 1rem;">Cargando posibles coincidencias...</h3>
            <p style="margin: 0; font-size: 0.82rem; color: #6b7280;">Consultando afinidades detectadas por el sistema de custodia</p>
          </div>
        } @else if (coincidencias().length === 0) {
          <div class="itm-empty-state" style="border: none;">
            <div class="itm-empty-icon">
              <mat-icon>compare_arrows</mat-icon>
            </div>
            <h3 style="margin: 8px 0 0; font-size: 1.05rem;">No hay coincidencias detectadas</h3>
            <p style="margin: 0; font-size: 0.85rem; color: #6b7280; max-width: 440px;">
              Pulsa "Ejecutar Smart Matching" para que el algoritmo busque afinidades entre los artículos en custodia y los reportes de pérdida.
            </p>
          </div>
        } @else {
          <div class="matches-grid">
            @for (item of coincidencias(); track item.posibleCoincidencia_id) {
              <div class="match-card">
                
                <!-- Encabezado con Score y Afinidad -->
                <div class="match-header">
                  <div class="score-display">
                    <span class="score-percent" [style.color]="obtenerColorScore(item.score)">
                      {{ normalizarPorcentaje(item.score) }}%
                    </span>
                    <span class="score-label">Nivel de Afinidad</span>
                  </div>

                  <div class="score-track-container">
                    <div class="score-track">
                      <div
                        class="score-fill"
                        [style.width.%]="normalizarPorcentaje(item.score)"
                        [style.background-color]="obtenerColorScore(item.score)">
                      </div>
                    </div>
                  </div>

                  <div>
                    @if (item.notificado) {
                      <span class="itm-badge itm-badge-success">
                        <mat-icon style="font-size: 13px; width: 13px; height: 13px;">check</mat-icon>
                        Notificado
                      </span>
                    } @else {
                      <span class="itm-badge itm-badge-warning">
                        Pendiente Notificar
                      </span>
                    }
                  </div>
                </div>

                <!-- Comparativa en 2 Columnas -->
                <div class="comparison-row">
                  <!-- Columna Izquierda: Objeto en Custodia -->
                  <div class="compare-col custody-col">
                    <div class="col-kicker">
                      <mat-icon>inventory_2</mat-icon>
                      <span>Objeto en Custodia Oficial</span>
                    </div>
                    <div class="col-code mono">
                      OP-{{ item.objetoEnCustodia_id.slice(-6).toUpperCase() }}
                    </div>
                    <div class="col-desc">
                      {{ item.objeto_descripcion || 'Artículo en custodia física resguardado' }}
                    </div>
                    @if (item.objeto_categoria) {
                      <div class="col-badge">
                        <span class="itm-badge itm-badge-primary">{{ item.objeto_categoria }}</span>
                      </div>
                    }
                  </div>

                  <div class="compare-divider">
                    <mat-icon>swap_horiz</mat-icon>
                  </div>

                  <!-- Columna Derecha: Reporte de Pérdida -->
                  <div class="compare-col lost-col">
                    <div class="col-kicker lost">
                      <mat-icon>search</mat-icon>
                      <span>Reporte de Pérdida Ciudadano</span>
                    </div>
                    <div class="col-code mono">
                      REP-{{ item.reportePerdida_id.slice(-6).toUpperCase() }}
                    </div>
                    <div class="col-desc">
                      {{ item.reporte_descripcion || 'Reporte de pérdida registrado por estudiante/funcionario' }}
                    </div>
                    @if (item.usuario_nombre) {
                      <div class="col-subtext">
                        Titular: <strong>{{ item.usuario_nombre }}</strong>
                      </div>
                    }
                  </div>
                </div>

                <!-- Pie de Tarjeta con Fechas y Acción de Notificar -->
                <div class="match-footer">
                  <span class="detect-date">
                    <mat-icon>calendar_today</mat-icon>
                    Detectado: {{ formatearFecha(item.fecha_deteccion) }}
                  </span>

                  @if (!item.notificado) {
                    <button
                      type="button"
                      (click)="marcarNotificado(item)"
                      class="itm-btn itm-btn-outline compact">
                      <mat-icon>mark_email_read</mat-icon>
                      <span>Marcar como Notificado</span>
                    </button>
                  }
                </div>

              </div>
            }
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    .filter-actions {
      display: flex;
      gap: 8px;
    }

    .top-buttons {
      display: flex;
      gap: 10px;
    }

    .match-info-card {
      display: flex;
      gap: 14px;
      padding: 14px 18px;
      margin-top: 16px;
      margin-bottom: 16px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 5px solid #008a47;
      border-radius: 12px;
      color: #14532d;
    }

    .match-info-icon {
      font-size: 26px !important;
      width: 26px !important;
      height: 26px !important;
      color: #008a47;
      flex-shrink: 0;
    }

    .match-info-card h4 {
      margin: 0 0 2px;
      font-size: 0.92rem;
      font-weight: 800;
      color: #011c5b;
    }

    .match-info-card p {
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

    .matches-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .match-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 18px 20px;
      box-shadow: 0 2px 8px rgba(1, 28, 91, 0.04);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .match-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
      flex-wrap: wrap;
    }

    .score-display {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .score-percent {
      font-size: 1.4rem;
      font-weight: 800;
      font-family: 'Montserrat', sans-serif;
    }

    .score-label {
      font-size: 0.74rem;
      color: #6b7280;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .score-track-container {
      flex: 1;
      min-width: 140px;
      max-width: 240px;
    }

    .score-track {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 999px;
      overflow: hidden;
    }

    .score-fill {
      height: 100%;
      border-radius: 999px;
      transition: width 0.3s ease;
    }

    .comparison-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 14px;
      align-items: center;
    }

    @media (max-width: 768px) {
      .comparison-row {
        grid-template-columns: 1fr;
      }
    }

    .compare-col {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .compare-col.custody-col {
      border-left: 4px solid #102d69;
    }

    .compare-col.lost-col {
      border-left: 4px solid #b23b24;
    }

    .col-kicker {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.72rem;
      font-weight: 800;
      color: #102d69;
      text-transform: uppercase;
    }

    .col-kicker.lost {
      color: #b23b24;
    }

    .col-kicker mat-icon {
      font-size: 15px !important;
      width: 15px !important;
      height: 15px !important;
    }

    .col-code {
      font-size: 0.8rem;
      font-weight: 700;
      color: #4b5563;
    }

    .col-desc {
      font-size: 0.88rem;
      font-weight: 600;
      color: #1f2937;
      line-height: 1.4;
    }

    .col-subtext {
      font-size: 0.78rem;
      color: #6b7280;
    }

    .col-badge {
      margin-top: 4px;
    }

    .compare-divider {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
    }

    .match-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 10px;
      border-top: 1px solid #f1f5f9;
      font-size: 0.8rem;
      color: #6b7280;
      flex-wrap: wrap;
    }

    .detect-date {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .detect-date mat-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
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
export class CustodiaMatchingComponent implements OnInit {
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);

  coincidencias = signal<PosibleCoincidenciaItem[]>([]);
  cargando = signal<boolean>(false);
  ejecutando = signal<boolean>(false);
  errorMensaje = signal<string | null>(null);

  filterForm = new FormGroup({
    score_minimo: new FormControl<string>(''),
    notificado: new FormControl<string>('')
  });

  ngOnInit(): void {
    this.cargarCoincidencias();
  }

  cargarCoincidencias(): void {
    this.cargando.set(true);
    this.errorMensaje.set(null);

    let params = new HttpParams();
    const { score_minimo, notificado } = this.filterForm.value;
    if (score_minimo) params = params.set('score_minimo', score_minimo);
    if (notificado !== '' && notificado !== null && notificado !== undefined) {
      params = params.set('notificado', notificado);
    }

    this.http.get<PosibleCoincidenciaItem[]>(`${API_URL}/posibles-coincidencias`, { params })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (items) => {
          this.coincidencias.set(Array.isArray(items) ? items : []);
        },
        error: (err) => {
          this.coincidencias.set([]);
          this.errorMensaje.set(mensajeDeError(err, 'No se pudo conectar con el servicio de posibles coincidencias.'));
        }
      });
  }

  aplicarFiltros(): void {
    this.cargarCoincidencias();
  }

  limpiarFiltros(): void {
    this.filterForm.reset({
      score_minimo: '',
      notificado: ''
    });
    this.cargarCoincidencias();
  }

  ejecutarMatching(): void {
    this.ejecutando.set(true);
    this.http.post<{ mensaje?: string }>(`${API_URL}/posibles-coincidencias/ejecutar-matching`, {})
      .pipe(finalize(() => this.ejecutando.set(false)))
      .subscribe({
        next: (res) => {
          this.snack.open(res.mensaje || 'Algoritmo de Smart Matching ejecutado exitosamente.', 'Entendido', { duration: 5000 });
          this.cargarCoincidencias();
        },
        error: (err) => {
          this.snack.open(mensajeDeError(err, 'Error al ejecutar el algoritmo de matching.'), 'Cerrar', { duration: 5000 });
        }
      });
  }

  marcarNotificado(item: PosibleCoincidenciaItem): void {
    this.http.put(`${API_URL}/posibles-coincidencias/${item.posibleCoincidencia_id}`, { notificado: true })
      .subscribe({
        next: () => {
          this.snack.open('Coincidencia marcada como notificada.', 'Cerrar', { duration: 3000 });
          this.cargarCoincidencias();
        },
        error: (err) => {
          this.snack.open(mensajeDeError(err, 'No fue posible actualizar el estado de notificación.'), 'Cerrar', { duration: 4500 });
        }
      });
  }

  normalizarPorcentaje(score: number): number {
    if (score === null || score === undefined || isNaN(score)) return 0;
    const pct = score <= 1 ? Math.round(score * 100) : Math.round(score);
    return Math.min(100, Math.max(0, pct));
  }

  obtenerColorScore(score: number): string {
    const pct = this.normalizarPorcentaje(score);
    if (pct >= 80) return '#008a47'; // Verde institucional
    if (pct >= 60) return '#f19800'; // Ámbar institucional
    return '#29abe2'; // Cian ITM
  }

  formatearFecha(ts: string | undefined): string {
    if (!ts) return '';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? ts : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
