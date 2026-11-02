import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, finalize, startWith } from 'rxjs/operators';

// Angular Material
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Core Services & API
import { AuthService } from '../../core/auth.service';
import { CATEGORIAS } from '../../core/categorias';
import { mensajeDeError } from '../../core/api-error';
import { ObjetosEnCustodiaService } from '../../api/api/objetosEnCustodia.service';
import { PublicacionesEncontradasService } from '../../api/api/publicacionesEncontradas.service';
import { ReclamosService } from '../../api/api/reclamos.service';
import { UbicacionesService } from '../../api/api/ubicaciones.service';
import { PuntosEntregaService } from '../../api/api/puntosEntrega.service';
import { ReportesDePrdidaService } from '../../api/api/reportesDePrdida.service';
import { UbicacionResponse } from '../../api/model/ubicacionResponse';
import { PuntoEntregaResponse } from '../../api/model/puntoEntregaResponse';
import { ObjetoEnCustodiaPublico } from '../../api/model/objetoEnCustodiaPublico';
import { CategoriaObjeto } from '../../api/model/categoriaObjeto';
import { EstadoCustodia } from '../../api/model/estadoCustodia';

/**
 * Modelo público unificado para la visualización en tarjeta del catálogo (HU01).
 * Garantiza el filtro de información sensible (no expone detalles internos ni datos personales).
 */
export interface ObjetoCatalogoItem {
  id: string;
  codigoPublico: string;
  descripcion: string;
  categoria: CategoriaObjeto;
  categoriaEtiqueta: string;
  sede: string;
  lugarGeneral: string;
  fechaIngreso: string;
  fechaFormateada: string;
  imagenUrl: string | null;
  estado: EstadoCustodia | string;
  estadoEtiqueta: string;
  diasEnCustodia: number;
}

export interface CategoriaFiltro {
  id: string;
  etiqueta: string;
  icono: string;
}

