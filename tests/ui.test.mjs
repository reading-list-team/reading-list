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
const { rl } = await import('../extension/scripts/lib/rl.js');

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
  const loading = root.querySelector('.loading[role="status"]');
  assert.equal(loading.getAttribute('aria-label'), 'Loading your pages');
  assert.ok(loading.querySelector('svg'));
  app.items = [];
  await update();
  assert.match(root.textContent, /Save your first page/);
  app.items = initial;
  await update();
  assert.equal(root.querySelectorAll('reading-list-item').length, 1);
  assert.equal(
    root.querySelector('reading-list-item').hasAttribute('last'),
    true,
  );
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
  assert.equal(
    root.querySelector('.close-search').parentElement,
    root.querySelector('.settings-toggle').parentElement,
  );
  assert.equal(
    root.querySelector('.settings-toggle').getAttribute('aria-hidden'),
    'true',
  );
  assert.match(
    app.constructor.styles.at(-1).cssText,
    /font-size: var\(--text-md\)/,
  );
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
  assert.equal(app.searchClosing, true);
  assert.ok(root.querySelector('footer.search-closing .close-search'));
  await new Promise((resolve) => setTimeout(resolve, 230));
  await update();
  assert.equal(root.querySelector('.search-field'), null);
  assert.equal(root.activeElement, search);
  search.click();
  await update();
  root.querySelector('.close-search').click();
  await update();
  assert.equal(app.searchClosing, true);
  assert.ok(root.querySelector('footer.search-closing .close-search'));
  await new Promise((resolve) => setTimeout(resolve, 230));
  await update();
  assert.equal(
    root.querySelector('.settings-toggle').getAttribute('aria-hidden'),
    'false',
  );
  search.click();
  await update();
  root
    .querySelector('header')
    .dispatchEvent(
      new window.PointerEvent('pointerdown', { bubbles: true, composed: true }),
    );
  await update();
  assert.equal(app.searchOpen, false);

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
    root.querySelector('.sort-menu').textContent.includes('Direction'),
    false,
  );
  assert.equal(
    root.querySelector('.sort-menu button').getAttribute('role'),
    'menuitemradio',
  );
  root.querySelector('.sort-menu').dispatchEvent(
    new window.KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      composed: true,
    }),
  );
  await update();
  assert.equal(app.sortOpen, false);
  assert.ok(root.querySelector('.sort-menu.closing'));
  assert.equal(root.activeElement, sort);
  await new Promise((resolve) => setTimeout(resolve, 160));
  await update();
  assert.equal(root.querySelector('.sort-menu'), null);

  const settings = root.querySelector('.settings-toggle');
  settings.click();
  await update();
  const dialog = root.querySelector('dialog');
  assert.equal(dialog.open, true);
  assert.equal(dialog.querySelectorAll('.theme-options button').length, 3);
  assert.equal(dialog.querySelectorAll('input[role="switch"]').length, 2);
  dialog.querySelector('.sheet-head button').click();
  await update();
  assert.equal(dialog.open, true);
  assert.equal(dialog.classList.contains('closing'), true);
  await new Promise((resolve) => setTimeout(resolve, 230));
  await update();
  assert.equal(dialog.open, false);
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
  assert.match(root.querySelector('.info').textContent, /Title saved/);
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
  assert.equal(root.querySelector('.feedback'), null);
  assert.equal(
    app.constructor.styles[0].cssText.includes('prefers-reduced-motion'),
    true,
  );
});

test('manual drag and keyboard movement persist and expose one grip per row', async () => {
  const second = {
    url: 'https://example.com/second',
    title: 'Second page',
    addedAt: 200,
    index: 2,
  };
  await rl.addReadingItem(second);
  app.items = await rl.getListItems();
  await update();
  let rows = [...root.querySelectorAll('reading-list-item')];
  assert.equal(rows.length, 2);
  assert.equal(rows[0].shadowRoot.querySelectorAll('.drag-handle').length, 1);
  assert.equal(
    rows[0].shadowRoot.querySelectorAll(
      '[title="Move up"], [title="Move down"]',
    ).length,
    0,
  );
  const transfer = new window.DataTransfer();
  const dragEvent = (type, clientY = 0) => {
    const event = new window.DragEvent(type, { bubbles: true, clientY });
    Object.defineProperty(event, 'dataTransfer', { value: transfer });
    return event;
  };
  rows[0].shadowRoot
    .querySelector('.drag-handle')
    .dispatchEvent(dragEvent('dragstart'));
  assert.equal(
    transfer.getData('application/x-reading-list-item'),
    rows[0].href,
  );
  assert.equal(app.draggedUrl, rows[0].href);
  rows[1].shadowRoot
    .querySelector('.row')
    .dispatchEvent(dragEvent('dragover', 1));
  await update();
  assert.equal(rows[0].hasAttribute('drag-active'), true);
  assert.match(rows[1].getAttribute('style'), /--drag-offset: -68px/);
  assert.equal(rows[1].shadowRoot.querySelector('.drop-after'), null);
  rows[1].shadowRoot.querySelector('.row').dispatchEvent(dragEvent('drop', 1));
  await new Promise((resolve) => setTimeout(resolve, 15));
  await update();
  rows = [...root.querySelectorAll('reading-list-item')];
  assert.equal(rows[1].href, saved.url);
  rows[1].shadowRoot
    .querySelector('.drag-handle')
    .dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
    );
  await new Promise((resolve) => setTimeout(resolve, 15));
  await update();
  rows = [...root.querySelectorAll('reading-list-item')];
  assert.equal(rows[0].href, saved.url);
});

