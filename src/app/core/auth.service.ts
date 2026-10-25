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