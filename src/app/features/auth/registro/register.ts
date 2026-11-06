import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth.service';
import { mensajeDeError } from '../../../core/api-error';
import { passwordComplexityValidator, igualAValidator } from '../../../core/password-validators';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [
        RouterModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatIconModule,
        MatButtonModule,
        MatSnackBarModule
    ],
    templateUrl: './register.html',
    styleUrl: './register.scss'
})
export class Register {
    private fb = inject(FormBuilder);
    private auth = inject(AuthService);
    private router = inject(Router);
    private snack = inject(MatSnackBar);

    paso = signal<'datos' | 'codigo'>('datos');
    cargando = signal(false);
    hidePassword = true;
    hideConfirmPassword = true;

    private usuarioId = '';
    correoRegistrado = '';

    readonly tipos = [
        { valor: 'ESTUDIANTE', etiqueta: 'Estudiante (@correo.itm.edu.co)', dominio: 'correo.itm.edu.co', corto: 'Estudiante' },
        { valor: 'PROFESOR', etiqueta: 'Profesor (@correo.itm.edu.co)', dominio: 'correo.itm.edu.co', corto: 'Profesor' },
        { valor: 'ADMINISTRATIVO', etiqueta: 'Administrativo (@itm.edu.co)', dominio: 'itm.edu.co', corto: 'Administrativo' },
        { valor: 'OFICIOS_VARIOS', etiqueta: 'Oficios varios (Dominio personalizado)', dominio: '', corto: 'Otro' }
    ];

    obtenerEtiquetaCorta(valor?: string): string {
        const match = this.tipos.find(t => t.valor === valor);
        return match ? match.corto : '';
    }

    form = this.fb.nonNullable.group({
        nombre_completo: ['', Validators.required],
        cedula: ['', Validators.required],
        celular: ['', [Validators.required, Validators.pattern(/^\d{7,15}$/)]],
        carnet: [''],
        tipo_vinculacion: ['ESTUDIANTE', Validators.required],
        prefijo_correo: ['', [Validators.required, Validators.pattern(/^[^@\s]+$/)]],
        dominio_personalizado: [''],
        password: ['', [Validators.required, passwordComplexityValidator]],
        confirmPassword: ['', [Validators.required, igualAValidator('password')]]
    });

    constructor() {
        this.form.controls.password.valueChanges
            .pipe(takeUntilDestroyed())
            .subscribe(() => {
                if (this.form.controls.confirmPassword.touched || this.form.controls.confirmPassword.value) {
                    this.form.controls.confirmPassword.updateValueAndValidity();
                }
            });
    }

    codigo = this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^\d{6}$/)]);

    get esOficios(): boolean {
        return this.form.controls.tipo_vinculacion.value === 'OFICIOS_VARIOS';
    }

    get dominioFijo(): string {
        return this.tipos.find(t => t.valor === this.form.controls.tipo_vinculacion.value)?.dominio ?? '';
    }

    enviarRegistro(): void {
        if (this.form.invalid || this.cargando()) {
            this.form.markAllAsTouched();
            return;
        }
        const v = this.form.getRawValue();
        if (this.esOficios && !v.dominio_personalizado.trim()) {
            this.snack.open('Indica el dominio de tu correo (lo que va después del @).', 'Cerrar', { duration: 5000 });
            return;
        }

        this.cargando.set(true);
        this.auth
            .registro({
                nombre_completo: v.nombre_completo.trim(),
                cedula: v.cedula.trim(),
                celular: v.celular.trim(),
                carnet: v.carnet.trim() ? v.carnet.trim() : null,
                tipo_vinculacion: v.tipo_vinculacion,
                prefijo_correo: v.prefijo_correo.trim().toLowerCase(),
                dominio_personalizado: this.esOficios ? v.dominio_personalizado.trim() : null,
                password: v.password
            })
            .subscribe({
                next: (res) => {
                    this.cargando.set(false);
                    this.usuarioId = res.usuario_id;
                    this.correoRegistrado = res.correo;
                    this.paso.set('codigo');
                    this.snack.open('Te enviamos un código de 6 dígitos a tu correo.', 'Aceptar', { duration: 5000 });
                },
                error: (err: HttpErrorResponse) => {
                    this.cargando.set(false);
                    this.snack.open(mensajeDeError(err, 'No se pudo completar el registro.'), 'Cerrar', { duration: 6000 });
                }
            });
    }

    verificarCodigo(): void {
        if (this.codigo.invalid || this.cargando()) {
            this.codigo.markAsTouched();
            return;
        }
        this.cargando.set(true);
        this.auth.verificarRegistro(this.usuarioId, this.codigo.value.trim()).subscribe({
            next: () => {
                this.cargando.set(false);
                this.snack.open('¡Cuenta verificada correctamente!', 'Aceptar', { duration: 3000 });
                this.router.navigateByUrl('/catalogo');
            },
            error: (err: HttpErrorResponse) => {
                this.cargando.set(false);
                this.snack.open(mensajeDeError(err, 'Código inválido o expirado.'), 'Cerrar', { duration: 6000 });
            }
        });
    }

    reenviarCodigo(): void {
        this.auth.reenviarCodigo(this.correoRegistrado).subscribe({
            next: () => this.snack.open('Código reenviado a tu correo.', 'Aceptar', { duration: 4000 }),
            error: (err: HttpErrorResponse) =>
                this.snack.open(mensajeDeError(err, 'No se pudo reenviar el código.'), 'Cerrar', { duration: 6000 })
        });
    }
}
