import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/api.config';
import { mensajeDeError } from '../../../core/api-error';
import { SedesService } from '../../../api/api/sedes.service';
import { UsuariosService } from '../../../api/api/usuarios.service';
import { SedeResponse } from '../../../api/model/sedeResponse';
import { UsuarioResponse } from '../../../api/model/usuarioResponse';
import { SedeAdminService } from '../../../core/sede-admin.service';

@Component({
  selector: 'app-admin-sedes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="itm-admin-page">
      
      <!-- Encabezado Principal -->
      <div class="itm-admin-header">
        <div>
          <div class="sede-header-badges">
            <h1 class="itm-admin-title">Sedes y Administradores Institucionales</h1>
            <span class="itm-badge itm-badge-warning">Exclusivo Superadmin</span>
          </div>
          <p class="itm-admin-subtitle">
            Parametrización oficial de sedes universitarias ITM y asignación de personal administrador
          </p>
        </div>

        <div class="sede-header-actions">
          <button type="button" (click)="abrirModalCrearAdmin()" class="itm-btn itm-btn-outline">
            <mat-icon>person_add</mat-icon>
            <span>Nuevo Administrador</span>
          </button>

          <button type="button" (click)="abrirModalCrearSede()" class="itm-btn itm-btn-primary">
            <mat-icon>add_business</mat-icon>
            <span>Nueva Sede ITM</span>
          </button>
        </div>
      </div>

      <!-- Grid de Dos Columnas: Sedes y Administradores -->
      <div class="sede-two-col">
        
        <!-- Columna 1: Sedes Registradas -->
        <div class="itm-table-card">
          <div class="sede-panel-header">
            <div class="sede-panel-title">
              <div class="sede-panel-icon">
                <mat-icon>apartment</mat-icon>
              </div>
              <div>
                <h2>Sedes Universitarias ITM ({{ sedes().length }})</h2>
                <p>Campus habilitados para recepción y custodia</p>
              </div>
            </div>

            <button type="button" (click)="cargarSedes()" class="itm-icon-btn" title="Actualizar sedes">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>

          @if (sedes().length === 0) {
            <div class="itm-empty-state" style="border: none;">
              <div class="itm-empty-icon">
                <mat-icon>domain_disabled</mat-icon>
              </div>
              <h3 style="margin: 8px 0 0; font-size: 1rem;">No hay sedes registradas</h3>
              <p style="margin: 0; font-size: 0.82rem; color: #6b7280;">Cree la primera sede institucional con el botón superior.</p>
            </div>
          } @else {
            <div class="sede-list">
              @for (s of sedes(); track s.sede_id) {
                <div class="sede-item">
                  <div class="sede-item-info">
                    <div class="sede-item-top">
                      <span class="sede-item-name">{{ s.nombre }}</span>
                      <span class="itm-badge itm-badge-primary">{{ s.codigo }}</span>
                      @if (s.activa) {
                        <span class="itm-badge itm-badge-success">Activa</span>
                      } @else {
                        <span class="itm-badge itm-badge-danger">Inactiva</span>
                      }
                    </div>
                    <div class="sede-item-id">UUID: {{ s.sede_id }}</div>
                  </div>

                  <button
                    type="button"
                    (click)="abrirModalEditarSede(s)"
                    class="itm-btn itm-btn-outline"
                    style="padding: 6px 12px !important; font-size: 0.78rem !important;">
                    <mat-icon style="font-size: 16px; width: 16px; height: 16px;">edit</mat-icon>
                    <span>Editar</span>
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <!-- Columna 2: Administradores Asignados -->
        <div class="itm-table-card">
          <div class="sede-panel-header">
            <div class="sede-panel-title">
              <div class="sede-panel-icon cyan">
                <mat-icon>admin_panel_settings</mat-icon>
              </div>
              <div>
                <h2>Equipo Administrador ({{ administradores().length }})</h2>
                <p>Funcionarios con permisos de moderación y custodia</p>
              </div>
            </div>

            <button type="button" (click)="cargarAdministradores()" class="itm-icon-btn" title="Actualizar administradores">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>

          @if (administradores().length === 0) {
            <div class="itm-empty-state" style="border: none;">
              <div class="itm-empty-icon">
                <mat-icon>manage_accounts</mat-icon>
              </div>
              <h3 style="margin: 8px 0 0; font-size: 1rem;">No se encontraron administradores</h3>
              <p style="margin: 0; font-size: 0.82rem; color: #6b7280;">Habilite un nuevo administrador para las sedes del ITM.</p>
            </div>
          } @else {
            <div class="sede-list">
              @for (adm of administradores(); track adm.usuario_id) {
                <div class="sede-item">
                  <div class="sede-item-info">
                    <div class="sede-item-top">
                      <span class="sede-item-name">{{ adm.nombre_completo }}</span>
                      <span
                        class="itm-badge"
                        [class.itm-badge-primary]="String(adm.rol) === 'SUPERADMIN'"
                        [class.itm-badge-cyan]="String(adm.rol) === 'ADMIN'">
                        {{ adm.rol }}
                      </span>
                    </div>
                    <div class="sede-item-email">{{ adm.correo }} · C.C. {{ adm.cedula }}</div>
                    <div class="sede-item-loc">
                      <mat-icon>location_on</mat-icon>
                      <span>{{ obtenerNombreSede(adm.sede_id) }}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    (click)="abrirModalAsignarSede(adm)"
                    class="itm-btn itm-btn-outline"
                    style="padding: 6px 12px !important; font-size: 0.78rem !important;">
                    <mat-icon style="font-size: 16px; width: 16px; height: 16px;">swap_horiz</mat-icon>
                    <span>Asignar Sede</span>
                  </button>
                </div>
              }
            </div>
          }
        </div>

      </div>

      <!-- Modal Crear / Editar Sede -->
      @if (modalSedeAbierto()) {
        <div class="itm-modal-backdrop">
          <div class="itm-modal-card">
            <div class="itm-modal-header">
              <h3>
                <mat-icon>apartment</mat-icon>
                <span>{{ sedeEditandoId() ? 'Editar Sede ITM' : 'Registrar Nueva Sede ITM' }}</span>
              </h3>
              <button type="button" (click)="cerrarModalSede()" class="itm-modal-close">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="sedeForm" (ngSubmit)="guardarSede()">
              <div class="itm-modal-body">
                <div class="itm-field">
                  <label for="sedeNombreInput" class="itm-label">Nombre institucional *</label>
                  <input
                    id="sedeNombreInput"
                    type="text"
                    formControlName="nombre"
                    placeholder="Ej: Sede Fraternidad (Boston)"
                    class="itm-input"
                  />
                </div>

                <div class="itm-field">
                  <label for="sedeCodigoInput" class="itm-label">Código corto de sede *</label>
                  <input
                    id="sedeCodigoInput"
                    type="text"
                    formControlName="codigo"
                    placeholder="Ej: FRAT"
                    class="itm-input"
                    style="text-transform: uppercase; font-family: monospace;"
                  />
                </div>

                <label class="sede-check-row">
                  <input type="checkbox" formControlName="activa" />
                  <span>Sede activa y operativa en el sistema OPE</span>
                </label>
              </div>

              <div class="itm-modal-footer">
                <button type="button" (click)="cerrarModalSede()" class="itm-btn itm-btn-ghost">
                  Cancelar
                </button>
                <button type="submit" [disabled]="sedeForm.invalid || guardando()" class="itm-btn itm-btn-primary">
                  {{ sedeEditandoId() ? 'Guardar Cambios' : 'Crear Sede' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Asignar Sede a Administrador -->
      @if (modalAsignarAbierto()) {
        <div class="itm-modal-backdrop">
          <div class="itm-modal-card">
            <div class="itm-modal-header">
              <h3>
                <mat-icon>swap_horiz</mat-icon>
                <span>Asignar Sede de Operación</span>
              </h3>
              <button type="button" (click)="cerrarModalAsignar()" class="itm-modal-close">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="asignarForm" (ngSubmit)="confirmarAsignacionSede()">
              <div class="itm-modal-body">
                <div class="sede-admin-summary">
                  <strong>{{ adminSeleccionado()?.nombre_completo }}</strong>
                  <span>{{ adminSeleccionado()?.correo }}</span>
                </div>

                <div class="itm-field">
                  <label for="selectSedeAsignar" class="itm-label">Sede de Jurisdicción *</label>
                  <select id="selectSedeAsignar" formControlName="sede_id" class="itm-select">
                    <option value="" disabled>-- Seleccione la sede asignada --</option>
                    @for (s of sedes(); track s.sede_id) {
                      <option [value]="s.sede_id">{{ s.nombre }} ({{ s.codigo }})</option>
                    }
                  </select>
                </div>
              </div>

              <div class="itm-modal-footer">
                <button type="button" (click)="cerrarModalAsignar()" class="itm-btn itm-btn-ghost">
                  Cancelar
                </button>
                <button type="submit" [disabled]="asignarForm.invalid || guardando()" class="itm-btn itm-btn-primary">
                  Confirmar Asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Crear Administrador -->
      @if (modalCrearAdminAbierto()) {
        <div class="itm-modal-backdrop">
          <div class="itm-modal-card">
            <div class="itm-modal-header">
              <h3>
                <mat-icon>person_add</mat-icon>
                <span>Habilitar Nuevo Administrador ITM</span>
              </h3>
              <button type="button" (click)="cerrarModalCrearAdmin()" class="itm-modal-close">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="crearAdminForm" (ngSubmit)="guardarNuevoAdmin()">
              <div class="itm-modal-body">
                <div class="itm-field">
                  <label for="adminNombreInput" class="itm-label">Nombre Completo *</label>
                  <input
                    id="adminNombreInput"
                    type="text"
                    formControlName="nombre_completo"
                    placeholder="Ej: Andrés Felipe Restrepo"
                    class="itm-input"
                  />
                </div>

                <div class="sede-form-2col">
                  <div class="itm-field">
                    <label for="adminCedulaInput" class="itm-label">Cédula / Documento *</label>
                    <input
                      id="adminCedulaInput"
                      type="text"
                      formControlName="cedula"
                      placeholder="Ej: 1037648123"
                      class="itm-input"
                    />
                  </div>

                  <div class="itm-field">
                    <label for="adminCelularInput" class="itm-label">Celular</label>
                    <input
                      id="adminCelularInput"
                      type="text"
                      formControlName="celular"
                      placeholder="Ej: 3001234567"
                      class="itm-input"
                    />
                  </div>
                </div>

                <div class="itm-field">
                  <label for="adminEmailInput" class="itm-label">Correo Institucional (@itm.edu.co) *</label>
                  <input
                    id="adminEmailInput"
                    type="email"
                    formControlName="correo"
                    placeholder="funcionario@correo.itm.edu.co"
                    class="itm-input"
                  />
                </div>

                <div class="itm-field">
                  <label for="adminSedeSelect" class="itm-label">Sede de Operación *</label>
                  <select id="adminSedeSelect" formControlName="sede_id" class="itm-select">
                    <option value="" disabled>-- Seleccione sede inicial --</option>
                    @for (s of sedes(); track s.sede_id) {
                      <option [value]="s.sede_id">{{ s.nombre }} ({{ s.codigo }})</option>
                    }
                  </select>
                </div>

                <div class="itm-field">
                  <label for="adminPasswordInput" class="itm-label">Contraseña Temporal Segura *</label>
                  <input
                    id="adminPasswordInput"
                    type="password"
                    formControlName="password_temporal"
                    placeholder="Mín. 8 caracteres, mayúscula, minúscula, número y símbolo"
                    class="itm-input"
                  />
                </div>
              </div>

              <div class="itm-modal-footer">
                <button type="button" (click)="cerrarModalCrearAdmin()" class="itm-btn itm-btn-ghost">
                  Cancelar
                </button>
                <button type="submit" [disabled]="crearAdminForm.invalid || guardando()" class="itm-btn itm-btn-primary">
                  Crear Administrador
                </button>
              </div>
            </form>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .sede-header-badges {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }

    .sede-header-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }

    .sede-two-col {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 22px;
      align-items: start;
    }

    @media (max-width: 980px) {
      .sede-two-col {
        grid-template-columns: 1fr;
      }
    }

    .sede-panel-header {
      padding: 18px 22px;
      background: #f8fafc;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .sede-panel-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .sede-panel-icon {
      width: 42px;
      height: 42px;
      border-radius: 11px;
      background: #f0f6fc;
      color: var(--ing-1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .sede-panel-icon.cyan {
      background: rgba(0, 160, 183, 0.12);
      color: var(--ing-2);
    }

    .sede-panel-title h2 {
      margin: 0;
      font-size: 0.96rem;
      font-weight: 800;
      color: var(--ing-1);
    }

    .sede-panel-title p {
      margin: 2px 0 0;
      font-size: 0.78rem;
      color: #6b7280;
    }

    .sede-list {
      display: flex;
      flex-direction: column;
      max-height: 540px;
      overflow-y: auto;
    }

    .sede-item {
      padding: 16px 22px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      transition: background-color 0.15s ease;
    }

    .sede-item:last-child {
      border-bottom: none;
    }

    .sede-item:hover {
      background: #f8fafc;
    }

    .sede-item-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .sede-item-top {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .sede-item-name {
      font-weight: 800;
      font-size: 0.9rem;
      color: var(--ing-1);
    }

    .sede-item-id {
      font-family: monospace;
      font-size: 0.73rem;
      color: #6b7280;
    }

    .sede-item-email {
      font-size: 0.8rem;
      color: #4b5563;
    }

    .sede-item-loc {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--ing-2);
      margin-top: 2px;
    }

    .sede-item-loc mat-icon {
      font-size: 15px !important;
      width: 15px !important;
      height: 15px !important;
    }

    .sede-check-row {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      font-weight: 700;
      color: #374151;
      cursor: pointer;
    }

    .sede-admin-summary {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 0.84rem;
    }

    .sede-admin-summary strong {
      color: var(--ing-1);
    }

    .sede-admin-summary span {
      color: #6b7280;
      font-size: 0.78rem;
    }

    .sede-form-2col {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    @media (max-width: 560px) {
      .sede-form-2col {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AdminSedesComponent implements OnInit {
  private sedesService = inject(SedesService);
  private usuariosService = inject(UsuariosService);
  private sedeAdmin = inject(SedeAdminService);
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);

  readonly String = String;

  sedes = signal<SedeResponse[]>([]);
  administradores = signal<UsuarioResponse[]>([]);
  guardando = signal(false);

  modalSedeAbierto = signal(false);
  modalAsignarAbierto = signal(false);
  modalCrearAdminAbierto = signal(false);

  sedeEditandoId = signal<string | null>(null);
  adminSeleccionado = signal<UsuarioResponse | null>(null);

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
    cedula: new FormControl('', [Validators.required, Validators.minLength(5)]),
    celular: new FormControl(''),
    sede_id: new FormControl('', [Validators.required]),
    password_temporal: new FormControl('', [Validators.required, Validators.minLength(8)])
  });

  ngOnInit(): void {
    this.cargarSedes();
    this.cargarAdministradores();
  }

  cargarSedes(): void {
    this.sedesService.obtenerTodasSedesSedesGet().subscribe({
      next: (data: SedeResponse[]) => {
        this.sedes.set(Array.isArray(data) ? data : []);
      },
      error: (err) => {
        this.mostrarFeedback(mensajeDeError(err, 'No se pudieron cargar las sedes registradas.'));
      }
    });
  }

  cargarAdministradores(): void {
    this.http.get<UsuarioResponse[]>(`${API_URL}/usuarios/administradores`).subscribe({
      next: (admins) => {
        this.administradores.set(Array.isArray(admins) ? admins : []);
      },
      error: (err) => {
        this.mostrarFeedback(mensajeDeError(err, 'No se pudo cargar el listado de administradores.'));
      }
    });
  }

  obtenerNombreSede(sedeId?: string | null): string {
    if (!sedeId) return 'Sin sede asignada / Jurisdicción Global';
    const s = this.sedes().find((x) => x.sede_id === sedeId);
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
    if (this.sedeForm.invalid || this.guardando()) return;
    const { nombre, codigo, activa } = this.sedeForm.value;
    const payload = {
      nombre: nombre!.trim(),
      codigo: codigo!.trim().toUpperCase(),
      activa: !!activa
    };

    this.guardando.set(true);
    const editId = this.sedeEditandoId();

    if (editId) {
      this.sedesService.actualizarSedeSedesSedeIdPut(editId, payload).subscribe({
        next: (actualizada) => {
          this.guardando.set(false);
          this.sedes.update((list) => list.map((s) => (s.sede_id === editId ? actualizada : s)));
          this.sedeAdmin.cargarSedes();
          this.mostrarFeedback(`Sede "${actualizada.nombre}" actualizada correctamente.`);
          this.cerrarModalSede();
        },
        error: (err) => {
          this.guardando.set(false);
          this.mostrarFeedback(mensajeDeError(err, 'Error al actualizar la sede.'));
        }
      });
    } else {
      this.sedesService.crearSedeSedesPost(payload).subscribe({
        next: (creada) => {
          this.guardando.set(false);
          this.sedes.update((list) => [...list, creada]);
          this.sedeAdmin.cargarSedes();
          this.mostrarFeedback(`Nueva sede "${creada.nombre}" registrada exitosamente.`);
          this.cerrarModalSede();
        },
        error: (err) => {
          this.guardando.set(false);
          this.mostrarFeedback(mensajeDeError(err, 'Error al registrar la nueva sede.'));
        }
      });
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
    if (this.asignarForm.invalid || this.guardando()) return;
    const target = this.adminSeleccionado();
    if (!target) return;
    const nuevaSedeId = this.asignarForm.value.sede_id!;

    this.guardando.set(true);
    this.usuariosService
      .moderarUsuarioUsuariosUsuarioIdModeracionPut(target.usuario_id, {
        sede_id: nuevaSedeId
      })
      .subscribe({
        next: (actualizado) => {
          this.guardando.set(false);
          this.administradores.update((list) =>
            list.map((a) => (a.usuario_id === target.usuario_id ? actualizado : a))
          );
          const sedeNombre = this.obtenerNombreSede(nuevaSedeId);
          this.mostrarFeedback(`Jurisdicción de ${target.nombre_completo} actualizada a ${sedeNombre}.`);
          this.cerrarModalAsignar();
        },
        error: (err) => {
          this.guardando.set(false);
          this.mostrarFeedback(mensajeDeError(err, 'No se pudo asignar la sede al administrador.'));
        }
      });
  }

  abrirModalCrearAdmin(): void {
    this.crearAdminForm.reset({
      correo: '',
      nombre_completo: '',
      cedula: '',
      celular: '',
      sede_id: '',
      password_temporal: ''
    });
    this.modalCrearAdminAbierto.set(true);
  }

  cerrarModalCrearAdmin(): void {
    this.modalCrearAdminAbierto.set(false);
  }

  guardarNuevoAdmin(): void {
    if (this.crearAdminForm.invalid || this.guardando()) return;
    const { correo, nombre_completo, cedula, celular, sede_id, password_temporal } = this.crearAdminForm.value;

    const payload = {
      correo: correo!.trim().toLowerCase(),
      nombre_completo: nombre_completo!.trim(),
      cedula: cedula!.trim(),
      celular: celular?.trim() || null,
      tipo_vinculacion: 'ADMINISTRATIVO',
      sede_id: sede_id!,
      password_temporal: password_temporal!
    };

    this.guardando.set(true);
    this.http.post<UsuarioResponse>(`${API_URL}/usuarios/administradores`, payload).subscribe({
      next: (nuevoAdm) => {
        this.guardando.set(false);
        this.administradores.update((list) => [nuevoAdm, ...list]);
        this.mostrarFeedback(`Administrador ${nuevoAdm.nombre_completo} creado y asignado exitosamente.`);
        this.cerrarModalCrearAdmin();
      },
      error: (err) => {
        this.guardando.set(false);
        this.mostrarFeedback(mensajeDeError(err, 'No se pudo crear el administrador. Verifique correo @itm.edu.co y contraseña segura.'));
      }
    });
  }

  private mostrarFeedback(msg: string): void {
    this.snack.open(msg, 'Cerrar', { duration: 4000 });
  }
}
