import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/api.config';
import { mensajeDeError } from '../../../core/api-error';
import { AuthService } from '../../../core/auth.service';
import { SedeAdminService } from '../../../core/sede-admin.service';
import { SedesService } from '../../../api/api/sedes.service';
import { UsuariosService } from '../../../api/api/usuarios.service';
import { SedeResponse } from '../../../api/model/sedeResponse';
import { UsuarioResponse } from '../../../api/model/usuarioResponse';
import { UbicacionResponse } from '../../../api/model/ubicacionResponse';
import { PuntoEntregaResponse } from '../../../api/model/puntoEntregaResponse';
import { TipoUbicacion } from '../../../api/model/tipoUbicacion';
import { TipoPuntoEntrega } from '../../../api/model/tipoPuntoEntrega';

export type TabSedes = 'sedes' | 'ubicaciones' | 'puntos';

@Component({
  selector: 'app-admin-sedes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSnackBarModule],
  templateUrl: './admin-sedes.component.html',
  styleUrl: './admin-sedes.component.scss'
})
export class AdminSedesComponent implements OnInit {
  private sedesService = inject(SedesService);
  private usuariosService = inject(UsuariosService);
  readonly sedeAdmin = inject(SedeAdminService);
  readonly auth = inject(AuthService);
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);

  readonly String = String;

  // Pestañas
  tabActiva = signal<TabSedes>('sedes');
  esSuperAdmin = computed(() => this.auth.isSuperAdmin());

  // Sedes y Administradores
  sedes = signal<SedeResponse[]>([]);
  administradores = signal<UsuarioResponse[]>([]);
  guardando = signal<boolean>(false);

  // Ubicaciones
  ubicaciones = signal<UbicacionResponse[]>([]);
  cargandoUbicaciones = signal<boolean>(false);
  modalUbicacionAbierto = signal<boolean>(false);
  ubicacionEditandoId = signal<string | null>(null);
  modalDesactivarUbicacionAbierto = signal<boolean>(false);
  ubicacionADesactivar = signal<UbicacionResponse | null>(null);
  errorModalUbicacion = signal<string | null>(null);

  // Puntos de Entrega
  puntosEntrega = signal<PuntoEntregaResponse[]>([]);
  cargandoPuntos = signal<boolean>(false);
  modalPuntoAbierto = signal<boolean>(false);
  puntoEditandoId = signal<string | null>(null);
  modalDesactivarPuntoAbierto = signal<boolean>(false);
  puntoADesactivar = signal<PuntoEntregaResponse | null>(null);
  errorModalPunto = signal<string | null>(null);

  // Modales Sedes
  modalSedeAbierto = signal<boolean>(false);
  modalAsignarAbierto = signal<boolean>(false);
  modalCrearAdminAbierto = signal<boolean>(false);
  sedeEditandoId = signal<string | null>(null);
  adminSeleccionado = signal<UsuarioResponse | null>(null);

  // Formularios
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

  ubicacionForm = new FormGroup({
    nombre: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    tipo: new FormControl<string>('BLOQUE', { nonNullable: true, validators: [Validators.required] }),
    activa: new FormControl<boolean>(true, { nonNullable: true })
  });

  puntoForm = new FormGroup({
    nombre: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    tipo: new FormControl<string>('OFICINA', { nonNullable: true, validators: [Validators.required] }),
    activa: new FormControl<boolean>(true, { nonNullable: true })
  });

  // Sede activa de trabajo
  readonly activeSedeId = computed<string | null>(() => {
    if (this.auth.isSuperAdmin()) {
      return this.sedeAdmin.selectedSedeId();
    }
    return this.auth.getUserSedeId() || this.sedeAdmin.selectedSedeId();
  });

  readonly activeSedeNombre = computed<string>(() => {
    const id = this.activeSedeId();
    if (!id) return 'Sin sede seleccionada';
    const s = this.sedes().find((x) => x.sede_id === id);
    return s ? `${s.nombre} (${s.codigo})` : 'Sede asignada';
  });

  // Filtros visibles para la sede activa
  readonly ubicacionesFiltradas = computed<UbicacionResponse[]>(() => {
    const list = this.ubicaciones();
    const sid = this.activeSedeId();
    if (!sid) return list;
    return list.filter(u => u.sede_id === sid);
  });

  readonly puntosFiltrados = computed<PuntoEntregaResponse[]>(() => {
    const list = this.puntosEntrega();
    const sid = this.activeSedeId();
    if (!sid) return list;
    return list.filter(p => p.sede_id === sid);
  });

  private get baseApi(): string {
    return API_URL.replace(/\/+$/, '');
  }

  ngOnInit(): void {
    if (!this.esSuperAdmin()) {
      this.tabActiva.set('ubicaciones');
    }
    this.cargarSedes();
    this.cargarAdministradores();
    this.cargarUbicaciones();
    this.cargarPuntosEntrega();
  }

  cambiarTab(tab: TabSedes): void {
    this.tabActiva.set(tab);
    if (tab === 'ubicaciones') {
      this.cargarUbicaciones();
    } else if (tab === 'puntos') {
      this.cargarPuntosEntrega();
    }
  }

  onCambiarSedeContexto(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target && target.value) {
      this.sedeAdmin.seleccionarSede(target.value);
      this.cargarUbicaciones();
      this.cargarPuntosEntrega();
    }
  }

  // =========================================================================
  // GESTIÓN DE UBICACIONES
  // =========================================================================
  cargarUbicaciones(): void {
    this.cargandoUbicaciones.set(true);
    const sid = this.activeSedeId();
    const query = sid ? `?sede=${encodeURIComponent(sid)}` : '';

    this.http.get<UbicacionResponse[]>(`${this.baseApi}/ubicaciones/${query}`).subscribe({
      next: (data) => {
        this.ubicaciones.set(Array.isArray(data) ? data : []);
        this.cargandoUbicaciones.set(false);
      },
      error: (err) => {
        this.cargandoUbicaciones.set(false);
        this.mostrarFeedback(mensajeDeError(err, 'No fue posible cargar las ubicaciones.'));
      }
    });
  }

  abrirModalCrearUbicacion(): void {
    const sid = this.activeSedeId();
    if (!sid) {
      this.mostrarFeedback('Debes seleccionar una sede institucional antes de registrar una ubicación.');
      return;
    }
    this.ubicacionEditandoId.set(null);
    this.errorModalUbicacion.set(null);
    this.ubicacionForm.reset({
      nombre: '',
      tipo: 'BLOQUE',
      activa: true
    });
    this.modalUbicacionAbierto.set(true);
  }

  abrirModalEditarUbicacion(u: UbicacionResponse): void {
    this.ubicacionEditandoId.set(u.ubicacion_id);
    this.errorModalUbicacion.set(null);
    this.ubicacionForm.setValue({
      nombre: u.nombre,
      tipo: u.tipo || 'BLOQUE',
      activa: u.activa !== false
    });
    this.modalUbicacionAbierto.set(true);
  }

  cerrarModalUbicacion(): void {
    this.modalUbicacionAbierto.set(false);
    this.ubicacionEditandoId.set(null);
    this.errorModalUbicacion.set(null);
  }

  guardarUbicacion(): void {
    if (this.ubicacionForm.invalid || this.guardando()) {
      this.ubicacionForm.markAllAsTouched();
      return;
    }

    const sid = this.activeSedeId();
    if (!sid) {
      this.errorModalUbicacion.set('No hay sede seleccionada para asociar la ubicación.');
      return;
    }

    const { nombre, tipo, activa } = this.ubicacionForm.getRawValue();
    this.guardando.set(true);
    this.errorModalUbicacion.set(null);

    const editId = this.ubicacionEditandoId();
    if (editId) {
      const payload = {
        nombre: nombre.trim(),
        tipo,
        activa: !!activa
      };
      this.http.put<UbicacionResponse>(`${this.baseApi}/ubicaciones/${editId}`, payload).subscribe({
        next: (res) => {
          this.guardando.set(false);
          this.mostrarFeedback(`Ubicación "${res.nombre}" actualizada exitosamente.`);
          this.cerrarModalUbicacion();
          this.cargarUbicaciones();
        },
        error: (err) => {
          this.guardando.set(false);
          this.errorModalUbicacion.set(mensajeDeError(err, 'No se pudo actualizar la ubicación.'));
        }
      });
    } else {
      const payload = {
        sede_id: sid,
        nombre: nombre.trim(),
        tipo,
        activa: !!activa
      };
      this.http.post<UbicacionResponse>(`${this.baseApi}/ubicaciones/`, payload).subscribe({
        next: (res) => {
          this.guardando.set(false);
          this.mostrarFeedback(`Ubicación "${res.nombre}" registrada correctamente.`);
          this.cerrarModalUbicacion();
          this.cargarUbicaciones();
        },
        error: (err) => {
          this.guardando.set(false);
          this.errorModalUbicacion.set(mensajeDeError(err, 'No se pudo registrar la ubicación.'));
        }
      });
    }
  }

  toggleActivaUbicacion(u: UbicacionResponse): void {
    if (this.guardando()) return;
    this.guardando.set(true);
    const nuevoEstado = !(u.activa !== false);

    this.http.put<UbicacionResponse>(`${this.baseApi}/ubicaciones/${u.ubicacion_id}`, { activa: nuevoEstado }).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.mostrarFeedback(`Ubicación "${res.nombre}" ${nuevoEstado ? 'activada' : 'desactivada'}.`);
        this.cargarUbicaciones();
      },
      error: (err) => {
        this.guardando.set(false);
        this.mostrarFeedback(mensajeDeError(err, 'No fue posible cambiar el estado de la ubicación.'));
      }
    });
  }

  solicitarDesactivarUbicacion(u: UbicacionResponse): void {
    this.ubicacionADesactivar.set(u);
    this.modalDesactivarUbicacionAbierto.set(true);
  }

  cerrarModalDesactivarUbicacion(): void {
    if (this.guardando()) return;
    this.modalDesactivarUbicacionAbierto.set(false);
    this.ubicacionADesactivar.set(null);
  }

  confirmarDesactivarUbicacion(): void {
    const u = this.ubicacionADesactivar();
    if (!u || this.guardando()) return;

    this.guardando.set(true);
    this.http.delete(`${this.baseApi}/ubicaciones/${u.ubicacion_id}`).subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarFeedback(`Ubicación "${u.nombre}" desactivada.`);
        this.cerrarModalDesactivarUbicacion();
        this.cargarUbicaciones();
      },
      error: (err) => {
        this.guardando.set(false);
        this.mostrarFeedback(mensajeDeError(err, 'No fue posible desactivar la ubicación.'));
      }
    });
  }

  // =========================================================================
  // GESTIÓN DE PUNTOS DE ENTREGA
  // =========================================================================
  cargarPuntosEntrega(): void {
    this.cargandoPuntos.set(true);
    const sid = this.activeSedeId();
    const query = sid ? `?sede_id=${encodeURIComponent(sid)}` : '';

    this.http.get<PuntoEntregaResponse[]>(`${this.baseApi}/puntos-entrega/${query}`).subscribe({
      next: (data) => {
        this.puntosEntrega.set(Array.isArray(data) ? data : []);
        this.cargandoPuntos.set(false);
      },
      error: (err) => {
        this.cargandoPuntos.set(false);
        this.mostrarFeedback(mensajeDeError(err, 'No fue posible cargar los puntos de entrega.'));
      }
    });
  }

  abrirModalCrearPunto(): void {
    const sid = this.activeSedeId();
    if (!sid) {
      this.mostrarFeedback('Debes seleccionar una sede institucional antes de registrar un punto de entrega.');
      return;
    }
    this.puntoEditandoId.set(null);
    this.errorModalPunto.set(null);
    this.puntoForm.reset({
      nombre: '',
      tipo: 'OFICINA',
      activa: true
    });
    this.modalPuntoAbierto.set(true);
  }

  abrirModalEditarPunto(p: PuntoEntregaResponse): void {
    this.puntoEditandoId.set(p.puntoEntrega_id);
    this.errorModalPunto.set(null);
    this.puntoForm.setValue({
      nombre: p.nombre,
      tipo: p.tipo || 'OFICINA',
      activa: p.activa !== false
    });
    this.modalPuntoAbierto.set(true);
  }

  cerrarModalPunto(): void {
    this.modalPuntoAbierto.set(false);
    this.puntoEditandoId.set(null);
    this.errorModalPunto.set(null);
  }

  guardarPuntoEntrega(): void {
    if (this.puntoForm.invalid || this.guardando()) {
      this.puntoForm.markAllAsTouched();
      return;
    }

    const sid = this.activeSedeId();
    if (!sid) {
      this.errorModalPunto.set('No hay sede seleccionada para asociar el punto de entrega.');
      return;
    }

    const { nombre, tipo, activa } = this.puntoForm.getRawValue();
    this.guardando.set(true);
    this.errorModalPunto.set(null);

    const editId = this.puntoEditandoId();
    if (editId) {
      const payload = {
        nombre: nombre.trim(),
        tipo,
        activa: !!activa
      };
      this.http.put<PuntoEntregaResponse>(`${this.baseApi}/puntos-entrega/${editId}`, payload).subscribe({
        next: (res) => {
          this.guardando.set(false);
          this.mostrarFeedback(`Punto de entrega "${res.nombre}" actualizado.`);
          this.cerrarModalPunto();
          this.cargarPuntosEntrega();
        },
        error: (err) => {
          this.guardando.set(false);
          this.errorModalPunto.set(mensajeDeError(err, 'No se pudo actualizar el punto de entrega.'));
        }
      });
    } else {
      const payload = {
        sede_id: sid,
        nombre: nombre.trim(),
        tipo,
        activa: !!activa
      };
      this.http.post<PuntoEntregaResponse>(`${this.baseApi}/puntos-entrega/`, payload).subscribe({
        next: (res) => {
          this.guardando.set(false);
          this.mostrarFeedback(`Punto de entrega "${res.nombre}" registrado exitosamente.`);
          this.cerrarModalPunto();
          this.cargarPuntosEntrega();
        },
        error: (err) => {
          this.guardando.set(false);
          this.errorModalPunto.set(mensajeDeError(err, 'No se pudo registrar el punto de entrega.'));
        }
      });
    }
  }

  toggleActivaPunto(p: PuntoEntregaResponse): void {
    if (this.guardando()) return;
    this.guardando.set(true);
    const nuevoEstado = !(p.activa !== false);

    this.http.put<PuntoEntregaResponse>(`${this.baseApi}/puntos-entrega/${p.puntoEntrega_id}`, { activa: nuevoEstado }).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.mostrarFeedback(`Punto "${res.nombre}" ${nuevoEstado ? 'activado' : 'desactivado'}.`);
        this.cargarPuntosEntrega();
      },
      error: (err) => {
        this.guardando.set(false);
        this.mostrarFeedback(mensajeDeError(err, 'No fue posible cambiar el estado del punto.'));
      }
    });
  }

  solicitarDesactivarPunto(p: PuntoEntregaResponse): void {
    this.puntoADesactivar.set(p);
    this.modalDesactivarPuntoAbierto.set(true);
  }

  cerrarModalDesactivarPunto(): void {
    if (this.guardando()) return;
    this.modalDesactivarPuntoAbierto.set(false);
    this.puntoADesactivar.set(null);
  }

  confirmarDesactivarPunto(): void {
    const p = this.puntoADesactivar();
    if (!p || this.guardando()) return;

    this.guardando.set(true);
    this.http.delete(`${this.baseApi}/puntos-entrega/${p.puntoEntrega_id}`).subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarFeedback(`Punto de entrega "${p.nombre}" desactivado.`);
        this.cerrarModalDesactivarPunto();
        this.cargarPuntosEntrega();
      },
      error: (err) => {
        this.guardando.set(false);
        this.mostrarFeedback(mensajeDeError(err, 'No fue posible desactivar el punto de entrega.'));
      }
    });
  }

  // =========================================================================
  // GESTIÓN DE SEDES Y ADMINISTRADORES
  // =========================================================================
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
    // GET /usuarios/administradores es exclusivo del SUPERADMIN: un ADMIN recibiría 403.
    if (!this.esSuperAdmin()) {
      this.administradores.set([]);
      return;
    }
    this.http.get<UsuarioResponse[]>(`${this.baseApi}/usuarios/administradores`).subscribe({
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
    this.http.post<UsuarioResponse>(`${this.baseApi}/usuarios/administradores`, payload).subscribe({
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

  getTipoUbicacionLabel(tipo?: string | null): string {
    switch (tipo) {
      case 'BLOQUE': return 'Bloque';
      case 'PORTERIA': return 'Portería';
      case 'ZONA_COMUN': return 'Zona Común';
      case 'OTRO': return 'Otro Espacio';
      default: return tipo || 'Espacio';
    }
  }

  getTipoPuntoLabel(tipo?: string | null): string {
    switch (tipo) {
      case 'OFICINA': return 'Oficina de Custodia';
      case 'PORTERIA': return 'Portería Institucional';
      default: return tipo || 'Punto';
    }
  }

  private mostrarFeedback(msg: string): void {
    this.snack.open(msg, 'Cerrar', { duration: 4000 });
  }
}
