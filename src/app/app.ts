import { Component, inject, signal } from '@angular/core';
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
  isAuthRoute = false;
  isCatalogoRoute = true;
  isAdminRoute = false;
  readonly isMobile = signal<boolean>(false);

  private readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);
  readonly authService = inject(AuthService);

  constructor() {
    this.breakpointObserver.observe(['(max-width: 768px)']).subscribe(result => {
      this.isMobile.set(result.matches);
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url || '';
      this.isAuthRoute = url.includes('/auth');
      this.isAdminRoute = url.startsWith('/admin') || url.includes('/admin');
      this.isCatalogoRoute = url.includes('/catalogo') || url === '/' || url === '';
    });
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth']);
  }
}