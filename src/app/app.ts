import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { BreakpointObserver } from '@angular/cdk/layout';

// Módulos de Angular Material para el Layout
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  title = 'frontend-objetos-perdidos';

  private readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);
  readonly authService = inject(AuthService);

  readonly isLoggedIn = this.authService.isLoggedIn;
  readonly isAdmin = this.authService.isAdmin;

  private getInitialUrl(): string {
    if (typeof window !== 'undefined' && window.location?.pathname) {
      return window.location.pathname + (window.location.search || '');
    }
    return this.router.url || '';
  }

  readonly currentUrl = signal<string>(this.getInitialUrl());

  readonly isAuthRoute = computed<boolean>(() => this.currentUrl().includes('/auth'));
  readonly isAdminRoute = computed<boolean>(() => this.currentUrl().startsWith('/admin') || this.currentUrl().includes('/admin'));
  readonly isCatalogoRoute = computed<boolean>(() => {
    const url = this.currentUrl();
    return url.includes('/catalogo') || url === '/' || url === '';
  });

  readonly isMobile = signal<boolean>(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  constructor() {
    this.breakpointObserver.observe(['(max-width: 768px)']).subscribe(result => {
      this.isMobile.set(result.matches);
    });

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const url = event.urlAfterRedirects || event.url || '';
      this.currentUrl.set(url);
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth']);
  }
}
