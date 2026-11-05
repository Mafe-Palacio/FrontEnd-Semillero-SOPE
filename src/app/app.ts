import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { filter } from 'rxjs/operators';
import { BreakpointObserver } from '@angular/cdk/layout';

// Módulos de Angular Material para el Layout
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService, PerfilUsuario } from './core/auth.service';
import { mensajeDeError } from './core/api-error';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  title = 'frontend-objetos-perdidos';

  private readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
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

  // Estado del Modal de Perfil
  modalPerfilAbierto = signal<boolean>(false);
  tabPerfil = signal<'datos' | 'password'>('datos');
  cargandoPerfil = signal<boolean>(false);
  perfilActual = signal<PerfilUsuario | null>(null);

  perfilForm = this.fb.nonNullable.group({
    celular: ['', [Validators.required, Validators.pattern(/^\d{7,15}$/)]],
    carnet: ['']
  });

  passwordForm = this.fb.nonNullable.group({
    password_actual: ['', Validators.required],
    password_nueva: ['', [Validators.required, Validators.minLength(8)]]
  });

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

  abrirModalPerfil(): void {
    this.modalPerfilAbierto.set(true);
    this.tabPerfil.set('datos');
    this.cargandoPerfil.set(true);
    this.authService.obtenerMiPerfil().subscribe({
      next: (perfil) => {
        this.cargandoPerfil.set(false);
        this.perfilActual.set(perfil);
        this.perfilForm.patchValue({
          celular: perfil.celular || '',
          carnet: perfil.carnet || ''
        });
      },
      error: () => {
        this.cargandoPerfil.set(false);
      }
    });
  }

  cerrarModalPerfil(): void {
    this.modalPerfilAbierto.set(false);
    this.passwordForm.reset();
  }

  guardarPerfil(): void {
    if (this.perfilForm.invalid || this.cargandoPerfil()) {
      this.perfilForm.markAllAsTouched();
      return;
    }
    const { celular, carnet } = this.perfilForm.getRawValue();
    this.cargandoPerfil.set(true);
    this.authService.actualizarMiPerfil({
      celular: celular.trim(),
      carnet: carnet.trim() ? carnet.trim() : null
    }).subscribe({
      next: (actualizado) => {
        this.cargandoPerfil.set(false);
        this.perfilActual.set(actualizado);
        this.snack.open('Perfil actualizado correctamente.', 'Aceptar', { duration: 3500 });
        this.cerrarModalPerfil();
      },
      error: (err) => {
        this.cargandoPerfil.set(false);
        this.snack.open(mensajeDeError(err, 'No se pudo actualizar el perfil.'), 'Cerrar', { duration: 5000 });
      }
    });
  }

  guardarPassword(): void {
    if (this.passwordForm.invalid || this.cargandoPerfil()) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { password_actual, password_nueva } = this.passwordForm.getRawValue();
    this.cargandoPerfil.set(true);
    this.authService.cambiarMiPassword({ password_actual, password_nueva }).subscribe({
      next: (res) => {
        this.cargandoPerfil.set(false);
        this.snack.open(res.mensaje || 'Contraseña actualizada exitosamente.', 'Aceptar', { duration: 3500 });
        this.cerrarModalPerfil();
      },
      error: (err) => {
        this.cargandoPerfil.set(false);
        this.snack.open(mensajeDeError(err, 'No se pudo cambiar la contraseña.'), 'Cerrar', { duration: 5000 });
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth']);
  }
}
