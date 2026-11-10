# OcuAdapt – Log de desarrollo (punto de guardado)

> **Para quien continúe (otro modelo):** lee este archivo primero. Actualiza "Estado" y "Bitácora" al terminar cada tarea.
> Documentos de referencia: `propuesta_ideacion_grupo2_OcuAdapt.md`, `lineamientos_cap7_cap8_grupo2.md` (sec. 4.3, 4.8, 4.11).

## Decisiones tomadas
- Proyecto único modular (no monorepo): `src/core` (agnóstico), `src/extension` (MV3), `src/widget`, `test-harness/`.
- TypeScript estricto, popup en TS/HTML vanilla (sin framework), build con esbuild, pruebas con vitest + jsdom.
- Sin telemetría; permisos `storage` + `activeTab`; content script en http/https; sin código remoto. Fuentes (Atkinson, Inter; SIL OFL) vía `@fontsource`, copiadas a `dist/fonts` y `dist/widget`.
- Corrección cromática: matrices de Machado 2009 (severidad 1.0) + redistribución del error `C = I + M(I−S)`, en RGB lineal vía `feColorMatrix color-interpolation-filters="linearRGB"`, aplicada con `filter:url(#id)` en `<html>`.
- Contraste: se ajusta el color de primer plano (mezcla hacia negro/blanco, redondeado a 8 bits) por elemento con texto, estilo en línea `!important`, con restauración completa. Fondos con imagen/degradado = «indeterminado» (no se tocan).
- Escala: se multiplica `font-size` por elemento; además `overflow:visible` en contenedores que recortan al ampliar (mitigación parcial B3).
- Codificación redundante: solo elementos que coinciden con reglas (`[data-state],[data-status],[data-estado]`); estado por palabra clave (es/en) y, de respaldo, por tono del color de fondo. Añade badge (icono ✔ círculo / ▲ triángulo / ✖ cuadrado + etiqueta si el elemento no tiene texto) y patrón (puntos = pendiente, rayas = rechazado).
- Test de color: 12 láminas generadas (2 control + 10 tamizaje, semilla fija), sin reproducir Ishihara. Regla: control fallido → no concluyente; ≥80 % → sin hallazgo; ≤50 % → probable déficit rojo/verde; intermedio → no concluyente. No distingue protan/deutan ni evalúa tritanopia (se declara). Siempre muestra aviso de derivación a un profesional. Accesible por teclado, con alternativa manual.
- Sitios excluidos: `excludedSites` en el perfil (dominio y subdominios); el content script aplica el perfil con `enabled:false` en esos sitios.
- Widget: Web Component con Shadow DOM, estado en `localStorage` del sitio anfitrión, atributos `lang` y `font-base-url`.

## Estructura
```
src/core/        types, profile, color, chroma, styles, dom, readingMask, redundant, colortest, i18n, adapter, index
src/extension/   manifest.json, background.ts, content.ts, storage.ts, popup/{html,css,ts}, colortest/{html,css,ts}
src/widget/      index.ts (Web Component <ocuadapt-widget>)
test-harness/    index.html, harness.css, harness.ts, widget-demo.html
tests/           core.test.ts (17), mvp1.test.ts (12)
build.mjs        genera dist/ (extensión, dist/widget, dist/test-harness)
```

## Comandos
- `npm install` · `npm run build` · `npm test` · `npm run typecheck`
- Extensión: `chrome://extensions` → Modo desarrollador → «Cargar descomprimida» → carpeta `dist/`.
- Banco de pruebas: `npx serve dist` y abrir `/test-harness/index.html` y `/test-harness/widget-demo.html`.

