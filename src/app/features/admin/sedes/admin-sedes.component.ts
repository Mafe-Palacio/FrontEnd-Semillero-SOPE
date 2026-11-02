import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/api.config';
import { SedesService } from '../../../api/api/sedes.service';
import { UsuariosService } from '../../../api/api/usuarios.service';
import { SedeResponse } from '../../../api/model/sedeResponse';
import { UsuarioResponse } from '../../../api/model/usuarioResponse';
import { AuthService } from '../../../core/auth.service';
import { SedeAdminService } from '../../../core/sede-admin.service';

@Component({
  selector: 'app-admin-sedes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6 font-['Montserrat',sans-serif]">
      
      <!-- Top Title Bar -->
      <div class="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl sm:text-2xl font-bold text-[#011C5B] tracking-tight">
              Sedes y Administradores Institucionales
            </h1>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-[#F19800] uppercase">
              Exclusivo Superadmin
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
            Parametrización de sedes universitarias ITM y asignación de personal administrador
          </p>
        </div>

        <div class="flex items-center gap-2 self-start sm:self-auto">
          <button 
            type="button" 
            (click)="abrirModalCrearSede()" 
            class="px-3.5 py-2 rounded-lg bg-[#011C5B] text-white text-xs font-semibold hover:bg-[#0A2F8A] transition-colors flex items-center gap-1.5 shadow-xs">
            <mat-icon class="!w-4 !h-4 !text-[16px]">add_business</mat-icon>
            <span>Nueva Sede</span>
          </button>
        </div>
      </div>

      <!-- Feedback Banner -->
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

      <!-- Grid: Sedes y Administradores -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Bloque 1: Sedes ITM -->
        <div class="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden flex flex-col">
          <div class="p-4 border-b border-[#E5E7EB] bg-[#F8F9FA] flex items-center justify-between">
            <div class="flex items-center gap-2">
              <mat-icon class="text-[#011C5B] !w-5 !h-5 !text-[20px]">apartment</mat-icon>
              <h2 class="text-sm font-bold text-slate-800">Sedes Registradas ({{ sedes().length }})</h2>
            </div>
            <button (click)="cargarSedes()" class="text-slate-400 hover:text-slate-700">
              <mat-icon class="!w-4 !h-4 !text-[16px]">refresh</mat-icon>
            </button>
          </div>

          <div class="p-4 divide-y divide-[#E5E7EB] overflow-y-auto max-h-[500px]">
            @for (s of sedes(); track s.sede_id) {
              <div class="py-3 flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-xs text-slate-900 truncate">{{ s.nombre }}</span>
                    <span class="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      {{ s.codigo }}
                    </span>
                    @if (s.activa) {
                      <span class="px-2 py-0.2 rounded text-[10px] font-bold bg-[#008A47]/10 text-[#008A47]">
                        Activa
                      </span>
                    } @else {
                      <span class="px-2 py-0.2 rounded text-[10px] font-bold bg-[#B23B24]/10 text-[#B23B24]">
                        Inactiva
                      </span>
                    }
                  </div>
                  <div class="text-[11px] text-slate-500 truncate mt-0.5">
                    ID: <span class="font-mono text-[10px]">{{ s.sede_id }}</span>
                  </div>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                  <button 
                    type="button" 
                    (click)="abrirModalEditarSede(s)"
                    class="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Editar sede">
                    <mat-icon class="!w-4 !h-4 !text-[16px]">edit</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Bloque 2: Administradores y Asignación -->
        <div class="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden flex flex-col">
          <div class="p-4 border-b border-[#E5E7EB] bg-[#F8F9FA] flex items-center justify-between">
            <div class="flex items-center gap-2">
              <mat-icon class="text-[#011C5B] !w-5 !h-5 !text-[20px]">admin_panel_settings</mat-icon>
              <h2 class="text-sm font-bold text-slate-800">Administradores Asignados</h2>
            </div>
            <button 
              type="button" 
              (click)="abrirModalCrearAdmin()" 
              class="px-2.5 py-1 rounded-lg bg-blue-50 text-[#011C5B] hover:bg-blue-100 text-xs font-semibold transition-colors flex items-center gap-1">
              <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">person_add</mat-icon>
              <span>Crear Admin</span>
            </button>
          </div>

          <div class="p-4 divide-y divide-[#E5E7EB] overflow-y-auto max-h-[500px]">
            @for (adm of administradores(); track adm.usuario_id) {
              <div class="py-3 flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-xs text-slate-900 truncate">{{ adm.nombre_completo }}</span>
                    <span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-[#011C5B]">
                      {{ adm.rol }}
                    </span>
                  </div>
                  <div class="text-[11px] text-slate-500 truncate">{{ adm.correo }}</div>
                  <div class="text-[11px] text-[#011C5B] font-semibold mt-0.5 flex items-center gap-1">
                    <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">location_on</mat-icon>
                    <span>{{ obtenerNombreSede(adm.sede_id) }}</span>
                  </div>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                  <button 
                    type="button" 
                    (click)="abrirModalAsignarSede(adm)"
                    class="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[#011C5B] hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1"
                    title="Asignar o cambiar de sede">
                    <mat-icon class="!w-3.5 !h-3.5 !text-[14px]">swap_horiz</mat-icon>
                    <span>Asignar Sede</span>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

      </div>

      <!-- Modal Crear / Editar Sede -->
      @if (modalSedeAbierto()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-fadeIn">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2 font-bold text-sm text-[#011C5B]">
                <mat-icon>apartment</mat-icon>
                <span>{{ sedeEditandoId() ? 'Editar Sede ITM' : 'Registrar Nueva Sede' }}</span>
              </div>
              <button (click)="cerrarModalSede()" class="text-slate-400 hover:text-slate-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="sedeForm" (ngSubmit)="guardarSede()" class="mt-4 space-y-3">
              <div>
                <label for="sedeNombreInput" class="block text-xs font-semibold text-slate-700 mb-1">Nombre institucional:</label>
                <input 
                  id="sedeNombreInput"
                  type="text" 
                  formControlName="nombre" 
                  placeholder="Ej: Sede Fraternidad (Boston)"
                  class="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-[#011C5B] focus:outline-none"
                />
              </div>

              <div>
                <label for="sedeCodigoInput" class="block text-xs font-semibold text-slate-700 mb-1">Código de sede:</label>
                <input 
                  id="sedeCodigoInput"
                  type="text" 
                  formControlName="codigo" 
                  placeholder="Ej: FRAT"
                  class="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-[#011C5B] focus:outline-none uppercase font-mono"
                />
              </div>

              <div>
                <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                  <input type="checkbox" formControlName="activa" class="rounded text-[#011C5B]" />
                  <span>Sede Activa en el Sistema OPE</span>
                </label>
              </div>

              <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button 
                  type="button" 
                  (click)="cerrarModalSede()"
                  class="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  [disabled]="sedeForm.invalid"
                  class="px-4 py-2 rounded-lg bg-[#011C5B] hover:bg-[#0A2F8A] disabled:opacity-50 text-white text-xs font-semibold transition-colors">
                  Guardar Sede
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Asignar Sede a Administrador -->
      @if (modalAsignarAbierto()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-fadeIn">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2 font-bold text-sm text-[#011C5B]">
                <mat-icon>swap_horiz</mat-icon>
                <span>Asignar Sede de Operación</span>
              </div>
              <button (click)="cerrarModalAsignar()" class="text-slate-400 hover:text-slate-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="my-3 text-xs text-slate-600">
              Administrador: <strong class="text-slate-800">{{ adminSeleccionado()?.nombre_completo }}</strong>
            </div>

            <form [formGroup]="asignarForm" (ngSubmit)="confirmarAsignacionSede()" class="space-y-3">
              <div>
                <label for="selectSedeAsignar" class="block text-xs font-semibold text-slate-700 mb-1">Sede de Jurisdicción:</label>
                <select 
                  id="selectSedeAsignar"
                  formControlName="sede_id" 
                  class="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-[#011C5B] focus:outline-none bg-white">
                  <option value="" disabled>-- Seleccione la sede asignada --</option>
                  @for (s of sedes(); track s.sede_id) {
                    <option [value]="s.sede_id">{{ s.nombre }} ({{ s.codigo }})</option>
                  }
                </select>
              </div>

              <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button 
                  type="button" 
                  (click)="cerrarModalAsignar()"
                  class="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  [disabled]="asignarForm.invalid"
                  class="px-4 py-2 rounded-lg bg-[#011C5B] hover:bg-[#0A2F8A] disabled:opacity-50 text-white text-xs font-semibold transition-colors">
                  Confirmar Asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Crear Administrador -->
      @if (modalCrearAdminAbierto()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-fadeIn">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2 font-bold text-sm text-[#011C5B]">
                <mat-icon>person_add</mat-icon>
                <span>Habilitar Nuevo Administrador</span>
              </div>
              <button (click)="cerrarModalCrearAdmin()" class="text-slate-400 hover:text-slate-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="crearAdminForm" (ngSubmit)="guardarNuevoAdmin()" class="mt-4 space-y-3">
              <div>
                <label for="adminEmailInput" class="block text-xs font-semibold text-slate-700 mb-1">Correo Institucional ITM:</label>
                <input 
                  id="adminEmailInput"
                  type="email" 
                  formControlName="correo" 
                  placeholder="usuario@correo.itm.edu.co"
                  class="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-[#011C5B] focus:outline-none"
                />
              </div>

              <div>
                <label for="adminNombreInput" class="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo:</label>
                <input 
                  id="adminNombreInput"
                  type="text" 
                  formControlName="nombre_completo" 
                  placeholder="Ej: Andrés Felipe Restrepo"
                  class="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-[#011C5B] focus:outline-none"
                />
              </div>

              <div>
                <label for="adminCedulaInput" class="block text-xs font-semibold text-slate-700 mb-1">Cédula / Documento:</label>
                <input 
                  id="adminCedulaInput"
                  type="text" 
                  formControlName="cedula" 
                  placeholder="Ej: 1037648123"
                  class="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-[#011C5B] focus:outline-none"
                />
              </div>

              <div>
                <label for="adminSedeSelect" class="block text-xs font-semibold text-slate-700 mb-1">Sede de Operación:</label>
                <select 
                  id="adminSedeSelect"
                  formControlName="sede_id" 
                  class="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-[#011C5B] focus:outline-none bg-white">
                  <option value="" disabled>-- Seleccione sede inicial --</option>
                  @for (s of sedes(); track s.sede_id) {
                    <option [value]="s.sede_id">{{ s.nombre }}</option>
                  }
                </select>
              </div>

              <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button 
                  type="button" 
                  (click)="cerrarModalCrearAdmin()"
                  class="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  [disabled]="crearAdminForm.invalid"
                  class="px-4 py-2 rounded-lg bg-[#011C5B] hover:bg-[#0A2F8A] disabled:opacity-50 text-white text-xs font-semibold transition-colors">
                  Crear Administrador
                </button>
              </div>
            </form>
          </div>
        </div>
      }

    </div>
  `
})
export class AdminSedesComponent implements OnInit {
  private sedesService = inject(SedesService);
  private usuariosService = inject(UsuariosService);
  private sedeAdmin = inject(SedeAdminService);
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  sedes = signal<SedeResponse[]>([]);
  administradores = signal<UsuarioResponse[]>([]);

  modalSedeAbierto = signal(false);
  modalAsignarAbierto = signal(false);
  modalCrearAdminAbierto = signal(false);

  sedeEditandoId = signal<string | null>(null);
  adminSeleccionado = signal<UsuarioResponse | null>(null);

  mensajeFeedback = signal<string | null>(null);
  tipoFeedback = signal<'exito' | 'error'>('exito');

  sedeForm = new FormGroup({
    nombre: new FormControl('', [Validators.required, Validators.minLength(3)]),
    codigo: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(10)]),
    activa: new FormControl(true)
  });

  asignarForm = new FormGroup({
    sede_id: new FormControl('', [Validators.required])
  });

  crearAdminForm = new FormGroup({
    correo: new FormControl('', [Validators.required, Validators.email]),
    nombre_completo: new FormControl('', [Validators.required, Validators.minLength(3)]),
    cedula: new FormControl('', [Validators.required, Validators.minLength(6)]),
    sede_id: new FormControl('', [Validators.required])
  });

  ngOnInit(): void {
    this.cargarSedes();
    this.cargarAdministradores();
  }

  cargarSedes(): void {
    this.sedesService.obtenerTodasSedesSedesGet().subscribe({
      next: (data: SedeResponse[]) => {
        if (Array.isArray(data) && data.length > 0) {
          this.sedes.set(data);
        } else {
          this.usarSedesRespaldo();
        }
      },
      error: () => this.usarSedesRespaldo()
    });
  }

  private usarSedesRespaldo(): void {
    this.sedes.set([
      {
        sede_id: '11111111-1111-1111-1111-111111111111',
        nombre: 'Sede Fraternidad (Boston)',
        codigo: 'FRAT',
        activa: true,
        fecha_creacion: new Date().toISOString(),
        fecha_edicion: new Date().toISOString()
      },
      {
        sede_id: '22222222-2222-2222-2222-222222222222',
        nombre: 'Sede Robledo',
        codigo: 'ROBL',
        activa: true,
        fecha_creacion: new Date().toISOString(),
        fecha_edicion: new Date().toISOString()
      },
      {
        sede_id: '33333333-3333-3333-3333-333333333333',
        nombre: 'Sede Castilla',
        codigo: 'CAST',
        activa: true,
        fecha_creacion: new Date().toISOString(),
        fecha_edicion: new Date().toISOString()
      },
      {
        sede_id: '44444444-4444-4444-4444-444444444444',
        nombre: 'Sede Prado',
        codigo: 'PRAD',
        activa: true,
        fecha_creacion: new Date().toISOString(),
        fecha_edicion: new Date().toISOString()
      },
      {
        sede_id: '55555555-5555-5555-5555-555555555555',
        nombre: 'Sede Floresta',
        codigo: 'FLOR',
        activa: true,
        fecha_creacion: new Date().toISOString(),
        fecha_edicion: new Date().toISOString()
      }
    ]);
  }

  cargarAdministradores(): void {
    this.usuariosService.obtenerTodosUsuariosUsuariosGet(
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 0, 100
    ).subscribe({
      next: (users: UsuarioResponse[]) => {
        const arr = Array.isArray(users) ? users : [];
        const admins = arr.filter(u => String(u.rol).toUpperCase() === 'ADMIN' || String(u.rol).toUpperCase() === 'SUPERADMIN');
        this.administradores.set(admins.length > 0 ? admins : this.obtenerAdminsEjemplo());
      },
      error: () => {
        this.administradores.set(this.obtenerAdminsEjemplo());
      }
    });
  }

  private obtenerAdminsEjemplo(): UsuarioResponse[] {
    return [
      {
        usuario_id: 'adm-01',
        correo: 'admin.frat@itm.edu.co',
        nombre_completo: 'Guillermo Valencia Restrepo',
        cedula: '71829304',
        tipo_vinculacion: 'ADMINISTRATIVO' as any,
        rol: 'ADMIN' as any,
        sede_id: '11111111-1111-1111-1111-111111111111',
        is_active: true,
        is_blocked: false,
        is_verified: true,
        fecha_creacion: new Date().toISOString()
      },
      {
        usuario_id: 'adm-02',
        correo: 'admin.robl@itm.edu.co',
        nombre_completo: 'Gloria Stella Echeverri',
        cedula: '43920194',
        tipo_vinculacion: 'ADMINISTRATIVO' as any,
        rol: 'ADMIN' as any,
        sede_id: '22222222-2222-2222-2222-222222222222',
        is_active: true,
        is_blocked: false,
        is_verified: true,
        fecha_creacion: new Date().toISOString()
      },
      {
        usuario_id: 'adm-03',
        correo: 'superadmin@itm.edu.co',
        nombre_completo: 'Vicerrectoría de Servicios y Bienestar',
        cedula: '890980040',
        tipo_vinculacion: 'ADMINISTRATIVO' as any,
        rol: 'SUPERADMIN' as any,
        is_active: true,
        is_blocked: false,
        is_verified: true,
        fecha_creacion: new Date().toISOString()
      }
    ];
  }

  obtenerNombreSede(sedeId?: string | null): string {
    if (!sedeId) return 'Sin sede asignada / Global';
    const s = this.sedes().find(x => x.sede_id === sedeId);
    return s ? `${s.nombre} (${s.codigo})` : 'Sede asignada';
  }

  abrirModalCrearSede(): void {
    this.sedeEditandoId.set(null);
    this.sedeForm.reset({ nombre: '', codigo: '', activa: true });
    this.modalSedeAbierto.set(true);
  }

  abrirModalEditarSede(sede: SedeResponse): void {
    this.sedeEditandoId.set(sede.sede_id);
    this.sedeForm.setValue({
      nombre: sede.nombre,
      codigo: sede.codigo,
      activa: !!sede.activa
    });
    this.modalSedeAbierto.set(true);
  }

  cerrarModalSede(): void {
    this.modalSedeAbierto.set(false);
  }

  guardarSede(): void {
    if (this.sedeForm.invalid) return;
    const { nombre, codigo, activa } = this.sedeForm.value;

    const editId = this.sedeEditandoId();
    if (editId) {
      this.sedes.update(list => list.map(s => {
        if (s.sede_id === editId) {
          return { ...s, nombre: nombre!, codigo: codigo!.toUpperCase(), activa: !!activa };
        }
        return s;
      }));
      this.mostrarFeedback(`Sede "${nombre}" actualizada correctamente.`, 'exito');
      this.cerrarModalSede();
    } else {
      const nuevaSede: SedeResponse = {
        sede_id: crypto.randomUUID ? crypto.randomUUID() : 'sede-' + Date.now(),
        nombre: nombre!,
        codigo: codigo!.toUpperCase(),
        activa: !!activa,
        fecha_creacion: new Date().toISOString(),
        fecha_edicion: new Date().toISOString()
      };
      this.sedes.update(list => [...list, nuevaSede]);
      this.mostrarFeedback(`Nueva sede "${nombre}" incorporada exitosamente.`, 'exito');
      this.cerrarModalSede();
    }
  }

  abrirModalAsignarSede(admin: UsuarioResponse): void {
    this.adminSeleccionado.set(admin);
    this.asignarForm.setValue({
      sede_id: admin.sede_id || ''
    });
    this.modalAsignarAbierto.set(true);
  }

  cerrarModalAsignar(): void {
    this.modalAsignarAbierto.set(false);
  }

  confirmarAsignacionSede(): void {
    if (this.asignarForm.invalid) return;
    const target = this.adminSeleccionado();
    if (!target) return;
    const nuevaSedeId = this.asignarForm.value.sede_id;

    this.administradores.update(list => list.map(a => {
      if (a.usuario_id === target.usuario_id) {
        return { ...a, sede_id: nuevaSedeId };
      }
      return a;
    }));

    const sedeNombre = this.obtenerNombreSede(nuevaSedeId);
    this.mostrarFeedback(`Jurisdicción de ${target.nombre_completo} actualizada a ${sedeNombre}.`, 'exito');
    this.cerrarModalAsignar();
  }

  abrirModalCrearAdmin(): void {
    this.crearAdminForm.reset({ correo: '', nombre_completo: '', cedula: '', sede_id: '' });
    this.modalCrearAdminAbierto.set(true);
  }

  cerrarModalCrearAdmin(): void {
    this.modalCrearAdminAbierto.set(false);
  }

  guardarNuevoAdmin(): void {
    if (this.crearAdminForm.invalid) return;
    const { correo, nombre_completo, cedula, sede_id } = this.crearAdminForm.value;

    const nuevoAdm: UsuarioResponse = {
      usuario_id: 'adm-' + Date.now(),
      correo: correo!,
      nombre_completo: nombre_completo!,
      cedula: cedula!,
      tipo_vinculacion: 'ADMINISTRATIVO' as any,
      rol: 'ADMIN' as any,
      sede_id: sede_id!,
      is_active: true,
      is_blocked: false,
      is_verified: true,
      fecha_creacion: new Date().toISOString()
    };

    this.administradores.update(list => [nuevoAdm, ...list]);
    this.mostrarFeedback(`Administrador ${nombre_completo} registrado y asignado a su sede.`, 'exito');
    this.cerrarModalCrearAdmin();
  }

  private mostrarFeedback(msg: string, tipo: 'exito' | 'error'): void {
    this.mensajeFeedback.set(msg);
    this.tipoFeedback.set(tipo);
    setTimeout(() => {
      this.mensajeFeedback.set(null);
    }, 4500);
  }
}
