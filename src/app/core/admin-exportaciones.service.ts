import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { API_URL } from './api.config';
import { SedeAdminService } from './sede-admin.service';

export type RecursoExportacion =
  | 'entregas'
  | 'objetos-custodia'
  | 'reportes-perdida'
  | 'publicaciones-encontradas';
export type FormatoExportacion = 'csv' | 'xlsx';

@Injectable({ providedIn: 'root' })
export class AdminExportacionesService {
  private http = inject(HttpClient);
  private sedeAdmin = inject(SedeAdminService);

  descargarExportacion(
    recurso: RecursoExportacion,
    formato: FormatoExportacion = 'csv',
    fechaDesde?: string,
    fechaHasta?: string
  ): Observable<{ exito: boolean; mensaje: string }> {
    let params = new HttpParams().set('formato', formato);
    if (fechaDesde) params = params.set('fecha_desde', fechaDesde);
    if (fechaHasta) params = params.set('fecha_hasta', fechaHasta);
    const sedeId = this.sedeAdmin.selectedSedeId();
    if (sedeId) params = params.set('sede_id', sedeId);

    return this.http
      .get(`${API_URL}/exportaciones/${recurso}`, {
        params,
        responseType: 'blob',
        observe: 'response'
      })
      .pipe(
        tap((response: HttpResponse<Blob>) => {
          const blob = response.body;
          if (!blob) return;

          let filename = `reporte_itm_${recurso}_${new Date().toISOString().slice(0, 10)}.${formato}`;
          const disposition = response.headers.get('content-disposition');
          if (disposition && disposition.includes('filename=')) {
            const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match && match[1]) {
              filename = match[1].replace(/['"]/g, '');
            }
          }

          this.dispararDescargaNavegador(blob, filename);
        }),
        map(() => ({ exito: true, mensaje: 'Reporte oficial descargado exitosamente.' }))
      );
  }

  exportarAuditoria(
    formato: FormatoExportacion = 'csv',
    filtros: { entidad?: string | null; accion?: string | null; fecha_desde?: string | null; fecha_hasta?: string | null } = {}
  ): Observable<{ exito: boolean; mensaje: string }> {
    let params = new HttpParams().set('formato', formato);
    if (filtros.entidad) params = params.set('entidad', filtros.entidad);
    if (filtros.accion) params = params.set('accion', filtros.accion);
    if (filtros.fecha_desde) params = params.set('fecha_desde', filtros.fecha_desde);
    if (filtros.fecha_hasta) params = params.set('fecha_hasta', filtros.fecha_hasta);

    return this.http
      .get(`${API_URL}/exportaciones/auditoria`, {
        params,
        responseType: 'blob',
        observe: 'response'
      })
      .pipe(
        tap((response: HttpResponse<Blob>) => {
          const blob = response.body;
          if (!blob) return;

          let filename = `auditoria_itm_${new Date().toISOString().slice(0, 10)}.${formato}`;
          const disposition = response.headers.get('content-disposition');
          if (disposition && disposition.includes('filename=')) {
            const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match && match[1]) {
              filename = match[1].replace(/['"]/g, '');
            }
          }

          this.dispararDescargaNavegador(blob, filename);
        }),
        map(() => ({ exito: true, mensaje: 'Bitácora de auditoría exportada exitosamente.' }))
      );
  }

  private dispararDescargaNavegador(blob: Blob, filename: string): void {
    if (typeof window === 'undefined') return;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 150);
  }
}
