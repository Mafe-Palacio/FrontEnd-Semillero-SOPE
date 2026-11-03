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
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, finalize, startWith, switchMap } from 'rxjs/operators';

// Angular Material
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Core Services & API
import { API_URL } from '../../core/api.config';
import { AuthService } from '../../core/auth.service';
import { CATEGORIAS } from '../../core/categorias';
import { mensajeDeError } from '../../core/api-error';
import { ObjetosEnCustodiaService } from '../../api/api/objetosEnCustodia.service';
import { PublicacionesEncontradasService } from '../../api/api/publicacionesEncontradas.service';
import { ReclamosService } from '../../api/api/reclamos.service';
import { PreguntasDeSeguridadService } from '../../api/api/preguntasDeSeguridad.service';
import { RespuestasDeSeguridadService } from '../../api/api/respuestasDeSeguridad.service';
import { UbicacionesService } from '../../api/api/ubicaciones.service';
import { PuntosEntregaService } from '../../api/api/puntosEntrega.service';
import { ReportesDePrdidaService } from '../../api/api/reportesDePrdida.service';
import { UbicacionResponse } from '../../api/model/ubicacionResponse';
import { PuntoEntregaResponse } from '../../api/model/puntoEntregaResponse';
import { ObjetoEnCustodiaPublico } from '../../api/model/objetoEnCustodiaPublico';
import { PreguntaSeguridadPublica } from '../../api/model/preguntaSeguridadPublica';
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

export interface ReportePerdidoPublico {
  reportePerdida_id: string;
  categoria: string;
  descripcion: string;
  lugar_perdida_nombre: string | null;
  fecha_perdida: string;
  imagen_url: string | null;
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
  private readonly http = inject(HttpClient);
  private readonly objetosService = inject(ObjetosEnCustodiaService);
  private readonly publicacionesService = inject(PublicacionesEncontradasService);
  private readonly reclamosService = inject(ReclamosService);
  private readonly preguntasService = inject(PreguntasDeSeguridadService);
  private readonly respuestasService = inject(RespuestasDeSeguridadService);
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
  /** Reportes de pérdida ya aprobados por un admin (GET /reportes-perdida/publicos). */
  readonly perdidosPublicos = signal<ReportePerdidoPublico[]>([]);
  readonly objetoSeleccionado = signal<ObjetoCatalogoItem | null>(null);
  readonly modalDetalleAbierto = signal<boolean>(false);
  readonly modalReclamarAbierto = signal<boolean>(false);
  readonly reclamoEnviadoConExito = signal<boolean>(false);

  // Estado del flujo real de reclamación (HU08, HU20, HU21, HU22)
  readonly preguntasSeguridad = signal<PreguntaSeguridadPublica[]>([]);
  readonly cargandoPreguntas = signal<boolean>(false);
  readonly modalidadReclamo = signal<'virtual' | 'presencial'>('virtual');
  readonly respuestasReclamo = signal<Record<string, string>>({});
  readonly evidenciaUrlReclamo = signal<string>('');
  readonly enviandoReclamo = signal<boolean>(false);

  // Modales de acciones rápidas (Se me perdió un objeto / Encontré un objeto)
  readonly modalReportarPerdidoAbierto = signal<boolean>(false);
  readonly modalRegistrarEncontradoAbierto = signal<boolean>(false);
  readonly reportePerdidoEnviado = signal<boolean>(false);
  readonly reporteEncontradoEnviado = signal<boolean>(false);
  readonly ubicaciones = signal<UbicacionResponse[]>([]);
  readonly puntosEntrega = signal<PuntoEntregaResponse[]>([]);
  readonly enviando = signal<boolean>(false);

  // Estado de carga de fotografías (HU28 - POST /imagenes)
  readonly imagenPerdidoUrl = signal<string | null>(null);
  readonly imagenPerdidoNombre = signal<string | null>(null);
  readonly subiendoImagenPerdido = signal<boolean>(false);