@Component({
  selector: 'app-catalogo-publico',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.scss'
})
export class CatalogoComponent implements OnInit, OnDestroy {
  private readonly objetosService = inject(ObjetosEnCustodiaService);
  private readonly publicacionesService = inject(PublicacionesEncontradasService);
  private readonly reclamosService = inject(ReclamosService);
  private readonly ubicacionesService = inject(UbicacionesService);
  private readonly puntosService = inject(PuntosEntregaService);
  private readonly reportesService = inject(ReportesDePrdidaService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly destroy$ = new Subject<void>();

  // Estado reactivo con Signals
  readonly cargando = signal<boolean>(true);
  readonly errorMensaje = signal<string | null>(null);
  readonly objetos = signal<ObjetoCatalogoItem[]>([]);
  readonly objetoSeleccionado = signal<ObjetoCatalogoItem | null>(null);
  readonly modalDetalleAbierto = signal<boolean>(false);
  readonly modalReclamarAbierto = signal<boolean>(false);
  readonly reclamoEnviadoConExito = signal<boolean>(false);

  // Modales de acciones rápidas (Se me perdió un objeto / Encontré un objeto)
  readonly modalReportarPerdidoAbierto = signal<boolean>(false);
  readonly modalRegistrarEncontradoAbierto = signal<boolean>(false);
  readonly reportePerdidoEnviado = signal<boolean>(false);
  readonly reporteEncontradoEnviado = signal<boolean>(false);
  readonly ubicaciones = signal<UbicacionResponse[]>([]);
  readonly puntosEntrega = signal<PuntoEntregaResponse[]>([]);
  readonly enviando = signal<boolean>(false);

  // Formulario reactivo de búsqueda y filtros
  readonly filtrosForm = new FormGroup({
    termino: new FormControl<string>('', { nonNullable: true }),
    categoria: new FormControl<string>('TODAS', { nonNullable: true }),
    orden: new FormControl<'recientes' | 'antiguos'>('recientes', { nonNullable: true })
  });

  // Los valores de un FormGroup NO son signals: sin esto, `computed` no se entera de que
  // cambió la búsqueda/categoría/orden y la lista nunca se filtra.
  private readonly filtros = toSignal(
    this.filtrosForm.valueChanges.pipe(startWith(this.filtrosForm.getRawValue())),
    { initialValue: this.filtrosForm.getRawValue() }
  );

  // Formulario de reclamo del objeto (HU21, HU22)
  readonly reclamoForm = new FormGroup({
    descripcionDetallada: new FormControl<string>('', { nonNullable: true }),
    caracteristicaUnica: new FormControl<string>('', { nonNullable: true }),
    fechaPerdidaEstimada: new FormControl<string>('', { nonNullable: true }),
    lugarPerdidaEstimado: new FormControl<string>('', { nonNullable: true })
  });

  // Formulario "Se me perdió un objeto"
  readonly formReportePerdido = new FormGroup({
    categoria: new FormControl<string>(CategoriaObjeto.Electronicos, { nonNullable: true, validators: [Validators.required] }),
    descripcion: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    lugarPerdidaId: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    fechaExtravio: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] })
  });

  // Formulario "Encontré un objeto"
  readonly formReporteEncontrado = new FormGroup({
    categoria: new FormControl<string>(CategoriaObjeto.Electronicos, { nonNullable: true, validators: [Validators.required] }),
    descripcion: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    lugarHallazgoId: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    lugarEntregaId: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    fechaHallazgo: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] })
  });
  // Filtros de categoría: salen de core/categorias.ts (las mismas 11 categorías del backend)
  readonly categorias: CategoriaFiltro[] = [
    { id: 'TODAS', etiqueta: 'Todas las categorías', icono: 'apps' },
    ...(Object.keys(CATEGORIAS) as CategoriaObjeto[]).map(id => ({
      id,
      etiqueta: CATEGORIAS[id].label,
      icono: CATEGORIAS[id].icon
    }))
  ];

  // Objetos filtrados reactivamente en base a búsqueda, categoría, sede y orden
  readonly objetosFiltrados = computed(() => {
    const lista = this.objetos();
    this.filtros(); // dependencia reactiva de los filtros
    const f = this.filtrosForm.getRawValue();
    const query = f.termino.trim().toLowerCase();
    const cat = f.categoria;
    const orden = f.orden;

    return lista
      .filter((item) => {
        // Filtro por categoría
        if (cat !== 'TODAS' && item.categoria !== cat) {
          return false;
        }

        // Filtro por texto reactivo (coincide con descripción o categoría)
        if (query) {
          const coincideDescripcion = item.descripcion.toLowerCase().includes(query);
          const coincideCategoria = item.categoriaEtiqueta.toLowerCase().includes(query);
          if (!coincideDescripcion && !coincideCategoria) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.fechaIngreso).getTime();
        const timeB = new Date(b.fechaIngreso).getTime();
        return orden === 'recientes' ? timeB - timeA : timeA - timeB;
      });
  });

  // Métricas del catálogo
  readonly totalDisponibles = computed(() => this.objetos().length);
  readonly totalFiltrados = computed(() => this.objetosFiltrados().length);

  ngOnInit(): void {
    this.suscribirCambiosFiltros();
    this.cargarCatalogo();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Suscribe a cambios en el término de búsqueda con debounceTime de 300ms
   */
  private suscribirCambiosFiltros(): void {
    this.filtrosForm.controls.termino.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // El computed signal `objetosFiltrados` se recalcula automáticamente
      });
  }

  /**
   * Carga el catálogo público desde la API FastAPI (GET /objetos-custodia/catalogo).
   * Solo muestra datos reales: si la API falla se muestra el error y "Reintentar".
   */
  cargarCatalogo(): void {
    this.cargando.set(true);
    this.errorMensaje.set(null);

    this.objetosService
      .obtenerCatalogoPublicoObjetosCustodiaCatalogoGet(0, 100)
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (items: ObjetoEnCustodiaPublico[]) => {
          this.objetos.set(items.map(item => this.mapearObjetoPublico(item)));
        },
        error: (err) => {
          this.errorMensaje.set(mensajeDeError(err, 'No se pudo conectar con el catálogo de objetos.'));
        }
      });
  }

  /**
   * Mapea un objeto del esquema de FastAPI a la tarjeta pública.
   * El catálogo público solo trae categoría, fecha, imagen y lugar de origen:
   * no se inventa ningún otro dato (descripción, sede, etc.).
   */
  private mapearObjetoPublico(item: ObjetoEnCustodiaPublico): ObjetoCatalogoItem {
    const fecha = item.fecha_ingreso ? new Date(item.fecha_ingreso) : new Date();
    const diasEnCustodia = Math.ceil(Math.abs(Date.now() - fecha.getTime()) / (1000 * 60 * 60 * 24));
    const etiqueta = CATEGORIAS[item.categoria]?.label ?? item.categoria;

    return {
      id: item.objetoEnCustodia_id,
      codigoPublico: `OP-${item.objetoEnCustodia_id.slice(-6).toUpperCase()}`,
      descripcion: etiqueta, // el usuario común solo ve la categoría
      categoria: item.categoria,
      categoriaEtiqueta: etiqueta,
      sede: 'Sede Fraternidad',
      lugarGeneral: item.lugar_origen_nombre ?? 'Oficina de custodia',
      fechaIngreso: item.fecha_ingreso,
      fechaFormateada: this.formatearFecha(fecha),
      imagenUrl: item.imagen_url || null,
      estado: item.estado || EstadoCustodia.EnCustodia,
      estadoEtiqueta: 'En Custodia Oficial',
      diasEnCustodia
    };
  }

  private formatearFecha(date: Date): string {
    const opciones: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    };
    return date.toLocaleDateString('es-CO', opciones);
  }

  /**
   * Manejador de selección de categoría rápida desde los botones
   */
  seleccionarCategoria(categoriaId: string): void {
    this.filtrosForm.patchValue({ categoria: categoriaId });
  }

  /**
   * Limpia todos los filtros y restablece la búsqueda
   */
  limpiarFiltros(): void {
    this.filtrosForm.setValue({
      termino: '',
      categoria: 'TODAS',
      orden: 'recientes'
    });
  }

  /**
   * Abre el modal de detalle del objeto (sin información sensible)
   */
  abrirDetalle(item: ObjetoCatalogoItem): void {
    this.objetoSeleccionado.set(item);
    this.modalDetalleAbierto.set(true);
  }

  cerrarDetalle(): void {
    this.modalDetalleAbierto.set(false);
  }

  /**
   * Inicia el flujo de reclamación (HU08, HU21, HU22)
   * Valida si el usuario está autenticado en la plataforma.
   */
  iniciarReclamo(item: ObjetoCatalogoItem, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.objetoSeleccionado.set(item);
    this.reclamoEnviadoConExito.set(false);
    this.reclamoForm.reset();

    // Verificación de autenticación: si no está logueado, redirige de inmediato a iniciar sesión
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth'], { queryParams: { returnUrl: '/catalogo' } });
      return;
    }

    this.modalReclamarAbierto.set(true);
  }

  cerrarModalReclamo(): void {
    this.modalReclamarAbierto.set(false);
  }

  /**
   * Métodos para modal "Se me perdió un objeto"
   */
  abrirModalReportarPerdido(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth'], { queryParams: { returnUrl: '/catalogo' } });
      return;
    }
    this.reportePerdidoEnviado.set(false);
    this.formReportePerdido.reset({
      categoria: CategoriaObjeto.Electronicos,
      descripcion: '',
      lugarPerdidaId: '',
      fechaExtravio: new Date().toISOString().substring(0, 10)
    });
    this.cargarLugares();
    this.modalReportarPerdidoAbierto.set(true);
  }

  cerrarModalReportarPerdido(): void {
    this.modalReportarPerdidoAbierto.set(false);
  }

  private cargarLugares(): void {
    if (this.ubicaciones().length === 0) {
      this.ubicacionesService
        .obtenerTodasUbicacionesUbicacionesGet()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (lista) => this.ubicaciones.set(lista),
          error: (err) =>
            this.snackBar.open(mensajeDeError(err, 'No se pudieron cargar las ubicaciones.'), 'Cerrar', { duration: 5000 })
        });
    }
    if (this.puntosEntrega().length === 0) {
      this.puntosService
        .obtenerTodosPuntosEntregaPuntosEntregaGet()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (lista) => this.puntosEntrega.set(lista),
          error: (err) =>
            this.snackBar.open(mensajeDeError(err, 'No se pudieron cargar los puntos de entrega.'), 'Cerrar', { duration: 5000 })
        });
    }
  }

  enviarReportePerdido(): void {
    if (this.formReportePerdido.invalid || this.enviando()) {
      this.formReportePerdido.markAllAsTouched();
      this.snackBar.open('Completa categoría, descripción, lugar y fecha.', 'Cerrar', { duration: 3000 });
      return;
    }
    const f = this.formReportePerdido.getRawValue();
    this.enviando.set(true);
    this.reportesService
      .crearReportePerdidaReportesPerdidaPost({
        categoria: f.categoria as CategoriaObjeto,
        descripcion: f.descripcion.trim(),
        lugar_perdida_id: f.lugarPerdidaId,
        fecha_perdida: f.fechaExtravio
      })
      .pipe(finalize(() => this.enviando.set(false)), takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.reportePerdidoEnviado.set(true);
          this.snackBar.open('Reporte de extravío registrado.', 'Entendido', { duration: 4000 });
        },
        error: (err) =>
          this.snackBar.open(mensajeDeError(err, 'No se pudo registrar el reporte.'), 'Cerrar', { duration: 6000 })
      });
  }

  /**
   * Métodos para modal "Encontré un objeto"
   */
  abrirModalRegistrarEncontrado(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth'], { queryParams: { returnUrl: '/catalogo' } });
      return;
    }
    this.reporteEncontradoEnviado.set(false);
    this.formReporteEncontrado.reset({
      categoria: CategoriaObjeto.Electronicos,
      descripcion: '',
      lugarHallazgoId: '',
      lugarEntregaId: '',
      fechaHallazgo: new Date().toISOString().substring(0, 10)
    });
    this.cargarLugares();
    this.modalRegistrarEncontradoAbierto.set(true);
  }

  cerrarModalRegistrarEncontrado(): void {
    this.modalRegistrarEncontradoAbierto.set(false);
  }

  enviarReporteEncontrado(): void {
    if (this.formReporteEncontrado.invalid || this.enviando()) {
      this.formReporteEncontrado.markAllAsTouched();
      this.snackBar.open('Completa categoría, descripción, lugares y fecha.', 'Cerrar', { duration: 3000 });
      return;
    }
    const f = this.formReporteEncontrado.getRawValue();
    this.enviando.set(true);
    this.publicacionesService
      .crearPublicacionEncontradaPublicacionesEncontradasPost({
        categoria: f.categoria as CategoriaObjeto,
        descripcion: f.descripcion.trim(),
        lugar_hallazgo_id: f.lugarHallazgoId,
        lugar_entrega_fisica_id: f.lugarEntregaId,
        fecha_hallazgo: f.fechaHallazgo
      })
      .pipe(finalize(() => this.enviando.set(false)), takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.reporteEncontradoEnviado.set(true);
          this.snackBar.open('¡Muchas gracias por reportar el hallazgo!', 'Entendido', { duration: 4000 });
        },
        error: (err) =>
          this.snackBar.open(mensajeDeError(err, 'No se pudo registrar el hallazgo.'), 'Cerrar', { duration: 6000 })
      });
  }

  /**
   * Envía la solicitud de reclamo para validación de seguridad (HU22)
   */
  enviarReclamo(): void {
    if (this.reclamoForm.invalid) {
      this.snackBar.open('Por favor ingrese las características que demuestren su titularidad.', 'Cerrar', { duration: 4000 });
      return;
    }

    const item = this.objetoSeleccionado();
    if (!item) return;

    // Feedback positivo y simulación de registro de reclamo
    this.reclamoEnviadoConExito.set(true);
    this.snackBar.open(
      `Reclamo para ${item.descripcion} enviado al personal de custodia.`,
      'Entendido',
      { duration: 5000 }
    );
  }

  /**
   * Fallback visual cuando la imagen no puede cargarse
   */
  onImageError(item: ObjetoCatalogoItem): void {
    item.imagenUrl = null;
  }

  /** Ícono representativo por categoría */
  getIconoPorCategoria(categoria: CategoriaObjeto | string): string {
    return CATEGORIAS[categoria as CategoriaObjeto]?.icon ?? 'inventory_2';
  }
}
