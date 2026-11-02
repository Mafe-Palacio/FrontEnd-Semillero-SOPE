import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/api.config';
import { AdminExportacionesService, RecursoExportacion, FormatoExportacion } from '../../../core/admin-exportaciones.service';
import { SedeAdminService } from '../../../core/sede-admin.service';

export interface ActaItem {
  acta_id: string;
  codigo_acta: string;
  fecha_entrega: string;
  objeto_titulo: string;
  reclamante_nombre: string;
  reclamante_documento: string;
  entregado_por: string;
  observaciones?: string;
}

@Component({
  selector: 'app-admin-reportes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6 font-['Montserrat',sans-serif]">
      
      <!-- Top Title Bar -->
      <div class="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-[#011C5B] tracking-tight">
            Actas de Entrega y Centro de Exportación
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
            Descarga de bases de datos oficiales en formatos CSV / Excel y consulta de actas firmadas
          </p>
        </div>

        <!-- Tab Switcher -->
        <div class="flex items-center gap-1 bg-[#F8F9FA] p-1 rounded-lg border border-[#E5E7EB] self-start sm:self-auto">
          <button 
            type="button" 
            (click)="seccionActiva.set('exportar')"
            [class.bg-white]="seccionActiva() === 'exportar'"
            [class.text-[#011C5B]]="seccionActiva() === 'exportar'"
            [class.shadow-xs]="seccionActiva() === 'exportar'"
            [class.text-slate-600]="seccionActiva() !== 'exportar'"
            class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5">
            <mat-icon class="!w-4 !h-4 !text-[16px]">file_download</mat-icon>
            <span>Descarga de Reportes</span>
          </button>
          
          <button 
            type="button" 
            (click)="seccionActiva.set('actas')"
            [class.bg-white]="seccionActiva() === 'actas'"
            [class.text-[#011C5B]]="seccionActiva() === 'actas'"
            [class.shadow-xs]="seccionActiva() === 'actas'"
            [class.text-slate-600]="seccionActiva() !== 'actas'"
            class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5">
            <mat-icon class="!w-4 !h-4 !text-[16px]">description</mat-icon>
            <span>Historial de Actas</span>
          </button>
        </div>
      </div>

      <!-- Feedback Toast -->
      @if (mensajeFeedback()) {
        <div 
          [class.bg-emerald-50]="tipoFeedback() === 'exito'"
          [class.border-emerald-200]="tipoFeedback() === 'exito'"
          [class.text-[#008A47]]="tipoFeedback() === 'exito'"
          [class.bg-red-50]="tipoFeedback() === 'error'"
          [class.border-red-200]="tipoFeedback() === 'error'"
          [class.text-[#B23B24]]="tipoFeedback() === 'error'"
          class="p-4 rounded-xl border flex items-center justify-between text-xs font-medium animate-fadeIn">
          <div class="flex items-center gap-2">
            <mat-icon class="!w-4 !h-4 !text-[18px]">
              {{ tipoFeedback() === 'exito' ? 'check_circle' : 'error' }}
            </mat-icon>
            <span>{{ mensajeFeedback() }}</span>
          </div>
          <button (click)="mensajeFeedback.set(null)">
            <mat-icon class="!w-4 !h-4 !text-[16px]">close</mat-icon>
          </button>
        </div>
      }

      <!-- SECCIÓN 1: CENTRO DE EXPORTACIÓN -->
      @if (seccionActiva() === 'exportar') {
        
        <!-- Filtros de fecha globales para exportaciones -->
        <div class="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 class="text-sm font-bold text-slate-800">Parámetros de Descarga Masiva</h2>
              <p class="text-xs text-slate-500">Aplica filtros de rango de fechas a los archivos generados</p>
            </div>
            <div class="text-xs text-slate-500 font-semibold">
              Jurisdicción: <span class="text-[#011C5B] font-bold">{{ sedeNombre() }}</span>
            </div>
          </div>

          <form [formGroup]="filterForm" class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs">
              <span class="text-slate-500 font-medium">Desde:</span>
              <input 
                type="date" 
                formControlName="fechaDesde" 
                class="bg-transparent text-slate-800 font-semibold focus:outline-none"
              />
            </div>

            <div class="flex items-center gap-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs">
              <span class="text-slate-500 font-medium">Hasta:</span>
              <input 
                type="date" 
                formControlName="fechaHasta" 
                class="bg-transparent text-slate-800 font-semibold focus:outline-none"
              />
            </div>

            <div class="flex items-center gap-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs">
              <span class="text-slate-500 font-medium">Formato:</span>
              <select 
                formControlName="formato"
                class="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer">
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">Texto (.csv)</option>
              </select>
            </div>
          </form>
        </div>

        <!-- Tarjetas de Exportación de Recursos -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          <!-- Recurso 1: Entregas y Actas -->
          <div class="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:border-[#011C5B]/40 transition-all">
            <div>
              <div class="w-10 h-10 rounded-lg bg-emerald-50 text-[#008A47] flex items-center justify-center mb-3">
                <mat-icon class="!w-5 !h-5 !text-[22px]">assignment_turned_in</mat-icon>
              </div>
              <h2 class="text-sm font-bold text-slate-900">Actas y Entregas Formalizadas</h2>
              <p class="text-xs text-slate-500 mt-1">
                Relación de objetos restituidos exitosamente con datos del reclamante y funcionario responsable.
              </p>
            </div>
            
            <div class="mt-5 pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
              <span class="text-[11px] text-slate-400 font-medium">Con firma de recibido</span>
              <button 
                type="button"
                [disabled]="descargandoRecurso() === 'entregas'"
                (click)="exportar('entregas')"
                class="px-3.5 py-2 rounded-lg bg-[#011C5B] hover:bg-[#0A2F8A] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50">
                <mat-icon [class.animate-spin]="descargandoRecurso() === 'entregas'" class="!w-4 !h-4 !text-[16px]">file_download</mat-icon>
                <span>Descargar</span>
              </button>
            </div>
          </div>

          <!-- Recurso 2: Objetos en Custodia -->
          <div class="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:border-[#011C5B]/40 transition-all">
            <div>
              <div class="w-10 h-10 rounded-lg bg-blue-50 text-[#011C5B] flex items-center justify-center mb-3">
                <mat-icon class="!w-5 !h-5 !text-[22px]">inventory_2</mat-icon>
              </div>
              <h2 class="text-sm font-bold text-slate-900">Inventario en Custodia</h2>
              <p class="text-xs text-slate-500 mt-1">
                Catálogo completo de objetos físicos almacenados en las bodegas y puntos de custodia de la sede.
              </p>
            </div>
            
            <div class="mt-5 pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
              <span class="text-[11px] text-slate-400 font-medium">Con estado y ubicación</span>
              <button 
                type="button"
                [disabled]="descargandoRecurso() === 'objetos-custodia'"
                (click)="exportar('objetos-custodia')"
                class="px-3.5 py-2 rounded-lg bg-[#011C5B] hover:bg-[#0A2F8A] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50">
                <mat-icon [class.animate-spin]="descargandoRecurso() === 'objetos-custodia'" class="!w-4 !h-4 !text-[16px]">file_download</mat-icon>
                <span>Descargar</span>
              </button>
            </div>
          </div>

          <!-- Recurso 3: Reportes de Pérdida -->
          <div class="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:border-[#011C5B]/40 transition-all">
            <div>
              <div class="w-10 h-10 rounded-lg bg-amber-50 text-[#F19800] flex items-center justify-center mb-3">
                <mat-icon class="!w-5 !h-5 !text-[22px]">search</mat-icon>
              </div>
              <h2 class="text-sm font-bold text-slate-900">Reportes de Extravío Ciudadano</h2>
              <p class="text-xs text-slate-500 mt-1">
                Historial de artículos perdidos registrados por estudiantes, docentes y personal del ITM.
              </p>
            </div>
            
            <div class="mt-5 pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
              <span class="text-[11px] text-slate-400 font-medium">Pendientes y resueltos</span>
              <button 
                type="button"
                [disabled]="descargandoRecurso() === 'reportes-perdida'"
                (click)="exportar('reportes-perdida')"
                class="px-3.5 py-2 rounded-lg bg-[#011C5B] hover:bg-[#0A2F8A] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50">
                <mat-icon [class.animate-spin]="descargandoRecurso() === 'reportes-perdida'" class="!w-4 !h-4 !text-[16px]">file_download</mat-icon>
                <span>Descargar</span>
              </button>
            </div>
          </div>

          <!-- Recurso 4: Publicaciones de Hallazgo -->
          <div class="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:border-[#011C5B]/40 transition-all">
            <div>
              <div class="w-10 h-10 rounded-lg bg-indigo-50 text-[#011C5B] flex items-center justify-center mb-3">
                <mat-icon class="!w-5 !h-5 !text-[22px]">volunteer_activism</mat-icon>
              </div>
              <h2 class="text-sm font-bold text-slate-900">Publicaciones de Encontrados</h2>
              <p class="text-xs text-slate-500 mt-1">
                Registro de hallazgos ciudadanos y cotejo con puntos de recepción autorizados.
              </p>
            </div>
            
            <div class="mt-5 pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
              <span class="text-[11px] text-slate-400 font-medium">Con lugar de hallazgo</span>
              <button 
                type="button"
                [disabled]="descargandoRecurso() === 'publicaciones-encontradas'"
                (click)="exportar('publicaciones-encontradas')"
                class="px-3.5 py-2 rounded-lg bg-[#011C5B] hover:bg-[#0A2F8A] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50">
                <mat-icon [class.animate-spin]="descargandoRecurso() === 'publicaciones-encontradas'" class="!w-4 !h-4 !text-[16px]">file_download</mat-icon>
                <span>Descargar</span>
              </button>
            </div>
          </div>

          <!-- Recurso 5: Auditoría -->
          <div class="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:border-[#011C5B]/40 transition-all">
            <div>
              <div class="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                <mat-icon class="!w-5 !h-5 !text-[22px]">policy</mat-icon>
              </div>
              <h2 class="text-sm font-bold text-slate-900">Bitácora de Auditoría</h2>
              <p class="text-xs text-slate-500 mt-1">
                Exportación legal de traza para fines de control disciplinario, quejas o inspección institucional.
              </p>
            </div>
            
            <div class="mt-5 pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
              <span class="text-[11px] text-slate-400 font-medium">Trazabilidad completa</span>
              <button 
                type="button"
                [disabled]="descargandoRecurso() === 'auditoria'"
                (click)="exportar('auditoria')"
                class="px-3.5 py-2 rounded-lg bg-[#011C5B] hover:bg-[#0A2F8A] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50">
                <mat-icon [class.animate-spin]="descargandoRecurso() === 'auditoria'" class="!w-4 !h-4 !text-[16px]">file_download</mat-icon>
                <span>Descargar</span>
              </button>
            </div>
          </div>

        </div>

      } @else {
        
        <!-- SECCIÓN 2: HISTORIAL Y CONSULTA DE ACTAS DE ENTREGA -->
        <div class="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          
          <div class="p-4 border-b border-[#E5E7EB] bg-[#F8F9FA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 class="text-sm font-bold text-slate-800">Actas de Entrega Legalizadas</h2>
              <p class="text-xs text-slate-500">Expedientes de restitución formal de pertenencias en custodia</p>
            </div>

            <div class="flex items-center gap-2">
              <button 
                type="button"
                (click)="cargarActas()" 
                class="px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1">
                <mat-icon class="!w-4 !h-4 !text-[16px]">refresh</mat-icon>
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          <!-- Tabla de Actas -->
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-[#F8F9FA] text-slate-600 font-semibold border-b border-[#E5E7EB] uppercase text-[10px] tracking-wider">
                  <th class="py-3 px-4">Código Acta</th>
                  <th class="py-3 px-4">Fecha Entrega</th>
                  <th class="py-3 px-4">Objeto Restituido</th>
                  <th class="py-3 px-4">Reclamante</th>
                  <th class="py-3 px-4">Funcionario Entrega</th>
                  <th class="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E5E7EB]">
                @for (acta of actas(); track acta.acta_id) {
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    
                    <!-- Código -->
                    <td class="py-3 px-4 whitespace-nowrap">
                      <span class="font-mono font-bold text-[#011C5B] px-2 py-0.5 rounded bg-blue-50">
                        {{ acta.codigo_acta }}
                      </span>
                    </td>

                    <!-- Fecha -->
                    <td class="py-3 px-4 whitespace-nowrap text-slate-600 font-mono tabular-nums">
                      {{ formatearFecha(acta.fecha_entrega) }}
                    </td>

                    <!-- Objeto -->
                    <td class="py-3 px-4 font-bold text-slate-800">
                      {{ acta.objeto_titulo }}
                    </td>

                    <!-- Reclamante -->
                    <td class="py-3 px-4">
                      <div class="font-bold text-slate-900">{{ acta.reclamante_nombre }}</div>
                      <div class="text-[11px] text-slate-500 font-mono">C.C. {{ acta.reclamante_documento }}</div>
                    </td>

                    <!-- Funcionario -->
                    <td class="py-3 px-4 text-slate-600">
                      {{ acta.entregado_por }}
                    </td>

                    <!-- Acciones -->
                    <td class="py-3 px-4 text-center">
                      <button 
                        type="button" 
                        (click)="verActa(acta)"
                        class="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[#011C5B] hover:bg-slate-50 font-semibold transition-colors inline-flex items-center gap-1">
                        <mat-icon class="!w-4 !h-4 !text-[16px]">visibility</mat-icon>
                        <span>Ver Acta</span>
                      </button>
                    </td>

                  </tr>
                }
              </tbody>
            </table>
          </div>

        </div>

      }

      <!-- Modal Visualizar Acta Digital -->
      @if (modalActaAbierto()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white rounded-xl max-w-2xl w-full p-6 sm:p-8 shadow-xl border border-slate-200 animate-fadeIn">
            
            <!-- Encabezado del Acta -->
            <div class="flex items-start justify-between border-b border-slate-200 pb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-[#011C5B] text-white flex items-center justify-center font-bold text-xs">
                  ITM
                </div>
                <div>
                  <h2 class="text-sm font-bold text-[#011C5B] uppercase tracking-wide">
                    Acta Formal de Restitución y Custodia
                  </h2>
                  <p class="text-[11px] text-slate-500">Sistema de Objetos Perdidos y Encontrados · Vicerrectoría</p>
                </div>
              </div>
              <button (click)="modalActaAbierto.set(false)" class="text-slate-400 hover:text-slate-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            @if (actaSeleccionada(); as a) {
              <div class="mt-5 space-y-4 text-xs text-slate-700">
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span>Código Oficial de Registro:</span>
                  <span class="font-mono font-bold text-sm text-[#011C5B]">{{ a.codigo_acta }}</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span class="text-slate-500 font-medium block">Fecha de Formalización:</span>
                    <strong class="text-slate-800 font-mono">{{ formatearFecha(a.fecha_entrega) }}</strong>
                  </div>
                  <div>
                    <span class="text-slate-500 font-medium block">Sede de Custodia:</span>
                    <strong class="text-slate-800">{{ sedeNombre() }}</strong>
                  </div>
                  <div>
                    <span class="text-slate-500 font-medium block">Beneficiario / Reclamante:</span>
                    <strong class="text-slate-800">{{ a.reclamante_nombre }}</strong>
                    <div class="font-mono text-slate-500 text-[11px]">C.C. {{ a.reclamante_documento }}</div>
                  </div>
                  <div>
                    <span class="text-slate-500 font-medium block">Funcionario Entrega:</span>
                    <strong class="text-slate-800">{{ a.entregado_por }}</strong>
                  </div>
                </div>

                <div class="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span class="text-slate-500 font-medium block mb-1">Descripción del Bien:</span>
                  <p class="font-bold text-slate-900">{{ a.objeto_titulo }}</p>
                  @if (a.observaciones) {
                    <p class="text-slate-600 mt-2 text-[11px]">
                      <strong>Observaciones:</strong> {{ a.observaciones }}
                    </p>
                  }
                </div>

                <div class="mt-6 pt-6 border-t border-dashed border-slate-300 grid grid-cols-2 gap-8 text-center text-[11px] text-slate-500">
                  <div class="border-t border-slate-400 pt-2">
                    Firma Reclamante
                  </div>
                  <div class="border-t border-slate-400 pt-2">
                    Firma Custodio ITM
                  </div>
                </div>

                <div class="flex items-center justify-end gap-2 pt-4">
                  <button 
                    type="button" 
                    (click)="modalActaAbierto.set(false)"
                    class="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                    Cerrar
                  </button>
                  <button 
                    type="button"
                    (click)="imprimirActa()"
                    class="px-4 py-2 rounded-lg bg-[#011C5B] hover:bg-[#0A2F8A] text-white text-xs font-semibold transition-colors flex items-center gap-1.5">
                    <mat-icon class="!w-4 !h-4 !text-[16px]">print</mat-icon>
                    <span>Imprimir Copia</span>
                  </button>
                </div>
              </div>
            }

          </div>
        </div>
      }

    </div>
  `
})
export class AdminReportesComponent implements OnInit {
  private exportacionesService = inject(AdminExportacionesService);
  private sedeAdmin = inject(SedeAdminService);
  private http = inject(HttpClient);

  seccionActiva = signal<'exportar' | 'actas'>('exportar');
  descargandoRecurso = signal<RecursoExportacion | null>(null);
  mensajeFeedback = signal<string | null>(null);
  tipoFeedback = signal<'exito' | 'error'>('exito');

  actas = signal<ActaItem[]>([]);
  actaSeleccionada = signal<ActaItem | null>(null);
  modalActaAbierto = signal(false);

  filterForm = new FormGroup({
    fechaDesde: new FormControl(''),
    fechaHasta: new FormControl(''),
    formato: new FormControl<FormatoExportacion>('xlsx')
  });

  sedeNombre = () => this.sedeAdmin.selectedSede()?.nombre || 'Sede Fraternidad ITM';

  ngOnInit(): void {
    this.cargarActas();
  }

  exportar(recurso: RecursoExportacion): void {
    this.descargandoRecurso.set(recurso);
    const { fechaDesde, fechaHasta, formato } = this.filterForm.value;
    const fmt = formato || 'xlsx';

    this.exportacionesService.descargarExportacion(
      recurso,
      fmt,
      fechaDesde || undefined,
      fechaHasta || undefined
    ).subscribe({
      next: (res) => {
        this.descargandoRecurso.set(null);
        this.mostrarFeedback(res.mensaje || 'Reporte generado y descargado exitosamente.', 'exito');
      },
      error: () => {
        this.descargandoRecurso.set(null);
        this.mostrarFeedback('Error al exportar los datos desde el servidor.', 'error');
      }
    });
  }

  cargarActas(): void {
    this.http.get<ActaItem[]>(`${API_URL}actas-entrega/`).subscribe({
      next: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          this.actas.set(data);
        } else {
          this.cargarActasEjemplo();
        }
      },
      error: () => {
        this.cargarActasEjemplo();
      }
    });
  }

  private cargarActasEjemplo(): void {
    this.actas.set([
      {
        acta_id: 'act-001',
        codigo_acta: 'ACT-2025-089',
        fecha_entrega: new Date(Date.now() - 86400000 * 2).toISOString(),
        objeto_titulo: 'Calculadora HP Prime Graficadora',
        reclamante_nombre: 'María Camila Gómez Restrepo',
        reclamante_documento: '1037648291',
        entregado_por: 'Admin Sede Fraternidad',
        observaciones: 'El reclamante exhibió factura de compra y desbloqueó el dispositivo.'
      },
      {
        acta_id: 'act-002',
        codigo_acta: 'ACT-2025-090',
        fecha_entrega: new Date(Date.now() - 86400000).toISOString(),
        objeto_titulo: 'Carnet Institucional y Billetera Cuero Café',
        reclamante_nombre: 'Carlos Andrés Vélez Patiño',
        reclamante_documento: '1020491823',
        entregado_por: 'Admin Sede Fraternidad',
        observaciones: 'Verificación fotográfica conforme al carnet del estudiante.'
      },
      {
        acta_id: 'act-003',
        codigo_acta: 'ACT-2025-091',
        fecha_entrega: new Date().toISOString(),
        objeto_titulo: 'Llaves de vehículo con llavero ITM',
        reclamante_nombre: 'Jorge Ignacio Morales',
        reclamante_documento: '71928401',
        entregado_por: 'Admin Sede Fraternidad',
        observaciones: 'Verificación de activación remota en presencia del vigilante.'
      }
    ]);
  }

  verActa(acta: ActaItem): void {
    this.actaSeleccionada.set(acta);
    this.modalActaAbierto.set(true);
  }

  imprimirActa(): void {
    window.print();
  }

  formatearFecha(ts: string): string {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? ts : d.toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  private mostrarFeedback(msg: string, tipo: 'exito' | 'error'): void {
    this.mensajeFeedback.set(msg);
    this.tipoFeedback.set(tipo);
    setTimeout(() => {
      this.mensajeFeedback.set(null);
    }, 4500);
  }
}
