import { RenderMode, ServerRoute } from '@angular/ssr';

// La sesión vive en localStorage (JWT) y los datos vienen de la API en vivo:
// se renderiza en el navegador, no en el build (si no, se "hornea" el catálogo sin sesión ni datos).
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
