import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';

const window = new Window({ url: 'https://reading-list.test/' });
for (const key of [
  'window',
  'document',
  'customElements',
  'HTMLElement',
  'Element',
  'Node',
  'Document',
  'ShadowRoot',
  'MutationObserver',
  'Event',
  'CustomEvent',
  'MouseEvent',
  'KeyboardEvent',
  'InputEvent',
  'CSSStyleSheet',
]) {
  globalThis[key] = window[key];
}
Object.defineProperty(globalThis, 'navigator', {
  value: window.navigator,
  configurable: true,
});
window.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
});
const saved = {
  url: 'https://example.com/first',
  title: 'A saved page',
  addedAt: 100,
  index: 1,
};
const local = { [`rl:v1:item:${saved.url}`]: saved };
const sync = { [saved.url]: saved };
const area = (records) => ({
  async get() {
    return { ...records };
  },
  async set(entries) {
    Object.assign(records, entries);
  },
  async remove(key) {
    delete records[key];
  },
});
globalThis.chrome = {
  i18n: {
    getMessage() {
      return '';
    },
  },
  storage: {
    local: area(local),
    sync: area(sync),
    onChanged: { addListener() {}, removeListener() {} },
  },
  tabs: {
    async query() {
      return [{ id: 1, url: 'https://example.com/new', title: 'A new page' }];
    },
    async update() {},
    async create() {},
  },
};
await import('../extension/scripts/components/reading-list-app.js');

const app = document.createElement('reading-list-app');
document.body.append(app);
await new Promise((resolve) => setTimeout(resolve, 20));
await app.updateComplete;
const root = app.shadowRoot;
const update = async () => {
  await app.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
};

test('popup renders loading, empty, populated, long-list, local-only, and error states at its fixed width', async () => {
  const initial = [...app.items];
  assert.equal(
    app.constructor.styles.at(-1).cssText.includes('width: 360px'),
    true,
  );
  app.items = null;
  app.loadError = false;
  await update();
  assert.match(root.textContent, /Loading your pages/);
  app.items = [];
  await update();
  assert.match(root.textContent, /Save your first page/);
  app.items = initial;
  await update();
  assert.equal(root.querySelectorAll('reading-list-item').length, 1);
  app.items = Array.from({ length: 40 }, (_, index) => ({
    ...saved,
    url: `https://example.com/${index}`,
    title: `Long page title ${index}`,
  }));
  await update();
  assert.equal(root.querySelectorAll('reading-list-item').length, 40);
  app.localOnly = 2;
  await update();
  assert.match(
    root.querySelector('.warning').textContent,
    /2 pages saved only on this device/,
  );
  app.loadError = true;
  app.items = null;
  await update();
  assert.match(root.textContent, /Couldn’t load your list/);
  app.loadError = false;
  app.localOnly = 0;
  app.items = initial;
  await update();
});

test('search, editing, sort, and settings expose keyboard reachable controls and restore focus', async () => {
  const search = root.querySelector('.search-toggle');
  search.click();
  await update();
  const field = root.querySelector('.search-field');
  assert.equal(root.activeElement, field);
  field.value = 'missing';
  field.dispatchEvent(new window.InputEvent('input', { bubbles: true }));
  await update();
  assert.match(root.textContent, /No pages found/);
  field.dispatchEvent(
    new window.KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      composed: true,
    }),
  );
  await update();
  assert.equal(app.searchOpen, false);
  assert.equal(root.activeElement, search);

  const item = root.querySelector('reading-list-item');
  await item.updateComplete;
  const link = item.shadowRoot.querySelector('.link');
  const edit = item.shadowRoot.querySelector('[title="Edit title"]');
  link.focus();
  assert.equal(item.shadowRoot.activeElement, link);
  assert.ok(edit.getAttribute('aria-label').includes('Edit'));
  assert.ok(
    item.shadowRoot
      .querySelector('[title="Copy URL"]')
      .getAttribute('aria-label'),
  );
  assert.ok(
    item.shadowRoot
      .querySelector('[title="Delete"]')
      .getAttribute('aria-label'),
  );
  edit.click();
  await item.updateComplete;
  const titleInput = item.shadowRoot.querySelector('.editor input');
  assert.equal(item.shadowRoot.activeElement, titleInput);
  titleInput.dispatchEvent(
    new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
  await item.updateComplete;
  assert.equal(
    item.shadowRoot.activeElement?.getAttribute('title'),
    'Edit title',
  );

  const sort = root.querySelector('.sort-button');
  assert.match(sort.getAttribute('aria-label'), /Sort: Manual/);
  sort.click();
  await update();
  assert.equal(
    root.querySelector('.sort-menu button').getAttribute('role'),
    'menuitemradio',
  );
  root
    .querySelector('.sort-menu')
    .dispatchEvent(
      new window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        composed: true,
      }),
    );
  await update();
  assert.equal(app.sortOpen, false);
  assert.equal(root.activeElement, sort);

  const settings = root.querySelector('.settings-toggle');
  settings.click();
  await update();
  const dialog = root.querySelector('dialog');
  assert.equal(dialog.open, true);
  assert.equal(dialog.querySelectorAll('.theme-options button').length, 3);
  dialog.querySelector('.sheet-head button').click();
  await update();
  assert.equal(root.activeElement, settings);
  assert.match(
    app.constructor.styles.at(-1).cssText,
    /prefers-reduced-motion|motion-smooth/,
  );
});

test('Enter saves an inline edit and Undo restores one deleted page', async () => {
  let row = root.querySelector('reading-list-item');
  row.shadowRoot.querySelector('[title="Edit title"]').click();
  await row.updateComplete;
  const input = row.shadowRoot.querySelector('.editor input');
  input.value = 'Updated title';
  input.dispatchEvent(new window.InputEvent('input', { bubbles: true }));
  input.dispatchEvent(
    new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
  );
  await new Promise((resolve) => setTimeout(resolve, 10));
  await update();
  row = root.querySelector('reading-list-item');
  assert.equal(row.name, 'Updated title');
  row.shadowRoot.querySelector('[title="Delete"]').click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  await update();
  assert.equal(root.querySelectorAll('reading-list-item').length, 0);
  assert.ok(root.querySelector('.undo button'));
  root.querySelector('.undo button').click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  await update();
  assert.equal(root.querySelectorAll('reading-list-item').length, 1);
  assert.equal(root.querySelector('reading-list-item').name, 'Updated title');
  assert.equal(
    app.constructor.styles[0].cssText.includes('prefers-reduced-motion'),
    true,
  );
});
