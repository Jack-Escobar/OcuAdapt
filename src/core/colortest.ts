/**
 * Test orientativo de visión del color (tamizaje). NO es diagnóstico.
 * Las láminas se generan algorítmicamente (círculos de tamaño aleatorio con paletas propias);
 * no reproducen láminas Ishihara ni de otros tests con derechos.
 */

export type PlateKind = 'control' | 'screening';

export interface Plate {
  kind: PlateKind;
  /** Número de dos cifras a identificar. */
  answer: number;
  seed: number;
  /** Paleta de la figura y del fondo (hex). */
  figure: string[];
  ground: string[];
}

/** Control: azul oscuro sobre amarillo claro (visible para visión roja/verde alterada). */
const CONTROL = {
  figure: ['#1f3a93', '#2b4fb8', '#17307a'],
  ground: ['#f2e08a', '#f6e9a6', '#ead66b', '#fbf0b8'],
};
/** Tamizaje: naranja/rojizo sobre verdes/oliva (confusión rojo-verde). */
const SCREEN = {
  figure: ['#e8743b', '#f0a35e', '#d9534f', '#e98a4a'],
  ground: ['#8fae4f', '#a7b86a', '#6f9a4a', '#b5c27a', '#9bb35c'],
};

const CONTROL_NUMBERS = [12, 35];
const SCREEN_NUMBERS = [29, 74, 45, 38, 16, 57, 83, 62, 94, 21];

export function buildPlates(baseSeed = 20261109): Plate[] {
  const plates: Plate[] = [];
  CONTROL_NUMBERS.forEach((n, i) => plates.push({ kind: 'control', answer: n, seed: baseSeed + i, ...CONTROL }));
  SCREEN_NUMBERS.forEach((n, i) => plates.push({ kind: 'screening', answer: n, seed: baseSeed + 100 + i, ...SCREEN }));
  // Orden: control, dos de tamizaje, control, resto (intercalado y determinista)
  const [c1, c2] = plates.slice(0, 2) as [Plate, Plate];
  const s = plates.slice(2);
  return [c1, ...s.slice(0, 5), c2, ...s.slice(5)];
}

export interface Answer {
  /** Texto escrito; vacío si marcó «no veo número». */
  value: string;
  none: boolean;
}

export type Outcome = 'none' | 'probable' | 'inconclusive' | 'control-failed';

export interface TestResult {
  outcome: Outcome;
  screeningCorrect: number;
  screeningTotal: number;
  controlCorrect: number;
  controlTotal: number;
}

export function isCorrect(plate: Plate, a: Answer | undefined): boolean {
  return !!a && !a.none && a.value.trim() === String(plate.answer);
}

/**
 * Regla (orientativa): si falla algún control → no concluyente.
 * ≥ 80 % de tamizaje acertado → sin hallazgo; ≤ 50 % → probable déficit rojo/verde; entre ambos → no concluyente.
 */
export function scoreTest(plates: Plate[], answers: (Answer | undefined)[]): TestResult {
  let sc = 0, st = 0, cc = 0, ct = 0;
  plates.forEach((p, i) => {
    const ok = isCorrect(p, answers[i]);
    if (p.kind === 'control') {
      ct++;
      if (ok) cc++;
    } else {
      st++;
      if (ok) sc++;
    }
  });
  let outcome: Outcome;
  if (cc < ct) outcome = 'control-failed';
  else if (sc / st >= 0.8) outcome = 'none';
  else if (sc / st <= 0.5) outcome = 'probable';
  else outcome = 'inconclusive';
  return { outcome, screeningCorrect: sc, screeningTotal: st, controlCorrect: cc, controlTotal: ct };
}

// ---------- Generación de la imagen (requiere canvas) ----------

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dibuja la lámina en un canvas cuadrado. */
export function renderPlate(canvas: HTMLCanvasElement, plate: Plate): void {
  const size = canvas.width;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  // Máscara del número
  const mask = document.createElement('canvas');
  mask.width = mask.height = size;
  const m = mask.getContext('2d', { willReadFrequently: true })!;
  m.fillStyle = '#000';
  m.fillRect(0, 0, size, size);
  m.fillStyle = '#fff';
  m.font = `900 ${Math.round(size * 0.62)}px Arial, Helvetica, sans-serif`;
  m.textAlign = 'center';
  m.textBaseline = 'middle';
  m.fillText(String(plate.answer), size / 2, size * 0.54);
  const data = m.getImageData(0, 0, size, size).data;
  const inFigure = (x: number, y: number) => data[(Math.round(y) * size + Math.round(x)) * 4]! > 128;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  const rand = rng(plate.seed);
  const pick = (arr: string[]) => arr[Math.floor(rand() * arr.length)]!;
  const placed: { x: number; y: number; r: number }[] = [];
  const cx = size / 2;
  const R = size / 2 - 2;
  for (let i = 0; i < 9000; i++) {
    const r = 3 + rand() * 6;
    const x = rand() * size;
    const y = rand() * size;
    if (Math.hypot(x - cx, y - cx) + r > R) continue;
    let ok = true;
    for (const p of placed) {
      if (Math.hypot(p.x - x, p.y - y) < p.r + r + 1) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    placed.push({ x, y, r });
    ctx.fillStyle = inFigure(x, y) ? pick(plate.figure) : pick(plate.ground);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
