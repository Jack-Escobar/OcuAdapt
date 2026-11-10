import type { VisualProfile } from './types';

export interface StyleOptions {
  /** URL base (terminada en /) de las fuentes empaquetadas. Vacío = sin @font-face. */
  fontBaseUrl?: string;
  /** id del filtro SVG de recromatización. */
  filterId: string;
}

const FONT_STACK: Record<'atkinson' | 'inter', string> = {
  atkinson: '"Atkinson Hyperlegible", "Segoe UI", Arial, sans-serif',
  inter: '"Inter", "Segoe UI", Arial, sans-serif',
};

function fontFaces(base: string): string {
  const face = (family: string, file: string, weight: number) =>
    `@font-face{font-family:"${family}";font-weight:${weight};font-style:normal;font-display:swap;` +
    `src:url("${base}${file}") format("woff2");}`;
  return [
    face('Atkinson Hyperlegible', 'atkinson-hyperlegible-latin-400-normal.woff2', 400),
    face('Atkinson Hyperlegible', 'atkinson-hyperlegible-latin-700-normal.woff2', 700),
    face('Inter', 'inter-latin-400-normal.woff2', 400),
    face('Inter', 'inter-latin-700-normal.woff2', 700),
  ].join('\n');
}

/** Hoja de estilos derivada del perfil (todo reversible: se elimina al restablecer). */
export function buildStyles(p: VisualProfile, o: StyleOptions): string {
  const css: string[] = [];

  if (p.font !== 'default' && o.fontBaseUrl) css.push(fontFaces(o.fontBaseUrl));

  if (p.colorVision !== 'normal' && p.intensity > 0) {
    css.push(`html{filter:url(#${o.filterId}) !important;}`);
  }

  if (p.font !== 'default') {
    css.push(`html, body, body *:not(svg):not(svg *):not(code):not(pre):not(kbd):not(samp):not(i[class]){font-family:${FONT_STACK[p.font]} !important;}`);
  }

  if (p.textSpacing) {
    // WCAG 1.4.12: interlineado 1.5, letras 0.12em, palabras 0.16em
    css.push(
      `body, body *{line-height:1.5 !important;letter-spacing:0.12em !important;word-spacing:0.16em !important;}` +
        `body p{margin-bottom:2em !important;}`,
    );
  }

  if (p.contrast === 'inverted') {
    css.push(
      `html{background:#000 !important;color-scheme:dark;}` +
        `body, body *:not(img):not(video):not(canvas):not(svg):not(svg *):not(picture){background-color:#000 !important;background-image:none !important;color:#fff !important;border-color:#fff !important;text-shadow:none !important;box-shadow:none !important;}` +
        `body a, body a *{color:#ffff00 !important;text-decoration:underline !important;}` +
        `body a:visited, body a:visited *{color:#ff9cff !important;}` +
        `body button, body input, body select, body textarea{border:2px solid #fff !important;}`,
    );
  }

  if (p.focusRing) {
    css.push(
      `:focus-visible{outline:3px solid #ffd400 !important;outline-offset:2px !important;box-shadow:0 0 0 2px #000 !important;}` +
        // WCAG 2.4.11: evitar que el foco quede tapado por cabeceras/pies fijos
        `html{scroll-padding-top:6rem;scroll-padding-bottom:6rem;}`,
    );
  }

  return css.join('\n');
}
