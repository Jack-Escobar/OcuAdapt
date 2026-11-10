/**
 * Widget institucional: <ocuadapt-widget>. Integración con una línea:
 *   <script src="ocuadapt-widget.js" defer></script>  +  <ocuadapt-widget></ocuadapt-widget>
 * Atributos opcionales: lang="es|en", font-base-url="/ruta/fuentes/".
 * Mismo núcleo que la extensión; Shadow DOM para aislar sus estilos; estado en localStorage del sitio.
 * Aviso: no sustituye la corrección en origen del sitio anfitrión.
 */
import { Adapter, DEFAULT_PROFILE, PRESETS, sanitizeProfile, t, type VisualProfile } from '../core';

const KEY = 'ocuadapt.widget.profile';

const CSS = `
:host{all:initial;position:fixed;right:1rem;bottom:1rem;z-index:2147483647;font:16px/1.5 "Segoe UI",Arial,sans-serif;color:#111}
*{box-sizing:border-box}
button,select,input{font:inherit}
.fab{width:3.25rem;height:3.25rem;border-radius:50%;border:3px solid #fff;background:#0b4f9c;color:#fff;cursor:pointer;display:grid;place-items:center;box-shadow:0 0 0 2px #000}
.fab svg{width:1.75rem;height:1.75rem}
.panel{position:absolute;right:0;bottom:4rem;width:min(21rem,calc(100vw - 2rem));max-height:75vh;overflow:auto;background:#fff;border:3px solid #111;border-radius:.5rem;padding:.75rem 1rem}
.panel[hidden]{display:none}
h2{font-size:1.1rem;margin:0 0 .5rem}
label{display:block;margin:.5rem 0 .125rem}
select{width:100%;min-height:2.75rem;border:2px solid #444;border-radius:.375rem;padding:.25rem;background:#fff;color:#111}
input[type=range]{width:100%;min-height:2rem}
.row{display:flex;gap:.5rem;align-items:center;margin:.5rem 0}.row label{margin:0}
input[type=checkbox]{width:1.5rem;height:1.5rem}
.actions{display:flex;gap:.5rem;margin-top:.75rem}
.actions button{flex:1;min-height:2.75rem;border:2px solid #0b4f9c;background:#0b4f9c;color:#fff;border-radius:.375rem;font-weight:700;cursor:pointer}
.actions button.sec{background:#fff;color:#0b4f9c}
:focus-visible{outline:3px solid #ffd400;outline-offset:2px;box-shadow:0 0 0 2px #000}
`;

class OcuAdaptWidget extends HTMLElement {
  private profile: VisualProfile = { ...DEFAULT_PROFILE };
  private adapter!: Adapter;
  private panel!: HTMLElement;
  private fab!: HTMLButtonElement;
  private root!: ShadowRoot;

  connectedCallback(): void {
    this.setAttribute('data-ocuadapt', 'widget');
    this.adapter = new Adapter(document, { fontBaseUrl: this.getAttribute('font-base-url') ?? undefined });
    try {
      const saved = localStorage.getItem(KEY);
      this.profile = saved ? sanitizeProfile(JSON.parse(saved)) : { ...DEFAULT_PROFILE };
    } catch {
      this.profile = { ...DEFAULT_PROFILE };
    }
    const attrLang = this.getAttribute('lang');
    if (attrLang === 'es' || attrLang === 'en') this.profile.language = attrLang;
    this.root = this.attachShadow({ mode: 'open' });
    this.render();
    this.adapter.apply(this.profile);
  }

  disconnectedCallback(): void {
    this.adapter.reset();
  }

  private set(patch: Partial<VisualProfile>, rerender = false): void {
    this.profile = sanitizeProfile({ ...this.profile, ...patch });
    try {
      localStorage.setItem(KEY, JSON.stringify(this.profile));
    } catch {
      /* almacenamiento no disponible */
    }
    this.adapter.apply(this.profile);
    if (rerender) this.render(true);
  }

