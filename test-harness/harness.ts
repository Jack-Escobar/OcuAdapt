/** Banco de pruebas: aplica el núcleo directamente y mide T1–T4 sobre las barreras replicadas. */
import {
  Adapter,
  DEFAULT_PROFILE,
  PRESETS,
  applyMatrixToRgb,
  auditContrast,
  contrastRatio,
  getCorrectionMatrix,
  getSimulationMatrix,
  parseColor,
  type ContrastAudit,
  type VisualProfile,
} from '../src/core';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const adapter = new Adapter(document, { fontBaseUrl: './' });
const baseline: ContrastAudit = auditContrast(document);

function profileFor(key: string, mask: boolean, redundant: boolean): VisualProfile {
  const base = { ...DEFAULT_PROFILE, readingMask: mask, redundantCoding: redundant };
  switch (key) {
    case 'inverted':
      return { ...base, contrast: 'inverted' };
    case 'redundant':
      return { ...base, redundantCoding: true };
    case 'all':
      return { ...base, contrast: 'aa', textScale: 200, textSpacing: true, focusRing: true, colorVision: 'deuteranopia', redundantCoding: true };
    default:
      return { ...base, ...(PRESETS[key] ?? {}), readingMask: mask, redundantCoding: redundant } as VisualProfile;
  }
}

let current: VisualProfile = profileFor('normal', false, false);

function apply(): void {
  const preset = $<HTMLSelectElement>('p-preset').value;
  const mask = $<HTMLInputElement>('p-mask').checked;
  const redundant = $<HTMLInputElement>('p-redundant').checked;
  current = profileFor(preset, mask, redundant);
  adapter.apply(current);
}

function sampleRatio(selector: string): number {
  const e = document.querySelector(selector) as HTMLElement;
  const fg = parseColor(getComputedStyle(e).color)!;
  let bgEl: HTMLElement | null = e;
  let bg = parseColor('rgb(255,255,255)')!;
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

const row = (cells: string[]) => `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
const pf = (ok: boolean) => (ok ? '<span class="ok-t">Cumple</span>' : '<span class="bad-t">No cumple</span>');
const sw = (c: { r: number; g: number; b: number }) => `<span class="sw" style="background:rgb(${c.r},${c.g},${c.b})"></span>`;
const dist = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) =>
  Math.round(Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b));

function measure(): void {
  const now = auditContrast(document);
  const rows: string[] = [];

  // T1 – contraste
  const r1 = sampleRatio('.b1-text');
  const r2 = sampleRatio('.b2-text');
  rows.push(row(['T1', 'Textos con contraste insuficiente (antes → ahora)', `${baseline.failing} → ${now.failing} de ${now.checked}`, pf(now.failing === 0)]));
  rows.push(row(['T1', 'Razón B1 (.b1-text)', r1.toFixed(2) + ':1', pf(r1 >= 4.5)]));
  rows.push(row(['T1', 'Razón B2 (.b2-text)', r2.toFixed(2) + ':1', pf(r2 >= 4.5)]));

  // T2 – formulario alcanzable
  const box = document.querySelector('.fixed-form') as HTMLElement;
  const btn = $('entrar').getBoundingClientRect();
  const boxR = box.getBoundingClientRect();
  const clipped = getComputedStyle(box).overflow !== 'visible' && (btn.bottom > boxR.bottom || btn.right > boxR.right);
  rows.push(row(['T2', 'Botón «Ingresar» visible (no recortado por el contenedor)', clipped ? 'recortado' : 'visible', pf(!clipped)]));

  // T3 – foco
  const hasRule = !!document.getElementById('ocuadapt-style')?.textContent?.includes(':focus-visible');
  rows.push(row(['T3', 'Regla de foco reforzado inyectada (confirmar visualmente con Tab)', hasRule ? 'sí' : 'no', pf(hasRule)]));

  // T4 – prueba «sin color»: cada estado debe tener icono/etiqueta propios
  const states = document.querySelectorAll('#b6 [data-state]').length;
  const badges = document.querySelectorAll('#b6 [data-ocuadapt-badge]');
  const labelled = Array.from(badges).filter((b) => (b.textContent ?? '').trim().length > 0 && b.querySelector('svg')).length;
  rows.push(row(['T4', 'Estados con icono + texto (prueba «sin color»)', `${labelled} de ${states}`, pf(states > 0 && labelled === states)]));

  // T4 – discriminación bajo simulación (deuteranopia)
  const sim = getSimulationMatrix('deuteranopia', 100);
  const cor = getCorrectionMatrix(current.colorVision === 'normal' ? 'deuteranopia' : current.colorVision, current.colorVision === 'normal' ? 100 : current.intensity);
  const green = { r: 0, g: 160, b: 74 };
  const red = { r: 208, g: 32, b: 32 };
  const sGreen = applyMatrixToRgb(sim, green);
  const sRed = applyMatrixToRgb(sim, red);
  const cGreen = applyMatrixToRgb(sim, applyMatrixToRgb(cor, green));
  const cRed = applyMatrixToRgb(sim, applyMatrixToRgb(cor, red));
  rows.push(
    row(['T4', `Verde/rojo vistos con deuteranopia SIN corrección ${sw(sGreen)}${sw(sRed)}`, `distancia ${dist(sGreen, sRed)}`, '—']),
  );
  rows.push(
    row(['T4', `Verde/rojo vistos con deuteranopia CON corrección ${sw(cGreen)}${sw(cRed)}`, `distancia ${dist(cGreen, cRed)}`, pf(dist(cGreen, cRed) > dist(sGreen, sRed))]),
  );

  $('results').innerHTML =
    `<p>Perfil aplicado: <strong>${$<HTMLSelectElement>('p-preset').selectedOptions[0]?.text}</strong>. ` +
    `Indeterminados (fondo con imagen): ${now.indeterminate}.</p>` +
    `<table><caption>Resultados de verificación</caption><thead><tr><th scope="col">Prueba</th><th scope="col">Medición</th><th scope="col">Valor</th><th scope="col">Estado</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

$<HTMLSelectElement>('p-preset').addEventListener('change', () => {
  const val = $<HTMLSelectElement>('p-preset').value;
  const chk = $<HTMLInputElement>('p-redundant');
  if (chk) chk.checked = val !== 'normal';
  apply();
});
$<HTMLInputElement>('p-redundant').addEventListener('change', apply);
$<HTMLInputElement>('p-mask').addEventListener('change', apply);

$('b-apply').addEventListener('click', apply);
$('b-reset').addEventListener('click', () => {
  $<HTMLSelectElement>('p-preset').value = 'normal';
  $<HTMLInputElement>('p-redundant').checked = false;
  $<HTMLInputElement>('p-mask').checked = false;
  adapter.reset();
  current = profileFor('normal', false, false);
});
$('b-measure').addEventListener('click', measure);
