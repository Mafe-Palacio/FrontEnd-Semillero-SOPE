# Prompt para Google AI Studio: módulo /admin/custodia

Pega esto tal cual. Tomé los nombres de campo y los enums de `/openapi.json` del back actual.

---

Crea el módulo **`/admin/custodia`** del sitio administrativo (Angular 21, componentes standalone, signals). Ya existe el botón "Custodia" en el menú lateral de `admin-layout.component.ts`; falta agregar la ruta hija `custodia` en `admin-routing-module.ts` con `loadComponent`.

## Reglas obligatorias (los errores de las versiones anteriores)
1. **Datos reales solamente.** Prohibido usar datos de ejemplo, arreglos quemados o "respaldos" cuando la API falla. Si una petición falla: lista vacía + mensaje de error rojo con `mensajeDeError(err, '...')` (de `core/api-error.ts`). **Nunca** mostrar un toast verde de éxito dentro de un `error:`.
2. Usar el cliente generado de `src/app/api` cuando exista el método; si no, `HttpClient` con `${API_URL}/ruta` (API_URL **sin** barra final; las rutas sin barra final no llevan barra: `/reclamos`, `/actas-entrega`, `/posibles-coincidencias`; las que el back define con barra la llevan: `/objetos-custodia/`).
3. Enums exactos del back. Categorías: `ELECTRONICOS, DOCUMENTOS, ROPA, ACCESORIOS, BILLETERAS_Y_MONEDEROS, BOLSOS_Y_MALETAS, LLAVES, LIBROS_Y_UTILES, TERMOS_Y_CONTENEDORES, CASCOS, OTROS` (usar `core/categorias.ts` para etiquetas e íconos). Estado de objeto: `EN_CUSTODIA, POR_VENCER, SIN_DUENO_DEFINITIVO, RECLAMADO`. Estado de reclamo: `ENVIADO, EN_REVISION, APROBADO, RECHAZADO, LISTO_PARA_RECOGER, CANCELADO_POR_USUARIO, RECLAMADO`.
4. No uses clases de Tailwind (no está instalado). Reutiliza el estilo de `admin-aprobaciones.component.ts` (clases `itm-*`, tarjetas blancas, borde #E5E7EB, radio 12px, botones 8px). Colores ITM: azul #011C5B, cian #29ABE2; badges: aprobado/activo #008A47, rechazado/bloqueado #B23B24, pendiente #F19800. Tipografía Montserrat.
5. La sede la resuelve el interceptor con `X-Sede-Id`; no la envíes a mano. El layout ya muestra el aviso si el superadmin no eligió sede.
6. Cada acción que cambia datos: confirmar si es destructiva, deshabilitar el botón mientras carga y recargar la lista al terminar.

## Estructura: 4 pestañas
**Pestaña 1: Inventario** (objetos en custodia)
- `GET /objetos-custodia/` con filtros (query): `estado`, `categoria`, `punto_entrega`, `disponibles`, `en_proceso_validacion`, `ingreso_desde`, `ingreso_hasta`, `skip`, `limit`.
- Botón "Ingresar objeto" → modal → `POST /objetos-custodia/` con `{categoria*, descripcion*, lugar_origen_id* (punto de entrega, de GET /puntos-entrega/), fecha_ingreso* (YYYY-MM-DD), imagen_url?, publicacionEncontrado_id?, detalles_internos?}`. La imagen se sube antes con `POST /imagenes` (multipart, campo `archivo`, responde `{url}`).
- Editar: `PUT /objetos-custodia/{id}` con `{categoria?, descripcion?, imagen_url?, detalles_internos?}`.
- Acciones por fila: `PUT .../bloquear`, `PUT .../liberar`, `PUT .../marcar-reclamado`, `PUT .../archivar-sin-dueno` (sin body; las dos últimas con confirmación).
- Botón "Revisar vencimientos": `POST /objetos-custodia/expiracion` (sin body) → muestra `mensaje` de la respuesta.
- Campos de la respuesta: `objetoEnCustodia_id, categoria, descripcion, lugar_origen_id, fecha_ingreso, imagen_url, estado, fecha_vencimiento_alerta, en_proceso_validacion, detalles_internos`. Badge "En validación" si `en_proceso_validacion` es true y "Por vencer" si el estado es `POR_VENCER`.

**Pestaña 2: Preguntas de seguridad** (se abre desde una fila del inventario o eligiendo un objeto)
- `GET /preguntas-seguridad/objeto/{objetoEnCustodia_id}` → lista `{preguntaSeguridad_id, pregunta, respuesta_correcta, orden}`.
- Crear de 1 a 3: `POST /preguntas-seguridad/objeto/{objetoEnCustodia_id}` con `{objetoEnCustodia_id, preguntas: [{pregunta, respuesta_correcta}]}`.
- Editar una: `PUT /preguntas-seguridad/{preguntaSeguridad_id}` con `{pregunta?, respuesta_correcta?}`.
- Borrar una: `DELETE /preguntas-seguridad/{preguntaSeguridad_id}`; borrar todas: `DELETE /preguntas-seguridad/objeto/{objetoEnCustodia_id}`.
- Aclarar en pantalla que `respuesta_correcta` es solo para el admin y no se muestra al público.

**Pestaña 3: Reclamos**
- `GET /reclamos` con filtros: `estado`, `usuario_id`, `fecha_desde`, `fecha_hasta`, `skip`, `limit`. Campos: `reclamo_id, objetoEnCustodia_id, usuario_id, estado, es_presencial, evidencia_url, fecha_envio, fecha_revision, motivo_rechazo, fecha_cita, horario_cita`.
- Detalle (drawer o modal): `GET /reclamos/{reclamo_id}` y `GET /respuestas-seguridad/reclamo/{reclamo_id}` para ver `respuesta_usuario` junto a la `respuesta_correcta` (cargada de las preguntas del objeto).
- "Validar respuestas automáticamente": `POST /reclamos/{reclamo_id}/validar-respuestas` (sin body; devuelve el reclamo actualizado).
- Gestionar: `PUT /reclamos/{reclamo_id}` con `{estado?, motivo_rechazo?, fecha_cita? (YYYY-MM-DD), horario_cita? (HH:mm), fecha_revision?}`. Botones: Aprobar (`APROBADO`), Rechazar (`RECHAZADO`, exige `motivo_rechazo`), Agendar cita (fecha + hora, estado `LISTO_PARA_RECOGER`).
- Flujo de estados: `ENVIADO → EN_REVISION → APROBADO → LISTO_PARA_RECOGER → RECLAMADO` (este último lo pone el acta). `RECHAZADO` y `CANCELADO_POR_USUARIO` son finales. Mostrar solo las acciones válidas para el estado actual.
- Botón "Generar acta de entrega" visible solo si el estado es `APROBADO` o `LISTO_PARA_RECOGER`.

**Acta de entrega (modal desde Reclamos):** `POST /actas-entrega` con **todos** estos campos obligatorios: `{reclamo_id, nombre_reclamante, cedula_reclamante, correo_reclamante, celular_reclamante, carnet_reclamante, firma_url, validacion_verbal}`. `firma_url` se obtiene subiendo la imagen de la firma o la foto con `POST /imagenes`. `validacion_verbal` es un checkbox (cotejo verbal en oficina). Al terminar, el reclamo pasa a `RECLAMADO` y el objeto a `RECLAMADO`; recargar ambas listas.

**Pestaña 4: Posibles coincidencias (Smart Match)**
- Botón "Buscar coincidencias": `POST /posibles-coincidencias/ejecutar-matching` (sin body) → mostrar el `mensaje`.
- `GET /posibles-coincidencias` con filtros `score_minimo`, `notificado`, `reporte_perdida_id`, `objeto_id`, `usuario_id`. Cada fila trae `posibleCoincidencia_id, score, notificado, fecha_deteccion, objeto_descripcion, objeto_categoria, reporte_descripcion, usuario_nombre`: mostrarla como tarjeta comparativa "objeto en custodia ↔ reporte de pérdida" con el score como barra de porcentaje.
- Marcar como notificada: `PUT /posibles-coincidencias/{coincidencia_id}` con `{notificado: true}`.

## Entregable
Un componente por pestaña dentro de `features/admin/custodia/` (`admin-custodia.component.ts` como contenedor con las 4 pestañas), más la ruta. Estados vacíos claros ("No hay objetos en custodia"), indicador de carga y paginación con `skip/limit` de 20 por página. Al terminar, verifica que compila sin errores de TypeScript.
