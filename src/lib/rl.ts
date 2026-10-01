import {
  classifyLegacySnapshot,
  isStoredItem,
  mergeItem,
  StoredItem,
} from './storage-model.js';
import { BackupFile } from './backup.js';

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

const ITEM_PREFIX = 'rl:v1:item:';
const DELETED_PREFIX = 'rl:v1:deleted:';
const SHADOW_PREFIX = 'rl:v1:sync-shadow:';
const CONFLICT_PREFIX = 'rl:v1:conflict:';

function sameItem(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export class RL {
  private list: ListItemData[] = [];
  private loading: Promise<void> | null = null;
  private syncAvailable = true;

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
    for (const item of legacy.items) {
      const shadow = local[SHADOW_PREFIX + item.url];
      const current = items.get(item.url);
      if (!local[DELETED_PREFIX + item.url]) {
        if (!current || (shadow && sameItem(current, shadow))) {
          // A migration/reconciliation is complete only after the copy succeeds.
          await chrome.storage.local.set({ [ITEM_PREFIX + item.url]: item });
          items.set(item.url, item);
        } else if (
          shadow &&
          !sameItem(item, shadow) &&
          !sameItem(current, item)
        ) {
          // Both devices changed the item. Keep the local version visible and
          // archive the remote version for export instead of discarding it.
          await chrome.storage.local.set({
            [CONFLICT_PREFIX + item.url + ':' + Date.now()]: item,
          });
        }
      }
      await chrome.storage.local.set({ [SHADOW_PREFIX + item.url]: item });
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
      await chrome.storage.sync.remove(url);
      await chrome.storage.local.remove(SHADOW_PREFIX + url);
      synced = true;
      this.syncAvailable = true;
    } catch (error) {
      this.syncAvailable = false;
      console.error('Reading List deleted locally but could not sync', error);
    }
    return synced;
  }

  get isSyncAvailable() {
    return this.syncAvailable;
  }
}

export const rl = new RL();