  private render(keepOpen = false): void {
    const lang = this.profile.language;
    const wasOpen = keepOpen || (this.panel && !this.panel.hidden);
    this.root.replaceChildren();
    const style = document.createElement('style');
    style.textContent = CSS;

    this.fab = document.createElement('button');
    this.fab.className = 'fab';
    this.fab.type = 'button';
    this.fab.setAttribute('aria-label', t(lang, 'w_label'));
    this.fab.setAttribute('aria-expanded', String(!!wasOpen));
    this.fab.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>';

    this.panel = document.createElement('div');
    this.panel.className = 'panel';
    this.panel.setAttribute('role', 'group');
    this.panel.setAttribute('aria-label', t(lang, 'w_label'));
    this.panel.hidden = !wasOpen;

    const h = document.createElement('h2');
    h.textContent = t(lang, 'w_label');
    this.panel.append(h);

    const p = this.profile;
    const sel = (id: string, label: string, opts: [string, string][], value: string, on: (v: string) => void) => {
      const l = document.createElement('label');
      l.htmlFor = id;
      l.textContent = label;
      const s = document.createElement('select');
      s.id = id;
      for (const [v, text] of opts) {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = text;
        o.selected = v === value;
        s.append(o);
      }
      s.addEventListener('change', () => on(s.value));
      this.panel.append(l, s);
    };
    const rng = (id: string, label: string, min: number, max: number, step: number, value: number, unit: string, on: (v: number) => void) => {
      const l = document.createElement('label');
      l.htmlFor = id;
      l.textContent = `${label}: ${value}${unit}`;
      const r = document.createElement('input');
      r.type = 'range';
      r.id = id;
      r.min = String(min);
      r.max = String(max);
      r.step = String(step);
      r.value = String(value);
      r.setAttribute('aria-valuetext', `${value}${unit}`);
      r.addEventListener('input', () => {
        l.textContent = `${label}: ${r.value}${unit}`;
        r.setAttribute('aria-valuetext', `${r.value}${unit}`);
      });
      r.addEventListener('change', () => on(Number(r.value)));
      this.panel.append(l, r);
    };
    const chk = (id: string, label: string, value: boolean, on: (v: boolean) => void) => {
      const d = document.createElement('div');
      d.className = 'row';
      const c = document.createElement('input');
      c.type = 'checkbox';
      c.id = id;
      c.checked = value;
      c.addEventListener('change', () => on(c.checked));
      const l = document.createElement('label');
      l.htmlFor = id;
      l.textContent = label;
      d.append(c, l);
      this.panel.append(d);
    };

    sel('w-preset', t(lang, 'presets'), [['', '—'], ...Object.keys(PRESETS).map((k): [string, string] => [k, t(lang, `preset_${k}`)])], '', (k) => {
      if (k) this.set({ ...DEFAULT_PROFILE, language: p.language, ...PRESETS[k] }, true);
    });
    sel('w-cv', t(lang, 'colorVision'), ['normal', 'protanopia', 'deuteranopia', 'tritanopia'].map((k): [string, string] => [k, t(lang, `cv_${k}`)]), p.colorVision, (v) => this.set({ colorVision: v as VisualProfile['colorVision'] }));
    rng('w-int', t(lang, 'intensity'), 0, 100, 5, p.intensity, '%', (v) => this.set({ intensity: v }));
    sel('w-ct', t(lang, 'contrast'), ['off', 'aa', 'inverted'].map((k): [string, string] => [k, t(lang, `ct_${k}`)]), p.contrast, (v) => this.set({ contrast: v as VisualProfile['contrast'] }));
    rng('w-scale', t(lang, 'textScale'), 100, 200, 10, p.textScale, '%', (v) => this.set({ textScale: v }));
    chk('w-sp', t(lang, 'textSpacing'), p.textSpacing, (v) => this.set({ textSpacing: v }));
    sel('w-font', t(lang, 'font'), ['default', 'atkinson', 'inter'].map((k): [string, string] => [k, t(lang, `ft_${k}`)]), p.font, (v) => this.set({ font: v as VisualProfile['font'] }));
    chk('w-focus', t(lang, 'focusRing'), p.focusRing, (v) => this.set({ focusRing: v }));
    chk('w-mask', t(lang, 'readingMask'), p.readingMask, (v) => this.set({ readingMask: v }));
    chk('w-red', t(lang, 'redundantCoding'), p.redundantCoding, (v) => this.set({ redundantCoding: v }));

    const actions = document.createElement('div');
    actions.className = 'actions';
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = t(lang, 'reset');
    reset.addEventListener('click', () => this.set({ ...DEFAULT_PROFILE, language: p.language }, true));
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'sec';
    close.textContent = t(lang, 'close');
    close.addEventListener('click', () => this.toggle(false));
    actions.append(reset, close);
    this.panel.append(actions);

    this.fab.addEventListener('click', () => this.toggle(this.panel.hidden));
    this.panel.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape') this.toggle(false);
    });
    this.root.append(style, this.panel, this.fab);
  }

  private toggle(open: boolean): void {
    this.panel.hidden = !open;
    this.fab.setAttribute('aria-expanded', String(open));
    if (!open) this.fab.focus();
  }
}

if (!customElements.get('ocuadapt-widget')) customElements.define('ocuadapt-widget', OcuAdaptWidget);
