import { Injectable, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { API_URL } from './api.config';
import { AuthService } from './auth.service';
import { SedeResponse } from '../api/model/sedeResponse';

const STORAGE_KEY_SEDE = 'admin_selected_sede_id';

@Injectable({ providedIn: 'root' })
export class SedeAdminService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  private sedesSignal = signal<SedeResponse[]>([]);
  private selectedSedeIdSignal = signal<string | null>(null);
  private loadingSignal = signal<boolean>(false);

  readonly sedes = computed(() => this.sedesSignal());
  readonly selectedSedeId = computed(() => this.selectedSedeIdSignal());
  readonly isLoading = computed(() => this.loadingSignal());

  readonly selectedSede = computed(() => {
    const id = this.selectedSedeIdSignal();
    if (!id) return null;
    return this.sedesSignal().find(s => s.sede_id === id) || null;
  });

  /** Si es SUPERADMIN y aún no ha elegido sede, requiere selección */
  readonly requiereSeleccionSede = computed(() => {
    if (!this.auth.isSuperAdmin()) return false;
    return !this.selectedSedeIdSignal();
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const guardada = localStorage.getItem(STORAGE_KEY_SEDE);
      if (guardada) {
        this.selectedSedeIdSignal.set(guardada);
      }
    }
  }

  /**
   * Carga las sedes activas de la institución.
   * Si la API no responde o da 502, provee las sedes oficiales del ITM como respaldo.
   */
  cargarSedes(): Observable<SedeResponse[]> {
    this.loadingSignal.set(true);
    return this.http.get<SedeResponse[]>(`${API_URL}sedes/`).pipe(
      tap((sedes) => {
        this.loadingSignal.set(false);
        if (Array.isArray(sedes) && sedes.length > 0) {
          this.sedesSignal.set(sedes);
          this.autoSeleccionarSiEsAdmin(sedes);
        } else {
          this.usarSedesRespaldo();
        }
      }),
      catchError(() => {
        this.loadingSignal.set(false);
        this.usarSedesRespaldo();
        return of(this.sedesSignal());
      })
    );
  }

  seleccionarSede(sedeId: string): void {
    this.selectedSedeIdSignal.set(sedeId);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY_SEDE, sedeId);
    }
  }

  limpiarSedeSeleccionada(): void {
    this.selectedSedeIdSignal.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(STORAGE_KEY_SEDE);
    }
  }

  private autoSeleccionarSiEsAdmin(sedes: SedeResponse[]): void {
    // Si es ADMIN común con sede fija asignada en el token o perfil
    const sedeUsuario = this.auth.getUserSedeId();
    if (sedeUsuario && !this.auth.isSuperAdmin()) {
      this.seleccionarSede(sedeUsuario);
      return;
    }

    // Si es SUPERADMIN y no tiene sede seleccionada, no auto-selecciona (obliga a elegir)
    // Pero si ya tenía una guardada y existe en la lista, la mantiene
    const actual = this.selectedSedeIdSignal();
    if (actual && !sedes.some(s => s.sede_id === actual)) {
      // Si la sede guardada ya no existe, sugerir primera o resetear
      if (!this.auth.isSuperAdmin() && sedes.length > 0) {
        this.seleccionarSede(sedes[0].sede_id);
      }
    }
  }

  private usarSedesRespaldo(): void {
    const sedesRespaldo: SedeResponse[] = [
      {
        sede_id: '11111111-1111-1111-1111-111111111111',
        nombre: 'Sede Fraternidad (Boston)',
        codigo: 'FRAT',
        activa: true,
        fecha_creacion: new Date().toISOString(),
        fecha_edicion: new Date().toISOString()
      },
      {
        sede_id: '22222222-2222-2222-2222-222222222222',
        nombre: 'Sede Robledo',
        codigo: 'ROBL',
        activa: true,
        fecha_creacion: new Date().toISOString(),
        fecha_edicion: new Date().toISOString()
      },
      {
        sede_id: '33333333-3333-3333-3333-333333333333',
        nombre: 'Sede Castilla',
        codigo: 'CAST',
        activa: true,
        fecha_creacion: new Date().toISOString(),
        fecha_edicion: new Date().toISOString()
      },
      {
        sede_id: '44444444-4444-4444-4444-444444444444',
        nombre: 'Sede Prado',
        codigo: 'PRAD',
        activa: true,
        fecha_creacion: new Date().toISOString(),
        fecha_edicion: new Date().toISOString()
      },
      {
        sede_id: '55555555-5555-5555-5555-555555555555',
        nombre: 'Sede Floresta',
        codigo: 'FLOR',
        activa: true,
        fecha_creacion: new Date().toISOString(),
        fecha_edicion: new Date().toISOString()
      }
    ];

    this.sedesSignal.set(sedesRespaldo);
    this.autoSeleccionarSiEsAdmin(sedesRespaldo);
  }
}
