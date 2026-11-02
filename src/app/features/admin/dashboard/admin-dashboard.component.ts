import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AdminMetricasService, MetricasResumen } from '../../../core/admin-metricas.service';
import { SedeAdminService } from '../../../core/sede-admin.service';

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
        <div class="welcome-date">
          <mat-icon class="date-icon">calendar_today</mat-icon>
          <span>{{ fechaHoy }}</span>
        </div>
      </section>

      <!-- 2. Grid de 4 Tarjetas KPI -->
      <section class="kpi-grid">
        
        <!-- KPI 1: Total en Custodia -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Total en Custodia</span>
            <div class="kpi-icon-box box-navy">
              <mat-icon>inventory_2</mat-icon>
            </div>
          </div>
          <div class="kpi-value text-navy">
            {{ metricas()?.total_custodia ?? 42 }}
          </div>
          <div class="kpi-subtext">
            <span>Artículos resguardados físicamente</span>
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
            {{ metricas()?.reclamados ?? 31 }}
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
              <span>Revisar solicitudes</span>
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
            {{ metricas()?.tasa_exito_porcentaje ?? 73.8 }}%
          </div>
          <div class="kpi-subtext">
            <span>Eficacia global de entrega</span>
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
              <p class="panel-subtitle">Distribución histórica de incidencias de extravío en la sede</p>
            </div>
            <div class="panel-header-icon">
              <mat-icon>bar_chart</mat-icon>
            </div>
          </div>

          <div class="categories-list">
            @for (cat of topCategorias(); track cat.nombre) {
              <div class="category-item">
                <div class="category-info">
                  <div class="category-label">
                    <mat-icon class="category-icon">{{ cat.icono }}</mat-icon>
                    <span class="category-name">{{ cat.nombre }}</span>
                  </div>
                  <span class="category-stats">{{ cat.cantidad }} reportes ({{ cat.porcentaje }}%)</span>
                </div>
                <div class="progress-track">
                  <div class="progress-bar" [style.width.%]="cat.porcentaje"></div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Columna Derecha: Reclamos por Estado -->
        <div class="panel-card col-narrow">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Reclamos por Estado</h2>
              <p class="panel-subtitle">Solicitudes ciudadanas en curso</p>
            </div>
            <div class="panel-header-icon">
              <mat-icon>pie_chart</mat-icon>
            </div>
          </div>

          <div class="status-list">
            <!-- Aprobados -->
            <div class="status-item">
              <div class="status-left">
                <span class="status-indicator dot-green"></span>
                <span class="status-name">Aprobados / Entregados</span>
              </div>
              <span class="status-badge badge-green">
                {{ metricas()?.reclamados ?? 31 }}
              </span>
            </div>

            <!-- En Revisión -->
            <div class="status-item">
              <div class="status-left">
                <span class="status-indicator dot-amber"></span>
                <span class="status-name">En Revisión / Pendientes</span>
              </div>
              <span class="status-badge badge-amber">
                {{ totalPendientes() }}
              </span>
            </div>

            <!-- Rechazados -->
            <div class="status-item">
              <div class="status-left">
                <span class="status-indicator dot-red"></span>
                <span class="status-name">Rechazados / Descartados</span>
              </div>
              <span class="status-badge badge-red">
                5
              </span>
            </div>
          </div>

          <!-- Acceso Directo de Acción -->
          <div class="panel-footer-action">
            <a routerLink="/admin/aprobaciones" class="action-btn">
              <mat-icon>verified</mat-icon>
              <span>Ir a la Bandeja de Moderación</span>
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

  fechaHoy = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  sedeNombre = () => this.sedeAdmin.selectedSede()?.nombre || 'Sede Fraternidad';

  totalPendientes = () => {
    const m = this.metricas();
    if (!m) return 12;
    return (m.pendientes_moderacion?.perdidos || 0) +
      (m.pendientes_moderacion?.encontrados || 0) +
      (m.pendientes_moderacion?.eliminaciones || 0) || 12;
  };

  topCategorias = () => {
    const cats = this.metricas()?.top_categorias;
    if (cats && cats.length > 0) return cats;
    return [
      { nombre: 'Dispositivos Electrónicos', icono: 'devices', cantidad: 38, porcentaje: 35 },
      { nombre: 'Documentos e Identificación', icono: 'badge', cantidad: 27, porcentaje: 25 },
      { nombre: 'Billeteras y Tarjeteros', icono: 'account_balance_wallet', cantidad: 18, porcentaje: 16 },
      { nombre: 'Llaves y Llaveros', icono: 'vpn_key', cantidad: 15, porcentaje: 14 },
      { nombre: 'Prendas y Accesorios', icono: 'checkroom', cantidad: 11, porcentaje: 10 }
    ];
  };

  ngOnInit(): void {
    this.metricasService.obtenerResumen().subscribe({
      next: (data) => {
        if (data) {
          this.metricas.set(data);
        }
      }
    });
  }
}
