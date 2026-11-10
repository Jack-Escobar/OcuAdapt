// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  Adapter,
  DEFAULT_PROFILE,
  RedundantCoder,
  buildPlates,
  classifyColor,
  classifyKeyword,
  isCorrect,
  isSiteExcluded,
  sanitizeProfile,
  scoreTest,
  type Answer,
} from '../src/core';

describe('clasificación de estados', () => {
  it('por palabra clave (es/en, con tildes)', () => {
    expect(classifyKeyword('aprobado')).toBe('ok');
    expect(classifyKeyword('Pendiente')).toBe('warn');
    expect(classifyKeyword('RECHAZADO')).toBe('bad');
    expect(classifyKeyword('status-ámbar')).toBe('warn');
    expect(classifyKeyword('zzz')).toBeNull();
  });
  it('por color de respaldo', () => {
    expect(classifyColor({ r: 0, g: 160, b: 74 })).toBe('ok');
    expect(classifyColor({ r: 230, g: 160, b: 0 })).toBe('warn');
    expect(classifyColor({ r: 208, g: 32, b: 32 })).toBe('bad');
    expect(classifyColor({ r: 128, g: 128, b: 128 })).toBeNull();
    expect(classifyColor({ r: 30, g: 60, b: 200 })).toBeNull();
  });
});

describe('codificación redundante en DOM', () => {
  function setup() {
    document.head.innerHTML = '';
    document.body.innerHTML =
      '<ul><li><span id="a" data-state="aprobado" style="background:#00a04a"></span></li>' +
      '<li><span id="b" data-state="rechazado" style="background:#d02020"></span></li>' +
      '<li><span id="c" data-status="x" style="background:#d02020">Texto</span></li>' +
      '<li><span id="d" data-state="otro"></span></li></ul>';
  }
  it('añade icono+texto y patrón, y se revierte', () => {
    setup();
    const ad = new Adapter(document, { observe: false });
    ad.apply({ ...DEFAULT_PROFILE, redundantCoding: true });
    const badges = document.querySelectorAll('[data-ocuadapt-badge]');
    expect(badges).toHaveLength(3); // a, b y c (c por color de respaldo); d sin estado
    expect(document.querySelector('#a + [data-ocuadapt-badge]')?.textContent).toBe('Aprobado');
    expect(document.querySelector('#a + [data-ocuadapt-badge] svg')).not.toBeNull();
    expect((document.getElementById('b') as HTMLElement).style.backgroundImage).toContain('repeating-linear-gradient');
    // elemento con texto propio: no se duplica la etiqueta
    expect(document.querySelector('#c + [data-ocuadapt-badge]')?.textContent).toBe('');
    ad.reset();
    expect(document.querySelectorAll('[data-ocuadapt-badge]')).toHaveLength(0);
    expect((document.getElementById('b') as HTMLElement).style.backgroundImage).not.toContain('gradient');
  });
  it('no duplica al ejecutarse dos veces', () => {
    setup();
    const c = new RedundantCoder(document);
    c.run('es');
    c.run('es');
    expect(c.count).toBe(3);
  });
});

describe('sitios excluidos', () => {
  it('coincide con dominio y subdominios', () => {
    expect(isSiteExcluded('www.essalud.gob.pe', ['essalud.gob.pe'])).toBe(true);
    expect(isSiteExcluded('essalud.gob.pe', ['essalud.gob.pe'])).toBe(true);
    expect(isSiteExcluded('malessalud.gob.pe', ['essalud.gob.pe'])).toBe(false);
  });
  it('sanitize filtra entradas inválidas y duplicados', () => {
    const p = sanitizeProfile({ excludedSites: ['A.com', 'a.com', '<script>', 5] });
    expect(p.excludedSites).toEqual(['a.com']);
  });
});

describe('test de visión del color', () => {
  const plates = buildPlates();
  const ans = (fn: (i: number) => boolean): Answer[] =>
    plates.map((p, i) => (fn(i) ? { value: String(p.answer), none: false } : { value: '', none: true }));
  it('12 láminas, 2 de control, respuestas únicas', () => {
    expect(plates).toHaveLength(12);
    expect(plates.filter((p) => p.kind === 'control')).toHaveLength(2);
    expect(new Set(plates.map((p) => p.answer)).size).toBe(12);
  });
  it('todo correcto → sin hallazgo', () => expect(scoreTest(plates, ans(() => true)).outcome).toBe('none'));
  it('solo controles correctos → probable', () =>
    expect(scoreTest(plates, ans((i) => plates[i]!.kind === 'control')).outcome).toBe('probable'));
  it('falla un control → control-failed', () => {
    const firstControl = plates.findIndex((p) => p.kind === 'control');
    expect(scoreTest(plates, ans((i) => i !== firstControl)).outcome).toBe('control-failed');
  });
  it('resultado intermedio → inconclusive', () => {
    let k = 0;
    const r = scoreTest(plates, ans((i) => plates[i]!.kind === 'control' || k++ < 7));
    expect(r.outcome).toBe('inconclusive');
  });
  it('isCorrect ignora espacios y respuestas «ninguno»', () => {
    const p = plates[0]!;
    expect(isCorrect(p, { value: ` ${p.answer} `, none: false })).toBe(true);
    expect(isCorrect(p, { value: String(p.answer), none: true })).toBe(false);
    expect(isCorrect(p, undefined)).toBe(false);
  });
});
