import { classifyLegacySnapshot, isStoredItem, StoredItem } from './storage-model.js';
import { normalizeSettings, ReadingListSettings } from './settings.js';

export interface BackupFile {
  format: 'reading-list-backup';
  version: 1;
  exportedAt: string;
  items: StoredItem[];
  rawLocal: Record<string, unknown>;
  rawSync: Record<string, unknown> | null;
}

export interface ImportPreview {
  items: StoredItem[];
  skipped: number;
  source: 'v2' | 'v3.1';
  settings?: ReadingListSettings;
}

export function parseBackup(text: string): ImportPreview {
  const data: unknown = JSON.parse(text);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Backup must contain a JSON object.');
  }
  const object = data as Record<string, unknown>;
  if (object.format === 'reading-list-backup') {
    if (object.version !== 1 || !Array.isArray(object.items)) {
      throw new Error('Unsupported Reading List backup version.');
    }
    const items = object.items.filter(
      (item): item is StoredItem =>
        !!item &&
        typeof item === 'object' &&
        isStoredItem((item as StoredItem).url, item),
    );
    const rawLocal = object.rawLocal && typeof object.rawLocal === 'object'
      ? object.rawLocal as Record<string, unknown> : {};
    const rawSync = object.rawSync && typeof object.rawSync === 'object'
      ? object.rawSync as Record<string, unknown> : {};
    const settings = rawLocal['rl:v1:settings']
      ? normalizeSettings(rawLocal['rl:v1:settings'])
      : rawSync.settings ? normalizeSettings(rawSync.settings, true) : undefined;
    return { items, skipped: object.items.length - items.length, source: 'v3.1', settings };
  }

  // The v2 options page exported the entire chrome.storage.sync object.
  const { items, other } = classifyLegacySnapshot(object);
  const skipped = Object.keys(other).filter(
    (key) => key !== 'settings' && key !== 'index',
  ).length;
  return {
    items, skipped, source: 'v2',
    settings: object.settings ? normalizeSettings(object.settings, true) : undefined,
  };
}
