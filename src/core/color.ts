/** Utilidades de color y contraste según WCAG 2.x (luminancia relativa y razón de contraste). */

export interface RGB {
  r: number; // 0–255
  g: number;
  b: number;
}
export interface RGBA extends RGB {
  a: number; // 0–1
}

export function srgbToLinear(c8: number): number {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
}

export function relativeLuminance(c: RGB): number {
  return 0.2126 * srgbToLinear(c.r) + 0.7152 * srgbToLinear(c.g) + 0.0722 * srgbToLinear(c.b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Interpreta `rgb()`/`rgba()` (formato de getComputedStyle) y `#rrggbb`/`#rgb`. */
export function parseColor(input: string): RGBA | null {
  const s = input.trim().toLowerCase();
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  let m = s.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  if (m) {
    let a = 1;
    if (m[4] !== undefined) a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1]!, g: +m[2]!, b: +m[3]!, a };
  }
  m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (m) {
    let h = m[1]!;
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  return null;
}

export function toCss(c: RGB): string {
  return `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;
}

/** Compone un color con alfa sobre un fondo opaco. */
export function compositeOver(fg: RGBA, bg: RGB): RGB {
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
  };
}

function mix(c: RGB, target: number, t: number): RGB {
  // Se redondea a enteros de 8 bits: lo que se mide es lo que realmente se pintará.
  return {
    r: Math.round(c.r + (target - c.r) * t),
    g: Math.round(c.g + (target - c.g) * t),
    b: Math.round(c.b + (target - c.b) * t),
  };
}

/** Busca el menor t en [0,1] tal que mix(c→target) alcanza la razón objetivo; null si no es posible. */
function minMix(fg: RGB, bg: RGB, target: number, to: number): { t: number; color: RGB } | null {
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

/**
 * Devuelve el color de primer plano más cercano (mezcla hacia negro o blanco, conservando el matiz
 * tanto como sea posible) que cumple la razón de contraste `target` sobre `bg`.
 * Si ya cumple, devuelve el mismo color. Si ninguno de los extremos alcanza el objetivo,
 * devuelve el extremo con mayor razón (mejor esfuerzo).
 */
export function adjustForeground(fg: RGB, bg: RGB, target: number): RGB {
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

/** WCAG 1.4.3: texto grande >= 24px, o >= 18.66px en negrita. */
export function isLargeText(fontSizePx: number, fontWeight: number): boolean {
  return fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700);
}
