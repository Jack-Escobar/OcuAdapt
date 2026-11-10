/**
 * ChromaVision Engine.
 * Simulación (Machado et al., 2009, severidad 1.0) y daltonización por redistribución del error
 * (I + M·(I − S)), todo en RGB lineal. La matriz resultante es 3×3 y se aplica con
 * <feColorMatrix color-interpolation-filters="linearRGB">.
 * Mejora la discriminación de ciertos pares de colores; NO restablece la visión del color.
 */
import { linearToSrgb, srgbToLinear, type RGB } from './color';
import type { ColorVision } from './types';

export type Matrix3 = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
];

export const IDENTITY: Matrix3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/** Matrices de simulación (Machado, Oliveira y Fernandes, 2009), severidad 1.0, RGB lineal. */
const SIMULATION: Record<Exclude<ColorVision, 'normal'>, Matrix3> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/** Matriz que traslada el error perdido hacia canales que la persona sí percibe. */
const ERROR_SHIFT: Record<Exclude<ColorVision, 'normal'>, Matrix3> = {
  protanopia: [
    [0, 0, 0],
    [0.7, 1, 0],
    [0.7, 0, 1],
  ],
  deuteranopia: [
    [0, 0, 0],
    [0.7, 1, 0],
    [0.7, 0, 1],
  ],
  tritanopia: [
    [1, 0, 0.7],
    [0, 1, 0.7],
    [0, 0, 0],
  ],
};

export function mul(a: Matrix3, b: Matrix3): Matrix3 {
  const r = (i: number, j: number) =>
    a[i]![0]! * b[0]![j]! + a[i]![1]! * b[1]![j]! + a[i]![2]! * b[2]![j]!;
  return [
    [r(0, 0), r(0, 1), r(0, 2)],
    [r(1, 0), r(1, 1), r(1, 2)],
    [r(2, 0), r(2, 1), r(2, 2)],
  ];
}

function add(a: Matrix3, b: Matrix3, kb = 1): Matrix3 {
  const f = (i: number, j: number) => a[i]![j]! + kb * b[i]![j]!;
  return [
    [f(0, 0), f(0, 1), f(0, 2)],
    [f(1, 0), f(1, 1), f(1, 2)],
    [f(2, 0), f(2, 1), f(2, 2)],
  ];
}

/** Mezcla lineal entre identidad y m según t (0–1). */
function blend(m: Matrix3, t: number): Matrix3 {
  return add(IDENTITY, add(m, IDENTITY, -1), t);
}

/** Matriz que simula cómo ve una persona con el déficit (para vista previa/pruebas). */
export function getSimulationMatrix(type: ColorVision, intensity: number): Matrix3 {
  if (type === 'normal') return IDENTITY;
  return blend(SIMULATION[type], clamp01(intensity / 100));
}

/** Matriz de corrección (daltonización): C = I + M·(I − S); se atenúa con la intensidad. */
export function getCorrectionMatrix(type: ColorVision, intensity: number): Matrix3 {
  if (type === 'normal') return IDENTITY;
  const s = SIMULATION[type];
  const m = ERROR_SHIFT[type];
  const c = add(IDENTITY, mul(m, add(IDENTITY, s, -1)));
  return blend(c, clamp01(intensity / 100));
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** Cadena `values` de feColorMatrix (4×5) a partir de una matriz 3×3. */
export function toFeColorMatrixValues(m: Matrix3): string {
  const row = (i: number) => `${fmt(m[i]![0]!)} ${fmt(m[i]![1]!)} ${fmt(m[i]![2]!)} 0 0`;
  return `${row(0)} ${row(1)} ${row(2)} 0 0 0 1 0`;
}
const fmt = (n: number) => (Math.round(n * 1e5) / 1e5).toString();

/** Aplica una matriz 3×3 a un color sRGB (vía RGB lineal); útil para vistas previas. */
export function applyMatrixToRgb(m: Matrix3, c: RGB): RGB {
  const v = [srgbToLinear(c.r), srgbToLinear(c.g), srgbToLinear(c.b)];
  const o = m.map((row) => row[0]! * v[0]! + row[1]! * v[1]! + row[2]! * v[2]!);
  return { r: linearToSrgb(o[0]!), g: linearToSrgb(o[1]!), b: linearToSrgb(o[2]!) };
}

export const SVG_NS = 'http://www.w3.org/2000/svg';

/** Crea el <svg> oculto con el filtro; se referencia con `filter: url(#id)`. */
export function buildFilterSvg(doc: Document, id: string, m: Matrix3): SVGSVGElement {
  const svg = doc.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none');
  const filter = doc.createElementNS(SVG_NS, 'filter');
  filter.setAttribute('id', id);
  filter.setAttribute('color-interpolation-filters', 'linearRGB');
  const fe = doc.createElementNS(SVG_NS, 'feColorMatrix');
  fe.setAttribute('type', 'matrix');
  fe.setAttribute('values', toFeColorMatrixValues(m));
  filter.appendChild(fe);
  svg.appendChild(filter);
  return svg;
}
