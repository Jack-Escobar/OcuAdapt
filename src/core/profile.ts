import { DEFAULT_PROFILE, type VisualProfile } from './types';

const COLOR_VISION = ['normal', 'protanopia', 'deuteranopia', 'tritanopia'] as const;
const CONTRAST = ['off', 'aa', 'inverted'] as const;
const FONTS = ['default', 'atkinson', 'inter'] as const;
const LANGS = ['es', 'en'] as const;

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}
function num(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function sanitizeSites(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out = new Set<string>();
  for (const s of v) {
    if (typeof s === 'string' && /^[a-z0-9.-]{1,253}$/i.test(s.trim())) out.add(s.trim().toLowerCase());
    if (out.size >= 200) break;
  }
  return [...out];
}

/** ¿El sitio está en la lista de exclusión? (coincide con el dominio o sus subdominios) */
export function isSiteExcluded(hostname: string, list: readonly string[]): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return list.some((s) => s && (h === s || h.endsWith(`.${s}`)));
}

/** Valida y normaliza cualquier entrada (almacenamiento, importación) a un perfil seguro. */
export function sanitizeProfile(input: unknown): VisualProfile {
  const o = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const d = DEFAULT_PROFILE;
  return {
    version: 1,
    enabled: bool(o.enabled, d.enabled),
    colorVision: pick(o.colorVision, COLOR_VISION, d.colorVision),
    intensity: Math.round(num(o.intensity, 0, 100, d.intensity)),
    contrast: pick(o.contrast, CONTRAST, d.contrast),
    textScale: Math.round(num(o.textScale, 100, 200, d.textScale)),
    textSpacing: bool(o.textSpacing, d.textSpacing),
    font: pick(o.font, FONTS, d.font),
    focusRing: bool(o.focusRing, d.focusRing),
    readingMask: bool(o.readingMask, d.readingMask),
    redundantCoding: bool(o.redundantCoding, d.redundantCoding),
    excludedSites: sanitizeSites(o.excludedSites),
    language: pick(o.language, LANGS, d.language),
  };
}

export function exportProfile(p: VisualProfile): string {
  return JSON.stringify(p, null, 2);
}

export function importProfile(json: string): VisualProfile {
  try {
    return sanitizeProfile(JSON.parse(json));
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

/** ¿El perfil modifica algo de la página? */
export function isIdentity(p: VisualProfile): boolean {
  return (
    !p.enabled ||
    (p.colorVision === 'normal' &&
      p.contrast === 'off' &&
      p.textScale === 100 &&
      !p.textSpacing &&
      p.font === 'default' &&
      !p.focusRing &&
      !p.readingMask &&
      !p.redundantCoding)
  );
}
