import { DEFAULT_PROFILE } from '../core';
import { STORAGE_KEY, saveProfile } from './storage';

// Service worker: inicializa el perfil por defecto. Todo el procesamiento es local; sin telemetría.
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  if (!data[STORAGE_KEY]) await saveProfile({ ...DEFAULT_PROFILE });
});
