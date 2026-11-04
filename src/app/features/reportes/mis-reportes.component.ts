import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { mensajeDeError } from '../../core/api-error';
import { CATEGORIAS } from '../../core/categorias';
import { CategoriaObjeto } from '../../api/model/categoriaObjeto';
import { EstadoPublicacion } from '../../api/model/estadoPublicacion';
import { ReportePerdidaResponse } from '../../api/model/reportePerdidaResponse';
import { PublicacionEncontradoResponse } from '../../api/model/publicacionEncontradoResponse';
import { ReportesDePrdidaService } from '../../api/api/reportesDePrdida.service';
import { PublicacionesEncontradasService } from '../../api/api/publicacionesEncontradas.service';
import { UbicacionesService } from '../../api/api/ubicaciones.service';
import { PuntosEntregaService } from '../../api/api/puntosEntrega.service';

export type TabReporte = 'PERDIDOS' | 'ENCONTRADOS';

export interface ItemEliminacion {
  tipo: 'PERDIDO' | 'ENCONTRADO';
  id: string;
  categoria: string;
  descripcion: string;
}

@Component({
  selector: 'app-mis-reportes',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './mis-reportes.component.html',
  styleUrl: './mis-reportes.component.scss'
})
export class MisReportesComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  readonly authService = inject(AuthService);
  private reportesService = inject(ReportesDePrdidaService);
  private publicacionesService = inject(PublicacionesEncontradasService);
  private ubicacionesService = inject(UbicacionesService);
  private puntosEntregaService = inject(PuntosEntregaService);

  // Estados
  tabActiva = signal<TabReporte>('PERDIDOS');
  reportesPerdida = signal<ReportePerdidaResponse[]>([]);
  publicacionesEncontradas = signal<PublicacionEncontradoResponse[]>([]);
  ubicacionesMap = signal<Map<string, string>>(new Map());
  puntosEntregaMap = signal<Map<string, string>>(new Map());

  cargando = signal<boolean>(true);
  errorMensaje = signal<string | null>(null);
  mensajeExito = signal<string | null>(null);

  // Modal de solicitud de eliminación (HU14)
  modalEliminarAbierto = signal<boolean>(false);
  itemAEliminar = signal<ItemEliminacion | null>(null);
  procesandoEliminacion = signal<boolean>(false);
  errorEliminacion = signal<string | null>(null);

  formEliminacion = this.fb.group({
    motivo: ['Ya encontré el objeto por mi cuenta']
  });

  // Modal de imagen ampliada
  imagenModalUrl = signal<string | null>(null);

  // Contadores
  totalPerdidos = computed(() => this.reportesPerdida().length);
  totalEncontrados = computed(() => this.publicacionesEncontradas().length);

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth']);
      return;
    }
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.errorMensaje.set(null);

    forkJoin({
      ubicaciones: this.ubicacionesService.obtenerTodasUbicacionesUbicacionesGet().pipe(catchError(() => of([]))),
      puntos: this.puntosEntregaService.obtenerTodosPuntosEntregaPuntosEntregaGet().pipe(catchError(() => of([]))),
      perdidos: this.reportesService.obtenerMisReportesReportesPerdidaMeGet(0, 50),
      encontrados: this.publicacionesService.obtenerMisPublicacionesPublicacionesEncontradasMeGet(0, 50)
    }).subscribe({
      next: (res) => {
        // Mapa de ubicaciones (bloque, aula, zona)
        const uMap = new Map<string, string>();
        (res.ubicaciones || []).forEach(u => {
          const detalle = u.nombre + (u.tipo ? ` (${u.tipo})` : '');
          uMap.set(u.ubicacion_id, detalle);
        });
        this.ubicacionesMap.set(uMap);

        // Mapa de puntos de entrega
        const pMap = new Map<string, string>();
        (res.puntos || []).forEach(p => {
          pMap.set(p.puntoEntrega_id, p.nombre);
        });
        this.puntosEntregaMap.set(pMap);

        this.reportesPerdida.set(res.perdidos || []);
        this.publicacionesEncontradas.set(res.encontrados || []);
        this.cargando.set(false);
      },
      error: (err: any) => {
        this.cargando.set(false);
        this.reportesPerdida.set([]);
        this.publicacionesEncontradas.set([]);
        this.errorMensaje.set(
          mensajeDeError(err, 'No fue posible cargar tus reportes y publicaciones. Por favor intenta de nuevo.')
        );
      }
    });
  }

  // Solicitud de Eliminación (HU14)
  puedeSolicitarEliminacion(estado: EstadoPublicacion, eliminacionSolicitada?: boolean): boolean {
    if (eliminacionSolicitada) return false;
    return estado === 'PENDIENTE' || estado === 'APROBADA';
  }

  abrirModalEliminar(tipo: 'PERDIDO' | 'ENCONTRADO', id: string, categoria: string, descripcion: string): void {
    this.errorEliminacion.set(null);
    this.itemAEliminar.set({ tipo, id, categoria, descripcion });
    this.formEliminacion.reset({ motivo: 'Ya encontré el objeto por mi cuenta' });
    this.modalEliminarAbierto.set(true);
  }

  cerrarModalEliminar(): void {
    if (this.procesandoEliminacion()) return;
    this.modalEliminarAbierto.set(false);
    this.itemAEliminar.set(null);
    this.errorEliminacion.set(null);
  }

  confirmarEliminacion(): void {
    const item = this.itemAEliminar();
    if (!item) return;

    this.procesandoEliminacion.set(true);
    this.errorEliminacion.set(null);

    const accion$ = item.tipo === 'PERDIDO'
      ? this.reportesService.solicitarEliminacionReporteReportesPerdidaReporteIdSolicitarEliminacionPut(item.id)
      : this.publicacionesService.solicitarEliminacionPublicacionPublicacionesEncontradasPublicacionIdSolicitarEliminacionPut(item.id);

    (accion$ as any).subscribe({
      next: () => {
        this.procesandoEliminacion.set(false);
        this.modalEliminarAbierto.set(false);
        this.itemAEliminar.set(null);
        this.mostrarMensajeExito(
          'Solicitud enviada exitosamente. La publicación pasó a "Baja en revisión" y fue ocultada del muro público mientras la administración evalúa el retiro.'
        );
        this.cargarDatos();
      },
      error: (err: any) => {
        this.procesandoEliminacion.set(false);
        this.errorEliminacion.set(
          mensajeDeError(err, 'No fue posible procesar la solicitud de baja. Intenta de nuevo.')
        );
      }
    });
  }

  mostrarMensajeExito(msg: string): void {
    this.mensajeExito.set(msg);
    setTimeout(() => {
      this.mensajeExito.set(null);
    }, 6000);
  }

  // Helpers de visualización
  getNombreUbicacion(id?: string | null): string {
    if (!id) return 'Lugar no especificado';
    return this.ubicacionesMap().get(id) || 'Ubicación institucional';
  }

  getNombrePuntoEntrega(id?: string | null): string {
    if (!id) return 'Punto de custodia';
    return this.puntosEntregaMap().get(id) || 'Oficina de Custodia ITM';
  }

  getCategoriaLabel(categoria?: string | null): string {
    if (!categoria) return 'General';
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

  getEstadoConfig(estado: EstadoPublicacion, eliminacionSolicitada?: boolean): { label: string; icon: string; clase: string; explicacion?: string } {
    if (eliminacionSolicitada || estado === 'ELIMINACION_PENDIENTE') {
      return {
        label: 'Baja en revisión',
        icon: 'hourglass_top',
        clase: 'badge-amber',
        explicacion: 'El administrador está evaluando la solicitud de retiro de esta publicación.'
      };
    }

    switch (estado) {
      case 'PENDIENTE':
        return {
          label: 'En revisión administrativa',
          icon: 'schedule',
          clase: 'badge-amber',
          explicacion: 'En espera de aprobación para aparecer en el muro público.'
        };
      case 'APROBADA':
        return {
          label: 'Publicada en muro público',
          icon: 'check_circle',
          clase: 'badge-green',
          explicacion: 'Visible para toda la comunidad ITM en el catálogo.'
        };
      case 'RECHAZADA':
        return {
          label: 'Publicación Rechazada',
          icon: 'cancel',
          clase: 'badge-red',
          explicacion: 'No cumple con las políticas de moderación institucional.'
        };
      case 'CERRADA':
        return {
          label: 'Caso Cerrado · Entregado a su dueño',
          icon: 'task_alt',
          clase: 'badge-closed',
          explicacion: '¡Gracias por tu honestidad! Este artículo fue restituido exitosamente a su propietario.'
        };
      default:
        return {
          label: estado,
          icon: 'info',
          clase: 'badge-gray'
        };
    }
  }
}
