import {
  buildPlates,
  renderPlate,
  sanitizeProfile,
  scoreTest,
  t,
  type Answer,
  type ColorVision,
  type Outcome,
  type VisualProfile,
} from '../../core';
import { loadProfile, saveProfile } from '../storage';

const app = document.getElementById('app') as HTMLElement;
const plates = buildPlates();
let profile: VisualProfile;
let idx = 0;
let answers: Answer[] = [];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, kids: (Node | string)[] = []): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  for (const c of kids) e.append(c);
  return e;
}

const L = () => profile.language;
function head(): HTMLElement[] {
  document.documentElement.lang = L();
  return [el('h1', { id: 'title', tabindex: '-1' }, [t(L(), 'ct_title')])];
}
function focusTitle(): void {
  document.getElementById('title')?.focus();
}

function intro(): void {
  app.replaceChildren(
    ...head(),
    el('p', { class: 'warn', role: 'note' }, [t(L(), 'ct_disclaimer')]),
    el('p', {}, [t(L(), 'ct_intro', { n: plates.length })]),
  );
  const start = el('button', { type: 'button', id: 'start' }, [t(L(), 'ct_start')]);
  start.addEventListener('click', () => {
    idx = 0;
    answers = [];
    plate();
  });
  const manual = el('button', { type: 'button', class: 'secondary' }, [t(L(), 'ct_manual')]);
  manual.addEventListener('click', () => applyView(null));
  app.append(start, manual);
  focusTitle();
}

function plate(): void {
  const p = plates[idx]!;
  const canvas = el('canvas', { width: '440', height: '440', role: 'img', 'aria-label': t(L(), 'ct_alt') });
  renderPlate(canvas, p);
  const input = el('input', { type: 'text', id: 'num', inputmode: 'numeric', maxlength: '2', autocomplete: 'off' });
  const none = el('input', { type: 'checkbox', id: 'none' });
  const last = idx === plates.length - 1;
  const form = el('form', {}, [
    el('label', { for: 'num' }, [t(L(), 'ct_answer')]),
    input,
    el('div', { class: 'row' }, [none, el('label', { for: 'none' }, [t(L(), 'ct_none')])]),
    el('button', { type: 'submit' }, [t(L(), last ? 'ct_finish' : 'ct_next')]),
  ]);
  none.addEventListener('change', () => {
    input.disabled = none.checked;
    if (none.checked) input.value = '';
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    answers[idx] = { value: input.value, none: none.checked };
    if (last) result();
    else {
      idx++;
      plate();
    }
  });
  app.replaceChildren(
    ...head(),
    el('p', { role: 'status' }, [t(L(), 'ct_plate', { i: idx + 1, n: plates.length })]),
    canvas,
    form,
  );
  input.focus();
}

const OUTCOME_KEY: Record<Outcome, string> = {
  none: 'ct_res_none',
  probable: 'ct_res_probable',
  inconclusive: 'ct_res_inconclusive',
  'control-failed': 'ct_res_control',
};

function result(): void {
  const r = scoreTest(plates, answers);
  const box = el('div', { class: 'result', role: 'region', 'aria-labelledby': 'rh' }, [
    el('h2', { id: 'rh' }, [t(L(), 'ct_result')]),
    el('p', {}, [t(L(), OUTCOME_KEY[r.outcome])]),
    el('p', {}, [t(L(), 'ct_score', { ok: r.screeningCorrect, total: r.screeningTotal })]),
    el('p', {}, [t(L(), 'ct_refer')]),
  ]);
  app.replaceChildren(...head(), box);
  const retry = el('button', { type: 'button', class: 'secondary' }, [t(L(), 'ct_retry')]);
  retry.addEventListener('click', intro);
  if (r.outcome === 'probable') {
    app.append(applySection('deuteranopia'));
  }
  app.append(retry);
  focusTitle();
}

function applySection(preselect: ColorVision | null): HTMLElement {
  const sel = el('select', { id: 'cv' });
  for (const k of ['deuteranopia', 'protanopia', 'tritanopia', 'normal'] as ColorVision[]) {
    const o = el('option', { value: k }, [t(L(), `cv_${k}`)]);
    if (k === (preselect ?? profile.colorVision)) o.selected = true;
    sel.append(o);
  }
  const msg = el('p', { role: 'status', 'aria-live': 'polite' });
  const btn = el('button', { type: 'button' }, [t(L(), 'ct_apply')]);
  btn.addEventListener('click', async () => {
    profile = sanitizeProfile({ ...profile, colorVision: sel.value, intensity: profile.intensity || 100 });
    await saveProfile(profile);
    msg.textContent = t(L(), 'ct_applied');
  });
  return el('section', {}, [el('label', { for: 'cv' }, [t(L(), 'ct_apply_as')]), sel, btn, msg]);
}

function applyView(preselect: ColorVision | null): void {
  app.replaceChildren(...head(), applySection(preselect));
  const back = el('button', { type: 'button', class: 'secondary' }, [t(L(), 'ct_retry')]);
  back.addEventListener('click', intro);
  app.append(back);
  focusTitle();
}

void loadProfile().then((p) => {
  profile = p;
  intro();
});
