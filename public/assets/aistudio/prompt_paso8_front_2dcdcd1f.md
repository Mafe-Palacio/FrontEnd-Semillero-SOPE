Implementa el **Paso 8** del front (Angular 21, componentes standalone, Signals, ReactiveFormsModule, MatIconModule). Son 4 tareas independientes; hazlas en este orden y compila (`ng build`) al terminar cada una.

## Reglas obligatorias (iguales a los pasos anteriores)
1. **Datos reales solamente.** Prohibido usar arreglos quemados, mocks o éxito falso cuando la API falla. Si una petición falla: banner rojo con `mensajeDeError(err, '...')` (de `core/api-error.ts`) y, donde aplique, botón "Reintentar". Nunca muestres un mensaje verde de éxito dentro de un bloque `error:`.
2. **Cliente HTTP:** usa los servicios generados en `src/app/api` cuando existan; si no, `HttpClient` con `${API_URL}/ruta` (usa `API_URL.replace(/\/+$/, '')` y respeta las barras finales exactas indicadas abajo).
3. **Diseño ITM (`temas-itm.css`), sin Tailwind** (no está instalado): fondo `#F8F9FA`, tarjetas blancas con borde `1px solid #E5E7EB`, `border-radius: 12px`, sombra `0 1px 3px rgba(0,0,0,0.05)`, azul `#011C5B`, cian `#29ABE2`, verde `#008A47`, rojo teja `#B23B24`, ámbar `#F19800`, fuente `'Montserrat', sans-serif`.
4. Toda acción destructiva o que modifique datos pide confirmación en un modal limpio, deshabilita el botón mientras corre la petición y recarga la lista al terminar.
5. Errores del back vienen como `{ "success": false, "error": { "message": "..." } }`; `mensajeDeError` ya lo interpreta.

---

## Tarea 1 — Recuperar y restablecer contraseña (HU31) en `/auth/recuperar-password`
Crea `recuperar-password.component.ts` en `features/auth` y su ruta (lazy, `loadComponent`) dentro del módulo de auth. Enlázala desde el login con el texto "¿Olvidaste tu contraseña?" (hoy no debe llevar a ningún sitio roto).
Flujo en 2 pasos dentro de la misma pantalla (stepper simple, un solo `FormGroup` por paso):
- **Paso 1 — Correo:** campo `correo` (obligatorio, formato email). Botón "Enviar código" → `POST /auth/recuperar-password` con `{ "correo": "..." }`. El back responde **siempre igual exista o no el correo** (para no filtrar cuentas), así que muestra: "Si el correo está registrado, te enviamos un código de 6 dígitos. Vence en 10 minutos." y pasa al paso 2.
- **Paso 2 — Código y nueva contraseña:** campos `codigo` (exactamente 6 dígitos, `inputmode="numeric"`), `password_nueva` y `confirmar_password`. Valida: mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número; ambas contraseñas iguales; botón mostrar/ocultar. Botón "Cambiar contraseña" → `POST /auth/resetear-password` con `{ "correo", "codigo", "password_nueva" }`.
  - Éxito: mensaje "Contraseña actualizada" y redirigir a `/auth` (login) tras 2 segundos.
  - Error 400 ("Código inválido o expirado"): muestra el mensaje del back y deja reintentar sin perder el correo.
- Botón "Reenviar código" (vuelve a llamar a `POST /auth/recuperar-password`; el código anterior queda invalidado) con enfriamiento de 60 segundos visible en el botón.
- Usa el mismo estilo visual de la pantalla de login (tarjeta centrada, logo ITM). Pantalla accesible sin sesión (no usar guard).
- Reutiliza el patrón de validación de contraseña que ya exista en el registro o en "Cambiar contraseña" de perfil; no dupliques reglas distintas.

## Tarea 2 — Cerrar sesión con revocación de token (HU35)
El back agregará `POST /auth/logout` (requiere `Authorization: Bearer <access_token>`, cuerpo `{ "refresh_token": "..." }`, responde 200 `{ "success": true, "message": "..." }`). Modifica `AuthService.logout()` en `core/auth.service.ts`:
1. Si hay sesión, llama a `POST ${API_URL}/auth/logout` con el `refresh_token` guardado.
2. **Pase lo que pase** (éxito, 401 o error de red) borra `access_token` y `refresh_token` del `localStorage`, limpia los signals del usuario y navega a `/auth`. El cierre local nunca debe depender de que la API responda.
3. Que la llamada de logout NO dispare el interceptor de refresh en 401 (evita bucle): exclúyela en el `HttpInterceptorFn` igual que se excluye `/auth/login` y `/auth/refresh`.
4. Actualiza los llamadores de `logout()` (barra superior, menú lateral, perfil) para que sigan funcionando; si ahora devuelve `Observable<void>`, suscríbete o conviértelo a `Promise`, pero que el botón "Salir" no quede bloqueado.

