import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_URL } from './api.config';
import { CATEGORIAS } from './categorias';
import { CategoriaObjeto } from '../api/model/categoriaObjeto';

export interface MetricasBackendResponse {
  total_objetos: number;
  objetos_por_estado: Record<string, number>;
  reclamados: number;
  sin_reclamar: number;
  sin_dueno_definitivo: number;
  porcentaje_devueltos: number;
  dias_promedio_custodia: number | null;
  categorias_mas_perdidas: Array<{
    categoria: string;
    total: number;
  }>;
  reclamos_por_estado: Record<string, number>;
  pendientes_aprobacion: {
    reportes_perdida: number;
    publicaciones_encontradas: number;
    solicitudes_eliminacion: number;
  };
  generado_en: string;
}

export interface MetricasResumen {
  total_objetos: number;
  total_custodia: number;
  reclamados: number;
  no_reclamados: number;
  sin_dueno_definitivo: number;
  tasa_exito_porcentaje: number;
  dias_promedio_custodia: number | null;
  pendientes_moderacion: {
    perdidos: number;
    encontrados: number;
    eliminaciones: number;
  };
  top_categorias: Array<{
    categoria: string;
    nombre: string;
    icono: string;
    cantidad: number;
    porcentaje: number;
  }>;
  por_estado: Record<string, number>;
  reclamos_por_estado: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class AdminMetricasService {
  private http = inject(HttpClient);

  obtenerResumen(fechaDesde?: string, fechaHasta?: string): Observable<MetricasResumen> {
    let params = new HttpParams();
    if (fechaDesde) params = params.set('fecha_desde', fechaDesde);
    if (fechaHasta) params = params.set('fecha_hasta', fechaHasta);

    return this.http.get<MetricasBackendResponse>(`${API_URL}/metricas/resumen`, { params }).pipe(
      map((raw) => this.normalizarMetricas(raw))
    );
  }

  private normalizarMetricas(raw: MetricasBackendResponse): MetricasResumen {
    const porEstado = raw.objetos_por_estado ?? {};
    const enCustodiaActiva = (porEstado['EN_CUSTODIA'] ?? 0) + (porEstado['POR_VENCER'] ?? 0);
    const categoriasRaw = raw.categorias_mas_perdidas ?? [];
    const totalReportesCat = categoriasRaw.reduce((acc, item) => acc + (item.total || 0), 0);

    const topCategorias = categoriasRaw.map((item) => {
      const catMeta = CATEGORIAS[item.categoria as CategoriaObjeto];
      const cantidad = item.total || 0;
      const porcentaje = totalReportesCat > 0 ? Math.round((cantidad * 100) / totalReportesCat) : 0;
      return {
        categoria: item.categoria,
        nombre: catMeta?.label ?? item.categoria,
        icono: catMeta?.icon ?? 'inventory_2',
        cantidad,
        porcentaje
      };
    });

    return {
      total_objetos: raw.total_objetos ?? 0,
      total_custodia: enCustodiaActiva,
      reclamados: raw.reclamados ?? 0,
      no_reclamados: raw.sin_reclamar ?? 0,
      sin_dueno_definitivo: raw.sin_dueno_definitivo ?? 0,
      tasa_exito_porcentaje: raw.porcentaje_devueltos ?? 0,
      dias_promedio_custodia: raw.dias_promedio_custodia ?? null,
      pendientes_moderacion: {
        perdidos: raw.pendientes_aprobacion?.reportes_perdida ?? 0,
        encontrados: raw.pendientes_aprobacion?.publicaciones_encontradas ?? 0,
        eliminaciones: raw.pendientes_aprobacion?.solicitudes_eliminacion ?? 0
      },
      top_categorias: topCategorias,
      por_estado: porEstado,
      reclamos_por_estado: raw.reclamos_por_estado ?? {}
    };
  }
}
