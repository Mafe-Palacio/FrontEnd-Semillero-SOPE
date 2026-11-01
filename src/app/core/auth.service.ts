import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_URL } from './api.config';

export interface TokenResponse {
    access_token: string;
    token_type: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpClient);
    private platformId = inject(PLATFORM_ID);

    login(correo: string, password: string): Observable<TokenResponse> {
        return this.http
            .post<TokenResponse>(`${API_URL}/auth/login`, { correo, password })
            .pipe(tap((res) => this.guardarToken(res.access_token)));
    }

    getToken(): string | null {
        if (!isPlatformBrowser(this.platformId)) return null;
        return localStorage.getItem('access_token');
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
            const payload = parts[1];
            const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
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

    logout(): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem('access_token');
        }
    }

    private guardarToken(token: string): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('access_token', token);
        }
    }
}