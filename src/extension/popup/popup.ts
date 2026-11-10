import {
  DEFAULT_PROFILE,
  PRESETS,
  applyMatrixToRgb,
  getCorrectionMatrix,
  isSiteExcluded,
  sanitizeProfile,
  t,
  type VisualProfile,
} from '../../core';
import { loadProfile, saveProfile } from '../storage';

const app = document.getElementById('app') as HTMLElement;
let profile: VisualProfile = { ...DEFAULT_PROFILE };
let auditText = '';
let currentHost = '';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  for (const c of children) e.append(c);
  return e;
}

async function applyToActiveTab(p: VisualProfile): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) return;
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'ocuadapt:apply', profile: p });
      return;
    } catch {
      // Content script no responde (pestaña abierta antes de recargar la extensión)
    }

    if (chrome.scripting) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        });
        setTimeout(() => {
          if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'ocuadapt:apply', profile: p }).catch(() => {});
        }, 120);
      } catch {
        if (tab.url.startsWith('file://')) {
          const status = document.getElementById('status');
          if (status) {
            status.textContent = 'Aviso: En páginas locales (file://), debes activar "Permitir acceso a URL de archivo" en chrome://extensions → Detalles de OcuAdapt.';
          }
        }
      }
    }
  } catch (err) {
    console.warn('OcuAdapt: error al comunicar con la pestaña', err);
  }
}

async function update(patch: Partial<VisualProfile>, rerender = false, focusId?: string): Promise<void> {
  profile = sanitizeProfile({ ...profile, ...patch });
  await saveProfile(profile);
  await applyToActiveTab(profile);
  if (rerender) render(focusId);
}

function select(id: string, label: string, options: [string, string][], value: string, onChange: (v: string) => void): HTMLElement {
  const sel = el('select', { id });
  for (const [v, text] of options) {
    const o = el('option', { value: v }, [text]);
    if (v === value) o.selected = true;
    sel.append(o);
  }
  sel.addEventListener('change', () => onChange(sel.value));
  return el('div', {}, [el('label', { for: id }, [label]), sel]);
}

function range(id: string, label: string, min: number, max: number, step: number, value: number, unit: string, onChange: (v: number) => void): HTMLElement {
  const out = el('output', { for: id, id: `${id}-out` }, [`${value}${unit}`]);
  const input = el('input', { id, type: 'range', min: String(min), max: String(max), step: String(step), value: String(value), 'aria-valuetext': `${value}${unit}` });
  input.addEventListener('input', () => {
    const v = Number(input.value);
    out.textContent = `${v}${unit}`;
    input.setAttribute('aria-valuetext', `${v}${unit}`);
  });
  input.addEventListener('change', () => onChange(Number(input.value)));
  return el('div', {}, [el('label', { for: id }, [label, ' ', out]), input]);
}

function checkbox(id: string, label: string, checked: boolean, onChange: (v: boolean) => void): HTMLElement {
  const cb = el('input', { id, type: 'checkbox' });
  cb.checked = checked;
  cb.addEventListener('change', () => onChange(cb.checked));
  return el('div', { class: 'row' }, [cb, el('label', { for: id }, [label])]);
}

function previewSwatches(): HTMLElement {
  const lang = profile.language;
  const m = getCorrectionMatrix(profile.colorVision, profile.intensity);
  const base: [string, { r: number; g: number; b: number }][] = [
    [t(lang, 'green'), { r: 0, g: 140, b: 60 }],
    [t(lang, 'amber'), { r: 230, g: 160, b: 0 }],
    [t(lang, 'red'), { r: 200, g: 30, b: 30 }],
  ];
  const box = el('div', { class: 'swatches', role: 'img', 'aria-label': t(lang, 'preview') });
  for (const [name, c] of base) {
    const n = applyMatrixToRgb(m, c);
    const a = el('span', { class: 'a' });
    a.style.background = `rgb(${c.r},${c.g},${c.b})`;
    const b = el('span', { class: 'b' });
    b.style.background = `rgb(${n.r},${n.g},${n.b})`;
    box.append(el('div', { class: 'sw' }, [a, b, name]));
  }
  return box;
}

async function runAudit(): Promise<void> {
  const lang = profile.language;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('no tab');
    const r = await chrome.tabs.sendMessage(tab.id, { type: 'ocuadapt:audit' });
    auditText = t(lang, 'audit_result', r);
  } catch {
    auditText = t(lang, 'audit_error');
  }
  const status = document.getElementById('status');
  if (status) status.textContent = auditText;
}

