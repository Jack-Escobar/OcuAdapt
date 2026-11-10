# OcuAdapt · Adaptación Visual y Accesibilidad Web del Lado del Usuario

<p align="center">
  <img src="https://img.shields.io/badge/Versi%C3%B3n-0.1.0-blue?style=for-the-badge" alt="Versión">
  <img src="https://img.shields.io/badge/Manifest-V3-success?style=for-the-badge" alt="Manifest V3">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/WCAG-2.2%20AA%20%2F%20AAA-orange?style=for-the-badge" alt="WCAG 2.2">
  <img src="https://img.shields.io/badge/Tests-29%20passed-brightgreen?style=for-the-badge" alt="Tests">
  <img src="https://img.shields.io/badge/Licencia-MIT-lightgrey?style=for-the-badge" alt="Licencia MIT">
</p>

---

## 👁️ Acerca de OcuAdapt

**OcuAdapt** es una solución tecnológica de accesibilidad digital y visión asistida diseñada para devolver la autonomía a personas con **baja visión** (agudeza visual reducida, sensibilidad al contraste disminuida, fotofobia) y **discromatopsias** (daltonismo: protanopia, deuteranopia y tritanopia) al interactuar con portales web institucionales y gubernamentales.

Desarrollada como proyecto de investigación aplicada en la **Universidad Nacional del Centro del Perú (UNCP)** para la asignatura *Discapacidad y Accesibilidad (IS066B)*, toma como caso de estudio la atención al asegurado en el **Hospital Nacional Ramiro Prialé Prialé de EsSalud (Huancayo)**.

### Principios Fundamentales de Diseño
* **Remediación del lado del usuario (*Client-Side*):** Transforma el DOM en tiempo de ejecución sin requerir alteraciones en los servidores del portal anfitrión.
* **Privacidad estricta (*Local-First*):** Todos los perfiles, cálculos fotométricos y filtros se ejecutan localmente en el navegador. No se recopilan datos personales ni se transmiten historiales de navegación (cumplimiento Ley N.° 29733).
* **Transformación no destructiva:** Preserva los estilos y la funcionalidad original de la página mediante referencias débiles (`WeakMap`), permitiendo revertir los cambios de forma instantánea al desactivar la extensión o al pulsar *Restablecer*.
* **Permisos mínimos:** Funciona bajo el estándar **Manifest V3** de Chromium requiriendo únicamente permisos de almacenamiento (`storage`), pestaña activa (`activeTab`) e inyección bajo demanda (`scripting`).

---

## 📦 Componentes del Sistema

El ecosistema OcuAdapt se compone de cuatro entregables complementarios sustentados en un mismo núcleo modular en TypeScript (`src/core/`):

1. **Extensión Web Chromium (Manifest V3):** Popup completo con panel de control, perfiles rápidos, ajuste daltonismo con previsualización en vivo, corrección fotométrica de contraste, escalado fluido, anillo de foco, guía de lectura y codificación redundante.
2. **Web Component Institucional (`<ocuadapt-widget>`):** Script autónomo encapsulado en *Shadow DOM* que permite a cualquier entidad pública incorporar las herramientas de accesibilidad en su sitio web con una sola línea de código HTML.
3. **Módulo de Tamizaje Cromático (`dist/colortest/`):** Test orientativo de visión del color basado en 12 láminas policromáticas generadas algorítmicamente en Canvas 2D (PRNG Mulberry32), con clasificación de porcentaje y derivación a oftalmología.
4. **Banco de Pruebas y Mockups Conceptuales (`test-harness/`):**
   * `index.html`: Laboratorio interactivo para verificar la remediación de barreras WCAG (B1–B6).
   * `widget-mockup.html`: Simulación de alta fidelidad del widget operando sobre el portal de EsSalud (M8).
   * `mobile-mockup.html`: Prototipo interactivo conceptual de la aplicación móvil *OcuAdapt Lupa* con *Freeze Frame*, OCR local y síntesis de voz TTS (M7).

---

## 🚀 Guía de Instalación Rápida (Para Usuarios y Evaluadores)

No se requiere experiencia en programación para probar la extensión en cualquier navegador basado en Chromium (**Google Chrome**, **Microsoft Edge**, **Brave**, **Opera**).

### Paso 1: Descargar o clonar el proyecto
Si descargaste el archivo ZIP, descomprímelo en una carpeta de tu preferencia. Si usas Git:
```bash
git clone https://github.com/TU_USUARIO/OcuAdapt.git
cd OcuAdapt
```

### Paso 2: Habilitar el Modo Desarrollador en Chrome / Edge
1. Abre tu navegador y escribe en la barra de direcciones:
   * En Chrome: `chrome://extensions`
   * En Edge: `edge://extensions`
   * En Brave: `brave://extensions`