  readonly imagenEncontradoUrl = signal<string | null>(null);
  readonly imagenEncontradoNombre = signal<string | null>(null);
  readonly subiendoImagenEncontrado = signal<boolean>(false);

  readonly subiendoEvidenciaReclamo = signal<boolean>(false);

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

  // Objetos filtrados reactivamente en base a búsqueda, categoría y orden
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

        // Filtro por texto reactivo (coincide con descripción pública, categoría, punto de custodia o código)
        if (query) {
          const coincideDescripcion = item.descripcion.toLowerCase().includes(query);
          const coincideCategoria = item.categoriaEtiqueta.toLowerCase().includes(query);
          const coincideLugar = item.lugarGeneral.toLowerCase().includes(query);
          const coincideCodigo = item.codigoPublico.toLowerCase().includes(query);
          if (!coincideDescripcion && !coincideCategoria && !coincideLugar && !coincideCodigo) {
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
    this.cargarPerdidosPublicos();
  }

  cargarPerdidosPublicos(): void {
    this.http
      .get<ReportePerdidoPublico[]>(`${API_URL.replace(/\/+$/, '')}/reportes-perdida/publicos`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => this.perdidosPublicos.set(Array.isArray(items) ? items : []),
        error: () => this.perdidosPublicos.set([])
      });
  }

