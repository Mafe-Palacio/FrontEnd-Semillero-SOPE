import { Component, OnInit, inject, signal, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService, PerfilUsuario } from '../../core/auth.service';
import { SedeAdminService } from '../../core/sede-admin.service';
import { mensajeDeError } from '../../core/api-error';

@Component({
  selector: 'app-perfil',
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerfilComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
  readonly authService = inject(AuthService);
  readonly sedeAdmin = inject(SedeAdminService);

  @ViewChild('celularInput') celularInputRef?: ElementRef<HTMLInputElement>;

  // Pestañas y estado de la página
  tabPerfil = signal<'info' | 'password'>('info');
  editandoPerfil = signal<boolean>(false);
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

  ngOnInit(): void {
    this.cargarPerfil();
    if (this.sedeAdmin.sedes().length === 0) {
      this.sedeAdmin.cargarSedes().subscribe();
    }
  }

  cargarPerfil(): void {
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
      error: (err) => {
        this.cargandoPerfil.set(false);
        this.snack.open(mensajeDeError(err, 'No se pudo cargar la información de tu perfil.'), 'Cerrar', { duration: 4000 });
      }
    });
  }

  iniciarEdicionPerfil(): void {
    const p = this.perfilActual();
    this.perfilForm.patchValue({
      celular: p?.celular || '',
      carnet: p?.carnet || ''
    });
    this.editandoPerfil.set(true);
    setTimeout(() => {
      this.celularInputRef?.nativeElement?.focus();
    }, 100);
  }

  cancelarEdicionPerfil(): void {
    const p = this.perfilActual();
    this.perfilForm.patchValue({
      celular: p?.celular || '',
      carnet: p?.carnet || ''
    });
    this.editandoPerfil.set(false);
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
        this.editandoPerfil.set(false);
        this.snack.open('Perfil actualizado correctamente.', 'Aceptar', { duration: 3500 });
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
        this.passwordForm.reset();
        this.snack.open(res.mensaje || 'Contraseña actualizada exitosamente.', 'Aceptar', { duration: 3500 });
      },
      error: (err) => {
        this.cargandoPerfil.set(false);
        this.snack.open(mensajeDeError(err, 'No se pudo cambiar la contraseña.'), 'Cerrar', { duration: 5000 });
      }
    });
  }

  obtenerNombreSede(sedeId?: string | null): string {
    if (!sedeId) return 'Sin sede asignada';
    const sede = this.sedeAdmin.sedes().find(s => s.sede_id === sedeId);
    if (!sede) return 'Sede no disponible';
    return `${sede.nombre} (${sede.codigo})`;
  }

  humanizarRol(rol?: string | null): string {
    if (!rol) return 'No especificado';
    const r = rol.toUpperCase();
    if (r === 'SUPERADMIN') return 'Superadministrador';
    if (r === 'ADMIN') return 'Administrador';
    if (r === 'USER') return 'Usuario';
    return rol;
  }

  humanizarVinculacion(tipo?: string | null): string {
    if (!tipo) return 'No especificado';
    const t = tipo.toUpperCase();
    if (t === 'ESTUDIANTE') return 'Estudiante';
    if (t === 'PROFESOR' || t === 'DOCENTE') return 'Profesor';
    if (t === 'ADMINISTRATIVO') return 'Administrativo';
    if (t === 'OFICIOS_VARIOS' || t === 'OFICIOS VARIOS') return 'Oficios varios';
    return tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase();
  }

  formatearFecha(fechaStr?: string | null): string {
    if (!fechaStr) return 'Sin cambios';
    try {
      const d = new Date(fechaStr);
      if (isNaN(d.getTime())) return fechaStr;
      return new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(d);
    } catch {
      return fechaStr;
    }
  }
}
