import { DEFAULT_PROFILE, sanitizeProfile, type VisualProfile } from '../core';

export const STORAGE_KEY = 'ocuadapt.profile';

export async function loadProfile(): Promise<VisualProfile> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] ? sanitizeProfile(data[STORAGE_KEY]) : { ...DEFAULT_PROFILE };
}

export async function saveProfile(p: VisualProfile): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: p });
}
