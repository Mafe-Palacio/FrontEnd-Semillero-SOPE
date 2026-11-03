import { Component, OnInit, effect, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/api.config';
import { mensajeDeError } from '../../../core/api-error';
import { UsuariosService } from '../../../api/api/usuarios.service';
import { UsuarioResponse } from '../../../api/model/usuarioResponse';
import { AuthService } from '../../../core/auth.service';
import { SedeAdminService } from '../../../core/sede-admin.service';

interface ResumenUsuarioBackend {
  usuario: UsuarioResponse;
  reportes_perdida: { total: number; por_estado: Record<string, number> };
  publicaciones_encontradas: { total: number; por_estado: Record<string, number> };
  reclamos: { total: number; por_estado: Record<string, number> };
}

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="itm-admin-page">
      
      <!-- Encabezado -->
      <div class="itm-admin-header">
        <div>
          <h1 class="itm-admin-title">Directorio y Gestión de Usuarios</h1>
          <p class="itm-admin-subtitle">
            Administración de cuentas institucionales, auditoría de vinculación y moderación de accesos
          </p>
        </div>

        <button type="button" (click)="cargarUsuarios()" class="itm-btn itm-btn-outline">
          <mat-icon>refresh</mat-icon>
          <span>Actualizar Directorio</span>
        </button>
      </div>

      <!-- Barra de Filtros -->
      <form [formGroup]="filterForm" class="itm-filter-bar usr-filter-grid">
        <div class="itm-field usr-search-col">
          <label for="buscarUsuarioInput" class="itm-label">Búsqueda por nombre, cédula o correo</label>
          <div class="itm-input-wrap">
            <mat-icon class="itm-input-icon">search</mat-icon>
            <input
              id="buscarUsuarioInput"
              type="text"
              formControlName="busqueda"
              placeholder="Ej: Valentina, 1020..., @correo.itm.edu.co"
              class="itm-input with-icon"
            />
          </div>
        </div>

        <div class="itm-field">
          <label for="vinculacionSelect" class="itm-label">Tipo de vinculación</label>
          <select id="vinculacionSelect" formControlName="tipoVinculacion" class="itm-select">
            <option value="">Todas las vinculaciones</option>
            <option value="ESTUDIANTE">Estudiante</option>
            <option value="PROFESOR">Profesor / Docente</option>
            <option value="ADMINISTRATIVO">Personal Administrativo</option>
            <option value="OFICIOS_VARIOS">Servicios Generales (Oficios Varios)</option>
          </select>
        </div>

        <div class="itm-field">
          <label for="estadoSelect" class="itm-label">Estado de la cuenta</label>
          <select id="estadoSelect" formControlName="estadoFiltro" class="itm-select">
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Solo Activos</option>
            <option value="BLOQUEADO">Bloqueados por moderación</option>
            <option value="INACTIVO">Inactivos / Desactivados</option>
          </select>
        </div>
      </form>

      <!-- Tabla Institucional de Usuarios -->
      <div class="itm-table-card">
        @if (isLoading()) {
          <div class="itm-empty-state" style="border: none;">
            <div class="itm-empty-icon">
              <mat-icon class="spin-icon">sync</mat-icon>
            </div>
            <h3 style="margin: 8px 0 0; font-size: 1rem;">Cargando directorio de usuarios...</h3>
            <p style="margin: 0; font-size: 0.84rem; color: #6b7280;">Consultando cuentas registradas en el sistema</p>
          </div>
        } @else if (usuariosFiltrados().length === 0) {
          <div class="itm-empty-state" style="border: none;">
            <div class="itm-empty-icon">
              <mat-icon>person_off</mat-icon>
            </div>
            <h3 style="margin: 8px 0 0; font-size: 1.05rem;">No se encontraron usuarios</h3>
            <p style="margin: 0; font-size: 0.85rem; color: #6b7280;">Ajuste los filtros de búsqueda o intente con otro término.</p>
          </div>
        } @else {
          <div class="itm-table-scroll">
            <table class="itm-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Documento / Carnet</th>
                  <th>Vinculación</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th style="text-align: center;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (usr of usuariosFiltrados(); track usr.usuario_id) {
                  <tr>
                    <td>
                      <div class="usr-cell-main">
                        <div class="usr-avatar">
                          {{ obtenerIniciales(usr.nombre_completo) }}
                        </div>
                        <div>
                          <div class="usr-name">{{ usr.nombre_completo }}</div>
                          <div class="usr-email">{{ usr.correo }}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div class="usr-doc">{{ usr.cedula }}</div>
                      @if (usr.carnet) {
                        <div class="usr-sub">Carnet: {{ usr.carnet }}</div>
                      }
                    </td>

                    <td>
                      <span class="itm-badge itm-badge-neutral">
                        {{ formatearVinculacion(usr.tipo_vinculacion) }}
                      </span>
                    </td>

                    <td>
                      <span
                        class="itm-badge"
                        [class.itm-badge-primary]="esSuperadminRol(usr.rol)"
                        [class.itm-badge-cyan]="usr.rol === 'ADMIN'"
                        [class.itm-badge-neutral]="usr.rol === 'USER'">
                        {{ usr.rol }}
                      </span>
                    </td>

                    <td>
                      <div class="usr-status-wrap">
                        @if (usr.is_blocked) {
                          <span class="itm-badge itm-badge-danger">Bloqueado</span>
                        } @else if (!usr.is_active) {
                          <span class="itm-badge itm-badge-neutral">Inactivo</span>
                        } @else {
                          <span class="itm-badge itm-badge-success">Activo</span>
                        }

                        @if (usr.is_verified) {
                          <span class="usr-verified" title="Cuenta verificada por correo">
                            <mat-icon>verified</mat-icon>
                          </span>
                        }
                      </div>
                    </td>

                    <td>
                      <div class="usr-actions">
                        @if (usr.usuario_id !== currentUserId()) {
                          <button
                            type="button"
                            (click)="abrirModalModeracion(usr)"
                            class="itm-icon-btn"
                            [class.danger]="!usr.is_blocked"
                            [class.success]="usr.is_blocked"
                            [title]="usr.is_blocked ? 'Desbloquear acceso' : 'Bloquear usuario'">
                            <mat-icon>{{ usr.is_blocked ? 'lock_open' : 'block' }}</mat-icon>
                          </button>

                          @if (usr.is_active) {
                            <button
                              type="button"
                              (click)="desactivarUsuario(usr)"
                              class="itm-icon-btn danger"
                              title="Desactivar cuenta">
                              <mat-icon>person_remove</mat-icon>
                            </button>
                          } @else {
                            <button
                              type="button"
                              (click)="reactivarUsuario(usr)"
                              class="itm-icon-btn success"
                              title="Reactivar cuenta">
                              <mat-icon>how_to_reg</mat-icon>
                            </button>
                          }
                        } @else {
                          <span class="usr-self-tag">Tu cuenta</span>
                        }

                        <button
                          type="button"
                          (click)="verDetalle(usr)"
                          class="itm-icon-btn"
                          title="Ver ficha y resumen de actividad">
                          <mat-icon>visibility</mat-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="itm-pagination">
            <span>Mostrando <strong>{{ usuariosFiltrados().length }}</strong> de <strong>{{ usuarios().length }}</strong> usuarios registrados</span>
          </div>
        }
      </div>

      <!-- Modal Moderación / Bloqueo -->
      @if (modalModeracionAbierto()) {
        <div class="itm-modal-backdrop">
          <div class="itm-modal-card">
            <div class="itm-modal-header" [class.danger]="!usuarioSeleccionado()?.is_blocked">
              <h3>
                <mat-icon>{{ usuarioSeleccionado()?.is_blocked ? 'lock_open' : 'block' }}</mat-icon>
                <span>{{ usuarioSeleccionado()?.is_blocked ? 'Desbloquear Usuario' : 'Bloquear Usuario' }}</span>
              </h3>
              <button type="button" (click)="cerrarModalModeracion()" class="itm-modal-close">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="moderacionForm" (ngSubmit)="confirmarModeracion()">
              <div class="itm-modal-body">
                <div class="usr-modal-summary">
                  <div class="usr-name">{{ usuarioSeleccionado()?.nombre_completo }}</div>
                  <div class="usr-email">{{ usuarioSeleccionado()?.correo }} · C.C. {{ usuarioSeleccionado()?.cedula }}</div>
                </div>

                @if (!usuarioSeleccionado()?.is_blocked) {
                  <div class="itm-field">
                    <label for="motivoBloqueoAdmin" class="itm-label">Motivo institucional del bloqueo *</label>
                    <textarea
                      id="motivoBloqueoAdmin"
                      formControlName="motivo"
                      rows="3"
                      placeholder="Especifique la causa (ej. reportes falsos reiterados, suplantación de identidad)..."
                      class="itm-textarea"></textarea>
                  </div>
                } @else {
                  <p style="margin: 0; font-size: 0.88rem; color: #374151; line-height: 1.45;">
                    ¿Desea levantar el bloqueo disciplinario y restablecer el acceso a la plataforma para este usuario?
                  </p>
                }
              </div>

              <div class="itm-modal-footer">
                <button type="button" (click)="cerrarModalModeracion()" class="itm-btn itm-btn-ghost">
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="!usuarioSeleccionado()?.is_blocked && moderacionForm.invalid"
                  class="itm-btn"
                  [class.itm-btn-danger]="!usuarioSeleccionado()?.is_blocked"
                  [class.itm-btn-success]="usuarioSeleccionado()?.is_blocked">
                  {{ usuarioSeleccionado()?.is_blocked ? 'Confirmar Desbloqueo' : 'Confirmar Bloqueo' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Detalle y Resumen Real del Usuario -->
      @if (modalDetalleAbierto()) {
        <div class="itm-modal-backdrop">
          <div class="itm-modal-card wide">
            <div class="itm-modal-header">
              <h3>
                <mat-icon>badge</mat-icon>
                <span>Expediente Institucional de Usuario ITM</span>
              </h3>
              <button type="button" (click)="modalDetalleAbierto.set(false)" class="itm-modal-close">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            @if (usuarioSeleccionado(); as u) {
              <div class="itm-modal-body">
                <div class="usr-detail-grid">
                  <div>
                    <span class="itm-label">Nombre Completo</span>
                    <div class="usr-detail-val">{{ u.nombre_completo }}</div>
                  </div>
                  <div>
                    <span class="itm-label">Documento de Identidad</span>
                    <div class="usr-detail-val">{{ u.cedula }}</div>
                  </div>
                  <div>
                    <span class="itm-label">Correo Institucional</span>
                    <div class="usr-detail-val">{{ u.correo }}</div>
                  </div>
                  <div>
                    <span class="itm-label">Teléfono / Celular</span>
                    <div class="usr-detail-val">{{ u.celular || 'No registrado' }}</div>
                  </div>
                  <div>
                    <span class="itm-label">Carnet / Código</span>
                    <div class="usr-detail-val">{{ u.carnet || 'No registrado' }}</div>
                  </div>
                  <div>
                    <span class="itm-label">Tipo de Vinculación</span>
                    <div class="usr-detail-val">{{ formatearVinculacion(u.tipo_vinculacion) }}</div>
                  </div>
                </div>

                @if (u.is_blocked && u.motivo_bloqueo) {
                  <div class="usr-blocked-box">
                    <strong>Motivo de bloqueo vigente:</strong> {{ u.motivo_bloqueo }}
                  </div>
                }

                <div class="usr-stats-section">
                  <h4 style="margin: 0 0 12px; font-size: 0.9rem; color: var(--ing-1);">
                    Historial Real de Actividad en el Sistema
                  </h4>

                  @if (cargandoResumen()) {
                    <p style="margin: 0; font-size: 0.84rem; color: #6b7280;">Consultando estadísticas del usuario...</p>
                  } @else {
                    <div class="usr-stats-grid">
                      <div class="usr-stat-card">
                        <div class="usr-stat-num">{{ resumenUsuario()?.reportes_perdida?.total ?? 0 }}</div>
                        <div class="usr-stat-label">Reportes de Pérdida</div>
                      </div>
                      <div class="usr-stat-card cyan">
                        <div class="usr-stat-num">{{ resumenUsuario()?.publicaciones_encontradas?.total ?? 0 }}</div>
                        <div class="usr-stat-label">Objetos Hallados</div>
                      </div>
                      <div class="usr-stat-card green">
                        <div class="usr-stat-num">{{ resumenUsuario()?.reclamos?.total ?? 0 }}</div>
                        <div class="usr-stat-label">Reclamaciones</div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <div class="itm-modal-footer">
              <button type="button" (click)="modalDetalleAbierto.set(false)" class="itm-btn itm-btn-primary">
                Cerrar Expediente
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .usr-filter-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .usr-search-col {
      grid-column: span 2;
    }

    @media (max-width: 900px) {
      .usr-filter-grid {
        grid-template-columns: 1fr;
      }
      .usr-search-col {
        grid-column: span 1;
      }
    }

    .usr-cell-main {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .usr-avatar {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--itm-azul), var(--ing-2));
      color: #ffffff;
      font-size: 0.8rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .usr-name {
      font-weight: 800;
      color: var(--ing-1);
      font-size: 0.88rem;
    }

    .usr-email {
      font-size: 0.78rem;
      color: #6b7280;
    }

    .usr-doc {
      font-family: monospace;
      font-weight: 700;
      color: #1f2937;
      font-size: 0.85rem;
    }

    .usr-sub {
      font-size: 0.74rem;
      color: #6b7280;
    }

    .usr-status-wrap {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .usr-verified {
      color: #059669;
      display: inline-flex;
      align-items: center;
    }

    .usr-verified mat-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
    }

    .usr-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .usr-self-tag {
      font-size: 0.74rem;
      font-weight: 700;
      color: #6b7280;
      padding: 0 6px;
    }

    .usr-modal-summary {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 12px 16px;
    }

    .usr-detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 16px;
    }

    @media (max-width: 600px) {
      .usr-detail-grid {
        grid-template-columns: 1fr;
      }
    }

    .usr-detail-val {
      font-size: 0.88rem;
      font-weight: 700;
      color: #1f2937;
      margin-top: 3px;
      word-break: break-word;
    }

    .usr-blocked-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 12px 14px;
      border-radius: 12px;
      font-size: 0.83rem;
    }

    .usr-stats-section {
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 16px;
    }

    .usr-stats-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .usr-stat-card {
      background: #f0f6fc;
      border: 1px solid #dbeafe;
      border-radius: 12px;
      padding: 14px 10px;
      text-align: center;
    }

    .usr-stat-card.cyan {
      background: rgba(0, 160, 183, 0.08);
      border-color: rgba(0, 160, 183, 0.25);
    }

    .usr-stat-card.green {
      background: #ecfdf5;
      border-color: #a7f3d0;
    }

    .usr-stat-num {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--ing-1);
      line-height: 1.1;
    }

    .usr-stat-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #4b5563;
      margin-top: 4px;
    }

    .spin-icon {
      animation: itmSpin 1.1s linear infinite;
    }

    @keyframes itmSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class AdminUsuariosComponent implements OnInit {
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);
  private usuariosService = inject(UsuariosService);
  private auth = inject(AuthService);
  private sedeAdmin = inject(SedeAdminService);

  usuarios = signal<UsuarioResponse[]>([]);
  isLoading = signal(false);

  currentUserId = computed(() => this.auth.getUserId());

  filterForm = new FormGroup({
    busqueda: new FormControl(''),
    tipoVinculacion: new FormControl(''),
    estadoFiltro: new FormControl('')
  });

  private filtrosSignal = signal({
    busqueda: '',
    tipoVinculacion: '',
    estadoFiltro: ''
  });

  modalModeracionAbierto = signal(false);
  modalDetalleAbierto = signal(false);
  usuarioSeleccionado = signal<UsuarioResponse | null>(null);
  resumenUsuario = signal<ResumenUsuarioBackend | null>(null);
  cargandoResumen = signal(false);

  moderacionForm = new FormGroup({
    motivo: new FormControl('', [Validators.required, Validators.minLength(5)])
  });

  usuariosFiltrados = computed(() => {
    let list = this.usuarios();
    const { busqueda, tipoVinculacion, estadoFiltro } = this.filtrosSignal();
    const query = (busqueda || '').toLowerCase().trim();

    if (query) {
      list = list.filter((u) =>
        (u.nombre_completo || '').toLowerCase().includes(query) ||
        (u.cedula || '').toLowerCase().includes(query) ||
        (u.correo || '').toLowerCase().includes(query)
      );
    }

    if (tipoVinculacion) {
      list = list.filter((u) => u.tipo_vinculacion === tipoVinculacion);
    }

    if (estadoFiltro === 'ACTIVO') {
      list = list.filter((u) => u.is_active && !u.is_blocked);
    } else if (estadoFiltro === 'BLOQUEADO') {
      list = list.filter((u) => u.is_blocked);
    } else if (estadoFiltro === 'INACTIVO') {
      list = list.filter((u) => !u.is_active);
    }

    return list;
  });

  constructor() {
    this.filterForm.valueChanges.subscribe((val) => {
      this.filtrosSignal.set({
        busqueda: val.busqueda ?? '',
        tipoVinculacion: val.tipoVinculacion ?? '',
        estadoFiltro: val.estadoFiltro ?? ''
      });
    });

    effect(() => {
      this.sedeAdmin.selectedSedeId();
      this.cargarUsuarios();
    });
  }

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  esSuperadminRol(rol: any): boolean {
    return String(rol).toUpperCase() === 'SUPERADMIN';
  }

  obtenerIniciales(nombre: string | undefined): string {
    if (!nombre) return 'U';
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');
  }

  formatearVinculacion(tipo: string | undefined): string {
    const mapa: Record<string, string> = {
      ESTUDIANTE: 'Estudiante',
      PROFESOR: 'Profesor / Docente',
      ADMINISTRATIVO: 'Administrativo',
      OFICIOS_VARIOS: 'Servicios Generales'
    };
    return mapa[tipo || ''] || tipo || 'Estudiante';
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
      error: (err) => {
        this.isLoading.set(false);
        this.mostrarFeedback(mensajeDeError(err, 'No se pudo cargar el directorio de usuarios.'));
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
    const motivo = this.moderacionForm.value.motivo?.trim() || undefined;

    this.usuariosService.moderarUsuarioUsuariosUsuarioIdModeracionPut(usr.usuario_id, {
      is_blocked: nuevoEstadoBloqueado,
      motivo_bloqueo: nuevoEstadoBloqueado ? motivo : null
    }).subscribe({
      next: (actualizado) => {
        this.mostrarFeedback(`Usuario ${nuevoEstadoBloqueado ? 'bloqueado' : 'desbloqueado'} exitosamente.`);
        this.usuarios.update((list) =>
          list.map((u) => (u.usuario_id === usr.usuario_id ? actualizado : u))
        );
        this.cerrarModalModeracion();
      },
      error: (err) => {
        this.mostrarFeedback(mensajeDeError(err, 'Error al actualizar el estado de moderación del usuario.'));
      }
    });
  }

  desactivarUsuario(usr: UsuarioResponse): void {
    if (!confirm(`¿Está seguro de desactivar la cuenta de ${usr.nombre_completo}?`)) return;

    this.usuariosService.desactivarUsuarioUsuariosUsuarioIdDelete(usr.usuario_id).subscribe({
      next: () => {
        this.mostrarFeedback('Cuenta de usuario desactivada.');
        this.usuarios.update((list) =>
          list.map((u) => (u.usuario_id === usr.usuario_id ? { ...u, is_active: false } : u))
        );
      },
      error: (err) => {
        this.mostrarFeedback(mensajeDeError(err, 'No se pudo desactivar la cuenta del usuario.'));
      }
    });
  }

  reactivarUsuario(usr: UsuarioResponse): void {
    this.usuariosService.reactivarUsuarioUsuariosUsuarioIdReactivarPost(usr.usuario_id).subscribe({
      next: () => {
        this.mostrarFeedback('Cuenta de usuario reactivada exitosamente.');
        this.usuarios.update((list) =>
          list.map((u) => (u.usuario_id === usr.usuario_id ? { ...u, is_active: true } : u))
        );
      },
      error: (err) => {
        this.mostrarFeedback(mensajeDeError(err, 'No se pudo reactivar la cuenta del usuario.'));
      }
    });
  }

  verDetalle(usr: UsuarioResponse): void {
    this.usuarioSeleccionado.set(usr);
    this.resumenUsuario.set(null);
    this.cargandoResumen.set(true);
    this.modalDetalleAbierto.set(true);

    this.http.get<ResumenUsuarioBackend>(`${API_URL}/usuarios/${usr.usuario_id}/resumen`).subscribe({
      next: (resumen) => {
        this.resumenUsuario.set(resumen);
        this.cargandoResumen.set(false);
      },
      error: () => {
        this.cargandoResumen.set(false);
      }
    });
  }

  private mostrarFeedback(msg: string): void {
    this.snack.open(msg, 'Cerrar', { duration: 4000 });
  }
}
