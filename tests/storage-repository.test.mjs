import assert from 'node:assert/strict';
import test from 'node:test';
import { RL } from '../extension/scripts/lib/rl.js';

function memoryArea(initial = {}) {
  const values = { ...initial };
  return {
    values,
    failSet: false,
    failRemove: false,
    async get() { return { ...values }; },
    async set(entries) {
      if (this.failSet) throw new Error('quota');
      Object.assign(values, entries);
    },
    async remove(key) {
      if (this.failRemove) throw new Error('offline');
      delete values[key];
    },
  };
}

const url = 'https://example.com/article';
const legacy = { url, title: 'Old title', addedAt: 100, viewed: true, index: 3 };

test('migration copies legacy data locally and leaves sync intact', async () => {
  const local = memoryArea();
  const sync = memoryArea({ [url]: legacy, settings: { theme: 'dark' } });
  globalThis.chrome = { storage: { local, sync } };

  assert.deepEqual(await new RL().getListItems(), [legacy]);
  assert.deepEqual(local.values[`rl:v1:item:${url}`], legacy);
  assert.deepEqual(sync.values[url], legacy);
  assert.deepEqual(sync.values.settings, { theme: 'dark' });
  assert.deepEqual(await new RL().getListItems(), [legacy]);
});

test('a sync quota failure keeps the new title locally and reports local-only', async () => {
  const local = memoryArea();
  const sync = memoryArea({ [url]: legacy });
  globalThis.chrome = { storage: { local, sync } };
  const list = new RL();
  await list.getListItems();

  sync.failSet = true;
  const result = await list.addReadingItem({ url, title: 'New title', addedAt: 200 });
  assert.equal(result.synced, false);
  assert.equal(result.item.viewed, true);
  assert.equal(result.item.index, 3);
  assert.equal(local.values[`rl:v1:item:${url}`].title, 'New title');
  assert.equal(sync.values[url].title, 'Old title');
  assert.equal((await new RL().getListItems())[0].title, 'New title');
});

test('a failed remote deletion stays deleted after restart', async () => {
  const local = memoryArea();
  const sync = memoryArea({ [url]: legacy });
  globalThis.chrome = { storage: { local, sync } };
  const list = new RL();
  await list.getListItems();

  sync.failSet = true;
  assert.equal(await list.removeReadingItem(url), false);
  assert.deepEqual(await new RL().getListItems(), []);
  assert.deepEqual(sync.values[url], legacy);
});

test('a local write failure does not claim a save or change the visible item', async () => {
  const local = memoryArea();
  const sync = memoryArea({ [url]: legacy });
  globalThis.chrome = { storage: { local, sync } };
  const list = new RL();
  await list.getListItems();

  local.failSet = true;
  await assert.rejects(
    list.addReadingItem({ url, title: 'Unwritten', addedAt: 200 }),
    /quota/,
  );
  assert.deepEqual(await list.getListItems(), [legacy]);
  assert.deepEqual(sync.values[url], legacy);
});

test('remote updates reconcile, while missing sync entries cannot erase local data', async () => {
  const local = memoryArea();
  const sync = memoryArea({ [url]: legacy });
  globalThis.chrome = { storage: { local, sync } };
  await new RL().getListItems();

  sync.values[url] = { ...legacy, title: 'Remote title' };
  assert.equal((await new RL().getListItems())[0].title, 'Remote title');

  delete sync.values[url];
  assert.equal((await new RL().getListItems())[0].title, 'Remote title');
  assert.equal(local.values[`rl:v1:deleted:${url}`], undefined);
});

