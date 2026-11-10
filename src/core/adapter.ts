import { buildFilterSvg, getCorrectionMatrix } from './chroma';
import { DomAdapter, HOST_ATTR } from './dom';
import { isIdentity } from './profile';
import { ReadingMask } from './readingMask';
import { RedundantCoder } from './redundant';
import { buildStyles } from './styles';
import type { VisualProfile } from './types';

export interface AdapterOptions {
  /** URL base de las fuentes empaquetadas (terminada en "/"). */
  fontBaseUrl?: string;
  /** Observa nodos nuevos (contenido dinámico). Por defecto true. */
  observe?: boolean;
}

const FILTER_ID = 'ocuadapt-chroma';
const STYLE_ID = 'ocuadapt-style';

/**
 * Orquesta la aplicación reversible de un perfil sobre un documento.
 * Núcleo compartido por la extensión y el widget.
 */
export class Adapter {
  private dom: DomAdapter;
  private mask: ReadingMask;
  private coder: RedundantCoder;
  private svg: SVGSVGElement | null = null;
  private style: HTMLStyleElement | null = null;
  private observer: MutationObserver | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private profile: VisualProfile | null = null;

  constructor(private doc: Document, private opts: AdapterOptions = {}) {
    this.dom = new DomAdapter(doc);
    this.mask = new ReadingMask(doc);
    this.coder = new RedundantCoder(doc);
  }

  apply(profile: VisualProfile): void {
    this.reset();
    this.profile = profile;
    if (isIdentity(profile)) return;
    const doc = this.doc;

    // 1. Filtro cromático
    if (profile.colorVision !== 'normal' && profile.intensity > 0) {
      this.svg = buildFilterSvg(doc, FILTER_ID, getCorrectionMatrix(profile.colorVision, profile.intensity));
      this.svg.setAttribute(HOST_ATTR, 'filter');
      doc.documentElement.appendChild(this.svg);
    }

    // 2. Hoja de estilos
    const css = buildStyles(profile, { filterId: FILTER_ID, fontBaseUrl: this.opts.fontBaseUrl });
    if (css) {
      const s = doc.createElement('style');
      s.id = STYLE_ID;
      s.setAttribute(HOST_ATTR, 'style');
      s.textContent = css;
      (doc.head ?? doc.documentElement).appendChild(s);
      this.style = s;
    }

    // 3. Pasada DOM (contraste AA y escala). En modo invertido el contraste ya es 21:1.
    this.runDom();
    if (profile.redundantCoding) this.coder.run(profile.language);
    const watch = profile.contrast === 'aa' || profile.textScale > 100 || profile.redundantCoding;
    if (doc.body && this.opts.observe !== false && watch) {
      const View = doc.defaultView;
      if (View?.MutationObserver) {
        this.observer = new View.MutationObserver((records) => {
          clearTimeout(this.timer);
          this.timer = setTimeout(() => {
            for (const r of records) {
              r.addedNodes.forEach((n) => {
                if (n.nodeType !== 1 || (n as Element).closest(`[${HOST_ATTR}]`)) return;
                this.runDom(n as Element);
                if (profile.redundantCoding) this.coder.run(profile.language, n as Element);
              });
            }
          }, 250);
        });
        this.observer.observe(doc.body, { childList: true, subtree: true });
      }
    }

    // 4. Guía de lectura
    if (profile.readingMask) this.mask.enable();
  }

  private runDom(subtree?: Element): void {
    const p = this.profile;
    if (!p) return;
    this.dom.run(
      { contrastTarget: p.contrast === 'aa' ? 4.5 : 0, textScale: p.textScale },
      subtree,
    );
  }

  /** Restablece la página al estado original (botón «restablecer»). */
  reset(): void {
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
}
