import { Injectable, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { API_URL } from './api.config';
import { AuthService } from './auth.service';
import { SedeResponse } from '../api/model/sedeResponse';

const STORAGE_KEY_SEDE = 'admin_selected_sede_id';
const SEDES_RESPALDO_IDS = new Set([
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
]);

@Injectable({ providedIn: 'root' })
export class SedeAdminService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  private sedesSignal = signal<SedeResponse[]>([]);
  private selectedSedeIdSignal = signal<string | null>(null);
  private loadingSignal = signal<boolean>(false);
  private errorSedesSignal = signal<boolean>(false);

  readonly sedes = computed(() => this.sedesSignal());
  readonly selectedSedeId = computed(() => {
    const id = this.selectedSedeIdSignal();
    if (!id || SEDES_RESPALDO_IDS.has(id)) return null;
    return id;
  });
  readonly isLoading = computed(() => this.loadingSignal());
  readonly errorSedes = computed(() => this.errorSedesSignal());

  readonly selectedSede = computed(() => {
    const id = this.selectedSedeIdSignal();
    if (!id) return null;
    return this.sedesSignal().find(s => s.sede_id === id) || null;
  });

  /** Si es SUPERADMIN y aún no ha elegido sede, requiere selección */
  readonly requiereSeleccionSede = computed(() => {
    if (!this.auth.isSuperAdmin()) return false;
    return !this.selectedSedeId();
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const guardada = localStorage.getItem(STORAGE_KEY_SEDE);
      if (guardada && !SEDES_RESPALDO_IDS.has(guardada)) {
        this.selectedSedeIdSignal.set(guardada);
      } else if (guardada) {
        localStorage.removeItem(STORAGE_KEY_SEDE);
      }
    }
  }

  /**
   * Carga las sedes activas de la institución.
   */
  cargarSedes(): Observable<SedeResponse[]> {
    this.loadingSignal.set(true);
    this.errorSedesSignal.set(false);
    return this.http.get<SedeResponse[]>(`${API_URL}/sedes/`).pipe(
      tap((sedes) => {
        this.loadingSignal.set(false);
        const lista = Array.isArray(sedes) ? sedes : [];
        this.sedesSignal.set(lista);
        this.autoSeleccionarSiEsAdmin(lista);
      }),
      catchError(() => {
        this.loadingSignal.set(false);
        this.errorSedesSignal.set(true);
        if (isPlatformBrowser(this.platformId)) {
          setTimeout(() => {
            if (this.errorSedesSignal()) {
              this.cargarSedes().subscribe();
            }
          }, 3000);
        }
        return of(this.sedesSignal());
      })
    );
  }

  reintentarSedes(): void {
    this.cargarSedes().subscribe();
  }

  seleccionarSede(sedeId: string): void {
    this.selectedSedeIdSignal.set(sedeId);
    if (isPlatformBrowser(this.platformId) && !SEDES_RESPALDO_IDS.has(sedeId)) {
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
      if (!this.auth.isSuperAdmin() && sedes.length > 0 && !SEDES_RESPALDO_IDS.has(sedes[0].sede_id)) {
        this.seleccionarSede(sedes[0].sede_id);
      } else {
        this.limpiarSedeSeleccionada();
      }
    }
  }
}