test('explicit v3.1 sync deletion hides an unchanged mirrored item', async () => {
  const local = memoryArea();
  const otherLocal = memoryArea();
  const sync = memoryArea({ [url]: legacy });
  globalThis.chrome = { storage: { local, sync } };
  await new RL().getListItems();

  globalThis.chrome = { storage: { local: otherLocal, sync } };
  const deletingDevice = new RL();
  await deletingDevice.getListItems();
  assert.equal(await deletingDevice.removeReadingItem(url), true);
  assert.deepEqual(sync.values[url].url, url);
  assert.ok(sync.values[url].deletedAt);
  assert.equal('addedAt' in sync.values[url], false);
  globalThis.chrome = { storage: { local, sync } };
  assert.deepEqual(await new RL().getListItems(), []);
});

test('remote deletion does not hide a newer local-only edit', async () => {
  const local = memoryArea();
  const sync = memoryArea({ [url]: legacy });
  globalThis.chrome = { storage: { local, sync } };
  const list = new RL();
  await list.getListItems();
  sync.failSet = true;
  await list.updateTitle(url, 'Local edit');
  sync.failSet = false;
  sync.values[url] = { url, deletedAt: 300 };

  assert.equal((await new RL().getListItems())[0].title, 'Local edit');
});

test('export keeps raw local and sync records; import merges without overwriting', async () => {
  const second = { url: 'https://example.com/other', title: 'Other', addedAt: 50 };
  const local = memoryArea();
  const sync = memoryArea({ [url]: legacy, odd: { source: 'v2' } });
  globalThis.chrome = { storage: { local, sync } };
  const list = new RL();
  await list.getListItems();

  const backup = await list.exportBackup();
  assert.deepEqual(backup.items, [legacy]);
  assert.deepEqual(backup.rawSync.odd, { source: 'v2' });
  assert.deepEqual(backup.rawLocal[`rl:v1:item:${url}`], legacy);

  sync.failSet = true;
  const result = await list.importItems([
    { ...legacy, title: 'Should not overwrite' }, second,
  ]);
  assert.deepEqual(result, { imported: 1, alreadyPresent: 1, synced: false });
  assert.equal((await list.getListItems()).find((item) => item.url === url).title,
    'Old title');
  assert.deepEqual(local.values[`rl:v1:item:${second.url}`], second);
  assert.deepEqual((await new RL().getListItems()).length, 2);
});

test('v2 settings migrate and edits keep their legacy sync shape', async () => {
  const local = memoryArea();
  const sync = memoryArea({ settings: {
    theme: 'dark', sortOption: 'title', sortOrder: 'down', custom: 'keep',
  } });
  globalThis.chrome = { storage: { local, sync } };
  const list = new RL();
  const settings = await list.getSettings();
  assert.equal(settings.theme, 'dark');
  assert.equal(settings.sortOrder, 'up');
  assert.deepEqual(local.values['rl:v1:settings'], settings);

  assert.equal(await list.saveSettings({ ...settings, sortOption: 'manual' }), true);
  assert.equal(sync.values.settings.sortOption, '');
  assert.equal(sync.values.settings.custom, 'keep');
});

test('a remote settings change updates an unchanged local copy', async () => {
  const local = memoryArea();
  const sync = memoryArea({ settings: { theme: 'light' } });
  globalThis.chrome = { storage: { local, sync } };
  const list = new RL();
  assert.equal((await list.getSettings()).theme, 'light');

  sync.values.settings = { theme: 'dark' };
  assert.equal((await new RL().getSettings()).theme, 'dark');
});

test('manual movement and viewed status persist while retaining metadata', async () => {
  const second = { url: 'https://example.com/other', title: 'Other', addedAt: 50 };
  const local = memoryArea();
  const sync = memoryArea({ [url]: legacy, [second.url]: second });
  globalThis.chrome = { storage: { local, sync } };
  const list = new RL();
  await list.getListItems();
  assert.equal(await list.moveItem(second.url, -1), true);
  const moved = await list.getListItems();
  assert.equal(moved[0].url, second.url);
  assert.equal(moved[1].viewed, true);

  const viewed = await list.markViewed(second.url);
  assert.equal(viewed.item.viewed, true);
  assert.equal((await new RL().getListItems()).find((item) => item.url === second.url).viewed, true);
});