test('options page uses switches and hides manual direction', async () => {
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  await import('../extension/scripts/components/reading-list-options.js');
  const options = document.createElement('reading-list-options');
  document.body.append(options);
  await new Promise((resolve) => setTimeout(resolve, 15));
  await options.updateComplete;
  const optionsRoot = options.shadowRoot;
  assert.equal(optionsRoot.querySelectorAll('input[role="switch"]').length, 2);
  assert.equal(optionsRoot.textContent.includes('Direction'), false);
  const sort = [...optionsRoot.querySelectorAll('select')].find(
    (select) => select.value === 'manual',
  );
  sort.value = 'date';
  sort.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 15));
  await options.updateComplete;
  assert.equal(optionsRoot.textContent.includes('Direction'), true);
  options.remove();
});

test('A saves the current page but does not fire while editing text', async () => {
  assert.equal(
    root.querySelector('.save').getAttribute('aria-keyshortcuts'),
    'A',
  );
  let scrolledUrl = null;
  const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
  window.HTMLElement.prototype.scrollIntoView = function () {
    scrolledUrl = this.href;
  };
  const before = app.items.length;
  document.dispatchEvent(
    new window.KeyboardEvent('keydown', { key: 'a', bubbles: true }),
  );
  await new Promise((resolve) => setTimeout(resolve, 15));
  await update();
  assert.equal(app.items.length, before + 1);
  assert.equal(scrolledUrl, 'https://example.com/new');
  assert.equal(
    root.querySelector('reading-list-item[recently-saved]')?.href,
    scrolledUrl,
  );
  assert.equal(root.querySelector('.feedback'), null);
  assert.equal(root.querySelector('.save').classList.contains('saved'), true);
  assert.match(
    root.querySelector('.visually-hidden[role="status"]').textContent,
    /Page saved/,
  );

  const row = root.querySelector('reading-list-item');
  row.shadowRoot.querySelector('[title="Edit title"]').click();
  await row.updateComplete;
  row.shadowRoot.querySelector('.editor input').dispatchEvent(
    new window.KeyboardEvent('keydown', {
      key: 'a',
      bubbles: true,
      composed: true,
    }),
  );
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(app.items.length, before + 1);
  row.shadowRoot
    .querySelector('.editor input')
    .dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
  if (originalScrollIntoView)
    window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  else delete window.HTMLElement.prototype.scrollIntoView;
});

test('Undo toast overlays the footer, pauses on hover, and dismisses with X', async () => {
  const row = root.querySelector('reading-list-item');
  const clipboardDescriptor = Object.getOwnPropertyDescriptor(
    navigator,
    'clipboard',
  );
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async () => {} },
  });
  row.shadowRoot.querySelector('[title="Copy URL"]').click();
  await new Promise((resolve) => setTimeout(resolve, 15));
  await update();
  assert.match(root.querySelector('.info').textContent, /URL copied/);
  assert.equal(root.querySelector('.feedback'), null);
  row.shadowRoot.querySelector('[title="Delete"]').click();
  await new Promise((resolve) => setTimeout(resolve, 15));
  await update();
  const toast = root.querySelector('.undo');
  assert.ok(toast);
  assert.match(toast.textContent, /example.com deleted/);
  assert.equal(root.querySelectorAll('.toast-stack .toast').length, 2);
  root.querySelector('.info .dismiss').click();
  await new Promise((resolve) => setTimeout(resolve, 170));
  await update();
  assert.equal(root.querySelector('.info'), null);
  assert.ok(root.querySelector('.undo'));
  assert.ok(app.undoAutoTimer);
  assert.ok(toast.querySelector('.dismiss[aria-label="Dismiss Undo"]'));
  toast.dispatchEvent(new window.PointerEvent('pointerenter'));
  assert.equal(app.undoAutoTimer, null);
  toast.querySelector('.dismiss').click();
  await update();
  assert.equal(root.querySelector('.undo.closing') !== null, true);
  await new Promise((resolve) => setTimeout(resolve, 170));
  await update();
  assert.equal(root.querySelector('.undo'), null);

  app.deleted = saved;
  app.scheduleUndoDismiss(15);
  await update();
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(app.undoClosing, true);
  await new Promise((resolve) => setTimeout(resolve, 170));
  await update();
  assert.equal(root.querySelector('.undo'), null);
  if (clipboardDescriptor)
    Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
  else delete navigator.clipboard;
});
