/**
 * Pasada sobre el DOM: corrección de contraste (1.4.3) y escalado de texto (1.4.4).
 * Es reversible: guarda el valor en línea original de cada propiedad modificada.
 */
import { adjustForeground, compositeOver, contrastRatio, isLargeText, parseColor, toCss, type RGB } from './color';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO', 'IFRAME', 'OBJECT', 'HEAD', 'META', 'LINK', 'TEMPLATE']);
export const HOST_ATTR = 'data-ocuadapt';
const WHITE: RGB = { r: 255, g: 255, b: 255 };

interface Saved {
  prop: string;
  value: string;
  priority: string;
}

export interface DomPassOptions {
  /** Razón de contraste mínima a forzar (texto normal); 0 = no corregir. */
  contrastTarget: number;
  /** 100–200 */
  textScale: number;
}

export interface ContrastAudit {
  /** Elementos de texto evaluables. */
  checked: number;
  /** Con razón < mínimo requerido (4.5 normal / 3 grande). */
  failing: number;
  /** Elementos omitidos por fondo con imagen/degradado (no se puede medir con fiabilidad). */
  indeterminate: number;
}

function hasOwnText(el: Element): boolean {
  for (const n of Array.from(el.childNodes)) {
    if (n.nodeType === 3 && (n.nodeValue ?? '').trim().length > 0) return true;
  }
  return false;
}

function isHidden(cs: CSSStyleDeclaration): boolean {
  return cs.display === 'none' || cs.visibility === 'hidden';
}

/** Fondo efectivo opaco detrás de `el`; null si hay imagen/degradado (indeterminado). */
export function effectiveBackground(el: Element): RGB | null {
  const view = el.ownerDocument.defaultView;
  if (!view) return WHITE;
  const layers: { r: number; g: number; b: number; a: number }[] = [];
  let cur: Element | null = el;
  while (cur) {
    const cs = view.getComputedStyle(cur);
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
    const bg = parseColor(cs.backgroundColor);
    if (bg && bg.a > 0) {
      layers.push(bg);
      if (bg.a >= 1) break;
    }
    cur = cur.parentElement;
  }
  let base: RGB = WHITE; // el lienzo del navegador es blanco por defecto
  for (let i = layers.length - 1; i >= 0; i--) base = compositeOver(layers[i]!, base);
  return base;
}

export class DomAdapter {
  private saved = new WeakMap<HTMLElement, Saved[]>();
  private touched = new Set<WeakRef<HTMLElement>>();
  private processed = new WeakSet<Element>();

  constructor(private root: Document) {}

  /** Aplica contraste y escala a todo el documento (o a un subárbol nuevo). */
  run(opts: DomPassOptions, subtree?: Element): void {
    const scope = subtree ?? this.root.body;
    if (!scope) return;
    const elements: Element[] = [scope, ...Array.from(scope.querySelectorAll('*'))];
    for (const el of elements) {
      if (!(el instanceof (this.root.defaultView?.HTMLElement ?? HTMLElement))) continue;
      this.processElement(el as HTMLElement, opts);
    }
    if (opts.textScale > 100) this.relaxClipping(elements);
  }

  /**
   * Mitigación parcial de 1.4.4/1.4.10: si al ampliar el texto un contenedor con overflow oculto
   * recorta su contenido, se muestra el desbordamiento. No repara diseños rotos de origen.
   */
  private relaxClipping(elements: Element[]): void {
    const view = this.root.defaultView;
    if (!view) return;
    for (const el of elements) {
      if (!(el instanceof view.HTMLElement) || SKIP_TAGS.has(el.tagName.toUpperCase()) || el.closest(`[${HOST_ATTR}]`)) continue;
      if (el === this.root.body || el === this.root.documentElement) continue;
      const cs = view.getComputedStyle(el);
      const clips = (v: string) => v === 'hidden' || v === 'clip';
      if (!(clips(cs.overflowX) || clips(cs.overflowY))) continue;
      if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) {
        this.setProp(el, 'overflow', 'visible');
      }
    }
  }

  private processElement(el: HTMLElement, opts: DomPassOptions): void {
    if (SKIP_TAGS.has(el.tagName.toUpperCase()) || el.closest(`[${HOST_ATTR}]`)) return;
    if (this.processed.has(el) || !hasOwnText(el)) return;
    const view = this.root.defaultView;
    if (!view) return;
    const cs = view.getComputedStyle(el);
    if (isHidden(cs)) return;
    this.processed.add(el);

    // Tamaño primero (no depende del color)
    if (opts.textScale > 100) {
      const size = parseFloat(cs.fontSize);
      if (Number.isFinite(size) && size > 0) {
        this.setProp(el, 'font-size', `${(size * opts.textScale) / 100}px`);
      }
    }

    if (opts.contrastTarget > 0) {
      const fgRaw = parseColor(cs.color);
      const bg = effectiveBackground(el);
      if (!fgRaw || !bg) return;
      const fg = compositeOver(fgRaw, bg);
      const weight = parseInt(cs.fontWeight, 10) || (cs.fontWeight === 'bold' ? 700 : 400);
      const large = isLargeText(parseFloat(cs.fontSize), weight);
      const target = large ? Math.min(3, opts.contrastTarget) : opts.contrastTarget;
      const fixed = adjustForeground(fg, bg, target);
      if (fixed !== fg) this.setProp(el, 'color', toCss(fixed));
    }
  }

  private setProp(el: HTMLElement, prop: string, value: string): void {
    let list = this.saved.get(el);
    if (!list) {
      list = [];
      this.saved.set(el, list);
      this.touched.add(new WeakRef(el));
    }
    if (!list.some((s) => s.prop === prop)) {
      list.push({ prop, value: el.style.getPropertyValue(prop), priority: el.style.getPropertyPriority(prop) });
    }
    el.style.setProperty(prop, value, 'important');
  }

  /** Revierte todas las modificaciones y olvida el estado procesado. */
  restore(): void {
    for (const ref of this.touched) {
      const el = ref.deref();
      if (!el) continue;
      for (const s of this.saved.get(el) ?? []) {
        if (s.value) el.style.setProperty(s.prop, s.value, s.priority);
        else el.style.removeProperty(s.prop);
      }
      if (el.getAttribute('style') === '') el.removeAttribute('style');
      this.saved.delete(el);
    }
    this.touched.clear();
    this.processed = new WeakSet();
  }
}

/** Cuenta los textos con contraste insuficiente según WCAG 1.4.3 (estado actual de la página). */
export function auditContrast(doc: Document): ContrastAudit {
  const out: ContrastAudit = { checked: 0, failing: 0, indeterminate: 0 };
  const view = doc.defaultView;
  if (!view || !doc.body) return out;
  const all = [doc.body, ...Array.from(doc.body.querySelectorAll('*'))];
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
    const weight = parseInt(cs.fontWeight, 10) || (cs.fontWeight === 'bold' ? 700 : 400);
    const min = isLargeText(parseFloat(cs.fontSize), weight) ? 3 : 4.5;
    if (contrastRatio(compositeOver(fgRaw, bg), bg) < min) out.failing++;
  }
  return out;
}
