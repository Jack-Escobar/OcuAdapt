/** Guía de lectura (Reading Mask): franja visible que sigue puntero y foco; aislada en Shadow DOM. */
import { HOST_ATTR } from './dom';

const BAND_PX = 96;

export class ReadingMask {
  private host: HTMLElement | null = null;
  private top: HTMLElement | null = null;
  private bottom: HTMLElement | null = null;
  private y = 0;
  private raf = 0;

  constructor(private doc: Document) {}

  private onMove = (e: MouseEvent) => this.moveTo(e.clientY);
  private onFocus = (e: FocusEvent) => {
    const t = e.target;
    if (t instanceof (this.doc.defaultView?.Element ?? Element)) {
      const r = (t as Element).getBoundingClientRect();
      this.moveTo(r.top + r.height / 2);
    }
  };

  enable(): void {
    if (this.host) return;
    const host = this.doc.createElement('div');
    host.setAttribute(HOST_ATTR, 'reading-mask');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none;';
    const root = host.attachShadow({ mode: 'closed' });
    const style = this.doc.createElement('style');
    style.textContent =
      '.m{position:fixed;left:0;right:0;background:rgba(0,0,0,.72);pointer-events:none}' +
      '.t{top:0}.b{bottom:0}';
    this.top = this.doc.createElement('div');
    this.top.className = 'm t';
    this.bottom = this.doc.createElement('div');
    this.bottom.className = 'm b';
    root.append(style, this.top, this.bottom);
    this.doc.documentElement.appendChild(host);
    this.host = host;
    this.doc.addEventListener('mousemove', this.onMove, { passive: true });
    this.doc.addEventListener('focusin', this.onFocus);
    this.moveTo((this.doc.defaultView?.innerHeight ?? 600) / 2);
  }

  private moveTo(y: number): void {
    this.y = y;
    if (this.raf) return;
    const win = this.doc.defaultView;
    const paint = () => {
      this.raf = 0;
      const vh = win?.innerHeight ?? 600;
      const topH = Math.max(0, this.y - BAND_PX / 2);
      const bottomH = Math.max(0, vh - (this.y + BAND_PX / 2));
      if (this.top) this.top.style.height = `${topH}px`;
      if (this.bottom) this.bottom.style.height = `${bottomH}px`;
    };
    if (win?.requestAnimationFrame) this.raf = win.requestAnimationFrame(paint);
    else paint();
  }

  disable(): void {
    this.doc.removeEventListener('mousemove', this.onMove);
    this.doc.removeEventListener('focusin', this.onFocus);
    this.host?.remove();
    this.host = this.top = this.bottom = null;
    this.raf = 0;
  }

  get active(): boolean {
    return this.host !== null;
  }
}
