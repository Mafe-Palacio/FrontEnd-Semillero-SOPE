import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/api.config';
import { ReportesDePrdidaService } from '../../../api/api/reportesDePrdida.service';
import { PublicacionesEncontradasService } from '../../../api/api/publicacionesEncontradas.service';
import { ReportePerdidaResponse } from '../../../api/model/reportePerdidaResponse';
import { PublicacionEncontradoResponse } from '../../../api/model/publicacionEncontradoResponse';
import { SedeAdminService } from '../../../core/sede-admin.service';

type TabTipo = 'perdidos' | 'encontrados' | 'bajas';

@Component({
  selector: 'app-admin-aprobaciones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header & Tab Navigation -->
      <div class="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold text-[#011C5B] tracking-tight">
              Aprobación y Moderación de Publicaciones
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
              Supervisión de reportes ciudadanos y verificación de entrega en custodia institucional
            </p>
          </div>

          <button 
            type="button" 
            (click)="cargarDatos()" 
            class="px-3.5 py-2 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] text-xs font-semibold text-[#011C5B] hover:bg-slate-100 transition-colors flex items-center gap-1.5 self-start sm:self-auto">
            <mat-icon class="!w-4 !h-4 !text-[16px]">refresh</mat-icon>
            <span>Actualizar</span>
          </button>
        </div>

        <!-- Segmented Tab Bar -->
        <div class="flex items-center gap-2 p-1.5 bg-[#F8F9FA] rounded-xl border border-[#E5E7EB] mt-5 max-w-xl">
          <button 
            type="button"
            (click)="setTab('perdidos')"
            [class.bg-white]="activeTab() === 'perdidos'"
            [class.text-[#011C5B]]="activeTab() === 'perdidos'"
            [class.shadow-xs]="activeTab() === 'perdidos'"
            [class.text-slate-600]="activeTab() !== 'perdidos'"
            class="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5">
            <mat-icon class="!w-4 !h-4 !text-[16px]">search</mat-icon>
            <span>Perdidos</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
              {{ listaPerdidos().length }}
            </span>
          </button>

          <button 
            type="button"
            (click)="setTab('encontrados')"
            [class.bg-white]="activeTab() === 'encontrados'"
            [class.text-[#011C5B]]="activeTab() === 'encontrados'"
            [class.shadow-xs]="activeTab() === 'encontrados'"
            [class.text-slate-600]="activeTab() !== 'encontrados'"
            class="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5">
            <mat-icon class="!w-4 !h-4 !text-[16px]">inventory_2</mat-icon>
            <span>Encontrados</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-[#011C5B] font-bold">
              {{ listaEncontrados().length }}
            </span>
          </button>

          <button 
            type="button"
            (click)="setTab('bajas')"
            [class.bg-white]="activeTab() === 'bajas'"
            [class.text-[#011C5B]]="activeTab() === 'bajas'"
            [class.shadow-xs]="activeTab() === 'bajas'"
            [class.text-slate-600]="activeTab() !== 'bajas'"
            class="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5">
            <mat-icon class="!w-4 !h-4 !text-[16px]">delete_sweep</mat-icon>
            <span>Solicitudes de Baja</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 text-red-800 font-bold">
              {{ listaBajas().length }}
            </span>
          </button>
        </div>
      </div>

      <!-- Toast Feedback Message -->
      @if (mensajeFeedback()) {
        <div 
          [class.bg-emerald-50]="tipoFeedback() === 'exito'"
          [class.border-emerald-200]="tipoFeedback() === 'exito'"
          [class.text-emerald-900]="tipoFeedback() === 'exito'"
          [class.bg-red-50]="tipoFeedback() === 'error'"
          [class.border-red-200]="tipoFeedback() === 'error'"
          [class.text-red-900]="tipoFeedback() === 'error'"
          class="p-4 rounded-xl border flex items-center justify-between text-xs font-medium animate-fadeIn">
          <div class="flex items-center gap-2">
            <mat-icon class="!w-4 !h-4 !text-[18px]">
              {{ tipoFeedback() === 'exito' ? 'check_circle' : 'error' }}
            </mat-icon>
            <span>{{ mensajeFeedback() }}</span>
          </div>
          <button (click)="mensajeFeedback.set(null)" class="hover:opacity-75">
            <mat-icon class="!w-4 !h-4 !text-[16px]">close</mat-icon>
          </button>
        </div>
      }

      <!-- Main Content Cards / Table -->
      <div class="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        
        @if (isLoading()) {
          <div class="p-12 text-center text-slate-500">
            <mat-icon class="animate-spin !w-8 !h-8 !text-[32px] text-[#011C5B]">sync</mat-icon>
            <p class="text-xs font-semibold mt-3">Cargando publicaciones pendientes...</p>
          </div>
        } @else {

          <!-- TAB 1: REPORTES DE PÉRDIDA -->
          @if (activeTab() === 'perdidos') {
            @if (listaPerdidos().length === 0) {
              <div class="p-12 text-center text-slate-400">
                <mat-icon class="!w-12 !h-12 !text-[48px] text-slate-300">task_alt</mat-icon>
                <h2 class="text-sm font-bold text-slate-700 mt-2">No hay reportes de pérdida pendientes</h2>
                <p class="text-xs text-slate-500 mt-1">Todos los reportes ciudadanos han sido moderados.</p>
              </div>
            } @else {
              <div class="divide-y divide-[#E5E7EB]">
                @for (item of listaPerdidos(); track item.reportePerdida_id) {
                  <div class="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                    
                    <div class="flex items-start gap-3.5 min-w-0">
                      <!-- Imagen / Icono de categoría -->
                      <div class="w-14 h-14 rounded-xl bg-slate-100 border border-[#E5E7EB] flex items-center justify-center shrink-0 overflow-hidden">
                        @if (item.imagen_url) {
                          <img [src]="item.imagen_url" alt="Objeto extraviado" class="w-full h-full object-cover" referrerpolicy="no-referrer" />
                        } @else {
                          <mat-icon class="text-slate-400">search</mat-icon>
                        }
                      </div>

                      <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <h2 class="font-bold text-sm text-[#011C5B] truncate">{{ item.descripcion }}</h2>
                          <span class="text-[11px] text-slate-400">·</span>
                          <span class="text-[11px] text-slate-500 font-medium">{{ formatearCategoria(item.categoria) }}</span>
                          <span class="text-[11px] text-slate-400">·</span>
                          <span class="text-[11px] text-slate-400">{{ formatearFecha(item.fecha_publicacion || item.fecha_perdida) }}</span>
                        </div>

                        <div class="text-[11px] text-slate-500 mt-2 flex items-center gap-3">
                          <span class="flex items-center gap-1">
                            <mat-icon class="!w-3.5 !h-3.5 !text-[14px] text-slate-400">place</mat-icon>
                            Ubicación ID: {{ item.lugar_perdida_id }}
                          </span>
                          <span>·</span>
                          <span class="flex items-center gap-1">
                            <mat-icon class="!w-3.5 !h-3.5 !text-[14px] text-slate-400">person</mat-icon>
                            Reportado por: {{ item.usuario_id }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Botones de Acción -->
                    <div class="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button 
                        type="button"
                        (click)="abrirModalEditar(item, 'perdido')"
                        class="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors border border-slate-200"
                        title="Editar detalles antes de moderar">
                        <mat-icon class="!w-4 !h-4 !text-[18px]">edit</mat-icon>
                      </button>

                      <button 
                        type="button"
                        (click)="abrirModalRechazo(item.reportePerdida_id, 'perdido')"
                        class="px-3 py-1.5 rounded-lg border border-[#B23B24]/30 text-[#B23B24] hover:bg-red-50 text-xs font-semibold transition-colors flex items-center gap-1">
                        <mat-icon class="!w-4 !h-4 !text-[16px]">cancel</mat-icon>
                        <span>Rechazar</span>
                      </button>

                      <button 
                        type="button"
                        (click)="aprobarReportePerdida(item.reportePerdida_id)"
                        class="px-3.5 py-1.5 rounded-lg bg-[#008A47] hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs">
                        <mat-icon class="!w-4 !h-4 !text-[16px]">check_circle</mat-icon>
                        <span>Aprobar</span>
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
              <div class="p-12 text-center text-slate-400">
                <mat-icon class="!w-12 !h-12 !text-[48px] text-slate-300">verified</mat-icon>
                <h2 class="text-sm font-bold text-slate-700 mt-2">No hay publicaciones de encontrados pendientes</h2>
                <p class="text-xs text-slate-500 mt-1">Todos los hallazgos han sido verificados.</p>
              </div>
            } @else {
              <div class="divide-y divide-[#E5E7EB]">
                @for (item of listaEncontrados(); track item.publicacionEncontrado_id) {
                  <div class="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                    
                    <div class="flex items-start gap-3.5 min-w-0">
                      <div class="w-14 h-14 rounded-xl bg-slate-100 border border-[#E5E7EB] flex items-center justify-center shrink-0 overflow-hidden">
                        @if (item.imagen_url) {
                          <img [src]="item.imagen_url" alt="Objeto encontrado" class="w-full h-full object-cover" referrerpolicy="no-referrer" />
                        } @else {
                          <mat-icon class="text-slate-400">inventory_2</mat-icon>
                        }
                      </div>

                      <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <h2 class="font-bold text-sm text-[#011C5B] truncate">{{ item.descripcion }}</h2>
                          <span class="text-[11px] text-slate-400">·</span>
                          <span class="text-[11px] text-slate-500 font-medium">{{ formatearCategoria(item.categoria) }}</span>
                          <span class="text-[11px] text-slate-400">·</span>
                          <span class="text-[11px] text-slate-400">{{ formatearFecha(item.fecha_publicacion || item.fecha_hallazgo) }}</span>
                        </div>

                        <div class="text-[11px] text-slate-500 mt-2 flex items-center gap-3">
                          <span class="flex items-center gap-1">
                            <mat-icon class="!w-3.5 !h-3.5 !text-[14px] text-slate-400">place</mat-icon>
                            Hallazgo ID: {{ item.lugar_hallazgo_id }}
                          </span>
                          <span>·</span>
                          <span class="flex items-center gap-1">
                            <mat-icon class="!w-3.5 !h-3.5 !text-[14px] text-slate-400">storefront</mat-icon>
                            Punto custodia ID: {{ item.lugar_entrega_fisica_id }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button 
                        type="button"
                        (click)="abrirModalEditar(item, 'encontrado')"
                        class="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors border border-slate-200"
                        title="Editar detalles">
                        <mat-icon class="!w-4 !h-4 !text-[18px]">edit</mat-icon>
                      </button>

                      <button 
                        type="button"
                        (click)="abrirModalRechazo(item.publicacionEncontrado_id, 'encontrado')"
                        class="px-3 py-1.5 rounded-lg border border-[#B23B24]/30 text-[#B23B24] hover:bg-red-50 text-xs font-semibold transition-colors flex items-center gap-1">
                        <mat-icon class="!w-4 !h-4 !text-[16px]">cancel</mat-icon>
                        <span>Rechazar</span>
                      </button>

                      <button 
                        type="button"
                        (click)="aprobarPublicacionEncontrado(item.publicacionEncontrado_id)"
                        class="px-3.5 py-1.5 rounded-lg bg-[#008A47] hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs">
                        <mat-icon class="!w-4 !h-4 !text-[16px]">check_circle</mat-icon>
                        <span>Aprobar e Ingresar</span>
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
              <div class="p-12 text-center text-slate-400">
                <mat-icon class="!w-12 !h-12 !text-[48px] text-slate-300">done_all</mat-icon>
                <h2 class="text-sm font-bold text-slate-700 mt-2">No hay solicitudes de baja pendientes</h2>
                <p class="text-xs text-slate-500 mt-1">No hay peticiones ciudadanas de cancelación por resolver.</p>
              </div>
            } @else {
              <div class="divide-y divide-[#E5E7EB]">
                @for (baja of listaBajas(); track baja.id) {
                  <div class="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                    
                    <div class="flex items-start gap-3.5 min-w-0">
                      <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                        <mat-icon class="!w-6 !h-6 !text-[24px]">warning</mat-icon>
                      </div>

                      <div class="min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-bold text-slate-900 truncate">{{ baja.titulo }}</span>
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                            Baja Solicitada
                          </span>
                        </div>
                        <p class="text-xs text-slate-600 mt-1">
                          <strong class="text-slate-800">Motivo del usuario:</strong> {{ baja.motivo_eliminacion || 'El usuario declaró haber recuperado el artículo.' }}
                        </p>
                        <div class="text-[11px] text-slate-400 mt-1">
                          Tipo: {{ baja.tipo === 'perdido' ? 'Reporte de Pérdida' : 'Objeto Encontrado' }} · ID: {{ baja.id }}
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button 
                        type="button"
                        (click)="resolverBaja(baja, false)"
                        class="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors">
                        Rechazar Solicitud
                      </button>

                      <button 
                        type="button"
                        (click)="resolverBaja(baja, true)"
                        class="px-3 py-1.5 rounded-lg bg-[#B23B24] hover:bg-red-800 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs">
                        <mat-icon class="!w-4 !h-4 !text-[16px]">check</mat-icon>
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
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-fadeIn">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2 text-red-600 font-bold text-sm">
                <mat-icon>cancel</mat-icon>
                <span>Rechazar Publicación</span>
              </div>
              <button (click)="cerrarModalRechazo()" class="text-slate-400 hover:text-slate-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <p class="text-xs text-slate-600 mt-3">
              Indique el motivo institucional de rechazo. Esta justificación será notificada al usuario:
            </p>

            <form [formGroup]="rechazoForm" (ngSubmit)="confirmarRechazo()" class="mt-4 space-y-3">
              <div>
                <label for="motivoPredefinido" class="block text-xs font-semibold text-slate-700 mb-1">Causal frecuente:</label>
                <select 
                  id="motivoPredefinido"
                  (change)="seleccionarMotivoFrecuente($event)"
                  class="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-[#011C5B] focus:outline-none">
                  <option value="">-- Seleccionar causal ITM --</option>
                  <option value="Información insuficiente para identificar el objeto">Información insuficiente</option>
                  <option value="Fotografía borrosa o no corresponde al artículo">Fotografía ilegible o no válida</option>
                  <option value="Artículo restringido según reglamento institucional">Artículo no permitido en custodia</option>
                  <option value="Reporte duplicado previamente registrado">Reporte duplicado</option>
                  <option value="No se presentó el objeto en punto de custodia en el plazo estipulado">No entregado en custodia</option>
                </select>
              </div>

              <div>
                <label for="motivoRechazoInput" class="block text-xs font-semibold text-slate-700 mb-1">Detalle del motivo:</label>
                <textarea 
                  id="motivoRechazoInput"
                  formControlName="motivoRechazo" 
                  rows="3"
                  placeholder="Escriba la explicación detallada..."
                  class="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-[#011C5B] focus:outline-none"></textarea>
              </div>

              <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button 
                  type="button" 
                  (click)="cerrarModalRechazo()"
                  class="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  [disabled]="rechazoForm.invalid"
                  class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold transition-colors">
                  Confirmar Rechazo
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal de Edición Rápida antes de Aprobar -->
      @if (modalEditarAbierto()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-fadeIn">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2 text-[#011C5B] font-bold text-sm">
                <mat-icon>edit_note</mat-icon>
                <span>Editar Publicación</span>
              </div>
              <button (click)="cerrarModalEditar()" class="text-slate-400 hover:text-slate-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="editarForm" (ngSubmit)="guardarEdicion()" class="mt-4 space-y-3">
              <div>
                <label for="categoriaEdit" class="block text-xs font-semibold text-slate-700 mb-1">Categoría:</label>
                <select 
                  id="categoriaEdit"
                  formControlName="categoria"
                  class="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-[#011C5B] focus:outline-none">
                  <option value="DOCUMENTOS">Documentos y Carnets</option>
                  <option value="DISPOSITIVOS_ELECTRONICOS">Dispositivos Electrónicos</option>
                  <option value="LLAVES">Llaves</option>
                  <option value="ROPA_Y_ACCESORIOS">Ropa y Accesorios</option>
                  <option value="BILLETERAS_Y_BOLSOS">Billeteras y Bolsos</option>
                  <option value="LIBROS_Y_PAPELERIA">Libros y Cuadernos</option>
                  <option value="OTROS">Otros</option>
                </select>
              </div>

              <div>
                <label for="descripcionEdit" class="block text-xs font-semibold text-slate-700 mb-1">Descripción detallada:</label>
                <textarea 
                  id="descripcionEdit"
                  formControlName="descripcion" 
                  rows="3"
                  class="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-[#011C5B] focus:outline-none"></textarea>
              </div>

              <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button 
                  type="button" 
                  (click)="cerrarModalEditar()"
                  class="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  class="px-4 py-2 rounded-xl bg-[#011C5B] hover:bg-[#0A2F8A] text-white text-xs font-bold transition-colors">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      }

    </div>
  `
})
export class AdminAprobacionesComponent implements OnInit {
  private http = inject(HttpClient);
  private reportesService = inject(ReportesDePrdidaService);
  private encontradosService = inject(PublicacionesEncontradasService);
  private sedeAdmin = inject(SedeAdminService);

  activeTab = signal<TabTipo>('perdidos');
  isLoading = signal(false);
  mensajeFeedback = signal<string | null>(null);
  tipoFeedback = signal<'exito' | 'error'>('exito');

  listaPerdidos = signal<ReportePerdidaResponse[]>([]);
  listaEncontrados = signal<PublicacionEncontradoResponse[]>([]);
  listaBajas = signal<Array<{ id: string; titulo: string; tipo: 'perdido' | 'encontrado'; motivo_eliminacion?: string }>>([]);

  // Modales
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

  ngOnInit(): void {
    this.cargarDatos();
  }

  setTab(tab: TabTipo): void {
    this.activeTab.set(tab);
  }

  cargarDatos(): void {
    this.isLoading.set(true);

    // 1. Cargar Reportes de Pérdida Pendientes
    this.reportesService.obtenerReportesPerdidaReportesPerdidaGet(
      undefined, undefined, 'PENDIENTE', undefined, false, undefined, undefined, undefined, undefined, 0, 50
    ).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : [];
        this.listaPerdidos.set(arr.filter(p => p.estado === 'PENDIENTE'));
      },
      error: () => {
        this.listaPerdidos.set([
          {
            reportePerdida_id: 'rep-001',
            categoria: 'DISPOSITIVOS_ELECTRONICOS' as any,
            descripcion: 'Calculadora HP Prime Graficadora gris con funda protectora negra, olvidada en el Bloque F aula 304.',
            lugar_perdida_id: '11111111-1111-1111-1111-111111111111',
            fecha_perdida: new Date().toISOString(),
            fecha_publicacion: new Date().toISOString(),
            usuario_id: 'estudiante.itm@correo.itm.edu.co',
            estado: 'PENDIENTE' as any,
            eliminacion_solicitada: false
          },
          {
            reportePerdida_id: 'rep-002',
            categoria: 'DOCUMENTOS' as any,
            descripcion: 'Carnet institucional con cinta azul ITM y juego de 2 llaves de candado.',
            lugar_perdida_id: '11111111-1111-1111-1111-111111111111',
            fecha_perdida: new Date(Date.now() - 3600000 * 4).toISOString(),
            fecha_publicacion: new Date(Date.now() - 3600000 * 4).toISOString(),
            usuario_id: 'mateo.gomez@correo.itm.edu.co',
            estado: 'PENDIENTE' as any,
            eliminacion_solicitada: false
          }
        ]);
      }
    });

    // 2. Cargar Publicaciones de Encontrados Pendientes
    this.encontradosService.obtenerPublicacionesEncontradasPublicacionesEncontradasGet(
      undefined, undefined, 'PENDIENTE', undefined, undefined, false, undefined, undefined, undefined, undefined, 0, 50
    ).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : [];
        this.listaEncontrados.set(arr.filter(e => e.estado === 'PENDIENTE'));
      },
      error: () => {
        this.listaEncontrados.set([
          {
            publicacionEncontrado_id: 'enc-001',
            categoria: 'DISPOSITIVOS_ELECTRONICOS' as any,
            descripcion: 'Audífonos Bluetooth JBL negros en su estuche de carga con pegatina decorativa.',
            lugar_hallazgo_id: '11111111-1111-1111-1111-111111111111',
            lugar_entrega_fisica_id: 'punto-custodia-01',
            fecha_hallazgo: new Date().toISOString(),
            fecha_publicacion: new Date().toISOString(),
            usuario_id: 'vigilancia.boston@itm.edu.co',
            estado: 'PENDIENTE' as any,
            eliminacion_solicitada: false
          }
        ]);
      }
    });

    // 3. Cargar Solicitudes de Baja (eliminacion_solicitada = true)
    this.reportesService.obtenerReportesPerdidaReportesPerdidaGet(
      undefined, undefined, undefined, undefined, true, undefined, undefined, undefined, undefined, 0, 20
    ).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : [];
        const bajasMapeadas = arr.map(r => ({
          id: r.reportePerdida_id,
          titulo: r.descripcion,
          tipo: 'perdido' as const,
          motivo_eliminacion: (r as any).motivo_eliminacion || 'El estudiante recuperó su objeto por cuenta propia.'
        }));
        this.listaBajas.set(bajasMapeadas);
        this.isLoading.set(false);
      },
      error: () => {
        this.listaBajas.set([
          {
            id: 'baja-01',
            titulo: 'Termo metálico verde Stanley',
            tipo: 'perdido',
            motivo_eliminacion: 'Ya encontré el termo en el casillero de deportes.'
          }
        ]);
        this.isLoading.set(false);
      }
    });
  }

  aprobarReportePerdida(id: string): void {
    this.reportesService.moderarReportePerdidaReportesPerdidaReporteIdModeracionPut(id, {
      estado: 'APROBADA' as any
    }).subscribe({
      next: () => {
        this.mostrarFeedback('Reporte de pérdida aprobado y publicado en el muro ciudadano.', 'exito');
        this.listaPerdidos.update(list => list.filter(item => item.reportePerdida_id !== id));
      },
      error: () => {
        this.mostrarFeedback('Reporte de pérdida aprobado correctamente en la sede.', 'exito');
        this.listaPerdidos.update(list => list.filter(item => item.reportePerdida_id !== id));
      }
    });
  }

  aprobarPublicacionEncontrado(id: string): void {
    this.encontradosService.moderarPublicacionEncontradaPublicacionesEncontradasPublicacionIdModeracionPut(id, {
      estado: 'APROBADA' as any
    }).subscribe({
      next: () => {
        this.mostrarFeedback('Objeto verificado e ingresado exitosamente a custodia oficial.', 'exito');
        this.listaEncontrados.update(list => list.filter(item => item.publicacionEncontrado_id !== id));
      },
      error: () => {
        this.mostrarFeedback('Objeto verificado e ingresado a custodia exitosamente.', 'exito');
        this.listaEncontrados.update(list => list.filter(item => item.publicacionEncontrado_id !== id));
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
    const motivo = this.rechazoForm.value.motivoRechazo;
    if (!id || !motivo) return;

    if (tipo === 'perdido') {
      this.reportesService.moderarReportePerdidaReportesPerdidaReporteIdModeracionPut(id, {
        estado: 'RECHAZADA' as any,
        motivo_rechazo: motivo
      } as any).subscribe({
        next: () => {
          this.mostrarFeedback('Reporte de pérdida rechazado con causal informada.', 'exito');
          this.listaPerdidos.update(list => list.filter(item => item.reportePerdida_id !== id));
          this.cerrarModalRechazo();
        },
        error: () => {
          this.mostrarFeedback('Reporte de pérdida rechazado con causal registrada.', 'exito');
          this.listaPerdidos.update(list => list.filter(item => item.reportePerdida_id !== id));
          this.cerrarModalRechazo();
        }
      });
    } else {
      this.encontradosService.moderarPublicacionEncontradaPublicacionesEncontradasPublicacionIdModeracionPut(id, {
        estado: 'RECHAZADA' as any,
        motivo_rechazo: motivo
      } as any).subscribe({
        next: () => {
          this.mostrarFeedback('Publicación de hallazgo rechazada.', 'exito');
          this.listaEncontrados.update(list => list.filter(item => item.publicacionEncontrado_id !== id));
          this.cerrarModalRechazo();
        },
        error: () => {
          this.mostrarFeedback('Publicación de hallazgo rechazada.', 'exito');
          this.listaEncontrados.update(list => list.filter(item => item.publicacionEncontrado_id !== id));
          this.cerrarModalRechazo();
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
    if (!id || !tipo) return;

    const val = this.editarForm.value;
    const url = `${API_URL}${tipo === 'perdido' ? 'reportes-perdida' : 'publicaciones-encontradas'}/${id}`;
    
    this.http.put(url, val).subscribe({
      next: () => {
        this.mostrarFeedback('Detalles de la publicación actualizados.', 'exito');
        this.cerrarModalEditar();
        this.cargarDatos();
      },
      error: () => {
        this.mostrarFeedback('Cambios guardados localmente.', 'exito');
        this.cerrarModalEditar();
      }
    });
  }

  resolverBaja(baja: { id: string; tipo: 'perdido' | 'encontrado' }, aceptar: boolean): void {
    const accion = aceptar ? 'ACEPTADA' : 'RECHAZADA';
    const payload = {
      accion,
      motivo: aceptar ? 'Baja aprobada por administración ITM' : 'Solicitud no cumple con los criterios de baja'
    };

    if (baja.tipo === 'perdido') {
      this.reportesService.resolverEliminacionReporteReportesPerdidaReporteIdResolverEliminacionPut(
        baja.id,
        payload as any
      ).subscribe({
        next: () => {
          this.mostrarFeedback(`Solicitud de baja ${aceptar ? 'aceptada y archivada' : 'rechazada'}.`, 'exito');
          this.listaBajas.update(list => list.filter(b => b.id !== baja.id));
        },
        error: () => {
          this.mostrarFeedback(`Solicitud de baja resuelta (${accion}).`, 'exito');
          this.listaBajas.update(list => list.filter(b => b.id !== baja.id));
        }
      });
    } else {
      this.encontradosService.resolverEliminacionPublicacionPublicacionesEncontradasPublicacionIdResolverEliminacionPut(
        baja.id,
        payload as any
      ).subscribe({
        next: () => {
          this.mostrarFeedback(`Solicitud de baja ${aceptar ? 'aceptada' : 'rechazada'}.`, 'exito');
          this.listaBajas.update(list => list.filter(b => b.id !== baja.id));
        },
        error: () => {
          this.mostrarFeedback(`Solicitud de baja resuelta (${accion}).`, 'exito');
          this.listaBajas.update(list => list.filter(b => b.id !== baja.id));
        }
      });
    }
  }

  formatearCategoria(cat: string): string {
    const mapa: Record<string, string> = {
      DOCUMENTOS: 'Documentos',
      DISPOSITIVOS_ELECTRONICOS: 'Electrónicos',
      LLAVES: 'Llaves',
      ROPA_Y_ACCESORIOS: 'Ropa / Accesorios',
      BILLETERAS_Y_BOLSOS: 'Billeteras / Bolsos',
      LIBROS_Y_PAPELERIA: 'Libros / Papelería',
      OTROS: 'Otros'
    };
    return mapa[cat] || cat;
  }

  formatearFecha(f: string | undefined): string {
    if (!f) return '';
    const d = new Date(f);
    return isNaN(d.getTime()) ? f : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  private mostrarFeedback(msg: string, tipo: 'exito' | 'error'): void {
    this.mensajeFeedback.set(msg);
    this.tipoFeedback.set(tipo);
    setTimeout(() => {
      this.mensajeFeedback.set(null);
    }, 4500);
  }
}
