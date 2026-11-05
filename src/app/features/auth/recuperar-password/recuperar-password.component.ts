import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth.service';
import { mensajeDeError } from '../../../core/api-error';

export const passwordComplexityValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value || '';
  if (!value) return null;
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const isValid = value.length >= 8 && hasUpper && hasLower && hasNumber;
  return isValid ? null : { passwordComplexity: true };
};

export const passwordsMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password_nueva')?.value;
  const confirm = group.get('confirmar_password')?.value;
  if (!password || !confirm) return null;
  return password === confirm ? null : { passwordsMismatch: true };
};

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './recuperar-password.component.html',
  styleUrl: './recuperar-password.component.scss'
})
export class RecuperarPasswordComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  paso = signal<'correo' | 'codigo'>('correo');
  cargando = signal<boolean>(false);
  mensajeInfo = signal<string | null>(null);
  mensajeError = signal<string | null>(null);
  mensajeExito = signal<string | null>(null);

  hidePassword = signal<boolean>(true);
  hideConfirm = signal<boolean>(true);

  // Cooldown de 60s para reenviar código
  segundosReenvio = signal<number>(0);
  private timerInterval: any = null;

  correoEnviado = signal<string>('');

  correoForm = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]]
  });

  resetForm = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    password_nueva: ['', [Validators.required, passwordComplexityValidator]],
    confirmar_password: ['', [Validators.required]]
  }, { validators: [passwordsMatchValidator] });

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  solicitarCodigo(): void {
    if (this.correoForm.invalid || this.cargando()) {
      this.correoForm.markAllAsTouched();
      return;
    }

    const correo = this.correoForm.getRawValue().correo.trim().toLowerCase();
    this.cargando.set(true);
    this.mensajeError.set(null);
    this.mensajeInfo.set(null);

    this.auth.recuperarPassword(correo).subscribe({
      next: () => {
        this.cargando.set(false);
        this.correoEnviado.set(correo);
        this.mensajeInfo.set('Si el correo está registrado, te enviamos un código de 6 dígitos. Vence en 10 minutos.');
        this.paso.set('codigo');
        this.iniciarCooldownReenvio();
      },
      error: (err) => {
        this.cargando.set(false);
        // Aun en error no crítico o respuesta estándar mostramos mensaje institucional seguro
        this.mensajeError.set(mensajeDeError(err, 'No fue posible solicitar el código de recuperación. Intenta nuevamente.'));
      }
    });
  }

  reenviarCodigo(): void {
    if (this.segundosReenvio() > 0 || this.cargando()) return;

    const correo = this.correoEnviado();
    if (!correo) {
      this.paso.set('correo');
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set(null);
    this.auth.recuperarPassword(correo).subscribe({
      next: () => {
        this.cargando.set(false);
        this.snack.open('Se ha enviado un nuevo código de recuperación.', 'Aceptar', { duration: 4000 });
        this.iniciarCooldownReenvio();
      },
      error: (err) => {
        this.cargando.set(false);
        this.mensajeError.set(mensajeDeError(err, 'No fue posible reenviar el código.'));
      }
    });
  }

  confirmarReseteo(): void {
    if (this.resetForm.invalid || this.cargando()) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const { codigo, password_nueva } = this.resetForm.getRawValue();
    const correo = this.correoEnviado();

    this.cargando.set(true);
    this.mensajeError.set(null);
    this.mensajeExito.set(null);

    this.auth.resetearPassword(correo, codigo.trim(), password_nueva).subscribe({
      next: () => {
        this.cargando.set(false);
        this.mensajeExito.set('¡Contraseña actualizada con éxito! Redirigiendo al inicio de sesión...');
        this.snack.open('Contraseña actualizada correctamente.', 'Aceptar', { duration: 2500 });
        setTimeout(() => {
          this.router.navigate(['/auth']);
        }, 2000);
      },
      error: (err) => {
        this.cargando.set(false);
        // En caso de código inválido o expirado, muestra el error y permite reintentar sin perder correo
        this.mensajeError.set(mensajeDeError(err, 'Código inválido o expirado. Por favor verifica e intenta de nuevo.'));
      }
    });
  }

  volverPasoCorreo(): void {
    this.paso.set('correo');
    this.mensajeError.set(null);
  }

  private iniciarCooldownReenvio(): void {
    this.segundosReenvio.set(60);
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const actual = this.segundosReenvio();
      if (actual <= 1) {
        this.segundosReenvio.set(0);
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      } else {
        this.segundosReenvio.set(actual - 1);
      }
    }, 1000);
  }
}
