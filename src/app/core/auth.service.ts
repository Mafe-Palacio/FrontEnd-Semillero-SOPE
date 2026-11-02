import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
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
    password: string;
}

export interface RegistroRespuesta {
    usuario_id: string;
    correo: string;
    mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpClient);
    private platformId = inject(PLATFORM_ID);

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

    getToken(): string | null {
        if (!isPlatformBrowser(this.platformId)) return null;
        return localStorage.getItem('access_token');
    }

    getRefreshToken(): string | null {
        if (!isPlatformBrowser(this.platformId)) return null;
        return localStorage.getItem('refresh_token');
    }

    isLoggedIn(): boolean {
        return !!this.getToken();
    }

    getDecodedToken(): Record<string, any> | null {
        const token = this.getToken();
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
    }

    isAdmin(): boolean {
        const payload = this.getDecodedToken();
        if (!payload) return false;
        const role = (payload['rol'] || payload['role'] || payload['rol_id'] || '').toString().toUpperCase();
        return role === 'ADMIN' || role === 'SUPERADMIN';
    }

    isSuperAdmin(): boolean {
        const payload = this.getDecodedToken();
        if (!payload) return false;
        const role = (payload['rol'] || payload['role'] || payload['rol_id'] || '').toString().toUpperCase();
        return role === 'SUPERADMIN';
    }

    getUserRole(): 'USER' | 'ADMIN' | 'SUPERADMIN' | null {
        const payload = this.getDecodedToken();
        if (!payload) return null;
        const role = (payload['rol'] || payload['role'] || payload['rol_id'] || '').toString().toUpperCase();
        if (role === 'SUPERADMIN') return 'SUPERADMIN';
        if (role === 'ADMIN') return 'ADMIN';
        return 'USER';
    }

    getUserName(): string {
        const payload = this.getDecodedToken();
        if (!payload) return 'Usuario';
        return payload['nombre_completo'] || payload['nombre'] || payload['sub'] || 'Administrador ITM';
    }

    getUserEmail(): string {
        const payload = this.getDecodedToken();
        if (!payload) return '';
        return payload['correo'] || payload['email'] || payload['sub'] || '';
    }

    getUserSedeId(): string | null {
        const payload = this.getDecodedToken();
        if (!payload) return null;
        return payload['sede_id'] || null;
    }

    getUserId(): string | null {
        const payload = this.getDecodedToken();
        if (!payload) return null;
        return payload['usuario_id'] || payload['id'] || payload['sub'] || null;
    }

    logout(): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('admin_selected_sede_id');
        }
    }

    private guardarTokens(res: TokenResponse): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('access_token', res.access_token);
            if (res.refresh_token) {
                localStorage.setItem('refresh_token', res.refresh_token);
            }
        }
    }
}