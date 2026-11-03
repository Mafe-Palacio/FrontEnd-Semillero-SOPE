import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AdminMetricasService, MetricasResumen } from '../../../core/admin-metricas.service';
import { SedeAdminService } from '../../../core/sede-admin.service';
import { mensajeDeError } from '../../../core/api-error';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <div class="dashboard-wrapper">
      
      <!-- 1. Banner de Bienvenida Limpio en Blanco -->
      <section class="welcome-banner">
        <div class="welcome-text">
          <h1 class="welcome-title">Bienvenido al Panel de Custodia OPE</h1>
          <p class="welcome-subtitle">
            Monitoreo en tiempo real del inventario, solicitudes de reclamo y publicaciones en {{ sedeNombre() }}
          </p>
        </div>
        <div class="welcome-actions">
          <button type="button" class="refresh-btn" (click)="cargarMetricas()" [disabled]="cargando()">
            <mat-icon [class.spin]="cargando()">refresh</mat-icon>
            <span>Actualizar</span>
          </button>
          <div class="welcome-date">
            <mat-icon class="date-icon">calendar_today</mat-icon>
            <span>{{ fechaHoy }}</span>
          </div>
        </div>
      </section>

      @if (errorMensaje()) {
        <div class="error-alert">
          <div class="error-alert-left">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorMensaje() }}</span>
          </div>
          <button type="button" class="retry-btn" (click)="cargarMetricas()">Reintentar</button>
        </div>
      }

      <!-- 2. Grid de 4 Tarjetas KPI -->
      <section class="kpi-grid">
        
        <!-- KPI 1: En Custodia Activa / Total Registrados -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">En Custodia Activa</span>
            <div class="kpi-icon-box box-navy">
              <mat-icon>inventory_2</mat-icon>
            </div>
          </div>
          <div class="kpi-value text-navy">
            {{ metricas()?.total_custodia ?? 0 }}
          </div>
          <div class="kpi-subtext">
            <span>De {{ metricas()?.total_objetos ?? 0 }} artículos registrados en total</span>
          </div>
        </div>

        <!-- KPI 2: Objetos Reclamados -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Objetos Reclamados</span>
            <div class="kpi-icon-box box-green">
              <mat-icon>check_circle</mat-icon>
            </div>
          </div>
          <div class="kpi-value text-green">
            {{ metricas()?.reclamados ?? 0 }}
          </div>
          <div class="kpi-subtext">
            <span>Restituidos a sus titulares</span>
          </div>
        </div>

        <!-- KPI 3: Pendientes por Aprobar -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Pendientes por Aprobar</span>
            <div class="kpi-icon-box box-amber">
              <mat-icon>schedule</mat-icon>
            </div>
          </div>
          <div class="kpi-value text-amber">
            {{ totalPendientes() }}
          </div>
          <div class="kpi-subtext">
            <a routerLink="/admin/aprobaciones" class="kpi-link">
              <span>{{ detallePendientesTexto() }}</span>
              <mat-icon>arrow_forward</mat-icon>
            </a>
          </div>
        </div>

        <!-- KPI 4: Tasa de Devolución % -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Tasa de Devolución</span>
            <div class="kpi-icon-box box-teal">
              <mat-icon>trending_up</mat-icon>
            </div>
          </div>
          <div class="kpi-value text-teal">
            {{ metricas()?.tasa_exito_porcentaje ?? 0 }}%
          </div>
          <div class="kpi-subtext">
            @if (metricas()?.dias_promedio_custodia !== null && metricas()?.dias_promedio_custodia !== undefined) {
              <span>Promedio de entrega: {{ metricas()?.dias_promedio_custodia }} días</span>
            } @else {
              <span>Eficacia global de entrega</span>
            }
          </div>
        </div>

      </section>

      <!-- 3. Fila Inferior en 2 Columnas -->
      <section class="bottom-grid">
        
        <!-- Columna Izquierda: Top 5 Categorías con más reportes -->
        <div class="panel-card col-wide">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Top 5 Categorías con más reportes</h2>
              <p class="panel-subtitle">Distribución real de reportes de extravío en {{ sedeNombre() }}</p>
            </div>
            <div class="panel-header-icon">
              <mat-icon>bar_chart</mat-icon>
            </div>
          </div>

          @if (topCategorias().length === 0) {
            <div class="empty-categories">
              <mat-icon>insights</mat-icon>
              <p>Aún no hay reportes de pérdida registrados en esta sede.</p>
            </div>
          } @else {
            <div class="categories-list">
              @for (cat of topCategorias(); track cat.categoria) {
                <div class="category-item">
                  <div class="category-info">
                    <div class="category-label">
                      <mat-icon class="category-icon">{{ cat.icono }}</mat-icon>
                      <span class="category-name">{{ cat.nombre }}</span>
                    </div>
                    <span class="category-stats">{{ cat.cantidad }} {{ cat.cantidad === 1 ? 'reporte' : 'reportes' }} ({{ cat.porcentaje }}%)</span>
                  </div>
                  <div class="progress-track">
                    <div class="progress-bar" [style.width.%]="cat.porcentaje"></div>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Columna Derecha: Reclamos y Moderación por Estado -->
        <div class="panel-card col-narrow">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Reclamos por Estado</h2>
              <p class="panel-subtitle">Solicitudes ciudadanas registradas en la sede</p>
            </div>
            <div class="panel-header-icon">
              <mat-icon>pie_chart</mat-icon>
            </div>
          </div>

          <div class="status-list">
            <!-- Aprobados / Entregados -->
            <div class="status-item">
              <div class="status-left">
                <span class="status-indicator dot-green"></span>
                <span class="status-name">Aprobados / Reclamados</span>
              </div>
              <span class="status-badge badge-green">
                {{ reclamosAprobadosYEntregados() }}
              </span>
            </div>

            <!-- En Revisión / Enviados / Cita Agendada -->
            <div class="status-item">
              <div class="status-left">
                <span class="status-indicator dot-amber"></span>
                <span class="status-name">En Revisión / Cita Agendada</span>
              </div>
              <span class="status-badge badge-amber">
                {{ reclamosEnCurso() }}
              </span>
            </div>

            <!-- Rechazados / Cancelados -->
            <div class="status-item">
              <div class="status-left">
                <span class="status-indicator dot-red"></span>
                <span class="status-name">Rechazados / Cancelados</span>
              </div>
              <span class="status-badge badge-red">
                {{ reclamosDescartados() }}
              </span>
            </div>
          </div>

          <!-- Acceso Directo de Acción -->
          <div class="panel-footer-action">
            <a routerLink="/admin/aprobaciones" class="action-btn">
              <mat-icon>verified</mat-icon>
              <span>Ir a la Bandeja de Moderación ({{ totalPendientes() }})</span>
            </a>
          </div>
        </div>

      </section>

    </div>
  `,
  styles: [`
    .dashboard-wrapper {
      display: flex;
      flex-direction: column;
      gap: 20px;
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* 1. Banner de Bienvenida */
    .welcome-banner {
      border-radius: 18px;
      padding: 24px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      box-sizing: border-box;
    }

    .welcome-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #011C5B;
      margin: 0 0 4px 0;
      line-height: 1.25;
    }

    .welcome-subtitle {
      font-size: 0.85rem;
      color: #6B7280;
      margin: 0;
      line-height: 1.4;
    }

    .welcome-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .refresh-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 10px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      color: #011C5B;
      font-family: inherit;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }

    .refresh-btn:hover:not(:disabled) {
      background: #F3F4F6;
    }

    .refresh-btn mat-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-alert {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 12px;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      color: #991B1B;
      font-size: 0.82rem;
      font-weight: 600;
    }

    .error-alert-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .retry-btn {
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid #FCA5A5;
      background: #FFFFFF;
      color: #991B1B;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
    }

    .welcome-date {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 10px;
      background: #F8F9FA;
      border: 1px solid #E5E7EB;
      color: #4B5563;
      font-size: 0.82rem;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .date-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
      line-height: 18px !important;
      color: #011C5B;
    }

    /* 2. Grid de KPIs */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 16px;
    }

    .kpi-card {
      background: #FFFFFF;
      border-radius: 16px;
      border: 1px solid #E5E7EB;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      box-sizing: border-box;
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(1, 28, 91, 0.06);
    }

    .kpi-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .kpi-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: #6B7280;
    }

    .kpi-icon-box {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .kpi-icon-box mat-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
      line-height: 20px !important;
    }

    .box-navy { background: #EEF2F7; color: #011C5B; }
    .box-green { background: #E6F4EA; color: #008A47; }
    .box-amber { background: #FEF3C7; color: #F19800; }
    .box-teal { background: #E0F7FA; color: #00A0B7; }

    .kpi-value {
      font-size: 2rem;
      font-weight: 800;
      margin: 12px 0 6px 0;
      font-family: monospace;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }

    .text-navy { color: #011C5B; }
    .text-green { color: #008A47; }
    .text-amber { color: #F19800; }
    .text-teal { color: #00A0B7; }

    .kpi-subtext {
      font-size: 0.78rem;
      color: #9CA3AF;
    }

    .kpi-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #011C5B;
      font-weight: 600;
      text-decoration: none;
      transition: color 0.15s;
    }

    .kpi-link mat-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
      line-height: 14px !important;
    }

    .kpi-link:hover {
      text-decoration: underline;
    }

    /* 3. Fila Inferior */
    .bottom-grid {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 20px;
    }

    .panel-card {
      background: #FFFFFF;
      border-radius: 18px;
      padding: 24px;
      border: 1px solid #E5E7EB;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }

    .panel-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 20px;
    }

    .panel-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #011C5B;
      margin: 0 0 4px 0;
    }

    .panel-subtitle {
      font-size: 0.8rem;
      color: #6B7280;
      margin: 0;
    }

    .panel-header-icon mat-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
      line-height: 20px !important;
      color: #9CA3AF;
    }

    .empty-categories {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 36px 16px;
      color: #9CA3AF;
      text-align: center;
      font-size: 0.85rem;
    }

    .empty-categories mat-icon {
      font-size: 32px !important;
      width: 32px !important;
      height: 32px !important;
      color: #CBD5E1;
    }

    /* Barras de Categorías */
    .categories-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .category-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .category-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.82rem;
    }

    .category-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #1F2937;
    }

    .category-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
      line-height: 18px !important;
      color: #011C5B;
    }

    .category-stats {
      font-size: 0.78rem;
      font-weight: 600;
      color: #6B7280;
      font-family: monospace;
      font-variant-numeric: tabular-nums;
    }

    .progress-track {
      width: 100%;
      height: 10px;
      border-radius: 999px;
      background: #F3F4F6;
      overflow: hidden;
    }

    .progress-bar {
      height: 10px;
      border-radius: 999px;
      background-color: #011C5B;
      transition: width 0.4s ease;
    }

    /* Lista de Estados */
    .status-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
    }

    .status-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      background: #F8F9FA;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
    }

    .status-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .status-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .dot-green { background-color: #008A47; }
    .dot-amber { background-color: #F19800; }
    .dot-red { background-color: #B23B24; }

    .status-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: #374151;
    }

    .status-badge {
      font-size: 0.8rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 8px;
      font-family: monospace;
      font-variant-numeric: tabular-nums;
    }

    .badge-green { background: #E6F4EA; color: #008A47; }
    .badge-amber { background: #FEF3C7; color: #F19800; }
    .badge-red { background: #FDE8E8; color: #B23B24; }

    .panel-footer-action {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid #E5E7EB;
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 10px 16px;
      border-radius: 10px;
      background: #011C5B;
      color: #FFFFFF;
      font-size: 0.85rem;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.2s;
      box-sizing: border-box;
    }

    .action-btn mat-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
      line-height: 18px !important;
    }

    .action-btn:hover {
      background: #0A2F8A;
    }

    @media (max-width: 900px) {
      .bottom-grid {
        grid-template-columns: 1fr;
      }
      .welcome-banner {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private metricasService = inject(AdminMetricasService);
  private sedeAdmin = inject(SedeAdminService);

  metricas = signal<MetricasResumen | null>(null);
  cargando = signal<boolean>(false);
  errorMensaje = signal<string | null>(null);

  fechaHoy = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  sedeNombre = computed(() => this.sedeAdmin.selectedSede()?.nombre || 'Sede Institucional');

  totalPendientes = computed(() => {
    const m = this.metricas();
    if (!m) return 0;
    return (
      (m.pendientes_moderacion?.perdidos ?? 0) +
      (m.pendientes_moderacion?.encontrados ?? 0) +
      (m.pendientes_moderacion?.eliminaciones ?? 0)
    );
  });

  detallePendientesTexto = computed(() => {
    const m = this.metricas();
    if (!m) return 'Revisar solicitudes';
    const p = m.pendientes_moderacion;
    return `${p.perdidos} perdidos · ${p.encontrados} encontrados · ${p.eliminaciones} bajas`;
  });

  topCategorias = computed(() => {
    return this.metricas()?.top_categorias ?? [];
  });

  reclamosAprobadosYEntregados = computed(() => {
    const r = this.metricas()?.reclamos_por_estado ?? {};
    return (r['APROBADO'] ?? 0) + (r['RECLAMADO'] ?? 0) + (r['ENTREGADO'] ?? 0);
  });

  reclamosEnCurso = computed(() => {
    const r = this.metricas()?.reclamos_por_estado ?? {};
    return (r['ENVIADO'] ?? 0) + (r['EN_REVISION'] ?? 0) + (r['CITA_AGENDADA'] ?? 0);
  });

  reclamosDescartados = computed(() => {
    const r = this.metricas()?.reclamos_por_estado ?? {};
    return (r['RECHAZADO'] ?? 0) + (r['CANCELADO_POR_USUARIO'] ?? 0);
  });

  constructor() {
    effect(() => {
      // Se suscribe reactivamente al cambio de sede del SUPERADMIN
      this.sedeAdmin.selectedSedeId();
      this.cargarMetricas();
    });
  }

  ngOnInit(): void {
    this.cargarMetricas();
  }

  cargarMetricas(): void {
    this.cargando.set(true);
    this.errorMensaje.set(null);

    this.metricasService.obtenerResumen().subscribe({
      next: (data) => {
        this.metricas.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.errorMensaje.set(mensajeDeError(err, 'No se pudieron obtener las métricas de la sede.'));
      }
    });
  }
}