## Tarea 3 — CRUD de Ubicaciones y Puntos de Entrega en `/admin/sedes`
Hoy `admin-sedes` solo administra sedes. Agrega **dos secciones/pestañas** nuevas dentro del mismo componente (o subcomponentes): "Ubicaciones" y "Puntos de entrega". Solo para ADMIN y SUPERADMIN. El ADMIN trabaja sobre su sede; el SUPERADMIN ya envía `X-Sede-Id` por el interceptor (no lo dupliques) y debe haber elegido sede antes, como en el resto del panel.
Endpoints (con barra final exacta):
- Ubicaciones: `GET /ubicaciones/`, `POST /ubicaciones/`, `PUT /ubicaciones/{ubicacion_id}`, `DELETE /ubicaciones/{ubicacion_id}`.
  - Campos: `ubicacion_id`, `sede_id`, `nombre`, `tipo` (enum `BLOQUE | PORTERIA | ZONA_COMUN | OTRO`), `activa`.
  - Crear: `{ sede_id, nombre, tipo, activa: true }`. Editar: `{ nombre?, tipo?, activa? }`.
- Puntos de entrega: `GET /puntos-entrega/`, `POST /puntos-entrega/`, `PUT /puntos-entrega/{puntoEntrega_id}`, `DELETE /puntos-entrega/{puntoEntrega_id}`.
  - Campos: `puntoEntrega_id`, `sede_id`, `nombre`, `tipo` (enum `OFICINA | PORTERIA`), `activa`.
  - Crear: `{ sede_id, nombre, tipo, activa: true }`. Editar: `{ nombre?, tipo?, activa? }`.
- **`DELETE` es una desactivación (no borra la fila):** el texto del modal debe decir "Desactivar" y la fila queda marcada como inactiva. Ofrece también un interruptor "Activa" que usa `PUT` con `{ activa: true/false }` para reactivar.
- UI: tabla/tarjetas por sede con nombre, tipo (badge), estado (Activa verde / Inactiva gris), botones Editar y Desactivar; botón "Nueva ubicación" / "Nuevo punto de entrega" que abre un modal con `nombre` (obligatorio, máx. 100), `tipo` (select con el enum) y `activa`. `sede_id` se toma de la sede actual (la del admin o la elegida por el SUPERADMIN), no se pide en el formulario.
- Errores 400/403 del back (por ejemplo nombre duplicado o sede ajena) se muestran dentro del modal con `mensajeDeError`.
- Estados vacíos con ícono (`place`, `storefront`) y texto claro. Al terminar cualquier acción, recarga la lista.
- Nota: los selects de ubicación/punto en los formularios de reportes y publicaciones usan estas mismas listas; solo deben ofrecer las `activa === true`. Si hoy no filtran, agrégalo.

## Tarea 4 — Exportar auditoría y limpieza del front
1. **Exportar auditoría (HU13):** en `/admin/auditoria` agrega un botón "Exportar" con menú CSV / Excel que llame `GET /exportaciones/auditoria?formato=csv|xlsx` reutilizando los mismos filtros activos de la pantalla (`fecha_desde`, `fecha_hasta`, módulo, rol, etc. — usa los nombres de parámetro que ya envía `GET /auditoria`). Descarga como blob (`responseType: 'blob'`) respetando el nombre del archivo del header `Content-Disposition`, igual que hace `admin-reportes`. Si el back responde 4xx, muestra banner rojo. (Este recurso lo agrega el back en este mismo paso; si ves 422 mientras tanto es normal.)
2. **Limpieza de rutas sin uso:** elimina las rutas vacías `chat` y `notificaciones` (módulos, routing y enlaces en `app.html`/menús) si no tienen componente real. No elimines nada que otra pantalla importe; verifica con `ng build`.
3. **Seguridad del front:** confirma que no hay secretos, URLs de ngrok ni contraseñas en el código; deja `API_URL` en `core/api.config.ts` con un comentario claro de que debe apuntar al backend desplegado antes de entregar. No uses `innerHTML`/`bypassSecurityTrust*` con texto que venga de usuarios.

## Entregable
- Archivos nuevos y modificados completos (`.ts`, `.html`, `.scss`), rutas actualizadas, y `ng build` sin errores.
- Lista corta de archivos tocados al final.
