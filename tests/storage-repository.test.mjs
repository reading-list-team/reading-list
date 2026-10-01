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

  sync.failRemove = true;
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

test('remote updates and removals reconcile on next load', async () => {
  const local = memoryArea();
  const sync = memoryArea({ [url]: legacy });
  globalThis.chrome = { storage: { local, sync } };
  await new RL().getListItems();

  sync.values[url] = { ...legacy, title: 'Remote title' };
  assert.equal((await new RL().getListItems())[0].title, 'Remote title');

  delete sync.values[url];
  assert.deepEqual(await new RL().getListItems(), []);
  assert.ok(local.values[`rl:v1:deleted:${url}`]);
});
