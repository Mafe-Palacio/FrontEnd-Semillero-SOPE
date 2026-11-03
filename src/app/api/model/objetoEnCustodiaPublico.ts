import { CategoriaObjeto } from './categoriaObjeto';
import { EstadoCustodia } from './estadoCustodia';

/**
 * Vista filtrada para el catálogo público (HU01): oculta detalles_internos y datos administrativos.
 */
export interface ObjetoEnCustodiaPublico { 
    objetoEnCustodia_id: string;
    categoria: CategoriaObjeto;
    descripcion?: string | null;
    lugar_origen_id: string;
    lugar_origen_nombre?: string | null;
    fecha_ingreso: string;
    imagen_url?: string | null;
    estado: EstadoCustodia;
}
export namespace ObjetoEnCustodiaPublico {
}
