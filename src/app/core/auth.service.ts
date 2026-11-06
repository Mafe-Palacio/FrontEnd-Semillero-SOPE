import { Injectable, PLATFORM_ID, inject, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, finalize, of } from 'rxjs';
import { API_URL } from './api.config';

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

export interface RegistroPayload {
    nombre_completo: string;
    cedula: string;
    tipo_vinculacion: string;
    prefijo_correo: string;
    dominio_personalizado: string | null;
    celular?: string | null;
    carnet?: string | null;
    password: string;
}

export interface RegistroRespuesta {
    usuario_id: string;
    correo: string;
    mensaje: string;
}

export interface PerfilUsuario {
    usuario_id: string;
    nombre_completo: string;
    cedula: string;
    correo: string;
    celular?: string | null;
    carnet?: string | null;
    rol: string;
    tipo_vinculacion: string;
    sede_id?: string | null;
    is_verified?: boolean;
    is_active?: boolean;
    is_blocked?: boolean;
    fecha_creacion?: string;
    fecha_edicion?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpClient);
    private platformId = inject(PLATFORM_ID);
    private router = inject(Router);

    private getInitialToken(): string | null {
        if (!isPlatformBrowser(this.platformId)) return null;
        try {
            return localStorage.getItem('access_token');
        } catch {
            return null;
        }
    }

    private getInitialRefreshToken(): string | null {
        if (!isPlatformBrowser(this.platformId)) return null;
        try {
            return localStorage.getItem('refresh_token');
        } catch {
            return null;
        }
    }

    readonly tokenSignal = signal<string | null>(this.getInitialToken());
    readonly refreshTokenSignal = signal<string | null>(this.getInitialRefreshToken());

    readonly isLoggedIn = computed<boolean>(() => !!this.tokenSignal());

    readonly decodedToken = computed<Record<string, any> | null>(() => {
        const token = this.tokenSignal();
        if (!token) return null;
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch {
            return null;
        }
    });

    readonly isAdmin = computed<boolean>(() => {
        const payload = this.decodedToken();
        if (!payload) return false;
        const role = (payload['rol'] || payload['role'] || payload['rol_id'] || '').toString().toUpperCase();
        return role === 'ADMIN' || role === 'SUPERADMIN';
    });

    readonly isSuperAdmin = computed<boolean>(() => {
        const payload = this.decodedToken();
        if (!payload) return false;
        const role = (payload['rol'] || payload['role'] || payload['rol_id'] || '').toString().toUpperCase();
        return role === 'SUPERADMIN';
    });

    readonly userRole = computed<'USER' | 'ADMIN' | 'SUPERADMIN' | null>(() => {
        const payload = this.decodedToken();
        if (!payload) return null;
        const role = (payload['rol'] || payload['role'] || payload['rol_id'] || '').toString().toUpperCase();
        if (role === 'SUPERADMIN') return 'SUPERADMIN';
        if (role === 'ADMIN') return 'ADMIN';
        return 'USER';
    });

    readonly userName = computed<string>(() => {
        const payload = this.decodedToken();
        if (!payload) return 'Usuario';
        return payload['nombre_completo'] || payload['nombre'] || payload['correo'] || payload['sub'] || 'Administrador ITM';
    });

    readonly userEmail = computed<string>(() => {
        const payload = this.decodedToken();
        if (!payload) return '';
        return payload['correo'] || payload['email'] || payload['sub'] || '';
    });

    readonly userSedeId = computed<string | null>(() => {
        const payload = this.decodedToken();
        if (!payload) return null;
        return payload['sede_id'] || null;
    });

    readonly userId = computed<string | null>(() => {
        const payload = this.decodedToken();
        if (!payload) return null;
        return payload['usuario_id'] || payload['id'] || payload['sub'] || null;
    });

    private get authBase(): string {
        return API_URL.replace(/\/+$/, '');
    }

    login(correo: string, password: string): Observable<TokenResponse> {
        return this.http
            .post<TokenResponse>(`${this.authBase}/auth/login`, { correo, password })
            .pipe(tap((res) => this.guardarTokens(res)));
    }

    registro(data: RegistroPayload): Observable<RegistroRespuesta> {
        return this.http.post<RegistroRespuesta>(`${this.authBase}/auth/registro`, data);
    }

    verificarRegistro(usuario_id: string, codigo: string): Observable<TokenResponse> {
        return this.http
            .post<TokenResponse>(`${this.authBase}/auth/verificar-registro`, { usuario_id, codigo })
            .pipe(tap((res) => this.guardarTokens(res)));
    }

    reenviarCodigo(correo: string): Observable<unknown> {
        return this.http.post(`${this.authBase}/auth/reenviar-codigo-registro`, { correo });
    }

    refresh(): Observable<TokenResponse> {
        return this.http
            .post<TokenResponse>(`${this.authBase}/auth/refresh`, { refresh_token: this.getRefreshToken() })
            .pipe(tap((res) => this.guardarTokens(res)));
    }

    obtenerMiPerfil(): Observable<PerfilUsuario> {
        return this.http.get<PerfilUsuario>(`${this.authBase}/usuarios/me`);
    }

    actualizarMiPerfil(datos: { celular?: string | null; carnet?: string | null }): Observable<PerfilUsuario> {
        return this.http.put<PerfilUsuario>(`${this.authBase}/usuarios/me`, datos);
    }

    cambiarMiPassword(datos: { password_actual: string; password_nueva: string }): Observable<{ mensaje: string; exito: boolean }> {
        return this.http.put<{ mensaje: string; exito: boolean }>(`${this.authBase}/usuarios/me/password`, datos);
    }

    getToken(): string | null {
        return this.tokenSignal();
    }

    getRefreshToken(): string | null {
        return this.refreshTokenSignal();
    }

    getDecodedToken(): Record<string, any> | null {
        return this.decodedToken();
    }

    getUserRole(): 'USER' | 'ADMIN' | 'SUPERADMIN' | null {
        return this.userRole();
    }

    getUserName(): string {
        return this.userName();
    }

    getUserEmail(): string {
        return this.userEmail();
    }

    getUserSedeId(): string | null {
        return this.userSedeId();
    }

    getUserId(): string | null {
        return this.userId();
    }

    recuperarPassword(correo: string): Observable<{ mensaje?: string; success?: boolean }> {
        return this.http.post<{ mensaje?: string; success?: boolean }>(`${this.authBase}/auth/recuperar-password`, { correo });
    }

    resetearPassword(correo: string, codigo: string, password_nueva: string): Observable<{ mensaje?: string; success?: boolean }> {
        return this.http.post<{ mensaje?: string; success?: boolean }>(`${this.authBase}/auth/resetear-password`, {
            correo,
            codigo,
            password_nueva
        });
    }

    logout(): void {
        const refreshToken = this.getRefreshToken();
        const token = this.getToken();

        const limpiarLocal = () => {
            if (isPlatformBrowser(this.platformId)) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('admin_selected_sede_id');
            }
            this.tokenSignal.set(null);
            this.refreshTokenSignal.set(null);
            this.router.navigate(['/auth']);
        };

        if (token && isPlatformBrowser(this.platformId)) {
            this.http.post(`${this.authBase}/auth/logout`, { refresh_token: refreshToken || '' }).pipe(
                catchError(() => of(null)),
                finalize(() => limpiarLocal())
            ).subscribe();
        } else {
            limpiarLocal();
        }
    }

    private guardarTokens(res: TokenResponse): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('access_token', res.access_token);
            if (res.refresh_token) {
                localStorage.setItem('refresh_token', res.refresh_token);
            }
        }
        this.tokenSignal.set(res.access_token);
        if (res.refresh_token) {
            this.refreshTokenSignal.set(res.refresh_token);
        }
    }
}
