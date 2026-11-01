import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { API_URL } from './api.config';
import { mensajeDeError } from './api-error';
import { ObjetoEnCustodiaPublico } from '../api/model/objetoEnCustodiaPublico';
import { PublicacionEncontradoResponse } from '../api/model/publicacionEncontradoResponse';
import { CategoriaObjeto } from '../api/model/categoriaObjeto';

export interface FiltrosBusquedaCatalogo {
  termino?: string;
  categoria?: CategoriaObjeto | string;
  sedeId?: string;
  skip?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ObjetosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = API_URL;

  /**
   * Obtiene la lista de objetos disponibles en el catálogo público (HU01).
   * Solo expone datos no sensibles para la comunidad ITM.
   *
   * @param skip Número de registros a omitir (paginación)
   * @param limit Cantidad máxima de registros a retornar
   */
  obtenerCatalogoPublico(skip = 0, limit = 100): Observable<ObjetoEnCustodiaPublico[]> {
    const params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    return this.http
      .get<ObjetoEnCustodiaPublico[]>(`${this.baseUrl}/objetos-custodia/catalogo`, { params })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const mensaje = mensajeDeError(err, 'No fue posible cargar el catálogo público de objetos en custodia');
          return throwError(() => new Error(mensaje));
        })
      );
  }

  /**
   * Búsqueda pública de publicaciones de objetos encontrados aprobados por sede.
   * Permite consultar qué artículos han aparecido en una sede particular del ITM.
   *
   * @param sedeId Identificador o nombre de la sede (ej. 'FRATERNIDAD', 'ROBLEDO')
   * @param categoria Filtro opcional por categoría
   * @param skip Paginación: registros a omitir
   * @param limit Paginación: límite de registros
   */
  buscarPublicacionesPorSede(
    sedeId: string,
    categoria?: CategoriaObjeto | string,
    skip = 0,
    limit = 100
  ): Observable<PublicacionEncontradoResponse[]> {
    let params = new HttpParams()
      .set('sede_id', sedeId)
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    if (categoria && categoria !== 'TODAS') {
      params = params.set('categoria', categoria);
    }

    return this.http
      .get<PublicacionEncontradoResponse[]>(`${this.baseUrl}/publicaciones-encontradas/buscar`, { params })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const mensaje = mensajeDeError(err, `No fue posible buscar publicaciones para la sede ${sedeId}`);
          return throwError(() => new Error(mensaje));
        })
      );
  }

  /**
   * Búsqueda y filtrado general de objetos para el catálogo público.
   * Soporta filtros de texto por término, categoría y sede.
   */
  buscarObjetos(filtros: FiltrosBusquedaCatalogo): Observable<ObjetoEnCustodiaPublico[]> {
    const skip = filtros.skip ?? 0;
    const limit = filtros.limit ?? 100;

    return this.obtenerCatalogoPublico(skip, limit).pipe(
      map((objetos) => {
        let resultados = [...objetos];

        if (filtros.categoria && filtros.categoria !== 'TODAS') {
          resultados = resultados.filter((item) => item.categoria === filtros.categoria);
        }

        if (filtros.sedeId && filtros.sedeId !== 'TODAS') {
          const sedeQuery = filtros.sedeId.toUpperCase();
          resultados = resultados.filter((item) =>
            item.lugar_origen_id.toUpperCase().includes(sedeQuery)
          );
        }

        if (filtros.termino && filtros.termino.trim().length > 0) {
          const q = filtros.termino.trim().toLowerCase();
          resultados = resultados.filter((item) =>
            item.categoria.toLowerCase().includes(q) ||
            item.lugar_origen_id.toLowerCase().includes(q) ||
            item.objetoEnCustodia_id.toLowerCase().includes(q)
          );
        }

        return resultados;
      }),
      catchError((err: HttpErrorResponse | Error) => {
        if (err instanceof Error) {
          return throwError(() => err);
        }
        const mensaje = mensajeDeError(err, 'Error al filtrar objetos en custodia');
        return throwError(() => new Error(mensaje));
      })
    );
  }

  /**
   * Consulta el detalle público de un objeto en custodia por su identificador.
   *
   * @param id Identificador único del objeto en custodia
   */
  obtenerObjetoPorId(id: string): Observable<ObjetoEnCustodiaPublico> {
    return this.http
      .get<ObjetoEnCustodiaPublico>(`${this.baseUrl}/objetos-custodia/${encodeURIComponent(id)}`)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const mensaje = mensajeDeError(err, `No se encontró el objeto en custodia con ID ${id}`);
          return throwError(() => new Error(mensaje));
        })
      );
  }
}