## Estado por tarea (✅ hecho · 🟡 parcial · ⬜ pendiente)
| ID | Tarea | Estado |
|---|---|---|
| F1.1–F1.5 | Setup, perfil, ChromaVision, contraste/escala/tipografía, guía de lectura y foco | ✅ (revisado por el usuario) |
| F2.x | Extensión MV3 (manifest, SW, content, popup es/en, auditoría de contraste) | ✅ (revisado por el usuario) |
| F3.1–F3.2 | Página de prueba + pruebas automatizadas | ✅ |
| F4.1 | Codificación redundante (RF-03) | ✅ código y pruebas jsdom |
| F4.2 | Test de tamizaje de color (RF-09) | ✅ código y pruebas de puntuación; **láminas sin verificar visualmente** |
| F4.3 | Widget `<ocuadapt-widget>` → `dist/widget/ocuadapt-widget.js` | ✅ compila; sin probar en navegador |
| F4.4 | Sitios excluidos (RF-13) | ✅ |
| F4.5 | Verificación manual de MVP-1 en Chrome (láminas legibles, badges en B6, widget con teclado/NVDA, T6 con axe en popup) | ⬜ **siguiente paso (usuario/navegador)** |
| F3.3–F3.4 | Capturas antes/después T1–T4, T6; medir T7 (tiempo de aplicación) | ⬜ |
| F5 | Móvil (concepto: cámara→OCR→TTS) | ⬜ (solo concepto; no implementar salvo pedido) |

## Limitaciones conocidas / ideas
- Filtro en `<html>` rompe `position:fixed` en algunos sitios; evaluar aplicar en `body` o por elementos.
- Sin soporte de iframes ni Shadow DOM de terceros (`all_frames:false`).
- `relaxClipping` usa scrollHeight/Width (no medible en jsdom).
- Widget: al re-renderizar (perfil rápido/restablecer) se pierde el foco del control; mejorable devolviéndolo al botón.
- Reglas de redundancia personalizadas por sitio aún no son configurables por el usuario (solo selectores por defecto; ver `RedundantCoder` constructor).
- En jsdom `removeProperty('background-image')` deja `'none'` si el fondo vino de un shorthand; en navegador real queda vacío.
- Verificar licencias OFL de fuentes para citar en el informe.

## Bitácora
- 2026-11-09 21:44 – Log creado, decisiones registradas.
- 2026-11-09 21:49 – MVP-0 completo (core, extensión, popup, harness, 17 pruebas). Bug corregido: precisión de color tras redondeo (4,478:1 → ≥4,5:1).
- 2026-11-09 22:37 – El usuario revisó el MVP-0 y lo aprobó; se continúa con MVP-1.
- 2026-11-09 22:42 – MVP-1 implementado (F4.1–F4.4). Perfil ampliado con `redundantCoding` y `excludedSites`. 29/29 pruebas, typecheck y build OK.
- 2026-11-09 23:15 – Corrección de codificación redundante en la página de prueba:
  1. Activación por defecto: los presets de baja visión y daltonismo (`lowVision`, `protanopia`, `deuteranopia`, `tritanopia`) ahora incluyen `redundantCoding: true` según WCAG 1.4.1.
  2. Control visible en el banco de pruebas: se agregó casilla explícita de `Estados redundantes (icono/patrón/texto)` en el panel y se ejecuta `apply()` automáticamente al cargar.
  3. Tramas y formas geométricas reales: micro-puntos blancos repetidos para 'aprobado' (círculo), líneas horizontales para 'pendiente' (rombo/redondeado) y líneas diagonales a 45° para 'rechazado' (cuadrado), con `background-size` y `border-radius` explícitos.
  4. Build y compatibilidad: `harness.js` ahora se copia tanto a `dist/test-harness/` como a `test-harness/`, y se habilitó soporte de archivos locales (`file:///*`) en el manifiesto de la extensión. Pruebas 29/29 pasaron.
- 2026-11-09 23:41 – Corrección de reactividad desde el popup de la extensión:
  1. Comunicación directa por mensajería: `popup.ts` ahora invoca `applyToActiveTab()` enviando el mensaje `ocuadapt:apply` directamente al tab activo con auto-inyección de `content.js` si el tab estaba desconectado (permiso `scripting` agregado al manifiesto).
  2. Desacople con el panel del banco de pruebas: la página de prueba ahora inicia en estado neutro original (sin autoejecución de `harness.js` en carga) para que la extensión pueda transformar el DOM libremente sin solapamientos.
  3. Limpieza de huérfanos: `RedundantCoder.restore()` y `code()` ahora limpian automáticamente cualquier badge previo o huérfano para garantizar respuesta inmediata al marcar y desmarcar.
  4. Diagnóstico de páginas locales: si se usa en `file:///...`, el popup advierte si no se ha habilitado "Permitir acceso a URL de archivo" en Chrome. Build y pruebas 29/29 OK.