function render(focusId?: string): void {
  const lang = profile.language;
  document.documentElement.lang = lang;
  app.replaceChildren();

  app.append(el('h1', {}, [t(lang, 'title')]), el('p', { class: 'sub' }, [t(lang, 'subtitle')]));
  app.append(checkbox('enabled', t(lang, 'enabled'), profile.enabled, (v) => void update({ enabled: v })));

  // Perfil rápido
  const presetOpts: [string, string][] = Object.keys(PRESETS).map((k) => [k, t(lang, `preset_${k}`)]);
  const presetSel = select('preset', t(lang, 'presets'), [['', '—'], ...presetOpts], '', (k) => {
    if (!k) return;
    void update({ ...DEFAULT_PROFILE, language: profile.language, excludedSites: profile.excludedSites, ...PRESETS[k] }, true, 'preset');
  });
  app.append(el('fieldset', {}, [el('legend', {}, [t(lang, 'presets')]), presetSel]));

  // Color
  const cvOpts: [string, string][] = ['normal', 'protanopia', 'deuteranopia', 'tritanopia'].map((k) => [k, t(lang, `cv_${k}`)]);
  const colorSet = el('fieldset', {}, [
    el('legend', {}, [t(lang, 'colorVision')]),
    select('colorVision', t(lang, 'colorVision'), cvOpts, profile.colorVision, (v) => void update({ colorVision: v as VisualProfile['colorVision'] }, true, 'colorVision')),
    range('intensity', t(lang, 'intensity'), 0, 100, 5, profile.intensity, '%', (v) => void update({ intensity: v }, true, 'intensity')),
  ]);
  if (profile.colorVision !== 'normal') {
    colorSet.append(el('p', { class: 'note' }, [t(lang, 'preview')]), previewSwatches());
  }
  app.append(colorSet);

  // Contraste / texto
  const ctOpts: [string, string][] = ['off', 'aa', 'inverted'].map((k) => [k, t(lang, `ct_${k}`)]);
  const ftOpts: [string, string][] = ['default', 'atkinson', 'inter'].map((k) => [k, t(lang, `ft_${k}`)]);
  app.append(
    el('fieldset', {}, [
      el('legend', {}, [t(lang, 'contrast')]),
      select('contrast', t(lang, 'contrast'), ctOpts, profile.contrast, (v) => void update({ contrast: v as VisualProfile['contrast'] })),
      range('textScale', t(lang, 'textScale'), 100, 200, 10, profile.textScale, '%', (v) => void update({ textScale: v })),
      checkbox('textSpacing', t(lang, 'textSpacing'), profile.textSpacing, (v) => void update({ textSpacing: v })),
      select('font', t(lang, 'font'), ftOpts, profile.font, (v) => void update({ font: v as VisualProfile['font'] })),
    ]),
  );

  // Ayudas de lectura
  app.append(
    el('fieldset', {}, [
      el('legend', {}, [t(lang, 'readingMask')]),
      checkbox('focusRing', t(lang, 'focusRing'), profile.focusRing, (v) => void update({ focusRing: v })),
      checkbox('readingMask', t(lang, 'readingMask'), profile.readingMask, (v) => void update({ readingMask: v })),
      checkbox('redundantCoding', t(lang, 'redundantCoding'), profile.redundantCoding, (v) => void update({ redundantCoding: v })),
    ]),
  );

  // Sitio actual y test de color
  const siteBox = el('div', {});
  if (currentHost) {
    const excluded = isSiteExcluded(currentHost, profile.excludedSites);
    siteBox.append(
      checkbox('excludeSite', `${t(lang, 'excludeSite')} (${currentHost})`, excluded, (v) => {
        const list = new Set(profile.excludedSites);
        if (v) list.add(currentHost);
        else list.delete(currentHost);
        void update({ excludedSites: [...list] });
      }),
    );
  }
  const testBtn = el('button', { id: 'colortest', type: 'button' }, [t(lang, 'colorTest')]);
  testBtn.addEventListener('click', () => void chrome.tabs.create({ url: chrome.runtime.getURL('colortest/colortest.html') }));
  app.append(siteBox, testBtn);

  app.append(
    select('language', t(lang, 'language'), [['es', 'Español'], ['en', 'English']], profile.language, (v) => void update({ language: v as VisualProfile['language'] }, true, 'language')),
  );

  const resetBtn = el('button', { id: 'reset', type: 'button' }, [t(lang, 'reset')]);
  resetBtn.addEventListener('click', () => void update({ ...DEFAULT_PROFILE, language: profile.language, excludedSites: profile.excludedSites }, true, 'reset'));
  const auditBtn = el('button', { id: 'audit', type: 'button', class: 'primary' }, [t(lang, 'audit')]);
  auditBtn.addEventListener('click', () => void runAudit());
  app.append(el('div', { class: 'buttons' }, [resetBtn, auditBtn]));
  app.append(el('p', { id: 'status', class: 'status', role: 'status', 'aria-live': 'polite' }, [auditText]));
  app.append(el('p', { class: 'note' }, [t(lang, 'note')]));

  if (focusId) document.getElementById(focusId)?.focus();
}

void Promise.all([loadProfile(), currentHostname()]).then(([p, host]) => {
  profile = p;
  currentHost = host;
  render();
});

async function currentHostname(): Promise<string> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && /^https?:/.test(tab.url)) return new URL(tab.url).hostname.toLowerCase();
  } catch {
    /* sin acceso a la pestaña */
  }
  return '';
}
