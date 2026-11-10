import { Adapter, auditContrast, isSiteExcluded, sanitizeProfile, type VisualProfile } from '../core';
import { STORAGE_KEY, loadProfile } from './storage';

// Content script: aplica el perfil guardado y reacciona a sus cambios.
const adapter = new Adapter(document, { fontBaseUrl: chrome.runtime.getURL('fonts/') });

function applyFor(p: VisualProfile): void {
  // Sitios excluidos (RF-13): la página queda intacta.
  const excluded = isSiteExcluded(location.hostname, p.excludedSites);
  adapter.apply(excluded ? { ...p, enabled: false } : p);
}

void loadProfile().then(applyFor);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEY]) {
    applyFor(sanitizeProfile(changes[STORAGE_KEY].newValue));
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'ocuadapt:apply') {
    applyFor(sanitizeProfile(msg.profile));
    sendResponse({ ok: true });
    return true;
  }
  if (msg && msg.type === 'ocuadapt:audit') {
    sendResponse(auditContrast(document));
    return true;
  }
  return false;
});
