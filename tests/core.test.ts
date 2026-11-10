// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  Adapter,
  DEFAULT_PROFILE,
  adjustForeground,
  applyMatrixToRgb,
  auditContrast,
  buildStyles,
  contrastRatio,
  getCorrectionMatrix,
  getSimulationMatrix,
  importProfile,
  isIdentity,
  parseColor,
  sanitizeProfile,
  t,
  toFeColorMatrixValues,
} from '../src/core';

const W = { r: 255, g: 255, b: 255 };
const K = { r: 0, g: 0, b: 0 };
const dist = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) =>
  Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);

describe('contraste WCAG', () => {
  it('negro/blanco = 21:1', () => expect(contrastRatio(K, W)).toBeCloseTo(21, 1));
  it('#999 sobre blanco ≈ 2,85:1', () => expect(contrastRatio({ r: 153, g: 153, b: 153 }, W)).toBeCloseTo(2.85, 1));
  it('rgb(159,159,159) sobre blanco ≈ 2,65:1 (hallazgo H3)', () =>
    expect(contrastRatio({ r: 159, g: 159, b: 159 }, W)).toBeCloseTo(2.65, 1));
  it('parseColor soporta rgb, rgba y hex', () => {
    expect(parseColor('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 });
    expect(parseColor('rgba(1, 2, 3, 0.5)')?.a).toBe(0.5);
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('foo')).toBeNull();
  });
  it('adjustForeground alcanza 4,5:1 y conserva el color si ya cumple', () => {
    const cases = [
      [{ r: 159, g: 159, b: 159 }, W],
      [{ r: 148, g: 148, b: 148 }, W],
      [{ r: 108, g: 122, b: 153 }, { r: 27, g: 42, b: 74 }],
      [{ r: 200, g: 120, b: 20 }, { r: 128, g: 128, b: 128 }],
    ] as const;
    for (const [fg, bg] of cases) {
      const fixed = adjustForeground(fg, bg, 4.5);
      expect(contrastRatio(fixed, bg)).toBeGreaterThanOrEqual(4.5);
    }
    expect(adjustForeground(K, W, 4.5)).toBe(K);
  });
});

describe('ChromaVision Engine', () => {
  it('normal e intensidad 0 son identidad', () => {
    expect(getCorrectionMatrix('normal', 100)[1]![1]).toBe(1);
    const m = getCorrectionMatrix('deuteranopia', 0);
    expect(m[0]![0]).toBeCloseTo(1);
    expect(m[0]![1]).toBeCloseTo(0);
  });
  it('simulación conserva el blanco', () => {
    for (const k of ['protanopia', 'deuteranopia', 'tritanopia'] as const) {
      const w = applyMatrixToRgb(getSimulationMatrix(k, 100), W);
      expect(Math.abs(w.r - 255) + Math.abs(w.g - 255) + Math.abs(w.b - 255)).toBeLessThan(6);
    }
  });
  it('feColorMatrix genera 20 valores', () => {
    expect(toFeColorMatrixValues(getCorrectionMatrix('protanopia', 100)).split(' ')).toHaveLength(20);
  });
  it('la corrección aumenta la distinción rojo/verde bajo simulación (protan y deután)', () => {
    const green = { r: 0, g: 160, b: 74 };
    const red = { r: 208, g: 32, b: 32 };
    for (const k of ['protanopia', 'deuteranopia'] as const) {
      const sim = getSimulationMatrix(k, 100);
      const cor = getCorrectionMatrix(k, 100);
      const before = dist(applyMatrixToRgb(sim, green), applyMatrixToRgb(sim, red));
      const after = dist(applyMatrixToRgb(sim, applyMatrixToRgb(cor, green)), applyMatrixToRgb(sim, applyMatrixToRgb(cor, red)));
      expect(after).toBeGreaterThan(before);
    }
  });
});

describe('perfil', () => {
  it('sanitize limita rangos y descarta valores inválidos', () => {
    const p = sanitizeProfile({ textScale: 999, intensity: -5, contrast: 'x', colorVision: 'tritanopia', font: 3 });
    expect(p.textScale).toBe(200);
    expect(p.intensity).toBe(0);
    expect(p.contrast).toBe('off');
    expect(p.colorVision).toBe('tritanopia');
    expect(p.font).toBe('default');
  });
  it('importProfile tolera JSON inválido', () => expect(importProfile('{no')).toEqual(DEFAULT_PROFILE));
  it('isIdentity', () => {
    expect(isIdentity(DEFAULT_PROFILE)).toBe(true);
    expect(isIdentity({ ...DEFAULT_PROFILE, contrast: 'aa' })).toBe(false);
    expect(isIdentity({ ...DEFAULT_PROFILE, contrast: 'aa', enabled: false })).toBe(true);
  });
  it('i18n tiene español e inglés', () => {
    expect(t('es', 'reset')).toBe('Restablecer');
    expect(t('en', 'reset')).toBe('Reset');
    expect(t('es', 'audit_result', { checked: 1, failing: 2, indeterminate: 3 })).toContain('2');
  });
});

describe('estilos', () => {
  it('foco y filtro aparecen solo cuando se piden', () => {
    expect(buildStyles(DEFAULT_PROFILE, { filterId: 'f' })).toBe('');
    const css = buildStyles({ ...DEFAULT_PROFILE, focusRing: true, colorVision: 'protanopia' }, { filterId: 'f' });
    expect(css).toContain(':focus-visible');
    expect(css).toContain('url(#f)');
  });
});

describe('Adapter sobre DOM (jsdom)', () => {
  function setup() {
    document.head.innerHTML = '';
    document.body.innerHTML =
      '<p id="a" style="color:rgb(159,159,159);background:#fff;font-size:10px">Texto gris</p>' +
      '<p id="b" style="color:#000;background:#fff">Texto negro</p>' +
      '<p id="c" style="color:rgb(159,159,159);background-image:linear-gradient(#fff,#eee)">Fondo imagen</p>';
  }
  it('audita, corrige, y revierte', () => {
    setup();
    const a = document.getElementById('a') as HTMLElement;
    const before = auditContrast(document);
    expect(before.failing).toBe(1);
    expect(before.indeterminate).toBe(1);

    const ad = new Adapter(document, { observe: false });
    ad.apply({ ...DEFAULT_PROFILE, contrast: 'aa', textScale: 200 });
    const fg = parseColor(a.style.color)!;
    expect(contrastRatio(fg, W)).toBeGreaterThanOrEqual(4.5);
    expect(a.style.fontSize).toBe('20px');
    expect(auditContrast(document).failing).toBe(0);

    ad.reset();
    expect(a.style.color).toBe('rgb(159, 159, 159)');
    expect(a.style.fontSize).toBe('10px');
    expect(auditContrast(document).failing).toBe(1);
  });
  it('inyecta y retira filtro SVG y estilos', () => {
    setup();
    const ad = new Adapter(document, { observe: false });
    ad.apply({ ...DEFAULT_PROFILE, colorVision: 'deuteranopia', focusRing: true });
    expect(document.getElementById('ocuadapt-chroma')).not.toBeNull();
    expect(document.getElementById('ocuadapt-style')).not.toBeNull();
    ad.reset();
    expect(document.getElementById('ocuadapt-chroma')).toBeNull();
    expect(document.getElementById('ocuadapt-style')).toBeNull();
  });
  it('guía de lectura se monta aislada y se retira', () => {
    setup();
    const ad = new Adapter(document, { observe: false });
    ad.apply({ ...DEFAULT_PROFILE, readingMask: true });
    expect(document.querySelector('[data-ocuadapt="reading-mask"]')).not.toBeNull();
    ad.reset();
    expect(document.querySelector('[data-ocuadapt="reading-mask"]')).toBeNull();
  });
});
