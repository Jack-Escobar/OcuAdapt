/** Modelo del perfil visual (compartido por extensión, widget y pruebas). */

export type ColorVision = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia';
/** off = sin cambios; aa = corrige a >= 4.5:1 (1.4.3); inverted = polaridad invertida >= 7:1 (1.4.6). */
export type ContrastMode = 'off' | 'aa' | 'inverted';
export type FontChoice = 'default' | 'atkinson' | 'inter';
export type Language = 'es' | 'en';

export interface VisualProfile {
  version: 1;
  /** Interruptor general; false = la página queda intacta. */
  enabled: boolean;
  colorVision: ColorVision;
  /** 0–100 */
  intensity: number;
  contrast: ContrastMode;
  /** Porcentaje de escala de texto, 100–200 */
  textScale: number;
  /** Espaciado de texto WCAG 1.4.12 */
  textSpacing: boolean;
  font: FontChoice;
  focusRing: boolean;
  readingMask: boolean;
  /** Codificación redundante (icono + patrón + texto) para estados indicados solo por color (1.4.1). */
  redundantCoding: boolean;
  /** Hostnames (sin puerto) donde la adaptación queda desactivada. */
  excludedSites: string[];
  language: Language;
}

export const DEFAULT_PROFILE: VisualProfile = {
  version: 1,
  enabled: true,
  colorVision: 'normal',
  intensity: 100,
  contrast: 'off',
  textScale: 100,
  textSpacing: false,
  font: 'default',
  focusRing: false,
  readingMask: false,
  redundantCoding: false,
  excludedSites: [],
  language: 'es',
};

/** Perfiles predefinidos (RF-01). */
export const PRESETS: Record<string, Partial<VisualProfile>> = {
  normal: {},
  lowVision: {
    contrast: 'aa',
    textScale: 150,
    textSpacing: true,
    font: 'atkinson',
    focusRing: true,
    readingMask: false,
    redundantCoding: true,
  },
  protanopia: { colorVision: 'protanopia', intensity: 100, redundantCoding: true },
  deuteranopia: { colorVision: 'deuteranopia', intensity: 100, redundantCoding: true },
  tritanopia: { colorVision: 'tritanopia', intensity: 100, redundantCoding: true },
};
