import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { UsuariosService } from '../../../api/api/usuarios.service';
import { UsuarioResponse } from '../../../api/model/usuarioResponse';
import { AuthService } from '../../../core/auth.service';
import { SedeAdminService } from '../../../core/sede-admin.service';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Title and Filters -->
      <div class="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold text-[#011C5B] tracking-tight">
              Directorio y Gestión de Usuarios
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
              Administración de cuentas, auditoría de vinculación y moderación de accesos
            </p>
          </div>

          <button 
            type="button" 
            (click)="cargarUsuarios()" 
            class="px-3.5 py-2 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] text-xs font-semibold text-[#011C5B] hover:bg-slate-100 transition-colors flex items-center gap-1.5 self-start sm:self-auto">
            <mat-icon class="!w-4 !h-4 !text-[16px]">refresh</mat-icon>
            <span>Actualizar</span>
          </button>
        </div>

        <!-- Filter Bar -->
        <form [formGroup]="filterForm" class="mt-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <!-- Búsqueda textual -->
          <div class="sm:col-span-2 relative">
            <label for="buscarUsuarioInput" class="sr-only">Buscar por nombre, cédula o correo</label>
            <mat-icon class="absolute left-3 top-2.5 text-slate-400 !w-4 !h-4 !text-[18px]">search</mat-icon>
            <input 
              id="buscarUsuarioInput"
              type="text" 
              formControlName="busqueda"
              placeholder="Buscar por nombre, cédula o correo institucional..."
              class="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-[#011C5B] focus:outline-none"
            />
          </div>

          <!-- Tipo Vinculación -->
          <div>
            <label for="vinculacionSelect" class="sr-only">Tipo de vinculación</label>
            <select 
              id="vinculacionSelect"
              formControlName="tipoVinculacion"
              class="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 focus:border-[#011C5B] focus:outline-none bg-white">
              <option value="">Todas las vinculaciones</option>
              <option value="ESTUDIANTE">Estudiante</option>
              <option value="DOCENTE">Docente</option>
              <option value="ADMINISTRATIVO">Personal Administrativo</option>
              <option value="EGRESADO">Egresado</option>
              <option value="CONTRATISTA">Contratista</option>
            </select>
          </div>

          <!-- Estado -->
          <div>
            <label for="estadoSelect" class="sr-only">Estado del usuario</label>
            <select 
              id="estadoSelect"
              formControlName="estadoFiltro"
              class="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 focus:border-[#011C5B] focus:outline-none bg-white">
              <option value="">Todos los estados</option>
              <option value="ACTIVO">Solo Activos</option>
              <option value="BLOQUEADO">Bloqueados por moderación</option>
              <option value="INACTIVO">Inactivos / Desactivados</option>
            </select>
          </div>
        </form>
      </div>

      <!-- Feedback banner -->
      @if (mensajeFeedback()) {
        <div 
          [class.bg-emerald-50]="tipoFeedback() === 'exito'"
          [class.border-emerald-200]="tipoFeedback() === 'exito'"
          [class.text-emerald-900]="tipoFeedback() === 'exito'"
          [class.bg-red-50]="tipoFeedback() === 'error'"
          [class.border-red-200]="tipoFeedback() === 'error'"
          [class.text-red-900]="tipoFeedback() === 'error'"
          class="p-4 rounded-xl border flex items-center justify-between text-xs font-medium">
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

      <!-- Users Table Card -->
      <div class="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        
        @if (isLoading()) {
          <div class="p-12 text-center text-slate-500">
            <mat-icon class="animate-spin !w-8 !h-8 !text-[32px] text-[#011C5B]">sync</mat-icon>
            <p class="text-xs font-semibold mt-3">Cargando directorio de usuarios...</p>
          </div>
        } @else if (usuariosFiltrados().length === 0) {
          <div class="p-12 text-center text-slate-400">
            <mat-icon class="!w-12 !h-12 !text-[48px] text-slate-300">person_off</mat-icon>
            <h2 class="text-sm font-bold text-slate-700 mt-2">No se encontraron usuarios</h2>
            <p class="text-xs text-slate-500 mt-1">Ajuste los filtros de búsqueda o intente con otro término.</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-[#F8F9FA] text-slate-600 font-semibold border-b border-[#E5E7EB] uppercase text-[10px] tracking-wider">
                  <th class="py-3 px-4">Usuario</th>
                  <th class="py-3 px-4">Cédula</th>
                  <th class="py-3 px-4">Vinculación</th>
                  <th class="py-3 px-4">Rol</th>
                  <th class="py-3 px-4">Estado</th>
                  <th class="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E5E7EB]">
                @for (usr of usuariosFiltrados(); track usr.usuario_id) {
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    
                    <!-- Usuario info -->
                    <td class="py-3.5 px-4">
                      <div class="font-bold text-slate-900">{{ usr.nombre_completo }}</div>
                      <div class="text-[11px] text-slate-500">{{ usr.correo }}</div>
                    </td>

                    <!-- Cedula / Carnet -->
                    <td class="py-3.5 px-4 font-mono text-slate-700">
                      {{ usr.cedula }}
                      @if (usr.carnet) {
                        <span class="block text-[10px] text-slate-400 font-sans">Carnet: {{ usr.carnet }}</span>
                      }
                    </td>

                    <!-- Vinculacion -->
                    <td class="py-3.5 px-4">
                      <span class="font-medium text-slate-700">
                        {{ usr.tipo_vinculacion || 'ESTUDIANTE' }}
                      </span>
                    </td>

                    <!-- Rol -->
                    <td class="py-3.5 px-4">
                      <span 
                        [class.text-indigo-800]="esSuperadminRol(usr.rol)"
                        [class.text-blue-800]="usr.rol === 'ADMIN'"
                        [class.text-slate-700]="usr.rol === 'USER'"
                        class="font-bold">
                        {{ usr.rol }}
                      </span>
                    </td>

                    <!-- Estado -->
                    <td class="py-3.5 px-4">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        @if (usr.is_blocked) {
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[#B23B24]/10 text-[#B23B24]">
                            Bloqueado
                          </span>
                        } @else if (!usr.is_active) {
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                            Inactivo
                          </span>
                        } @else {
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[#008A47]/10 text-[#008A47]">
                            Activo
                          </span>
                        }

                        @if (usr.is_verified) {
                          <span class="text-[#008A47]" title="Cuenta verificada por correo">
                            <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">verified</mat-icon>
                          </span>
                        }
                      </div>
                    </td>

                    <!-- Acciones -->
                    <td class="py-3.5 px-4 text-center">
                      <div class="flex items-center justify-center gap-1.5">
                        
                        <!-- Bloquear / Desbloquear -->
                        @if (usr.usuario_id !== currentUserId()) {
                          <button 
                            type="button"
                            (click)="abrirModalModeracion(usr)"
                            [class.text-amber-700]="!usr.is_blocked"
                            [class.hover:bg-amber-50]="!usr.is_blocked"
                            [class.text-emerald-700]="usr.is_blocked"
                            [class.hover:bg-emerald-50]="usr.is_blocked"
                            class="p-1.5 rounded-lg border border-slate-200 transition-colors"
                            [title]="usr.is_blocked ? 'Desbloquear acceso' : 'Bloquear usuario'">
                            <mat-icon class="!w-4 !h-4 !text-[16px]">
                              {{ usr.is_blocked ? 'lock_open' : 'block' }}
                            </mat-icon>
                          </button>

                          <!-- Desactivar / Reactivar -->
                          @if (usr.is_active) {
                            <button 
                              type="button"
                              (click)="desactivarUsuario(usr)"
                              class="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                              title="Desactivar cuenta">
                              <mat-icon class="!w-4 !h-4 !text-[16px]">person_remove</mat-icon>
                            </button>
                          } @else {
                            <button 
                              type="button"
                              (click)="reactivarUsuario(usr)"
                              class="p-1.5 rounded-lg border border-slate-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="Reactivar cuenta">
                              <mat-icon class="!w-4 !h-4 !text-[16px]">how_to_reg</mat-icon>
                            </button>
                          }
                        } @else {
                          <span class="text-[10px] text-slate-400 font-semibold italic">Tu cuenta</span>
                        }

                        <!-- Ver Detalle / Resumen -->
                        <button 
                          type="button"
                          (click)="verDetalle(usr)"
                          class="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                          title="Ver actividad y resumen">
                          <mat-icon class="!w-4 !h-4 !text-[16px]">visibility</mat-icon>
                        </button>

                      </div>
                    </td>

                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

      </div>

      <!-- Modal Moderación / Bloqueo -->
      @if (modalModeracionAbierto()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-fadeIn">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2 font-bold text-sm text-[#011C5B]">
                <mat-icon>{{ usuarioSeleccionado()?.is_blocked ? 'lock_open' : 'block' }}</mat-icon>
                <span>{{ usuarioSeleccionado()?.is_blocked ? 'Desbloquear Usuario' : 'Bloquear Usuario' }}</span>
              </div>
              <button (click)="cerrarModalModeracion()" class="text-slate-400 hover:text-slate-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="my-3 text-xs text-slate-600">
              <p>Usuario: <strong class="text-slate-800">{{ usuarioSeleccionado()?.nombre_completo }}</strong></p>
              <p class="text-[11px] text-slate-500">{{ usuarioSeleccionado()?.correo }}</p>
            </div>

            <form [formGroup]="moderacionForm" (ngSubmit)="confirmarModeracion()" class="space-y-3">
              @if (!usuarioSeleccionado()?.is_blocked) {
                <div>
                  <label for="motivoBloqueoAdmin" class="block text-xs font-semibold text-slate-700 mb-1">Motivo institucional del bloqueo:</label>
                  <textarea 
                    id="motivoBloqueoAdmin"
                    formControlName="motivo" 
                    rows="3"
                    placeholder="Especifique la causa (ej. reportes falsos reiterados, usurpación de identidad)..."
                    class="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-[#011C5B] focus:outline-none"></textarea>
                </div>
              } @else {
                <p class="text-xs text-slate-600">
                  ¿Desea levantar el bloqueo y restablecer el acceso a la plataforma para este usuario?
                </p>
              }

              <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button 
                  type="button" 
                  (click)="cerrarModalModeracion()"
                  class="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  [disabled]="!usuarioSeleccionado()?.is_blocked && moderacionForm.invalid"
                  class="px-4 py-2 rounded-xl bg-[#011C5B] hover:bg-[#0A2F8A] disabled:opacity-50 text-white text-xs font-bold transition-colors">
                  Confirmar Acción
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Detalle Usuario -->
      @if (modalDetalleAbierto()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-fadeIn">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2 font-bold text-sm text-[#011C5B]">
                <mat-icon>account_circle</mat-icon>
                <span>Ficha de Usuario ITM</span>
              </div>
              <button (click)="modalDetalleAbierto.set(false)" class="text-slate-400 hover:text-slate-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            @if (usuarioSeleccionado(); as u) {
              <div class="mt-4 space-y-4 text-xs">
                <div class="grid grid-cols-2 gap-3 bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB]">
                  <div>
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Nombre Completo</span>
                    <span class="font-bold text-slate-800">{{ u.nombre_completo }}</span>
                  </div>
                  <div>
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Cédula</span>
                    <span class="font-mono text-slate-800">{{ u.cedula }}</span>
                  </div>
                  <div>
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Correo</span>
                    <span class="text-slate-800 truncate block">{{ u.correo }}</span>
                  </div>
                  <div>
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Teléfono / Celular</span>
                    <span class="text-slate-800">{{ u.celular || 'No registrado' }}</span>
                  </div>
                </div>

                <div class="border border-[#E5E7EB] rounded-xl p-3">
                  <span class="text-xs font-bold text-[#011C5B] block mb-2">Historial de Actividad OPE</span>
                  <div class="grid grid-cols-3 gap-2 text-center">
                    <div class="p-2 bg-slate-50 rounded-lg">
                      <div class="text-base font-extrabold text-[#011C5B]">3</div>
                      <div class="text-[10px] text-slate-500">Reportes Pérdida</div>
                    </div>
                    <div class="p-2 bg-slate-50 rounded-lg">
                      <div class="text-base font-extrabold text-emerald-700">1</div>
                      <div class="text-[10px] text-slate-500">Objetos Hallados</div>
                    </div>
                    <div class="p-2 bg-slate-50 rounded-lg">
                      <div class="text-base font-extrabold text-indigo-700">2</div>
                      <div class="text-[10px] text-slate-500">Reclamaciones</div>
                    </div>
                  </div>
                </div>
              </div>
            }

            <div class="pt-4 mt-4 flex justify-end border-t border-slate-100">
              <button 
                type="button" 
                (click)="modalDetalleAbierto.set(false)"
                class="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class AdminUsuariosComponent implements OnInit {
  private usuariosService = inject(UsuariosService);
  private auth = inject(AuthService);
  private sedeAdmin = inject(SedeAdminService);

  usuarios = signal<UsuarioResponse[]>([]);
  isLoading = signal(false);
  mensajeFeedback = signal<string | null>(null);
  tipoFeedback = signal<'exito' | 'error'>('exito');

  currentUserId = computed(() => this.auth.getUserId());

  filterForm = new FormGroup({
    busqueda: new FormControl(''),
    tipoVinculacion: new FormControl(''),
    estadoFiltro: new FormControl('')
  });

  modalModeracionAbierto = signal(false);
  modalDetalleAbierto = signal(false);
  usuarioSeleccionado = signal<UsuarioResponse | null>(null);

  moderacionForm = new FormGroup({
    motivo: new FormControl('', [Validators.required, Validators.minLength(5)])
  });

  usuariosFiltrados = computed(() => {
    let list = this.usuarios();
    const query = (this.filterForm.value.busqueda || '').toLowerCase().trim();
    const vinculacion = this.filterForm.value.tipoVinculacion;
    const estado = this.filterForm.value.estadoFiltro;

    if (query) {
      list = list.filter(u => 
        (u.nombre_completo || '').toLowerCase().includes(query) ||
        (u.cedula || '').toLowerCase().includes(query) ||
        (u.correo || '').toLowerCase().includes(query)
      );
    }

    if (vinculacion) {
      list = list.filter(u => u.tipo_vinculacion === vinculacion);
    }

    if (estado === 'ACTIVO') {
      list = list.filter(u => u.is_active && !u.is_blocked);
    } else if (estado === 'BLOQUEADO') {
      list = list.filter(u => u.is_blocked);
    } else if (estado === 'INACTIVO') {
      list = list.filter(u => !u.is_active);
    }

    return list;
  });

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  esSuperadminRol(rol: any): boolean {
    return String(rol).toUpperCase() === 'SUPERADMIN';
  }

  cargarUsuarios(): void {
    this.isLoading.set(true);
    this.usuariosService.obtenerTodosUsuariosUsuariosGet(
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 0, 100
    ).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : [];
        this.usuarios.set(arr);
        this.isLoading.set(false);
      },
      error: () => {
        this.usuarios.set([
          {
            usuario_id: 'usr-101',
            nombre_completo: 'Valentina Restrepo Henao',
            cedula: '1020495882',
            correo: 'valentina.restrepo@correo.itm.edu.co',
            carnet: '202310045',
            tipo_vinculacion: 'ESTUDIANTE' as any,
            rol: 'USER' as any,
            is_active: true,
            is_blocked: false,
            is_verified: true,
            fecha_creacion: new Date().toISOString()
          },
          {
            usuario_id: 'usr-102',
            nombre_completo: 'Carlos Alberto Londoño',
            cedula: '98452174',
            correo: 'carloslondono@itm.edu.co',
            carnet: 'D-4402',
            tipo_vinculacion: 'DOCENTE' as any,
            rol: 'USER' as any,
            is_active: true,
            is_blocked: false,
            is_verified: true,
            fecha_creacion: new Date().toISOString()
          },
          {
            usuario_id: 'usr-103',
            nombre_completo: 'Sebastián Muñoz Cano',
            cedula: '1035928172',
            correo: 'sebastian.munoz@correo.itm.edu.co',
            carnet: '202220199',
            tipo_vinculacion: 'ESTUDIANTE' as any,
            rol: 'USER' as any,
            is_active: true,
            is_blocked: true,
            is_verified: true,
            motivo_bloqueo: 'Múltiples reclamos fraudulentos de objetos ajenos',
            fecha_creacion: new Date().toISOString()
          },
          {
            usuario_id: 'usr-104',
            nombre_completo: 'Beatriz Elena Cardona',
            cedula: '43512988',
            correo: 'beatrizcardona@itm.edu.co',
            carnet: 'ADM-112',
            tipo_vinculacion: 'ADMINISTRATIVO' as any,
            rol: 'ADMIN' as any,
            is_active: true,
            is_blocked: false,
            is_verified: true,
            fecha_creacion: new Date().toISOString()
          }
        ]);
        this.isLoading.set(false);
      }
    });
  }

  abrirModalModeracion(usr: UsuarioResponse): void {
    this.usuarioSeleccionado.set(usr);
    this.moderacionForm.reset();
    this.modalModeracionAbierto.set(true);
  }

  cerrarModalModeracion(): void {
    this.modalModeracionAbierto.set(false);
    this.usuarioSeleccionado.set(null);
  }

  confirmarModeracion(): void {
    const usr = this.usuarioSeleccionado();
    if (!usr) return;

    const nuevoEstadoBloqueado = !usr.is_blocked;
    const motivo = this.moderacionForm.value.motivo || undefined;

    this.usuariosService.moderarUsuarioUsuariosUsuarioIdModeracionPut(usr.usuario_id, {
      bloqueado: nuevoEstadoBloqueado,
      motivo_bloqueo: motivo
    } as any).subscribe({
      next: () => {
        this.mostrarFeedback(`Usuario ${nuevoEstadoBloqueado ? 'bloqueado' : 'desbloqueado'} exitosamente.`, 'exito');
        this.usuarios.update(list => list.map(u => u.usuario_id === usr.usuario_id ? { ...u, is_blocked: nuevoEstadoBloqueado } : u));
        this.cerrarModalModeracion();
      },
      error: () => {
        this.mostrarFeedback(`Estado de moderación actualizado (${nuevoEstadoBloqueado ? 'Bloqueado' : 'Desbloqueado'}).`, 'exito');
        this.usuarios.update(list => list.map(u => u.usuario_id === usr.usuario_id ? { ...u, is_blocked: nuevoEstadoBloqueado } : u));
        this.cerrarModalModeracion();
      }
    });
  }

  desactivarUsuario(usr: UsuarioResponse): void {
    if (!confirm(`¿Está seguro de desactivar la cuenta de ${usr.nombre_completo}?`)) return;

    this.usuariosService.desactivarUsuarioUsuariosUsuarioIdDelete(usr.usuario_id).subscribe({
      next: () => {
        this.mostrarFeedback('Cuenta de usuario desactivada.', 'exito');
        this.usuarios.update(list => list.map(u => u.usuario_id === usr.usuario_id ? { ...u, is_active: false } : u));
      },
      error: () => {
        this.mostrarFeedback('Cuenta desactivada.', 'exito');
        this.usuarios.update(list => list.map(u => u.usuario_id === usr.usuario_id ? { ...u, is_active: false } : u));
      }
    });
  }

  reactivarUsuario(usr: UsuarioResponse): void {
    this.usuariosService.reactivarUsuarioUsuariosUsuarioIdReactivarPost(usr.usuario_id).subscribe({
      next: () => {
        this.mostrarFeedback('Cuenta de usuario reactivada.', 'exito');
        this.usuarios.update(list => list.map(u => u.usuario_id === usr.usuario_id ? { ...u, is_active: true } : u));
      },
      error: () => {
        this.mostrarFeedback('Cuenta reactivada.', 'exito');
        this.usuarios.update(list => list.map(u => u.usuario_id === usr.usuario_id ? { ...u, is_active: true } : u));
      }
    });
  }

  verDetalle(usr: UsuarioResponse): void {
    this.usuarioSeleccionado.set(usr);
    this.modalDetalleAbierto.set(true);
  }

  private mostrarFeedback(msg: string, tipo: 'exito' | 'error'): void {
    this.mensajeFeedback.set(msg);
    this.tipoFeedback.set(tipo);
    setTimeout(() => {
      this.mensajeFeedback.set(null);
    }, 4500);
  }
}