2. En la esquina superior derecha de la página, activa la casilla o interruptor **«Modo de desarrollador»** (*Developer mode*).

### Paso 3: Cargar la extensión en el navegador
1. Haz clic en el botón **«Cargar descomprimida»** (*Load unpacked*) ubicado en la barra superior izquierda.
2. En el explorador de archivos, navega hasta la carpeta del proyecto y selecciona la carpeta **`dist`** (la carpeta compilada que contiene el archivo `manifest.json`).
3. La extensión **OcuAdapt** aparecerá inmediatamente en la lista de extensiones instaladas con su versión y logotipo.

### Paso 4 (Importante para pruebas locales): Permitir acceso a archivos
Si planeas evaluar la extensión en páginas locales (`file:///...`) o en el banco de pruebas incluido:
1. En la tarjeta de OcuAdapt dentro de `chrome://extensions`, haz clic en **«Detalles»**.
2. Desplázate hacia abajo y activa el interruptor: **«Permitir acceso a URL de archivo»** (*Allow access to file URLs*).

---

## 🖥️ Cómo Utilizar la Extensión

1. **Fijar el icono:** En la esquina superior derecha del navegador, haz clic en el icono del rompecabezas (Extensiones) y fija el icono de **OcuAdapt** en tu barra de herramientas.
2. **Abrir el panel:** Navega a cualquier página web (o abre el banco de pruebas local) y haz clic en el icono de OcuAdapt para abrir el popup flotante.

### Funcionalidades del Panel de Control

| Sección | Control | Función y Beneficio de Accesibilidad | Criterio WCAG 2.2 |
|---|---|---|---|
| **Perfil Rápido** | Menú desplegable | Aplica con un solo clic configuraciones preestablecidas optimizadas: *Baja Visión*, *Daltonismo Protanopia*, *Deuteranopia*, *Tritanopia* o *Alto Contraste Invertido*. | 1.4.3, 1.4.1 |
| **Visión del Color** | Menú + Slider de Intensidad | Activa la matriz de simulación/daltonización LMS (*ChromaVision Engine* basada en Machado et al., 2009) con slider de $0\%$ a $100\%$ y muestras de color en vivo para calibración. | 1.4.1 |
| **Contraste Adaptativo** | Selector de Modo | • **Desactivado:** Mantiene el diseño original.<br>• **Reforzado AA:** Ajusta automáticamente el color de texto mediante búsqueda binaria de luminancia relativa para garantizar una razón $\ge 4.5:1$.<br>• **Alto Contraste Invertido:** Fondo negro profundo (`#000000`) con textos amarillos de máxima visibilidad (`#FFD400`, razón $21.0:1$). | 1.4.3, 1.4.6 |
| **Escala de Texto** | Slider (100% a 200%) | Amplía proporcionalmente el tamaño de fuente en todo el documento sin romper la maquetación. | 1.4.4 |
| **Espaciado Adaptativo** | Casilla de verificación | Aplica espaciado tipográfico mejorado: interlineado $1.5\times$, espacio entre párrafos $2\times$ y entre palabras $0.16\times$ (según WCAG 1.4.12). | 1.4.12 |
| **Tipografía Accesible** | Selector de Fuente | Reemplaza las fuentes nativas por familias de alta legibilidad empaquetadas localmente: **Atkinson Hyperlegible** (distinción inequívoca de caracteres homogéneos: `1, I, l` o `0, O`) o **Inter**. | 1.4.4 |
| **Anillo de Foco Reforzado** | Casilla de verificación | Dibuja un indicador de foco visible de $3\text{ px}$ amarillo con borde exterior negro de $2\text{ px}$ al navegar con la tecla `Tab`, garantizando que nunca quede tapado. | 2.4.7, 2.4.11 |
| **Guía de Lectura** | Casilla de verificación | Despliega una franja horizontal translúcida (máscara de lectura) que sigue dinámicamente el cursor o el foco del teclado, aislando la línea de texto actual para reducir la fatiga visual. | 2.4.7 |
| **Estados Redundantes** | Casilla de verificación | Transforma semáforos o turnos que dependen únicamente del color añadiendo **formas geométricas diferenciadas** (círculo, rombo, cuadrado), **tramas y patrones CSS** (puntos, rayas, diagonales) y **etiquetas textuales** (`[✔ Aprobado]`, `[▲ Pendiente]`, `[✖ Rechazado]`). | 1.4.1 |
| **Tamizaje de Daltonismo** | Botón «Hacer test» | Abre la herramienta de 12 láminas Canvas con diagnóstico orientativo y recomendación de derivación médica. | 1.4.1 |
| **Exclusión de Sitio** | Casilla «Desactivar en este sitio» | Guarda el dominio actual en una lista negra local para respetar portales que ya posean accesibilidad certificada en origen. | 2.1.1 |
| **Auditoría Rápida** | Botón «Auditar contraste» | Escanea el DOM y muestra el número exacto de elementos en la página que incumplen la razón de contraste mínima de $4.5:1$. | 1.4.3 |