  etiquetaCategoria(cat: string): string {
    return (CATEGORIAS as Record<string, { label: string }>)[cat]?.label ?? cat;
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
   * Mapea un objeto del esquema de FastAPI a la tarjeta pública (HU01).
   * Incluye la descripción pública del objeto sin exponer detalles_internos.
   */
  private mapearObjetoPublico(item: ObjetoEnCustodiaPublico): ObjetoCatalogoItem {
    const fecha = item.fecha_ingreso ? new Date(item.fecha_ingreso) : new Date();
    const diasEnCustodia = Math.ceil(Math.abs(Date.now() - fecha.getTime()) / (1000 * 60 * 60 * 24));
    const etiqueta = CATEGORIAS[item.categoria]?.label ?? item.categoria;
    const descripcionPublica = item.descripcion?.trim() || etiqueta;

    return {
      id: item.objetoEnCustodia_id,
      codigoPublico: `OP-${item.objetoEnCustodia_id.slice(-6).toUpperCase()}`,
      descripcion: descripcionPublica,
      categoria: item.categoria,
      categoriaEtiqueta: etiqueta,
      sede: 'ITM',
      lugarGeneral: item.lugar_origen_nombre ?? 'Oficina de custodia',
      fechaIngreso: item.fecha_ingreso,
      fechaFormateada: this.formatearFecha(fecha),
      imagenUrl: item.imagen_url || null,
      estado: item.estado || EstadoCustodia.EnCustodia,
      estadoEtiqueta: item.estado === EstadoCustodia.PorVencer ? 'Por Vencer' : 'En Custodia Oficial',
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
   * Inicia el flujo real de reclamación (HU08, HU20, HU21, HU22)
   * Valida si el usuario está autenticado y consulta las preguntas de seguridad configuradas.
   */
  iniciarReclamo(item: ObjetoCatalogoItem, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.objetoSeleccionado.set(item);
    this.reclamoEnviadoConExito.set(false);
    this.respuestasReclamo.set({});
    this.evidenciaUrlReclamo.set('');
    this.preguntasSeguridad.set([]);
    this.modalidadReclamo.set('virtual');

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/catalogo' } });
      return;
    }

    this.modalReclamarAbierto.set(true);
    this.cargarPreguntasSeguridad(item.id);
  }

  private cargarPreguntasSeguridad(objetoId: string): void {
    this.cargandoPreguntas.set(true);
    this.preguntasService
      .obtenerPreguntasSeguridadPublicasPreguntasSeguridadObjetoObjetoEnCustodiaIdPublicoGet(objetoId)
      .pipe(
        finalize(() => this.cargandoPreguntas.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (preguntas) => {
          const ordenadas = [...(preguntas ?? [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
          this.preguntasSeguridad.set(ordenadas);
          if (ordenadas.length === 0) {
            this.modalidadReclamo.set('presencial');
          } else {
            this.modalidadReclamo.set('virtual');
            const inicial: Record<string, string> = {};
            for (const p of ordenadas) {
              inicial[p.preguntaSeguridad_id] = '';
            }
            this.respuestasReclamo.set(inicial);
          }
        },
        error: () => {
          // Si el objeto aún no tiene cuestionario configurado (404), habilitamos modalidad presencial
          this.preguntasSeguridad.set([]);
          this.modalidadReclamo.set('presencial');
        }
      });
  }

  cambiarModalidadReclamo(modalidad: 'virtual' | 'presencial'): void {
    if (modalidad === 'virtual' && this.preguntasSeguridad().length === 0) {
      return;
    }
    this.modalidadReclamo.set(modalidad);
  }

  actualizarRespuestaReclamo(preguntaId: string, valor: string): void {
    this.respuestasReclamo.update((actual) => ({
      ...actual,
      [preguntaId]: valor
    }));
  }

  actualizarEvidenciaUrl(valor: string): void {
    this.evidenciaUrlReclamo.set(valor);
  }

  formularioReclamoValido(): boolean {
    if (this.enviandoReclamo() || this.cargandoPreguntas()) {
      return false;
    }
    if (this.modalidadReclamo() === 'presencial') {
      return true;
    }
    const preguntas = this.preguntasSeguridad();
    if (preguntas.length === 0) {
      return true;
    }
    const respuestas = this.respuestasReclamo();
    return preguntas.every((p) => (respuestas[p.preguntaSeguridad_id] ?? '').trim().length > 0);
  }

  cerrarModalReclamo(): void {
    this.modalReclamarAbierto.set(false);
  }

  /**
   * Métodos para modal "Se me perdió un objeto"
   */
  abrirModalReportarPerdido(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/catalogo' } });
      return;
    }
    this.reportePerdidoEnviado.set(false);
    this.imagenPerdidoUrl.set(null);
    this.imagenPerdidoNombre.set(null);
    this.subiendoImagenPerdido.set(false);
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

  seleccionarFotoPerdido(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;
    this.subirFotografia(archivo, 'perdido');
    input.value = '';
  }

  quitarFotoPerdido(): void {
    this.imagenPerdidoUrl.set(null);
    this.imagenPerdidoNombre.set(null);
  }

  seleccionarFotoEncontrado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;
    this.subirFotografia(archivo, 'encontrado');
    input.value = '';
  }

  quitarFotoEncontrado(): void {
    this.imagenEncontradoUrl.set(null);
    this.imagenEncontradoNombre.set(null);
  }

  seleccionarFotoEvidenciaReclamo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;
    this.subirFotografia(archivo, 'reclamo');
    input.value = '';
  }

  private subirFotografia(archivo: File, destino: 'perdido' | 'encontrado' | 'reclamo'): void {
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!tiposPermitidos.includes(archivo.type)) {
      this.snackBar.open('Formato no válido. Solo se permiten imágenes JPG o PNG.', 'Cerrar', {
        duration: 4000
      });
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      this.snackBar.open('La imagen supera el límite máximo permitido de 5 MB.', 'Cerrar', {
        duration: 4000
      });
      return;
    }

    const formData = new FormData();
    formData.append('archivo', archivo);

    if (destino === 'perdido') this.subiendoImagenPerdido.set(true);
    if (destino === 'encontrado') this.subiendoImagenEncontrado.set(true);
    if (destino === 'reclamo') this.subiendoEvidenciaReclamo.set(true);

    this.http
      .post<{ url: string; formato: string; bytes: number }>(`${API_URL}/imagenes`, formData)
      .pipe(
        finalize(() => {
          if (destino === 'perdido') this.subiendoImagenPerdido.set(false);
          if (destino === 'encontrado') this.subiendoImagenEncontrado.set(false);
          if (destino === 'reclamo') this.subiendoEvidenciaReclamo.set(false);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (res) => {
          if (destino === 'perdido') {
            this.imagenPerdidoUrl.set(res.url);
            this.imagenPerdidoNombre.set(archivo.name);
          } else if (destino === 'encontrado') {
            this.imagenEncontradoUrl.set(res.url);
            this.imagenEncontradoNombre.set(archivo.name);
          } else {
            this.evidenciaUrlReclamo.set(res.url);
          }
          this.snackBar.open('Fotografía cargada correctamente.', 'Cerrar', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(
            mensajeDeError(err, 'No se pudo subir la fotografía. Intenta con otra imagen JPG o PNG.'),
            'Cerrar',
            { duration: 5000 }
          );
        }
      });
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
    if (this.formReportePerdido.invalid || this.enviando() || this.subiendoImagenPerdido()) {
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
        fecha_perdida: f.fechaExtravio,
        imagen_url: this.imagenPerdidoUrl() || undefined
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
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/catalogo' } });
      return;
    }
    this.reporteEncontradoEnviado.set(false);
    this.imagenEncontradoUrl.set(null);
    this.imagenEncontradoNombre.set(null);
    this.subiendoImagenEncontrado.set(false);
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
    if (this.formReporteEncontrado.invalid || this.enviando() || this.subiendoImagenEncontrado()) {
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
        fecha_hallazgo: f.fechaHallazgo,
        imagen_url: this.imagenEncontradoUrl() || undefined
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
   * Envía la solicitud real de reclamo al backend (POST /reclamos) y registra las
   * respuestas de seguridad (POST /respuestas-seguridad/) cuando es virtual (HU08, HU20, HU21, HU22).
   */
  enviarReclamo(): void {
    const item = this.objetoSeleccionado();
    if (!item || this.enviandoReclamo()) return;

    const esPresencial = this.modalidadReclamo() === 'presencial' || this.preguntasSeguridad().length === 0;
    const preguntas = this.preguntasSeguridad();
    const respuestas = this.respuestasReclamo();

    if (!esPresencial) {
      const faltanRespuestas = preguntas.some(
        (p) => !(respuestas[p.preguntaSeguridad_id] ?? '').trim()
      );
      if (faltanRespuestas) {
        this.snackBar.open(
          'Por favor responde todas las preguntas de seguridad para validar tu titularidad.',
          'Cerrar',
          { duration: 4000 }
        );
        return;
      }
    }

    const evidenciaLimpia = this.evidenciaUrlReclamo().trim();
    this.enviandoReclamo.set(true);

    this.reclamosService
      .crearReclamoReclamosPost({
        objetoEnCustodia_id: item.id,
        es_presencial: esPresencial,
        evidencia_url: evidenciaLimpia ? evidenciaLimpia : null
      })
      .pipe(
        switchMap((reclamoCreado) => {
          if (esPresencial || preguntas.length === 0) {
            return of(reclamoCreado);
          }
          const peticionesRespuestas = preguntas.map((p) =>
            this.respuestasService.crearRespuestaRespuestasSeguridadPost({
              reclamo_id: reclamoCreado.reclamo_id,
              preguntaSeguridad_id: p.preguntaSeguridad_id,
              respuesta_usuario: respuestas[p.preguntaSeguridad_id].trim()
            })
          );
          return forkJoin(peticionesRespuestas).pipe(switchMap(() => of(reclamoCreado)));
        }),
        finalize(() => this.enviandoReclamo.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.reclamoEnviadoConExito.set(true);
          this.snackBar.open(
            `Reclamo para "${item.descripcion}" registrado exitosamente.`,
            'Entendido',
            { duration: 5000 }
          );
          this.cargarCatalogo();
        },
        error: (err) => {
          this.snackBar.open(
            mensajeDeError(err, 'No se pudo enviar el reclamo. Verifica tu perfil e inténtalo de nuevo.'),
            'Cerrar',
            { duration: 6000 }
          );
        }
      });
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
