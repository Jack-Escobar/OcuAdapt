/**
 * Codificación redundante (WCAG 1.4.1): a los estados indicados solo por color se les añade
 * icono con forma distinta (✔ círculo / ▲ triángulo / ✖ cuadrado), patrón y, si el elemento no
 * tiene texto, una etiqueta. Se basa en reglas explícitas (selectores + atributo de estado) y,
 * como respaldo, en el tono del color de fondo. No es heurística global: en sitios de terceros
 * solo actúa sobre elementos que coinciden con las reglas.
 */
import { parseColor, type RGB } from './color';
import { HOST_ATTR } from './dom';
import { t } from './i18n';
import type { Language } from './types';

export type State = 'ok' | 'warn' | 'bad';

export const DEFAULT_RULE_SELECTOR = '[data-state],[data-status],[data-estado]';
const STATE_ATTRS = ['data-state', 'data-status', 'data-estado'];
export const BADGE_ATTR = 'data-ocuadapt-badge';

const KEYWORDS: Record<State, string[]> = {
  ok: ['ok', 'aprobado', 'aprobada', 'approved', 'success', 'verde', 'green', 'activo', 'completado', 'done', 'pass', 'atendido'],
  warn: ['warn', 'warning', 'pendiente', 'pending', 'ambar', 'amber', 'espera', 'wait', 'proceso', 'yellow', 'amarillo'],
  bad: ['bad', 'error', 'rechazado', 'rechazada', 'rejected', 'danger', 'fail', 'rojo', 'red', 'denegado', 'inactivo'],
};

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function classifyKeyword(value: string): State | null {
  const tokens = normalize(value).split(/[^a-z]+/).filter(Boolean);
  for (const state of ['bad', 'warn', 'ok'] as const) {
    if (tokens.some((tok) => KEYWORDS[state].includes(tok))) return state;
  }
  return null;
}

export function classifyColor(c: RGB): State | null {
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return null;
  const s = d / (1 - Math.abs(2 * l - 1));
  if (s < 0.35 || l < 0.15 || l > 0.85) return null;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h <= 15 || h >= 340) return 'bad';
  if (h >= 25 && h <= 70) return 'warn';
  if (h >= 80 && h <= 170) return 'ok';
  return null;
}

interface StatePattern {
  image: string;
  size: string;
  repeat: string;
  borderRadius?: string;
}

const PATTERN: Record<State, StatePattern> = {
  ok: {
    image: 'radial-gradient(circle, rgba(255,255,255,0.95) 1.5px, transparent 1.8px)',
    size: '5px 5px',
    repeat: 'repeat',
    borderRadius: '50%',
  },
  warn: {
    image: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.75) 0px, rgba(0,0,0,0.75) 2px, transparent 2px, transparent 5px)',
    size: '100% 5px',
    repeat: 'repeat',
    borderRadius: '3px',
  },
  bad: {
    image: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.8) 0px, rgba(0,0,0,0.8) 2.5px, transparent 2.5px, transparent 6px)',
    size: '100% 100%',
    repeat: 'repeat',
    borderRadius: '2px',
  },
};

const SVG_NS = 'http://www.w3.org/2000/svg';

function icon(doc: Document, state: State): SVGSVGElement {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.style.cssText = 'flex-shrink:0;vertical-align:middle;';
  const mk = (tag: string, attrs: Record<string, string>) => {
    const n = doc.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    svg.appendChild(n);
  };
  const common = { fill: '#fff', stroke: '#000', 'stroke-width': '1.5' };
  if (state === 'ok') {
    mk('circle', { cx: '8', cy: '8', r: '7', ...common });
    mk('path', { d: 'M4.5 8.5l2.5 2.5 4.5-5', fill: 'none', stroke: '#000', 'stroke-width': '2' });
  } else if (state === 'warn') {
    mk('path', { d: 'M8 1.5L15 14H1z', ...common });
    mk('path', { d: 'M8 6v4M8 11.5v1', fill: 'none', stroke: '#000', 'stroke-width': '2' });
  } else {
    mk('rect', { x: '1.5', y: '1.5', width: '13', height: '13', ...common });
    mk('path', { d: 'M5 5l6 6M11 5l-6 6', fill: 'none', stroke: '#000', 'stroke-width': '2' });
  }
  return svg;
}

interface SavedStyle {
  prop: string;
  value: string;
  priority: string;
}

interface Applied {
  el: HTMLElement;
  badge: HTMLElement;
  savedStyles: SavedStyle[];
}

export class RedundantCoder {
  private applied: Applied[] = [];
  private done = new WeakSet<Element>();

  constructor(private doc: Document, private selector = DEFAULT_RULE_SELECTOR) {}

  /** Devuelve el estado de un elemento (atributo → color de respaldo). */
  stateOf(el: Element): State | null {
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

  run(lang: Language, scope: ParentNode = this.doc): number {
    const view = this.doc.defaultView;
    if (!view) return 0;
    const found: Element[] = [];
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

  private code(el: HTMLElement, state: State, lang: Language): void {
    if (el.nextElementSibling?.hasAttribute(BADGE_ATTR)) {
      el.nextElementSibling.remove();
    }
    const label = t(lang, `state_${state}`);
    const badge = this.doc.createElement('span');
    badge.setAttribute(BADGE_ATTR, state);
    badge.setAttribute(HOST_ATTR, 'badge');
    badge.style.cssText =
      'display:inline-flex;align-items:center;gap:5px;margin:0 8px 0 4px;padding:1px 6px;vertical-align:middle;' +
      'font:700 0.85em/1.3 Arial,sans-serif;color:#000;background:#fff;border:2px solid #000;border-radius:4px;letter-spacing:0;box-shadow:0 1px 2px rgba(0,0,0,0.15);';
    badge.appendChild(icon(this.doc, state));
    const hasText = (el.textContent ?? '').trim().length > 0;
    if (!hasText) badge.append(label);
    else badge.setAttribute('title', label);
    el.insertAdjacentElement('afterend', badge);

    const savedStyles: SavedStyle[] = [];
    const setProp = (prop: string, val: string) => {
      savedStyles.push({
        prop,
        value: el.style.getPropertyValue(prop),
        priority: el.style.getPropertyPriority(prop),
      });
      el.style.setProperty(prop, val, 'important');
    };

    const pat = PATTERN[state];
    if (pat) {
      setProp('background-image', pat.image);
      setProp('background-size', pat.size);
      setProp('background-repeat', pat.repeat);
      if (pat.borderRadius) setProp('border-radius', pat.borderRadius);
    }
    this.applied.push({ el, badge, savedStyles });
  }

  restore(): void {
    for (const a of this.applied) {
      a.badge.remove();
      for (const s of a.savedStyles) {
        if (s.value) a.el.style.setProperty(s.prop, s.value, s.priority);
        else a.el.style.removeProperty(s.prop);
      }
      if (a.el.getAttribute('style') === '') a.el.removeAttribute('style');
    }
    this.applied = [];
    this.done = new WeakSet();
    const orphans = this.doc.querySelectorAll(`[${BADGE_ATTR}]`);
    orphans.forEach((b) => b.remove());
  }

  get count(): number {
    return this.applied.length;
  }
}
