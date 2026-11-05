import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { of, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { API_URL } from '../../core/api.config';
import { mensajeDeError } from '../../core/api-error';
import { CATEGORIAS } from '../../core/categorias';
import { CategoriaObjeto } from '../../api/model/categoriaObjeto';
import { EstadoReclamo } from '../../api/model/estadoReclamo';
import { ReclamoResponse } from '../../api/model/reclamoResponse';
import { ObjetosEnCustodiaService } from '../../api/api/objetosEnCustodia.service';
import { ObjetoEnCustodiaPublico } from '../../api/model/objetoEnCustodiaPublico';

export type FiltroEstado = 'TODOS' | 'EN_CURSO' | 'CON_CITA' | 'FINALIZADOS';

@Component({
  selector: 'app-mis-reclamos',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './mis-reclamos.component.html',
  styleUrl: './mis-reclamos.component.scss'
})
export class MisReclamosComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  readonly authService = inject(AuthService);
  private custodiaService = inject(ObjetosEnCustodiaService);

  // Estados de datos
  reclamos = signal<ReclamoResponse[]>([]);
  objetosInfo = signal<Map<string, ObjetoEnCustodiaPublico>>(new Map());
  cargando = signal<boolean>(true);
  errorMensaje = signal<string | null>(null);
  mensajeExito = signal<string | null>(null);

  // Filtro seleccionado
  filtroActivo = signal<FiltroEstado>('TODOS');

  // Modal de seguimiento / detalle
  reclamoSeleccionado = signal<ReclamoResponse | null>(null);

  // Modal de cancelación
  modalCancelarAbierto = signal<boolean>(false);
  reclamoACancelar = signal<ReclamoResponse | null>(null);
  cancelando = signal<boolean>(false);
  cancelarError = signal<string | null>(null);

  // Modal de felicitación por recuperación (HU26 CA2)
  modalFelicitacionAbierto = signal<boolean>(false);
  reclamoFelicitadoId = signal<string | null>(null);

  // Modal de imagen ampliada
  imagenModalUrl = signal<string | null>(null);

  // Métricas de los filtros
  totalReclamos = computed(() => this.reclamos().length);

  totalEnCurso = computed(() => {
    return this.reclamos().filter(r => r.estado === 'ENVIADO' || r.estado === 'EN_REVISION').length;
  });

  totalConCita = computed(() => {
    return this.reclamos().filter(r => r.estado === 'APROBADO' || r.estado === 'LISTO_PARA_RECOGER').length;
  });

  totalFinalizados = computed(() => {
    return this.reclamos().filter(r =>
      r.estado === 'RECLAMADO' || r.estado === 'RECHAZADO' || r.estado === 'CANCELADO_POR_USUARIO'
    ).length;
  });

  // Reclamos filtrados según la pestaña activa
  reclamosFiltrados = computed(() => {
    const list = this.reclamos();
    const f = this.filtroActivo();
    switch (f) {
      case 'EN_CURSO':
        return list.filter(r => r.estado === 'ENVIADO' || r.estado === 'EN_REVISION');
      case 'CON_CITA':
        return list.filter(r => r.estado === 'APROBADO' || r.estado === 'LISTO_PARA_RECOGER');
      case 'FINALIZADOS':
        return list.filter(r =>
          r.estado === 'RECLAMADO' || r.estado === 'RECHAZADO' || r.estado === 'CANCELADO_POR_USUARIO'
        );
      case 'TODOS':
      default:
        return list;
    }
  });

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth']);
      return;
    }
    this.cargarReclamos();
  }

  cargarReclamos(): void {
    this.cargando.set(true);
    this.errorMensaje.set(null);

    const base = API_URL.replace(/\/+$/, '');
    this.http.get<ReclamoResponse[]>(`${base}/reclamos/me?skip=0&limit=50`).subscribe({
      next: (data) => {
        const lista = data || [];
        this.reclamos.set(lista);
        this.cargando.set(false);

        // HU26 CA2: Verificar si hay algún reclamo RECLAMADO no felicitado aún
        this.verificarFelicitacion(lista);

        // Cargar información de los objetos en custodia para enriquecer las tarjetas
        this.cargarInformacionObjetos(lista);
      },
      error: (err) => {
        this.cargando.set(false);
        this.reclamos.set([]);
        this.errorMensaje.set(
          mensajeDeError(err, 'No fue posible cargar tus solicitudes de reclamo. Intenta de nuevo.')
        );
      }
    });
  }

  private cargarInformacionObjetos(lista: ReclamoResponse[]): void {
    // Si el reclamo ya trae los datos del objeto no hace falta consultarlo aparte.
    const ids = Array.from(new Set(
      lista.filter(r => !r.objeto_categoria && !r.objeto_descripcion).map(r => r.objetoEnCustodia_id).filter(Boolean)
    ));
    if (ids.length === 0) return;

    const peticiones = ids.map(id =>
      this.custodiaService.obtenerObjetoCustodiaObjetosCustodiaObjetoEnCustodiaIdGet(id).pipe(
        catchError(() => of(null))
      )
    );

    forkJoin(peticiones).subscribe({
      next: (respuestas) => {
        const mapa = new Map<string, ObjetoEnCustodiaPublico>();
        respuestas.forEach((obj, idx) => {
          if (obj) {
            mapa.set(ids[idx], obj as unknown as ObjetoEnCustodiaPublico);
          }
        });
        this.objetosInfo.set(mapa);
      }
    });
  }

  private verificarFelicitacion(lista: ReclamoResponse[]): void {
    const reclamado = lista.find(r => r.estado === 'RECLAMADO');
    if (reclamado) {
      const storageKey = `ope_felicitacion_vista_${reclamado.reclamo_id}`;
      const yaVisto = typeof window !== 'undefined' && localStorage.getItem(storageKey);
      if (!yaVisto) {
        this.reclamoFelicitadoId.set(reclamado.reclamo_id);
        this.modalFelicitacionAbierto.set(true);
      }
    }
  }

  cerrarModalFelicitacion(): void {
    const id = this.reclamoFelicitadoId();
    if (id && typeof window !== 'undefined') {
      localStorage.setItem(`ope_felicitacion_vista_${id}`, 'true');
    }
    this.modalFelicitacionAbierto.set(false);
    this.reclamoFelicitadoId.set(null);
  }

  // Visualización y Stepper
  abrirSeguimiento(reclamo: ReclamoResponse): void {
    this.reclamoSeleccionado.set(reclamo);
  }

  cerrarSeguimiento(): void {
    this.reclamoSeleccionado.set(null);
  }

  // Cancelación de reclamo
  solicitarCancelar(reclamo: ReclamoResponse, event?: Event): void {
    if (event) event.stopPropagation();
    this.cancelarError.set(null);
    this.reclamoACancelar.set(reclamo);
    this.modalCancelarAbierto.set(true);
  }

  cerrarModalCancelar(): void {
    if (this.cancelando()) return;
    this.modalCancelarAbierto.set(false);
    this.reclamoACancelar.set(null);
    this.cancelarError.set(null);
  }

  confirmarCancelar(): void {
    const r = this.reclamoACancelar();
    if (!r) return;

    this.cancelando.set(true);
    this.cancelarError.set(null);

    const base = API_URL.replace(/\/+$/, '');
    this.http.put(`${base}/reclamos/${r.reclamo_id}/cancelar`, {}).subscribe({
      next: () => {
        this.cancelando.set(false);
        this.modalCancelarAbierto.set(false);
        this.reclamoACancelar.set(null);
        this.mostrarMensajeExito('El reclamo ha sido cancelado exitosamente.');
        // Si estaba abierto el seguimiento de este reclamo, actualizar o cerrar
        if (this.reclamoSeleccionado()?.reclamo_id === r.reclamo_id) {
          this.cerrarSeguimiento();
        }
        this.cargarReclamos();
      },
      error: (err) => {
        this.cancelando.set(false);
        this.cancelarError.set(
          mensajeDeError(err, 'No fue posible cancelar el reclamo. Por favor intenta de nuevo.')
        );
      }
    });
  }

  mostrarMensajeExito(msg: string): void {
    this.mensajeExito.set(msg);
    setTimeout(() => {
      this.mensajeExito.set(null);
    }, 4500);
  }

  // Helpers de visualización
  private static readonly ESTADOS_CONFIG: Record<string, { label: string; icon: string; clase: string }> = {
    ENVIADO: { label: 'Solicitud Enviada', icon: 'send', clase: 'badge-amber' },
    EN_REVISION: { label: 'En Revisión', icon: 'schedule', clase: 'badge-amber' },
    APROBADO: { label: 'Aprobado · Cita Asignada', icon: 'event_available', clase: 'badge-green' },
    LISTO_PARA_RECOGER: { label: 'Listo para Entrega', icon: 'check_circle', clase: 'badge-green' },
    RECLAMADO: { label: 'Objeto Recuperado', icon: 'verified', clase: 'badge-green' },
    RECHAZADO: { label: 'Reclamo Rechazado', icon: 'cancel', clase: 'badge-red' },
    CANCELADO_POR_USUARIO: { label: 'Cancelado por Ti', icon: 'highlight_off', clase: 'badge-red' }
  };
  private static readonly ESTADO_DEFAULT = { label: 'Información', icon: 'info', clase: 'badge-gray' };

  private objetoCache = new Map<string, { categoria?: string | null; descripcion?: string | null; imagen_url?: string | null }>();

  /** Datos del objeto: primero los que ya trae el reclamo; si no, el detalle público. */
  getObjeto(r: ReclamoResponse): { categoria?: string | null; descripcion?: string | null; imagen_url?: string | null } | undefined {
    if (r.objeto_categoria || r.objeto_descripcion || r.objeto_imagen_url) {
      let cached = this.objetoCache.get(r.reclamo_id);
      if (!cached) {
        cached = { categoria: r.objeto_categoria, descripcion: r.objeto_descripcion, imagen_url: r.objeto_imagen_url };
        this.objetoCache.set(r.reclamo_id, cached);
      }
      return cached;
    }
    return this.objetosInfo().get(r.objetoEnCustodia_id);
  }

  getCategoriaLabel(categoria?: string | null): string {
    if (!categoria) return 'Artículo en custodia';
    const cat = categoria as CategoriaObjeto;
    return CATEGORIAS[cat]?.label || categoria;
  }

  getCategoriaIcon(categoria?: string | null): string {
    if (!categoria) return 'inventory_2';
    const cat = categoria as CategoriaObjeto;
    return CATEGORIAS[cat]?.icon || 'inventory_2';
  }

  formatearFecha(fechaStr?: string | null): string {
    if (!fechaStr) return 'Fecha no registrada';
    try {
      const d = new Date(fechaStr);
      if (isNaN(d.getTime())) return fechaStr;
      return d.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return fechaStr;
    }
  }

  puedeCancelar(estado: EstadoReclamo): boolean {
    return estado === 'ENVIADO' || estado === 'EN_REVISION';
  }

  getEstadoConfig(estado: EstadoReclamo): { label: string; icon: string; clase: string } {
    return MisReclamosComponent.ESTADOS_CONFIG[estado] || MisReclamosComponent.ESTADO_DEFAULT;
  }
}