---

## 🧪 Demostración con el Banco de Pruebas Local

Para verificar el funcionamiento de todas las características sin necesidad de conectarse a internet:

1. Abre en tu navegador Chrome el archivo:
   ```
   dist/test-harness/index.html
   ```
2. Observa las distintas secciones de barreras comunes:
   * **Sección B1 y B2:** Textos en gris claro con bajo contraste ($2.65:1$ y $2.94:1$).
   * **Sección B3:** Formulario de inicio de sesión con contenedor rígido que oculta botones al ampliar.
   * **Sección B4:** Enlaces sin indicador visible de foco al presionar la tecla `Tab`.
   * **Sección B6:** Semáforo de citas médicas que solo usa círculos de color (rojo/amarillo/verde).
3. Abre la extensión OcuAdapt desde la barra superior y selecciona el preset **«Baja Visión»** o activa individualmente los controles.
4. Observa cómo el texto gris se vuelve inmediatamente nítido, los estados de turno adoptan patrones e iconos geométricos, el foco se ilumina en amarillo brillante y el texto se amplía fluidamente con la tipografía *Atkinson Hyperlegible*.

### Otros Prototipos Incluidos
* **Demo del Widget Institucional:** Abre `dist/test-harness/widget-demo.html` para probar la etiqueta `<ocuadapt-widget>`.
* **Mockup Portal EsSalud (M8):** Abre `dist/test-harness/widget-mockup.html` para visualizar el portal hospitalario con el botón flotante de accesibilidad y su panel interactivo desplegado.
* **Mockup Móvil OcuAdapt Lupa (M7):** Abre `dist/test-harness/mobile-mockup.html` para explorar el concepto móvil con congelado de cámara (*Freeze Frame*), filtros croma y lectura asistida en voz alta por síntesis de voz (*Web Speech API*).

---

## 🛠️ Guía para Desarrolladores

Si deseas compilar el proyecto desde el código fuente TypeScript, extender sus capacidades o ejecutar las pruebas unitarias:

### Requisitos
* **Node.js** v18.0.0 o superior (recomendado v20+ o v24 LTS).
* **npm** v9+ o superior.

### Instalación de dependencias
```bash
npm install
```

### Comandos de desarrollo

| Comando | Acción |
|---|---|
| `npm run typecheck` | Ejecuta la verificación de tipos con `tsc --noEmit` sobre todo el proyecto sin generar archivos. |
| `npm test` | Ejecuta la suite de 29 pruebas unitarias automatizadas con **Vitest** en entorno JSDOM simulado. |
| `npm run build` | Ejecuta el script `build.mjs`, compila TypeScript con **esbuild** y empaqueta la extensión, el widget, las fuentes OFL y el banco de pruebas en el directorio `dist/`. |

