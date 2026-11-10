"use strict";
(() => {
  // src/core/types.ts
  var DEFAULT_PROFILE = {
    version: 1,
    enabled: true,
    colorVision: "normal",
    intensity: 100,
    contrast: "off",
    textScale: 100,
    textSpacing: false,
    font: "default",
    focusRing: false,
    readingMask: false,
    redundantCoding: false,
    excludedSites: [],
    language: "es"
  };
  var PRESETS = {
    normal: {},
    lowVision: {
      contrast: "aa",
      textScale: 150,
      textSpacing: true,
      font: "atkinson",
      focusRing: true,
      readingMask: false,
      redundantCoding: true
    },
    protanopia: { colorVision: "protanopia", intensity: 100, redundantCoding: true },
    deuteranopia: { colorVision: "deuteranopia", intensity: 100, redundantCoding: true },
    tritanopia: { colorVision: "tritanopia", intensity: 100, redundantCoding: true }
  };

  // src/core/profile.ts
  function isIdentity(p) {
    return !p.enabled || p.colorVision === "normal" && p.contrast === "off" && p.textScale === 100 && !p.textSpacing && p.font === "default" && !p.focusRing && !p.readingMask && !p.redundantCoding;
  }

  // src/core/color.ts
  function srgbToLinear(c8) {
    const c = c8 / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function linearToSrgb(c) {
    const v = c <= 31308e-7 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255);
  }
  function relativeLuminance(c) {
    return 0.2126 * srgbToLinear(c.r) + 0.7152 * srgbToLinear(c.g) + 0.0722 * srgbToLinear(c.b);
  }
  function contrastRatio(a, b) {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
  }
  function parseColor(input) {
    const s = input.trim().toLowerCase();
    if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
    let m = s.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
    if (m) {
      let a = 1;
      if (m[4] !== void 0) a = m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      return { r: +m[1], g: +m[2], b: +m[3], a };
    }
    m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
    if (m) {
      let h = m[1];
      if (h.length === 3) h = h.split("").map((x) => x + x).join("");
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
    }
    return null;
  }
  function toCss(c) {
    return `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;
  }
  function compositeOver(fg, bg) {
    return {
      r: fg.r * fg.a + bg.r * (1 - fg.a),
      g: fg.g * fg.a + bg.g * (1 - fg.a),
      b: fg.b * fg.a + bg.b * (1 - fg.a)
    };
  }
  function mix(c, target, t2) {
    return {
      r: Math.round(c.r + (target - c.r) * t2),
      g: Math.round(c.g + (target - c.g) * t2),
      b: Math.round(c.b + (target - c.b) * t2)
    };
  }
  function minMix(fg, bg, target, to) {
    if (contrastRatio(mix(fg, to, 1), bg) < target) return null;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (contrastRatio(mix(fg, to, mid), bg) >= target) hi = mid;
      else lo = mid;
    }
    return { t: hi, color: mix(fg, to, hi) };
  }
  function adjustForeground(fg, bg, target) {
    if (contrastRatio(fg, bg) >= target) return fg;
    const dark = minMix(fg, bg, target, 0);
    const light = minMix(fg, bg, target, 255);
    if (dark && light) return dark.t <= light.t ? dark.color : light.color;
    if (dark) return dark.color;
    if (light) return light.color;
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };
    return contrastRatio(black, bg) >= contrastRatio(white, bg) ? black : white;
  }
  function isLargeText(fontSizePx, fontWeight) {
    return fontSizePx >= 24 || fontSizePx >= 18.66 && fontWeight >= 700;
  }

  // src/core/chroma.ts
  var IDENTITY = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];
  var SIMULATION = {
    protanopia: [
      [0.152286, 1.052583, -0.204868],
      [0.114503, 0.786281, 0.099216],
      [-3882e-6, -0.048116, 1.051998]
    ],
    deuteranopia: [
      [0.367322, 0.860646, -0.227968],
      [0.280085, 0.672501, 0.047413],
      [-0.01182, 0.04294, 0.968881]
    ],
    tritanopia: [
      [1.255528, -0.076749, -0.178779],
      [-0.078411, 0.930809, 0.147602],
      [4733e-6, 0.691367, 0.3039]
    ]
  };
  var ERROR_SHIFT = {
    protanopia: [
      [0, 0, 0],
      [0.7, 1, 0],
      [0.7, 0, 1]
    ],
    deuteranopia: [
      [0, 0, 0],
      [0.7, 1, 0],
      [0.7, 0, 1]
    ],
    tritanopia: [
      [1, 0, 0.7],
      [0, 1, 0.7],
      [0, 0, 0]
    ]
  };
  function mul(a, b) {
    const r = (i, j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
    return [
      [r(0, 0), r(0, 1), r(0, 2)],
      [r(1, 0), r(1, 1), r(1, 2)],
      [r(2, 0), r(2, 1), r(2, 2)]
    ];
  }
  function add(a, b, kb = 1) {
    const f = (i, j) => a[i][j] + kb * b[i][j];
    return [
      [f(0, 0), f(0, 1), f(0, 2)],
      [f(1, 0), f(1, 1), f(1, 2)],
      [f(2, 0), f(2, 1), f(2, 2)]
    ];
  }
  function blend(m, t2) {
    return add(IDENTITY, add(m, IDENTITY, -1), t2);
  }
  function getSimulationMatrix(type, intensity) {
    if (type === "normal") return IDENTITY;
    return blend(SIMULATION[type], clamp01(intensity / 100));
  }
  function getCorrectionMatrix(type, intensity) {
    if (type === "normal") return IDENTITY;
    const s = SIMULATION[type];
    const m = ERROR_SHIFT[type];
    const c = add(IDENTITY, mul(m, add(IDENTITY, s, -1)));
    return blend(c, clamp01(intensity / 100));
  }
  function clamp01(x) {
    return Math.min(1, Math.max(0, x));
  }
  function toFeColorMatrixValues(m) {
    const row2 = (i) => `${fmt(m[i][0])} ${fmt(m[i][1])} ${fmt(m[i][2])} 0 0`;
    return `${row2(0)} ${row2(1)} ${row2(2)} 0 0 0 1 0`;
  }
  var fmt = (n) => (Math.round(n * 1e5) / 1e5).toString();
  function applyMatrixToRgb(m, c) {
    const v = [srgbToLinear(c.r), srgbToLinear(c.g), srgbToLinear(c.b)];
    const o = m.map((row2) => row2[0] * v[0] + row2[1] * v[1] + row2[2] * v[2]);
    return { r: linearToSrgb(o[0]), g: linearToSrgb(o[1]), b: linearToSrgb(o[2]) };
  }
  var SVG_NS = "http://www.w3.org/2000/svg";
  function buildFilterSvg(doc, id, m) {
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none");
    const filter = doc.createElementNS(SVG_NS, "filter");
    filter.setAttribute("id", id);
    filter.setAttribute("color-interpolation-filters", "linearRGB");
    const fe = doc.createElementNS(SVG_NS, "feColorMatrix");
    fe.setAttribute("type", "matrix");
    fe.setAttribute("values", toFeColorMatrixValues(m));
    filter.appendChild(fe);
    svg.appendChild(filter);
    return svg;
  }

  // src/core/styles.ts
  var FONT_STACK = {
    atkinson: '"Atkinson Hyperlegible", "Segoe UI", Arial, sans-serif',
    inter: '"Inter", "Segoe UI", Arial, sans-serif'
  };
  function fontFaces(base) {
    const face = (family, file, weight) => `@font-face{font-family:"${family}";font-weight:${weight};font-style:normal;font-display:swap;src:url("${base}${file}") format("woff2");}`;
    return [
      face("Atkinson Hyperlegible", "atkinson-hyperlegible-latin-400-normal.woff2", 400),
      face("Atkinson Hyperlegible", "atkinson-hyperlegible-latin-700-normal.woff2", 700),
      face("Inter", "inter-latin-400-normal.woff2", 400),
      face("Inter", "inter-latin-700-normal.woff2", 700)
    ].join("\n");
  }
  function buildStyles(p, o) {
    const css = [];
    if (p.font !== "default" && o.fontBaseUrl) css.push(fontFaces(o.fontBaseUrl));
    if (p.colorVision !== "normal" && p.intensity > 0) {
      css.push(`html{filter:url(#${o.filterId}) !important;}`);
    }
    if (p.font !== "default") {
      css.push(`html, body, body *:not(svg):not(svg *):not(code):not(pre):not(kbd):not(samp):not(i[class]){font-family:${FONT_STACK[p.font]} !important;}`);
    }
    if (p.textSpacing) {
      css.push(
        `body, body *{line-height:1.5 !important;letter-spacing:0.12em !important;word-spacing:0.16em !important;}body p{margin-bottom:2em !important;}`
      );
    }
    if (p.contrast === "inverted") {
      css.push(
        `html{background:#000 !important;color-scheme:dark;}body, body *:not(img):not(video):not(canvas):not(svg):not(svg *):not(picture){background-color:#000 !important;background-image:none !important;color:#fff !important;border-color:#fff !important;text-shadow:none !important;box-shadow:none !important;}body a, body a *{color:#ffff00 !important;text-decoration:underline !important;}body a:visited, body a:visited *{color:#ff9cff !important;}body button, body input, body select, body textarea{border:2px solid #fff !important;}`
      );
    }
    if (p.focusRing) {
      css.push(
        `:focus-visible{outline:3px solid #ffd400 !important;outline-offset:2px !important;box-shadow:0 0 0 2px #000 !important;}html{scroll-padding-top:6rem;scroll-padding-bottom:6rem;}`
      );
    }
    return css.join("\n");
  }

  // src/core/dom.ts
  var SKIP_TAGS = /* @__PURE__ */ new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "CANVAS", "VIDEO", "AUDIO", "IFRAME", "OBJECT", "HEAD", "META", "LINK", "TEMPLATE"]);
  var HOST_ATTR = "data-ocuadapt";
  var WHITE = { r: 255, g: 255, b: 255 };
  function hasOwnText(el) {
    for (const n of Array.from(el.childNodes)) {
      if (n.nodeType === 3 && (n.nodeValue ?? "").trim().length > 0) return true;
    }
    return false;
  }
  function isHidden(cs) {
    return cs.display === "none" || cs.visibility === "hidden";
  }
  function effectiveBackground(el) {
    const view = el.ownerDocument.defaultView;
    if (!view) return WHITE;
    const layers = [];
    let cur = el;
    while (cur) {
      const cs = view.getComputedStyle(cur);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      const bg = parseColor(cs.backgroundColor);
      if (bg && bg.a > 0) {
        layers.push(bg);
        if (bg.a >= 1) break;
      }
      cur = cur.parentElement;
    }
    let base = WHITE;
    for (let i = layers.length - 1; i >= 0; i--) base = compositeOver(layers[i], base);
    return base;
  }
  var DomAdapter = class {
    constructor(root) {
      this.root = root;
    }
    saved = /* @__PURE__ */ new WeakMap();
    touched = /* @__PURE__ */ new Set();
    processed = /* @__PURE__ */ new WeakSet();
    /** Aplica contraste y escala a todo el documento (o a un subárbol nuevo). */
    run(opts, subtree) {
      const scope = subtree ?? this.root.body;
      if (!scope) return;
      const elements = [scope, ...Array.from(scope.querySelectorAll("*"))];
      for (const el of elements) {
        if (!(el instanceof (this.root.defaultView?.HTMLElement ?? HTMLElement))) continue;
        this.processElement(el, opts);
      }
      if (opts.textScale > 100) this.relaxClipping(elements);
    }
    /**
     * Mitigación parcial de 1.4.4/1.4.10: si al ampliar el texto un contenedor con overflow oculto
     * recorta su contenido, se muestra el desbordamiento. No repara diseños rotos de origen.
     */
    relaxClipping(elements) {
      const view = this.root.defaultView;
      if (!view) return;
      for (const el of elements) {
        if (!(el instanceof view.HTMLElement) || SKIP_TAGS.has(el.tagName.toUpperCase()) || el.closest(`[${HOST_ATTR}]`)) continue;
        if (el === this.root.body || el === this.root.documentElement) continue;
        const cs = view.getComputedStyle(el);
        const clips = (v) => v === "hidden" || v === "clip";
        if (!(clips(cs.overflowX) || clips(cs.overflowY))) continue;
        if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) {
          this.setProp(el, "overflow", "visible");
        }
      }
    }
    processElement(el, opts) {
      if (SKIP_TAGS.has(el.tagName.toUpperCase()) || el.closest(`[${HOST_ATTR}]`)) return;
      if (this.processed.has(el) || !hasOwnText(el)) return;
      const view = this.root.defaultView;
      if (!view) return;
      const cs = view.getComputedStyle(el);
      if (isHidden(cs)) return;
      this.processed.add(el);
      if (opts.textScale > 100) {
        const size = parseFloat(cs.fontSize);
        if (Number.isFinite(size) && size > 0) {
          this.setProp(el, "font-size", `${size * opts.textScale / 100}px`);
        }
      }
      if (opts.contrastTarget > 0) {
        const fgRaw = parseColor(cs.color);
        const bg = effectiveBackground(el);
        if (!fgRaw || !bg) return;
        const fg = compositeOver(fgRaw, bg);
        const weight = parseInt(cs.fontWeight, 10) || (cs.fontWeight === "bold" ? 700 : 400);
        const large = isLargeText(parseFloat(cs.fontSize), weight);
        const target = large ? Math.min(3, opts.contrastTarget) : opts.contrastTarget;
        const fixed = adjustForeground(fg, bg, target);
        if (fixed !== fg) this.setProp(el, "color", toCss(fixed));
      }
    }
    setProp(el, prop, value) {
      let list = this.saved.get(el);
      if (!list) {
        list = [];
        this.saved.set(el, list);
        this.touched.add(new WeakRef(el));
      }
      if (!list.some((s) => s.prop === prop)) {
        list.push({ prop, value: el.style.getPropertyValue(prop), priority: el.style.getPropertyPriority(prop) });
      }
      el.style.setProperty(prop, value, "important");
    }
    /** Revierte todas las modificaciones y olvida el estado procesado. */
    restore() {
      for (const ref of this.touched) {
        const el = ref.deref();
        if (!el) continue;
        for (const s of this.saved.get(el) ?? []) {
          if (s.value) el.style.setProperty(s.prop, s.value, s.priority);
          else el.style.removeProperty(s.prop);
        }
        if (el.getAttribute("style") === "") el.removeAttribute("style");
        this.saved.delete(el);
      }
      this.touched.clear();
      this.processed = /* @__PURE__ */ new WeakSet();
    }
  };
  function auditContrast(doc) {
    const out = { checked: 0, failing: 0, indeterminate: 0 };
    const view = doc.defaultView;
    if (!view || !doc.body) return out;
    const all = [doc.body, ...Array.from(doc.body.querySelectorAll("*"))];
    for (const el of all) {
      if (SKIP_TAGS.has(el.tagName.toUpperCase()) || el.closest(`[${HOST_ATTR}]`) || !hasOwnText(el)) continue;
      const cs = view.getComputedStyle(el);
      if (isHidden(cs)) continue;
      const bg = effectiveBackground(el);
      const fgRaw = parseColor(cs.color);
      if (!bg || !fgRaw) {
        out.indeterminate++;
        continue;
      }
      out.checked++;
      const weight = parseInt(cs.fontWeight, 10) || (cs.fontWeight === "bold" ? 700 : 400);
      const min = isLargeText(parseFloat(cs.fontSize), weight) ? 3 : 4.5;
      if (contrastRatio(compositeOver(fgRaw, bg), bg) < min) out.failing++;
    }
    return out;
  }

  // src/core/readingMask.ts
  var BAND_PX = 96;
  var ReadingMask = class {
    constructor(doc) {
      this.doc = doc;
    }
    host = null;
    top = null;
    bottom = null;
    y = 0;
    raf = 0;
    onMove = (e) => this.moveTo(e.clientY);
    onFocus = (e) => {
      const t2 = e.target;
      if (t2 instanceof (this.doc.defaultView?.Element ?? Element)) {
        const r = t2.getBoundingClientRect();
        this.moveTo(r.top + r.height / 2);
      }
    };
    enable() {
      if (this.host) return;
      const host = this.doc.createElement("div");
      host.setAttribute(HOST_ATTR, "reading-mask");
      host.setAttribute("aria-hidden", "true");
      host.style.cssText = "position:fixed;inset:0;z-index:2147483646;pointer-events:none;";
      const root = host.attachShadow({ mode: "closed" });
      const style = this.doc.createElement("style");
      style.textContent = ".m{position:fixed;left:0;right:0;background:rgba(0,0,0,.72);pointer-events:none}.t{top:0}.b{bottom:0}";
      this.top = this.doc.createElement("div");
      this.top.className = "m t";
      this.bottom = this.doc.createElement("div");
      this.bottom.className = "m b";
      root.append(style, this.top, this.bottom);
      this.doc.documentElement.appendChild(host);
      this.host = host;
      this.doc.addEventListener("mousemove", this.onMove, { passive: true });
      this.doc.addEventListener("focusin", this.onFocus);
      this.moveTo((this.doc.defaultView?.innerHeight ?? 600) / 2);
    }
    moveTo(y) {
      this.y = y;
      if (this.raf) return;
      const win = this.doc.defaultView;
      const paint = () => {
        this.raf = 0;
        const vh = win?.innerHeight ?? 600;
        const topH = Math.max(0, this.y - BAND_PX / 2);
        const bottomH = Math.max(0, vh - (this.y + BAND_PX / 2));
        if (this.top) this.top.style.height = `${topH}px`;
        if (this.bottom) this.bottom.style.height = `${bottomH}px`;
      };
      if (win?.requestAnimationFrame) this.raf = win.requestAnimationFrame(paint);
      else paint();
    }
    disable() {
      this.doc.removeEventListener("mousemove", this.onMove);
      this.doc.removeEventListener("focusin", this.onFocus);
      this.host?.remove();
      this.host = this.top = this.bottom = null;
      this.raf = 0;
    }
    get active() {
      return this.host !== null;
    }
  };

  // src/core/i18n.ts
  var es = {
    title: "OcuAdapt",
    subtitle: "Adaptaci\xF3n visual en tu navegador",
    enabled: "Activar adaptaciones en esta p\xE1gina",
    presets: "Perfil r\xE1pido",
    preset_normal: "Visi\xF3n normal",
    preset_lowVision: "Baja visi\xF3n",
    preset_protanopia: "Protanopia",
    preset_deuteranopia: "Deuteranopia",
    preset_tritanopia: "Tritanopia",
    colorVision: "Visi\xF3n del color",
    cv_normal: "Sin correcci\xF3n",
    cv_protanopia: "Protanopia (rojo)",
    cv_deuteranopia: "Deuteranopia (verde)",
    cv_tritanopia: "Tritanopia (azul)",
    intensity: "Intensidad de correcci\xF3n",
    contrast: "Contraste",
    ct_off: "Original",
    ct_aa: "Corregir a 4,5:1 (AA)",
    ct_inverted: "Alto contraste invertido (\u2265 7:1)",
    textScale: "Tama\xF1o del texto",
    textSpacing: "Espaciado de texto ampliado",
    font: "Tipograf\xEDa",
    ft_default: "Original del sitio",
    ft_atkinson: "Atkinson Hyperlegible",
    ft_inter: "Inter",
    focusRing: "Foco visible reforzado",
    readingMask: "Gu\xEDa de lectura",
    language: "Idioma",
    reset: "Restablecer",
    audit: "Medir contraste de esta p\xE1gina",
    audit_result: "Textos evaluados: {checked}. Con contraste insuficiente: {failing}. No medibles (imagen de fondo): {indeterminate}.",
    audit_error: "No se pudo medir en esta p\xE1gina (por ejemplo, p\xE1ginas internas del navegador).",
    preview: "Vista previa de colores (original \u2192 corregido)",
    note: "Mitiga en tu navegador; no certifica que el sitio cumpla WCAG ni restablece la visi\xF3n del color.",
    green: "Aprobado",
    amber: "Pendiente",
    red: "Rechazado",
    state_ok: "Aprobado",
    state_warn: "Pendiente",
    state_bad: "Rechazado",
    redundantCoding: "Estados con icono, patr\xF3n y texto (no solo color)",
    excludeSite: "Desactivar en este sitio",
    excludeSite_on: "Desactivado en {host}",
    colorTest: "Test orientativo de visi\xF3n del color",
    open: "Abrir ajustes de accesibilidad visual",
    close: "Cerrar",
    ct_title: "Test orientativo de visi\xF3n del color",
    ct_disclaimer: "Este test es solo una orientaci\xF3n. No es un diagn\xF3stico m\xE9dico: si tiene dudas, consulte a un profesional de la salud visual (optometr\xEDa u oftalmolog\xEDa). El resultado depende de su pantalla y de la luz del ambiente; use brillo medio y evite filtros de color o el modo nocturno.",
    ct_intro: "Ver\xE1 {n} l\xE1minas de puntos. En cada una puede haber un n\xFAmero de dos cifras. Escr\xEDbalo, o marque que no ve ninguno. No hay l\xEDmite de tiempo.",
    ct_start: "Comenzar",
    ct_plate: "L\xE1mina {i} de {n}",
    ct_alt: "L\xE1mina de puntos de colores que puede contener un n\xFAmero de dos cifras",
    ct_answer: "N\xFAmero que ve",
    ct_none: "No veo ning\xFAn n\xFAmero",
    ct_next: "Siguiente",
    ct_finish: "Ver resultado",
    ct_manual: "Prefiero elegir mi perfil manualmente (sin hacer el test)",
    ct_result: "Resultado orientativo",
    ct_res_none: "Sin hallazgo: respondi\xF3 correctamente la mayor\xEDa de l\xE1minas de tamizaje.",
    ct_res_probable: "Probable dificultad para distinguir rojo y verde (protano/deuteranomal\xEDa). Este test no puede determinar el tipo exacto ni la severidad; la tritanopia no se eval\xFAa en un test corto.",
    ct_res_inconclusive: "No concluyente: repita el test con mejores condiciones de pantalla y luz, o elija su perfil manualmente.",
    ct_res_control: "No concluyente: no se identificaron las l\xE1minas de control. Revise brillo, filtros de pantalla y vuelva a intentar.",
    ct_refer: "Consulte a un profesional de la salud visual para una evaluaci\xF3n formal.",
    ct_apply: "Aplicar perfil sugerido",
    ct_apply_as: "Correcci\xF3n a aplicar",
    ct_applied: "Perfil aplicado. Puede cambiarlo en el panel de OcuAdapt.",
    ct_retry: "Repetir test",
    ct_score: "L\xE1minas de tamizaje acertadas: {ok} de {total}.",
    w_label: "Ajustes de accesibilidad visual"
  };
  var en = {
    title: "OcuAdapt",
    subtitle: "Visual adaptation in your browser",
    enabled: "Enable adaptations on this page",
    presets: "Quick profile",
    preset_normal: "Typical vision",
    preset_lowVision: "Low vision",
    preset_protanopia: "Protanopia",
    preset_deuteranopia: "Deuteranopia",
    preset_tritanopia: "Tritanopia",
    colorVision: "Color vision",
    cv_normal: "No correction",
    cv_protanopia: "Protanopia (red)",
    cv_deuteranopia: "Deuteranopia (green)",
    cv_tritanopia: "Tritanopia (blue)",
    intensity: "Correction intensity",
    contrast: "Contrast",
    ct_off: "Original",
    ct_aa: "Fix to 4.5:1 (AA)",
    ct_inverted: "Inverted high contrast (\u2265 7:1)",
    textScale: "Text size",
    textSpacing: "Increased text spacing",
    font: "Typeface",
    ft_default: "Site default",
    ft_atkinson: "Atkinson Hyperlegible",
    ft_inter: "Inter",
    focusRing: "Enhanced visible focus",
    readingMask: "Reading guide",
    language: "Language",
    reset: "Reset",
    audit: "Measure this page contrast",
    audit_result: "Text items checked: {checked}. Insufficient contrast: {failing}. Not measurable (background image): {indeterminate}.",
    audit_error: "Could not measure on this page (e.g. browser internal pages).",
    preview: "Color preview (original \u2192 corrected)",
    note: "Mitigates in your browser; it does not certify site WCAG conformance nor restore color vision.",
    green: "Approved",
    amber: "Pending",
    red: "Rejected",
    state_ok: "Approved",
    state_warn: "Pending",
    state_bad: "Rejected",
    redundantCoding: "Status with icon, pattern and text (not color only)",
    excludeSite: "Disable on this site",
    excludeSite_on: "Disabled on {host}",
    colorTest: "Color vision screening (guidance only)",
    open: "Open visual accessibility settings",
    close: "Close",
    ct_title: "Color vision screening (guidance only)",
    ct_disclaimer: "This test is guidance only. It is not a medical diagnosis: if in doubt, consult an eye-care professional (optometrist or ophthalmologist). Results depend on your screen and room light; use medium brightness and avoid color filters or night mode.",
    ct_intro: "You will see {n} plates of dots. Each may contain a two-digit number. Type it, or tick that you see none. There is no time limit.",
    ct_start: "Start",
    ct_plate: "Plate {i} of {n}",
    ct_alt: "Plate of colored dots that may contain a two-digit number",
    ct_answer: "Number you see",
    ct_none: "I see no number",
    ct_next: "Next",
    ct_finish: "See result",
    ct_manual: "I prefer to choose my profile manually (skip the test)",
    ct_result: "Guidance result",
    ct_res_none: "No finding: most screening plates were answered correctly.",
    ct_res_probable: "Probable difficulty telling red and green apart (protan/deutan). This test cannot determine the exact type or severity; tritanopia is not assessed by a short test.",
    ct_res_inconclusive: "Inconclusive: repeat the test with better screen and light conditions, or choose your profile manually.",
    ct_res_control: "Inconclusive: control plates were not identified. Check brightness and screen filters and try again.",
    ct_refer: "Consult an eye-care professional for a formal assessment.",
    ct_apply: "Apply suggested profile",
    ct_apply_as: "Correction to apply",
    ct_applied: "Profile applied. You can change it in the OcuAdapt panel.",
    ct_retry: "Repeat test",
    ct_score: "Screening plates correct: {ok} of {total}.",
    w_label: "Visual accessibility settings"
  };
  var DICTS = { es, en };
  function t(lang, key, vars = {}) {
    const raw = DICTS[lang][key] ?? DICTS.es[key] ?? key;
    return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
  }

  // src/core/redundant.ts
  var DEFAULT_RULE_SELECTOR = "[data-state],[data-status],[data-estado]";
  var STATE_ATTRS = ["data-state", "data-status", "data-estado"];
  var BADGE_ATTR = "data-ocuadapt-badge";
  var KEYWORDS = {
    ok: ["ok", "aprobado", "aprobada", "approved", "success", "verde", "green", "activo", "completado", "done", "pass", "atendido"],
    warn: ["warn", "warning", "pendiente", "pending", "ambar", "amber", "espera", "wait", "proceso", "yellow", "amarillo"],
    bad: ["bad", "error", "rechazado", "rechazada", "rejected", "danger", "fail", "rojo", "red", "denegado", "inactivo"]
  };
  function normalize(s) {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function classifyKeyword(value) {
    const tokens = normalize(value).split(/[^a-z]+/).filter(Boolean);
    for (const state of ["bad", "warn", "ok"]) {
      if (tokens.some((tok) => KEYWORDS[state].includes(tok))) return state;
    }
    return null;
  }
  function classifyColor(c) {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) return null;
    const s = d / (1 - Math.abs(2 * l - 1));
    if (s < 0.35 || l < 0.15 || l > 0.85) return null;
    let h;
    if (max === r) h = (g - b) / d % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    if (h <= 15 || h >= 340) return "bad";
    if (h >= 25 && h <= 70) return "warn";
    if (h >= 80 && h <= 170) return "ok";
    return null;
  }
  var PATTERN = {
    ok: {
      image: "radial-gradient(circle, rgba(255,255,255,0.95) 1.5px, transparent 1.8px)",
      size: "5px 5px",
      repeat: "repeat",
      borderRadius: "50%"
    },
    warn: {
      image: "repeating-linear-gradient(0deg, rgba(0,0,0,0.75) 0px, rgba(0,0,0,0.75) 2px, transparent 2px, transparent 5px)",
      size: "100% 5px",
      repeat: "repeat",
      borderRadius: "3px"
    },
    bad: {
      image: "repeating-linear-gradient(45deg, rgba(0,0,0,0.8) 0px, rgba(0,0,0,0.8) 2.5px, transparent 2.5px, transparent 6px)",
      size: "100% 100%",
      repeat: "repeat",
      borderRadius: "2px"
    }
  };
  var SVG_NS2 = "http://www.w3.org/2000/svg";
  function icon(doc, state) {
    const svg = doc.createElementNS(SVG_NS2, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.style.cssText = "flex-shrink:0;vertical-align:middle;";
    const mk = (tag, attrs) => {
      const n = doc.createElementNS(SVG_NS2, tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      svg.appendChild(n);
    };
    const common = { fill: "#fff", stroke: "#000", "stroke-width": "1.5" };
    if (state === "ok") {
      mk("circle", { cx: "8", cy: "8", r: "7", ...common });
      mk("path", { d: "M4.5 8.5l2.5 2.5 4.5-5", fill: "none", stroke: "#000", "stroke-width": "2" });
    } else if (state === "warn") {
      mk("path", { d: "M8 1.5L15 14H1z", ...common });
      mk("path", { d: "M8 6v4M8 11.5v1", fill: "none", stroke: "#000", "stroke-width": "2" });
    } else {
      mk("rect", { x: "1.5", y: "1.5", width: "13", height: "13", ...common });
      mk("path", { d: "M5 5l6 6M11 5l-6 6", fill: "none", stroke: "#000", "stroke-width": "2" });
    }
    return svg;
  }
  var RedundantCoder = class {
    constructor(doc, selector = DEFAULT_RULE_SELECTOR) {
      this.doc = doc;
      this.selector = selector;
    }
    applied = [];
    done = /* @__PURE__ */ new WeakSet();
    /** Devuelve el estado de un elemento (atributo → color de respaldo). */
    stateOf(el) {
      for (const a of STATE_ATTRS) {
        const v = el.getAttribute(a);
        if (v) {
          const s = classifyKeyword(v);
          if (s) return s;
        }
      }
      const view = this.doc.defaultView;
      if (!view) return null;
      const bg = parseColor(view.getComputedStyle(el).backgroundColor);
      return bg && bg.a > 0 ? classifyColor(bg) : null;
    }
    run(lang, scope = this.doc) {
      const view = this.doc.defaultView;
      if (!view) return 0;
      const found = [];
      if (scope instanceof view.Element && scope.matches(this.selector)) found.push(scope);
      found.push(...Array.from(scope.querySelectorAll(this.selector)));
      let n = 0;
      for (const el of found) {
        if (!(el instanceof view.HTMLElement) || this.done.has(el) || el.closest(`[${HOST_ATTR}]`)) continue;
        this.done.add(el);
        const state = this.stateOf(el);
        if (!state) continue;
        this.code(el, state, lang);
        n++;
      }
      return n;
    }
    code(el, state, lang) {
      if (el.nextElementSibling?.hasAttribute(BADGE_ATTR)) {
        el.nextElementSibling.remove();
      }
      const label = t(lang, `state_${state}`);
      const badge = this.doc.createElement("span");
      badge.setAttribute(BADGE_ATTR, state);
      badge.setAttribute(HOST_ATTR, "badge");
      badge.style.cssText = "display:inline-flex;align-items:center;gap:5px;margin:0 8px 0 4px;padding:1px 6px;vertical-align:middle;font:700 0.85em/1.3 Arial,sans-serif;color:#000;background:#fff;border:2px solid #000;border-radius:4px;letter-spacing:0;box-shadow:0 1px 2px rgba(0,0,0,0.15);";
      badge.appendChild(icon(this.doc, state));
      const hasText = (el.textContent ?? "").trim().length > 0;
      if (!hasText) badge.append(label);
      else badge.setAttribute("title", label);
      el.insertAdjacentElement("afterend", badge);
      const savedStyles = [];
      const setProp = (prop, val) => {
        savedStyles.push({
          prop,
          value: el.style.getPropertyValue(prop),
          priority: el.style.getPropertyPriority(prop)
        });
        el.style.setProperty(prop, val, "important");
      };
      const pat = PATTERN[state];
      if (pat) {
        setProp("background-image", pat.image);
        setProp("background-size", pat.size);
        setProp("background-repeat", pat.repeat);
        if (pat.borderRadius) setProp("border-radius", pat.borderRadius);
      }
      this.applied.push({ el, badge, savedStyles });
    }
    restore() {
      for (const a of this.applied) {
        a.badge.remove();
        for (const s of a.savedStyles) {
          if (s.value) a.el.style.setProperty(s.prop, s.value, s.priority);
          else a.el.style.removeProperty(s.prop);
        }
        if (a.el.getAttribute("style") === "") a.el.removeAttribute("style");
      }
      this.applied = [];
      this.done = /* @__PURE__ */ new WeakSet();
      const orphans = this.doc.querySelectorAll(`[${BADGE_ATTR}]`);
      orphans.forEach((b) => b.remove());
    }
    get count() {
      return this.applied.length;
    }
  };

  // src/core/adapter.ts
  var FILTER_ID = "ocuadapt-chroma";
  var STYLE_ID = "ocuadapt-style";
  var Adapter = class {
    constructor(doc, opts = {}) {
      this.doc = doc;
      this.opts = opts;
      this.dom = new DomAdapter(doc);
      this.mask = new ReadingMask(doc);
      this.coder = new RedundantCoder(doc);
    }
    dom;
    mask;
    coder;
    svg = null;
    style = null;
    observer = null;
    timer;
    profile = null;
    apply(profile) {
      this.reset();
      this.profile = profile;
      if (isIdentity(profile)) return;
      const doc = this.doc;
      if (profile.colorVision !== "normal" && profile.intensity > 0) {
        this.svg = buildFilterSvg(doc, FILTER_ID, getCorrectionMatrix(profile.colorVision, profile.intensity));
        this.svg.setAttribute(HOST_ATTR, "filter");
        doc.documentElement.appendChild(this.svg);
      }
      const css = buildStyles(profile, { filterId: FILTER_ID, fontBaseUrl: this.opts.fontBaseUrl });
      if (css) {
        const s = doc.createElement("style");
        s.id = STYLE_ID;
        s.setAttribute(HOST_ATTR, "style");
        s.textContent = css;
        (doc.head ?? doc.documentElement).appendChild(s);
        this.style = s;
      }
      this.runDom();
      if (profile.redundantCoding) this.coder.run(profile.language);
      const watch = profile.contrast === "aa" || profile.textScale > 100 || profile.redundantCoding;
      if (doc.body && this.opts.observe !== false && watch) {
        const View = doc.defaultView;
        if (View?.MutationObserver) {
          this.observer = new View.MutationObserver((records) => {
            clearTimeout(this.timer);
            this.timer = setTimeout(() => {
              for (const r of records) {
                r.addedNodes.forEach((n) => {
                  if (n.nodeType !== 1 || n.closest(`[${HOST_ATTR}]`)) return;
                  this.runDom(n);
                  if (profile.redundantCoding) this.coder.run(profile.language, n);
                });
              }
            }, 250);
          });
          this.observer.observe(doc.body, { childList: true, subtree: true });
        }
      }
      if (profile.readingMask) this.mask.enable();
    }
    runDom(subtree) {
      const p = this.profile;
      if (!p) return;
      this.dom.run(
        { contrastTarget: p.contrast === "aa" ? 4.5 : 0, textScale: p.textScale },
        subtree
      );
    }
    /** Restablece la página al estado original (botón «restablecer»). */
    reset() {
      this.observer?.disconnect();
      this.observer = null;
      clearTimeout(this.timer);
      this.dom.restore();
      this.coder.restore();
      this.mask.disable();
      this.svg?.remove();
      this.style?.remove();
      this.svg = null;
      this.style = null;
      this.profile = null;
    }
  };

  // test-harness/harness.ts
  var $ = (id) => document.getElementById(id);
  var adapter = new Adapter(document, { fontBaseUrl: "./" });
  var baseline = auditContrast(document);
  function profileFor(key, mask, redundant) {
    const base = { ...DEFAULT_PROFILE, readingMask: mask, redundantCoding: redundant };
    switch (key) {
      case "inverted":
        return { ...base, contrast: "inverted" };
      case "redundant":
        return { ...base, redundantCoding: true };
      case "all":
        return { ...base, contrast: "aa", textScale: 200, textSpacing: true, focusRing: true, colorVision: "deuteranopia", redundantCoding: true };
      default:
        return { ...base, ...PRESETS[key] ?? {}, readingMask: mask, redundantCoding: redundant };
    }
  }
  var current = profileFor("normal", false, false);
  function apply() {
    const preset = $("p-preset").value;
    const mask = $("p-mask").checked;
    const redundant = $("p-redundant").checked;
    current = profileFor(preset, mask, redundant);
    adapter.apply(current);
  }
  function sampleRatio(selector) {
    const e = document.querySelector(selector);
    const fg = parseColor(getComputedStyle(e).color);
    let bgEl = e;
    let bg = parseColor("rgb(255,255,255)");
    while (bgEl) {
      const c = parseColor(getComputedStyle(bgEl).backgroundColor);
      if (c && c.a > 0) {
        bg = c;
        break;
      }
      bgEl = bgEl.parentElement;
    }
    return contrastRatio(fg, bg);
  }
  var row = (cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
  var pf = (ok) => ok ? '<span class="ok-t">Cumple</span>' : '<span class="bad-t">No cumple</span>';
  var sw = (c) => `<span class="sw" style="background:rgb(${c.r},${c.g},${c.b})"></span>`;
  var dist = (a, b) => Math.round(Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b));
  function measure() {
    const now = auditContrast(document);
    const rows = [];
    const r1 = sampleRatio(".b1-text");
    const r2 = sampleRatio(".b2-text");
    rows.push(row(["T1", "Textos con contraste insuficiente (antes \u2192 ahora)", `${baseline.failing} \u2192 ${now.failing} de ${now.checked}`, pf(now.failing === 0)]));
    rows.push(row(["T1", "Raz\xF3n B1 (.b1-text)", r1.toFixed(2) + ":1", pf(r1 >= 4.5)]));
    rows.push(row(["T1", "Raz\xF3n B2 (.b2-text)", r2.toFixed(2) + ":1", pf(r2 >= 4.5)]));
    const box = document.querySelector(".fixed-form");
    const btn = $("entrar").getBoundingClientRect();
    const boxR = box.getBoundingClientRect();
    const clipped = getComputedStyle(box).overflow !== "visible" && (btn.bottom > boxR.bottom || btn.right > boxR.right);
    rows.push(row(["T2", "Bot\xF3n \xABIngresar\xBB visible (no recortado por el contenedor)", clipped ? "recortado" : "visible", pf(!clipped)]));
    const hasRule = !!document.getElementById("ocuadapt-style")?.textContent?.includes(":focus-visible");
    rows.push(row(["T3", "Regla de foco reforzado inyectada (confirmar visualmente con Tab)", hasRule ? "s\xED" : "no", pf(hasRule)]));
    const states = document.querySelectorAll("#b6 [data-state]").length;
    const badges = document.querySelectorAll("#b6 [data-ocuadapt-badge]");
    const labelled = Array.from(badges).filter((b) => (b.textContent ?? "").trim().length > 0 && b.querySelector("svg")).length;
    rows.push(row(["T4", "Estados con icono + texto (prueba \xABsin color\xBB)", `${labelled} de ${states}`, pf(states > 0 && labelled === states)]));
    const sim = getSimulationMatrix("deuteranopia", 100);
    const cor = getCorrectionMatrix(current.colorVision === "normal" ? "deuteranopia" : current.colorVision, current.colorVision === "normal" ? 100 : current.intensity);
    const green = { r: 0, g: 160, b: 74 };
    const red = { r: 208, g: 32, b: 32 };
    const sGreen = applyMatrixToRgb(sim, green);
    const sRed = applyMatrixToRgb(sim, red);
    const cGreen = applyMatrixToRgb(sim, applyMatrixToRgb(cor, green));
    const cRed = applyMatrixToRgb(sim, applyMatrixToRgb(cor, red));
    rows.push(
      row(["T4", `Verde/rojo vistos con deuteranopia SIN correcci\xF3n ${sw(sGreen)}${sw(sRed)}`, `distancia ${dist(sGreen, sRed)}`, "\u2014"])
    );
    rows.push(
      row(["T4", `Verde/rojo vistos con deuteranopia CON correcci\xF3n ${sw(cGreen)}${sw(cRed)}`, `distancia ${dist(cGreen, cRed)}`, pf(dist(cGreen, cRed) > dist(sGreen, sRed))])
    );
    $("results").innerHTML = `<p>Perfil aplicado: <strong>${$("p-preset").selectedOptions[0]?.text}</strong>. Indeterminados (fondo con imagen): ${now.indeterminate}.</p><table><caption>Resultados de verificaci\xF3n</caption><thead><tr><th scope="col">Prueba</th><th scope="col">Medici\xF3n</th><th scope="col">Valor</th><th scope="col">Estado</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
  }
  $("p-preset").addEventListener("change", () => {
    const val = $("p-preset").value;
    const chk = $("p-redundant");
    if (chk) chk.checked = val !== "normal";
    apply();
  });
  $("p-redundant").addEventListener("change", apply);
  $("p-mask").addEventListener("change", apply);
  $("b-apply").addEventListener("click", apply);
  $("b-reset").addEventListener("click", () => {
    $("p-preset").value = "normal";
    $("p-redundant").checked = false;
    $("p-mask").checked = false;
    adapter.reset();
    current = profileFor("normal", false, false);
  });
  $("b-measure").addEventListener("click", measure);
})();