- 2026-11-09 23:48 – Redacción de la documentación técnica completa del Capítulo VII en `documentacion_cap7_OcuAdapt.md`, incluyendo todas las secciones requeridas (7.1 a 7.13), los 7 diagramas Mermaid (D1–D7) con texto alternativo APA 7 y la tabla comparativa detallada del stack tecnológico propuesto vs. el realmente utilizado.
- 2026-11-10 09:00 – Creación y verificación del archivo `.gitignore` para repositorio remoto:
  1. Exclusiones académicas confidenciales: exclusión estricta de `lineamientos_cap7_cap8_grupo2.md` y `propuesta_ideacion_grupo2_OcuAdapt.md` (y comodines correspondientes).
  2. Artefactos de desarrollo y distribución: exclusión de `node_modules/`, `dist/`, logs (`*.log`), cachés de pruebas (`coverage/`, `.vitest/`), configuraciones de IDEs y archivos de sistema operativo (`.DS_Store`, `Thumbs.db`).
  3. Verificación con Git: repositorio Git inicializado (`git init`) y verificado con `git check-ignore -v` y `git status -s`, confirmando que los archivos de lineamientos, propuesta, dependencias y dist quedan totalmente ignorados y protegidos para el commit inicial.
- 2026-11-10 09:30 – Diseño y construcción del mockup conceptual móvil OcuAdapt Lupa (RF-12 / M7):
  1. Simulador interactivo en navegador (`test-harness/mobile-mockup.html` y `dist/test-harness/mobile-mockup.html`): simulación de chasis móvil con dos pantallas clave: M7-A (visor de cámara con congelado Freeze Frame, flash, brackets ROI y filtros croma amarillo/negro a 18.5:1) y M7-B (texto reflujado OCR en Atkinson Hyperlegible al 250 %, reproductor TTS con Web Speech API real en español y banner crítico de seguridad farmacológica).
  2. Generación de mockups en alta resolución (`test-harness/mockups/mockup_lupa_camara.jpg` y `test-harness/mockups/mockup_lupa_ocr_tts.jpg`): imágenes conceptuales listas para insertar en el informe Word con normas APA 7.
  3. Actualización de documentación: sección 7.8.4 y Tabla 7.10 en `documentacion_cap7_OcuAdapt.md` ampliadas con especificación UI/UX, ergonomía táctil (48x48 dp) y contrastes fotométricos WCAG 2.2 AAA.
- 2026-11-10 09:45 – Creación del mockup del widget institucional OcuAdapt (<ocuadapt-widget>, M8 / RF-11):
  1. Entorno de mockup institucional (`test-harness/widget-mockup.html` y `dist/test-harness/widget-mockup.html`): simulación de portal web de EsSalud (Hospital Nacional Ramiro Prialé Prialé de Huancayo) con el botón flotante accesible (FAB de 54x54 px con WCAG 2.5.5) y panel desplegable integrado con controles fotométricos en vivo.
  2. Barra de asistencia para captura: botones superiores para alternar entre "Panel Abierto" (M8 principal), "Solo Botón Flotante" y "Portal con Alto Contraste", con función para ocultar controles y permitir la captura de pantalla limpia para el informe de Word.
  3. Sincronización en build: empaquetado automático en `build.mjs`, actualización de la Tabla 7.10 en `documentacion_cap7_OcuAdapt.md` y verificación de pruebas (29/29 OK).
- 2026-11-10 10:15 – Creación de `README.md` profesional para distribución pública del repositorio:
  1. Guía de instalación paso a paso para usuarios y evaluadores mediante carga de extensión descomprimida en navegadores Chromium (Chrome, Edge, Brave) y activación de permisos de archivo local.
  2. Documentación detallada de los controles del panel popup y su correspondencia con criterios de conformidad WCAG 2.2 AA y AAA.
  3. Instrucciones de uso del banco de pruebas local (`test-harness/`), guía técnica para desarrolladores (npm scripts, arquitectura modular en TypeScript puro), tabla de criterios de accesibilidad y avisos legales, éticos y de licenciamiento (MIT y SIL OFL).




