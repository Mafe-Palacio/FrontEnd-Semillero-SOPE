import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

// Módulos de Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Importamos exactamente la clase que el generador creó
import { AutenticacinService } from '../../../api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  // Inyectamos el servicio correcto
  private authService = inject(AutenticacinService);

  constructor() {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { username, password } = this.loginForm.value;

      // Llamamos al método exacto y le pasamos un objeto JSON
      this.authService.loginAuthLoginPost({
        correo: username,
        password: password
      }).subscribe({
        next: (respuesta: any) => {
          this.isLoading = false;
          // Guardamos el token
          localStorage.setItem('access_token', respuesta.access_token);

          // Mostramos mensaje de éxito
          this.snackBar.open('¡Bienvenido al sistema!', 'Cerrar', { duration: 3000 });

          // Redirigimos al panel de administrador
          this.router.navigate(['/admin']);
        },
        error: (error) => {
          this.isLoading = false;
          this.snackBar.open('Correo o contraseña incorrectos', 'Cerrar', { duration: 4000 });
          console.error('Error de login:', error);
        }
      });
    }
  }
}