### Estructura del Código Fuente
```
OcuAdapt/
├── src/
│   ├── core/                  # Núcleo independiente de la plataforma (TypeScript puro)
│   │   ├── types.ts           # Definiciones de perfiles visuales, contrastes y presets
│   │   ├── color.ts           # Algoritmos WCAG: luminancia relativa y búsqueda binaria de contraste
│   │   ├── chroma.ts          # Motor ChromaVision (matrices LMS Machado et al. y filtros SVG)
│   │   ├── dom.ts             # DomAdapter: manipulación no destructiva con WeakMap
│   │   ├── redundant.ts       # RedundantCoder: patrones CSS, iconos SVG y formas geométricas
│   │   ├── readingMask.ts     # Máscara de lectura con Closed Shadow DOM y requestAnimationFrame
│   │   ├── colortest.ts       # Generador determinista de láminas Canvas 2D (PRNG Mulberry32)
│   │   ├── styles.ts          # Inyección dinámica de CSS (fuentes, foco, espaciado)
│   │   ├── i18n.ts            # Diccionarios de idioma (es-PE y en)
│   │   ├── profile.ts         # Validación, sanitización y persistencia de perfiles
│   │   └── adapter.ts         # Orquestador central con MutationObserver para SPAs
│   ├── extension/             # Extensión Chromium Manifest V3
│   │   ├── manifest.json      # Declaración del manifiesto (MV3)
│   │   ├── background.ts      # Service Worker de inicialización
│   │   ├── content.ts         # Script de contenido con escucha reactiva
│   │   ├── storage.ts         # Adaptador para chrome.storage.local
│   │   ├── popup/             # Interfaz gráfica del popup (HTML, CSS, TypeScript)
│   │   └── colortest/         # Interfaz de la prueba de daltonismo
│   └── widget/                # Web Component institucional (<ocuadapt-widget>)
│       └── index.ts           # Web Component encapsulado en Shadow DOM
├── test-harness/              # Banco de pruebas y mockups de evaluación
│   ├── index.html             # Laboratorio de verificación de barreras B1 a B6
│   ├── widget-mockup.html     # Mockup del portal hospitalario de EsSalud con widget (M8)
│   ├── mobile-mockup.html     # Mockup del prototipo móvil OcuAdapt Lupa (M7)
│   └── mockups/               # Capturas gráficas en alta resolución
├── tests/                     # Suite de pruebas unitarias
│   ├── core.test.ts           # 17 pruebas fotométricas, de contraste y daltonismo (MVP-0)
│   └── mvp1.test.ts           # 12 pruebas de redundancia, exclusión y consistencia (MVP-1)
├── dist/                      # Salida del empaquetado lista para producción
├── build.mjs                  # Pipeline de empaquetado con esbuild
├── package.json               # Configuración del paquete y scripts
├── tsconfig.json              # Configuración del compilador TypeScript
└── documentacion_cap7_OcuAdapt.md # Documentación técnica completa (Capítulo VII)
```

---

## ♿ Resumen de Criterios WCAG 2.2 Atendidos

| Criterio | Nombre | Nivel | Implementación en OcuAdapt |
|---|---|---|---|
| **1.4.1** | *Use of Color* | A | Codificación redundante: combina color con símbolos SVG y tramas geométricas distintivas en estados semafóricos. |
| **1.4.3** | *Contrast (Minimum)* | AA | Elevación algorítmica de texto de bajo contraste hasta alcanzar la razón mínima de $\ge 4.5:1$. |
| **1.4.4** | *Resize Text* | AA | Escalado fluido hasta el $200\%$ con relajación de contenedores rígidos (`overflow: visible`) para evitar recorte de botones. |
| **1.4.6** | *Contrast (Enhanced)* | AAA | Modo invertido de alto contraste que proporciona una razón superior a $21.0:1$ (amarillo `#FFD400` sobre negro `#000000`). |
| **1.4.12** | *Text Spacing* | AA | Inyección de estilos de espaciado adaptativo (líneas $1.5\times$, párrafos $2\times$, palabras $0.16\times$). |
| **2.1.1** | *Keyboard* | A | Todas las funciones de la extensión, el widget y los tests son operables íntegramente mediante el teclado. |
| **2.4.7** | *Focus Visible* | AA | Anillo de foco reforzado de $3\text{ px}$ amarillo con doble borde negro visible al pulsar la tecla `Tab`. |
| **2.4.11** | *Focus Not Obscured* | AA | El anillo de foco reforzado se posiciona con margen exterior evitando que el indicador sea ocultado por elementos contiguos. |
| **2.5.5 / 2.5.8** | *Target Size* | AA / AAA | Zonas táctiles en el popup, widget y mockups con dimensiones mínimas de $48\times 48\text{ dp}$ / $54\text{ px}$. |

---

## ⚖️ Aviso Legal, Privacidad y Licencia

1. **Naturaleza de la solución:** OcuAdapt es una herramienta de remediación del lado del cliente (*client-side*). La activación de esta extensión mejora la experiencia visual del usuario, pero **no certifica** la conformidad formal de un sitio web frente a las directrices WCAG ni exime a las instituciones de subsanar las barreras de accesibilidad en su código fuente original.
2. **Aviso no clínico:** El test orientativo de visión del color incluido en la herramienta tiene un propósito exclusivamente educativo y de pre-calibración de la extensión. No constituye un examen oftalmológico formal ni sustituye la evaluación clínica realizada por un especialista médico.
3. **Privacidad:** No se almacena ni transmite ningún dato identificable del usuario. La configuración se conserva únicamente en el almacenamiento local del navegador (`chrome.storage.local` y `localStorage`).
4. **Licencia de software:** Distribuido bajo la **Licencia MIT**. Puedes utilizar, modificar y distribuir libremente este software para fines académicos, personales o institucionales.
5. **Licencias de fuentes:** Las fuentes *Atkinson Hyperlegible* (Braille Institute) e *Inter* (Rasmus Andersson) se distribuyen bajo la licencia libre **SIL Open Font License 1.1** y se encuentran empaquetadas localmente para permitir su funcionamiento autónomo sin conexión a internet.
