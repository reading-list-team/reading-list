import {
  classifyLegacySnapshot,
  isStoredItem,
  isDeletionMarker,
  mergeItem,
  StoredItem,
} from './storage-model.js';
import { BackupFile } from './backup.js';
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  ReadingListSettings,
  sortList,
  toLegacySettings,
} from './settings.js';

export type ListItemData = StoredItem;

export interface SaveResult {
  item: ListItemData;
  synced: boolean;
}

export interface ImportResult {
  imported: number;
  alreadyPresent: number;
  synced: boolean;
}

export interface RetryResult {
  synced: number;
  remaining: number;
  conflicts: number;
}

const ITEM_PREFIX = 'rl:v1:item:';
const DELETED_PREFIX = 'rl:v1:deleted:';
const SHADOW_PREFIX = 'rl:v1:sync-shadow:';
const CONFLICT_PREFIX = 'rl:v1:conflict:';
const SETTINGS_KEY = 'rl:v1:settings';
const SETTINGS_SHADOW_KEY = 'rl:v1:settings-shadow';

function sameItem(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export class RL {
  private list: ListItemData[] = [];
  private loading: Promise<void> | null = null;
  private syncAvailable = true;
  private syncRecords: Record<string, unknown> = {};

  private async load() {
    const local = await chrome.storage.local.get(null);
    let synced: Record<string, unknown> = {};
    try {
      synced = await chrome.storage.sync.get(null);
      this.syncAvailable = true;
    } catch (error) {
      this.syncAvailable = false;
      console.error('Reading List could not read Chrome sync storage', error);
    }

    const items = new Map<string, ListItemData>();
    for (const [key, value] of Object.entries(local)) {
      if (key.startsWith(ITEM_PREFIX)) {
        const url = key.slice(ITEM_PREFIX.length);
        if (!local[DELETED_PREFIX + url] && isStoredItem(url, value)) {
          items.set(url, value);
        }
      }
    }

    const legacy = classifyLegacySnapshot(synced);
    this.syncRecords = synced;
    if (this.syncAvailable && synced.settings) {
      const remoteSettings = normalizeSettings(synced.settings, true);
      const currentSettings = local[SETTINGS_KEY];
      const settingsShadow = local[SETTINGS_SHADOW_KEY];
      if (!currentSettings ||
        (settingsShadow && sameItem(currentSettings, settingsShadow)) ||
        (!settingsShadow && sameItem(currentSettings, DEFAULT_SETTINGS))) {
        await chrome.storage.local.set({ [SETTINGS_KEY]: remoteSettings });
      }
      await chrome.storage.local.set({ [SETTINGS_SHADOW_KEY]: remoteSettings });
    }
    for (const item of legacy.items) {
      const shadow = local[SHADOW_PREFIX + item.url];
      const current = items.get(item.url);
      const deletedAt = local[DELETED_PREFIX + item.url];
      if (typeof deletedAt === 'number' && item.addedAt > deletedAt) {
        await chrome.storage.local.set({
          [ITEM_PREFIX + item.url]: item,
          [DELETED_PREFIX + item.url]: false,
        });
        items.set(item.url, item);
      }
      if (!deletedAt) {
        if (!current || (shadow && sameItem(current, shadow))) {
          // A migration/reconciliation is complete only after the copy succeeds.
          await chrome.storage.local.set({ [ITEM_PREFIX + item.url]: item });
          items.set(item.url, item);
        } else if (current && !sameItem(current, item) &&
          (!shadow || !sameItem(item, shadow))) {
          // Both devices changed the item. Keep the local version visible and
          // archive the remote version for export instead of discarding it.
          await chrome.storage.local.set({
            [CONFLICT_PREFIX + item.url + ':' + Date.now()]: item,
          });
        }
      }
      await chrome.storage.local.set({ [SHADOW_PREFIX + item.url]: item });
    }

    for (const [url, value] of Object.entries(synced)) {
      if (!isDeletionMarker(url, value)) continue;
      const current = items.get(url);
      const shadow = local[SHADOW_PREFIX + url];
      if (current && shadow && sameItem(current, shadow)) {
        // This device has not edited the item since it last synced, so the
        // explicit remote deletion can be applied without losing a local edit.
        await chrome.storage.local.set({ [DELETED_PREFIX + url]: value.deletedAt });
        items.delete(url);
      }
    }

    for (const key of Object.keys(local)) {
      if (!key.startsWith(SHADOW_PREFIX)) continue;
      if (!this.syncAvailable) continue;
      const url = key.slice(SHADOW_PREFIX.length);
      if (Object.prototype.hasOwnProperty.call(synced, url)) continue;
      // An absent sync key is not proof of a user deletion. A sync reset or
      // incomplete state must never hide the local copy.
      await chrome.storage.local.remove(key);
    }

    this.list = [...items.values()].sort((a, b) => b.addedAt - a.addedAt);
  }

  private async ensureLoaded() {
    if (!this.loading) {
      this.loading = this.load().catch((error) => {
        this.loading = null;
        throw error;
      });
    }
    await this.loading;
  }

  async getListItems(): Promise<ListItemData[]> {
    await this.ensureLoaded();
    return [...this.list];
  }

  async refresh(): Promise<ListItemData[]> {
    this.loading = null;
    return this.getListItems();
  }

  async getSettings(): Promise<ReadingListSettings> {
    await this.ensureLoaded();
    const local = await chrome.storage.local.get(SETTINGS_KEY);
    if (local[SETTINGS_KEY]) return normalizeSettings(local[SETTINGS_KEY]);
    const legacy = normalizeSettings(this.syncRecords.settings, true);
    if (this.syncAvailable) {
      await chrome.storage.local.set({
        [SETTINGS_KEY]: legacy,
      });
    }
    return legacy;
  }

  async saveSettings(settings: ReadingListSettings): Promise<boolean> {
    await this.ensureLoaded();
    const current = this.syncRecords.settings;
    const raw = current && typeof current === 'object' && !Array.isArray(current)
      ? current as Record<string, unknown> : {};
    const merged = { ...raw, ...toLegacySettings(settings) };
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
    try {
      await chrome.storage.sync.set({ settings: merged });
      this.syncRecords.settings = merged;
      await chrome.storage.local.set({ [SETTINGS_SHADOW_KEY]: settings });
      return true;
    } catch (error) {
      console.error('Reading List settings saved locally but not synced', error);
      return false;
    }
  }

  async exportBackup(): Promise<BackupFile> {
    await this.ensureLoaded();
    const rawLocal = await chrome.storage.local.get(null);
    let rawSync: Record<string, unknown> | null = null;
    try {
      rawSync = await chrome.storage.sync.get(null);
    } catch (error) {
      console.error('Reading List could not include raw sync data in backup', error);
    }
    return {
      format: 'reading-list-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      items: [...this.list],
      rawLocal,
      rawSync,
    };
  }

  async importItems(incoming: ListItemData[]): Promise<ImportResult> {
    await this.ensureLoaded();
    const existing = new Set(this.list.map((item) => item.url));
    const additions: ListItemData[] = [];
    let alreadyPresent = 0;
    for (const item of incoming) {
      if (!isStoredItem(item.url, item)) {
        throw new Error('Invalid reading list item in import.');
      }
      if (existing.has(item.url)) {
        alreadyPresent++;
        continue;
      }
      existing.add(item.url);
      additions.push(item);
    }
    if (additions.length === 0) {
      return { imported: 0, alreadyPresent, synced: true };
    }

    const writes: Record<string, unknown> = {};
    const syncWrites: Record<string, ListItemData> = {};
    for (const item of additions) {
      writes[ITEM_PREFIX + item.url] = item;
      writes[DELETED_PREFIX + item.url] = false;
      syncWrites[item.url] = item;
    }
    // A failed local batch leaves the existing list and sync data unchanged.
    await chrome.storage.local.set(writes);
    this.list = [...this.list, ...additions].sort((a, b) => b.addedAt - a.addedAt);

    let synced = false;
    try {
      await chrome.storage.sync.set(syncWrites);
      const shadows: Record<string, ListItemData> = {};
      for (const item of additions) shadows[SHADOW_PREFIX + item.url] = item;
      await chrome.storage.local.set(shadows);
      synced = true;
      Object.assign(this.syncRecords, syncWrites);
    } catch (error) {
      console.error('Reading List imported locally but could not sync', error);
    }
    return { imported: additions.length, alreadyPresent, synced };
  }

  async addReadingItem(incoming: ListItemData): Promise<SaveResult> {
    await this.ensureLoaded();
    const existing = this.list.find((item) => item.url === incoming.url);
    const item = mergeItem(existing, incoming);
    await chrome.storage.local.set({
      [ITEM_PREFIX + item.url]: item,
      [DELETED_PREFIX + item.url]: false,
    });
    this.list = [item, ...this.list.filter((current) => current.url !== item.url)];

    let synced = false;
    try {
      await chrome.storage.sync.set({ [item.url]: item });
      await chrome.storage.local.set({ [SHADOW_PREFIX + item.url]: item });
      synced = true;
      this.syncAvailable = true;
      this.syncRecords[item.url] = item;
    } catch (error) {
      this.syncAvailable = false;
      console.error('Reading List saved locally but could not sync', error);
    }
    return { item, synced };
  }

  async removeReadingItem(url: string): Promise<boolean> {
    await this.ensureLoaded();
    // The tombstone prevents a failed sync removal from restoring this item on
    // the next popup open. Never discard the item before the local write works.
    await chrome.storage.local.set({ [DELETED_PREFIX + url]: Date.now() });
    this.list = this.list.filter((item) => item.url !== url);
    let synced = false;
    try {
      const marker = { url, deletedAt: Date.now() };
      await chrome.storage.sync.set({ [url]: marker });
      await chrome.storage.local.remove(SHADOW_PREFIX + url);
      synced = true;
      this.syncAvailable = true;
      this.syncRecords[url] = marker;
    } catch (error) {
      this.syncAvailable = false;
      console.error('Reading List deleted locally but could not sync', error);
    }
    return synced;
  }

  get isSyncAvailable() {
    return this.syncAvailable;
  }

  get localOnlyCount() {
    return this.list.filter((item) => !sameItem(this.syncRecords[item.url], item)).length;
  }

  async updateTitle(url: string, title: string): Promise<SaveResult> {
    await this.ensureLoaded();
    const existing = this.list.find((item) => item.url === url);
    if (!existing) throw new Error('Reading list item not found.');
    return this.addReadingItem({ ...existing, title });
  }

  async markViewed(url: string): Promise<SaveResult> {
    await this.ensureLoaded();
    const existing = this.list.find((item) => item.url === url);
    if (!existing) throw new Error('Reading list item not found.');
    return this.addReadingItem({ ...existing, viewed: true });
  }

  async moveItem(url: string, direction: -1 | 1): Promise<boolean> {
    await this.ensureLoaded();
    const ordered = sortList(this.list, DEFAULT_SETTINGS);
    const from = ordered.findIndex((item) => item.url === url);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= ordered.length) return true;
    [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
    const updated = ordered.map((item, index) => ({ ...item, index: index + 1 }));
    const localWrites: Record<string, ListItemData> = {};
    const syncWrites: Record<string, ListItemData> = {};
    for (const item of updated) {
      localWrites[ITEM_PREFIX + item.url] = item;
      syncWrites[item.url] = item;
    }
    await chrome.storage.local.set(localWrites);
    this.list = updated;
    try {
      await chrome.storage.sync.set(syncWrites);
      Object.assign(this.syncRecords, syncWrites);
      const shadows: Record<string, ListItemData> = {};
      for (const item of updated) shadows[SHADOW_PREFIX + item.url] = item;
      await chrome.storage.local.set(shadows);
      return true;
    } catch (error) {
      console.error('Reading List order saved locally but not synced', error);
      return false;
    }
  }

  async retrySync(): Promise<RetryResult> {
    await this.ensureLoaded();
    const remote = await chrome.storage.sync.get(null);
    this.syncRecords = remote;
    const local = await chrome.storage.local.get(null);
    let synced = 0;
    let conflicts = 0;
    for (const item of this.list) {
      if (sameItem(remote[item.url], item)) continue;
      const shadow = local[SHADOW_PREFIX + item.url];
      if (Object.prototype.hasOwnProperty.call(remote, item.url) &&
        (!shadow || !sameItem(remote[item.url], shadow))) {
        conflicts++;
        continue;
      }
      if (synced >= 25) break;
      try {
        await chrome.storage.sync.set({ [item.url]: item });
        await chrome.storage.local.set({ [SHADOW_PREFIX + item.url]: item });
        remote[item.url] = item;
        this.syncRecords[item.url] = item;
        synced++;
      } catch (error) {
        console.error('Reading List could not retry Chrome sync', error);
        break;
      }
    }
    return { synced, remaining: this.localOnlyCount, conflicts };
  }
}

export const rl = new RL();
