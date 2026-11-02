import { HttpErrorResponse } from '@angular/common/http';

/**
 * Saca un mensaje legible de un error de la API.
 * El backend responde { success:false, error:{ message } } (error_handlers.py);
 * algunos errores de FastAPI/Pydantic todavía vienen como { detail }.
 */
export function mensajeDeError(err: HttpErrorResponse, porDefecto: string): string {
    if (err.status === 0) return 'No se pudo conectar con el servidor';
    const e = err.error;
    const det = e?.error?.details;
    if (Array.isArray(det) && typeof det[0]?.msg === 'string') {
        return det[0].msg.replace(/^Value error, /, '');
    }
    if (typeof e?.error?.message === 'string') return e.error.message;
    if (typeof e?.detail === 'string') return e.detail;
    if (Array.isArray(e?.detail) && e.detail.length > 0 && typeof e.detail[0]?.msg === 'string') {
        return e.detail[0].msg;
    }
    return porDefecto;
}
