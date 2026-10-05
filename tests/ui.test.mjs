import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

const catalogs = Object.fromEntries(
  ['en', 'de', 'es', 'fr', 'it', 'bg', 'zh_CN'].map((locale) => [
    locale,
    JSON.parse(
      readFileSync(
        new URL(
          `../extension/_locales/${locale}/messages.json`,
          import.meta.url,
        ),
      ),
    ),
  ]),
);
let currentLocale = 'en';
const localize = (key, substitutions = []) => {
  const entry = catalogs[currentLocale][key];
  if (!entry) return '';
  const values = Array.isArray(substitutions) ? substitutions : [substitutions];
  return entry.message.replace(/\$([a-z]+)\$/gi, (_, name) => {
    const position = Number(entry.placeholders?.[name]?.content?.slice(1)) - 1;
    return values[position] ?? '';
  });
};

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
  runtime: {
    async openOptionsPage() {},
    getManifest() {
      return { version: '3.1.0' };
    },
  },
  i18n: {
    getMessage: localize,
    getUILanguage: () => currentLocale.replace('_', '-'),
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
const { icon } = await import('../extension/scripts/lib/icon.js');
const { ArrowDownAZ, ArrowDownZA } = await import('lucide');

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
  assert.ok(!root.querySelector('.review-controls'));
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
  const previousSettings = app.settings;
  app.settings = { ...previousSettings, viewAll: false };
  app.items = Array.from({ length: 1000 }, (_, index) => ({
    ...saved,
    url: `https://example.com/viewed-${index}`,
    viewed: true,
  }));
  await update();
  assert.equal(root.querySelector('.count').textContent, '1,000');
  assert.match(
    root.querySelector('.viewed-toggle').textContent,
    /Viewed \(1,000\)/,
  );
  app.settings = previousSettings;
  app.items = initial;
  app.localOnly = 2;
  await update();
  let notice = root.querySelector('reading-list-notice');
  assert.equal(notice.variant, 'warning');
  assert.equal(notice.message, '2 pages are only on this device.');
  assert.equal(notice.actionLabel, 'Try again');
  notice.shadowRoot.querySelector('.dismiss').click();
  await update();
  assert.ok(!root.querySelector('reading-list-notice'));
  app.localOnly = 3;
  await update();
  notice = root.querySelector('reading-list-notice');
  assert.equal(notice.message, '3 pages are only on this device.');
  notice.shadowRoot.querySelector('.action').click();
  await new Promise((resolve) => setTimeout(resolve, 15));
  await update();
  assert.equal(app.localOnly, 0);
  assert.ok(!root.querySelector('reading-list-notice'));
  app.localOnly = 1;
  app.conflictNeedsBackup = true;
  await update();
  notice = root.querySelector('reading-list-notice');
  assert.equal(notice.actionLabel, 'Open settings');
  assert.match(notice.message, /Open settings to save a backup/);
  notice.shadowRoot.querySelector('.action').click();
  await update();
  app.localOnly = 0;
  app.conflictNeedsBackup = false;
  app.showError("We couldn't save this page.", async () => {});
  await update();
  notice = root.querySelector('reading-list-notice');
  assert.equal(notice.variant, 'error');
  assert.equal(notice.message, "We couldn't save this page.");
  notice.shadowRoot.querySelector('.action').click();
  await update();
  assert.ok(!root.querySelector('reading-list-notice'));
  app.loadError = true;
  app.items = null;
  app.showError("We couldn't open your list.", () => app.load());
  await update();
  assert.equal(
    root.querySelector('reading-list-notice').message,
    "We couldn't open your list.",
  );
  app.loadError = false;
  app.topNotice = null;
  app.localOnly = 0;
  app.items = initial;
  await update();
});

test('search, editing, sort, and settings expose keyboard reachable controls and restore focus', async () => {
  const search = root.querySelector('.search-toggle');
  search.click();
  await update();
  const field = root.querySelector('.search-field');
  assert.equal(field.getAttribute('placeholder'), 'Search');
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
  assert.match(
    app.constructor.styles.at(-1).cssText,
    /::-webkit-search-cancel-button[\s\S]*display:\s*none/,
  );
  field.value = 'missing';
  field.dispatchEvent(new window.InputEvent('input', { bubbles: true }));
  await update();
  assert.match(root.textContent, /No pages found/);
  const escapeSearch = new window.KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  field.dispatchEvent(escapeSearch);
  assert.equal(escapeSearch.defaultPrevented, true);
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
    root.querySelector('.sort-menu').textContent.includes('Order'),
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
  assert.equal(
    dialog.querySelector('.sheet-foot').parentElement.className,
    'sheet-body',
  );
  assert.match(
    dialog.querySelector('.sheet-foot').textContent,
    /Version 3\.1\.0/,
  );
  const settingRows = [...dialog.querySelectorAll('.setting-row')];
  const feedbackRow = settingRows.at(-2);
  const additionalSettingsRow = settingRows.at(-1);
  assert.equal(
    feedbackRow.querySelector('.setting-copy').textContent.trim(),
    'Provide Feedback',
  );
  const feedbackLink = feedbackRow.querySelector('a.text-button');
  assert.equal(feedbackLink.textContent.trim(), 'Open');
  assert.equal(feedbackLink.getAttribute('aria-label'), 'Provide Feedback');
  assert.equal(
    feedbackLink.getAttribute('href'),
    'https://forms.gle/faEkwySqvE3ebfev6',
  );
  assert.equal(feedbackLink.getAttribute('target'), '_blank');
  assert.match(
    additionalSettingsRow.querySelector('.setting-copy').textContent,
    /Additional Settings/,
  );
  assert.equal(
    additionalSettingsRow.querySelector('.setting-copy').textContent.trim(),
    'Additional Settings',
  );
  const openSettings = additionalSettingsRow.querySelector('a.text-button');
  assert.equal(openSettings.textContent.trim(), 'Open');
  assert.equal(openSettings.getAttribute('aria-label'), 'Additional Settings');
  assert.equal(openSettings.getAttribute('href'), 'options.html');
  assert.match(
    app.constructor.styles[0].cssText,
    /\.text-button\s*\{[^}]*border-radius: var\(--radius-pill\)/,
  );
  assert.match(
    app.constructor.styles[0].cssText,
    /\.text-button\s*\{[^}]*font-weight: var\(--weight-medium\)/,
  );
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
  assert.ok(!root.querySelector('.feedback'));
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
  const dragEvent = (type, clientY = 0, clientX = 0) => {
    const event = new window.DragEvent(type, {
      bubbles: true,
      clientX,
      clientY,
    });
    Object.defineProperty(event, 'dataTransfer', { value: transfer });
    Object.defineProperty(event, 'clientX', { value: clientX });
    Object.defineProperty(event, 'clientY', { value: clientY });
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
  // A drop in the space between rows reaches the list, not a row.
  // dragend follows drop in the browser and must not move the row again.
  const listBounds = root.querySelector('.list').getBoundingClientRect();
  root.querySelector('.list').dispatchEvent(dragEvent('drop', 1));
  rows[0].shadowRoot
    .querySelector('.drag-handle')
    .dispatchEvent(dragEvent('dragend', listBounds.top, listBounds.left));
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

  rows[0].shadowRoot
    .querySelector('.drag-handle')
    .dispatchEvent(dragEvent('dragstart'));
  assert.equal(app.draggedUrl, saved.url);
  root.querySelector('.list').dispatchEvent(dragEvent('dragover', 100));
  assert.equal(app.dragInsertIndex, 1);
  root.querySelector('.list').dispatchEvent(dragEvent('drop', 100));
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
  rows[0].shadowRoot
    .querySelector('.drag-handle')
    .dispatchEvent(dragEvent('dragstart'));
  rows[1].shadowRoot
    .querySelector('.row')
    .dispatchEvent(dragEvent('dragover', 1));
  const rowDrop = new window.DragEvent('drop', { bubbles: true, clientY: 1 });
  Object.defineProperty(rowDrop, 'dataTransfer', {
    value: new window.DataTransfer(),
  });
  Object.defineProperty(rowDrop, 'clientY', { value: 1 });
  rows[1].shadowRoot.querySelector('.row').dispatchEvent(rowDrop);
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
  rows[0].shadowRoot
    .querySelector('.drag-handle')
    .dispatchEvent(dragEvent('dragstart'));
  rows[1].shadowRoot
    .querySelector('.row')
    .dispatchEvent(dragEvent('dragover', 1));
  rows[0].shadowRoot
    .querySelector('.drag-handle')
    .dispatchEvent(
      dragEvent('dragend', listBounds.bottom + 40, listBounds.right + 40),
    );
  await update();
  rows = [...root.querySelectorAll('reading-list-item')];
  assert.equal(rows[0].href, saved.url);
  rows[0].shadowRoot
    .querySelector('.drag-handle')
    .dispatchEvent(dragEvent('dragstart'));
  rows[1].shadowRoot
    .querySelector('.row')
    .dispatchEvent(dragEvent('dragover', 1));
  rows[0].shadowRoot
    .querySelector('.drag-handle')
    .dispatchEvent(dragEvent('dragend', listBounds.top, listBounds.left));
  await new Promise((resolve) => setTimeout(resolve, 15));
  await update();
  rows = [...root.querySelectorAll('reading-list-item')];
  assert.equal(rows[1].href, saved.url);
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
  const feedback = optionsRoot.querySelector('.feedback-link');
  assert.ok(feedback.classList.contains('text-button'));
  assert.equal(feedback.textContent.trim(), 'Open form');
  assert.match(optionsRoot.textContent, /You have \d+ saved pages?\./);
  assert.match(
    optionsRoot.textContent,
    /Need help\? Found a problem\? Have an idea\?/,
  );
  assert.equal(optionsRoot.textContent.includes('other devices'), false);
  assert.equal(
    feedback.getAttribute('href'),
    'https://forms.gle/faEkwySqvE3ebfev6',
  );
  assert.equal(feedback.getAttribute('target'), '_blank');
  assert.match(feedback.getAttribute('rel'), /noopener noreferrer/);
  assert.equal(
    optionsRoot.querySelectorAll('.actions button.text-button').length,
    2,
  );
  assert.equal(optionsRoot.textContent.includes('Order'), false);
  const sort = [...optionsRoot.querySelectorAll('select')].find(
    (select) => select.value === 'manual',
  );
  sort.value = 'date';
  sort.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 15));
  await options.updateComplete;
  assert.equal(optionsRoot.textContent.includes('Order'), true);
  sort.value = 'title';
  sort.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 15));
  await options.updateComplete;
  const orderSelect = [...optionsRoot.querySelectorAll('label')]
    .find((label) => label.textContent.includes('Order'))
    ?.querySelector('select');
  assert.deepEqual(
    [...orderSelect.options].map((option) => option.textContent.trim()),
    ['A to Z', 'Z to A'],
  );
  options.conflicts = 1;
  await options.updateComplete;
  const recovery = [
    ...optionsRoot.querySelectorAll('reading-list-notice'),
  ].find((notice) => notice.message.includes('two copies'));
  assert.ok(recovery);
  assert.equal(recovery.actionLabel, 'Download backup');
  recovery.shadowRoot.querySelector('.dismiss').click();
  await options.updateComplete;
  assert.ok(
    ![...optionsRoot.querySelectorAll('reading-list-notice')].some((notice) =>
      notice.message.includes('two copies'),
    ),
  );
  options.showError("We couldn't make a backup.", 'Try again', async () => {});
  await options.updateComplete;
  assert.equal(
    optionsRoot.querySelector('reading-list-notice[variant="error"]').message,
    "We couldn't make a backup.",
  );
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
  assert.ok(!root.querySelector('.feedback'));
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
  assert.ok(!root.querySelector('.feedback'));
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

test('saving an existing page shows Already saved and keeps its edited title', async () => {
  const url = 'https://example.com/new';
  await rl.updateTitle(url, 'My custom title');
  app.items = await rl.getListItems();
  app.settings = { ...app.settings, viewAll: true };
  app.query = '';
  await update();
  const before = app.items.find((item) => item.url === url);
  const count = app.items.length;

  root.querySelector('.save').click();
  await new Promise((resolve) => setTimeout(resolve, 20));
  await update();
  assert.equal(app.items.length, count);
  assert.deepEqual(
    app.items.find((item) => item.url === url),
    before,
  );
  assert.match(root.querySelector('.info')?.textContent ?? '', /Already saved/);
});

test('Viewed disclosure appears only while viewed pages are hidden', async () => {
  const originalItems = app.items;
  const originalSettings = app.settings;
  const originalQuery = app.query;
  app.items = [
    { ...saved, viewed: false },
    {
      url: 'https://example.com/viewed',
      title: 'A viewed page',
      addedAt: 90,
      viewed: true,
    },
  ];
  app.settings = { ...app.settings, viewAll: false };
  app.query = '';
  app.viewedOpen = false;
  await update();

  const disclosure = root.querySelector('.viewed-toggle');
  assert.match(disclosure.textContent, /Viewed \(1\)/);
  assert.equal(disclosure.getAttribute('aria-expanded'), 'false');
  assert.equal(root.querySelectorAll('reading-list-item').length, 1);
  disclosure.click();
  await update();
  assert.equal(disclosure.getAttribute('aria-expanded'), 'true');
  assert.equal(root.querySelectorAll('reading-list-item').length, 2);
  assert.equal(
    root.querySelector('reading-list-item[data-list-group="viewed"]')
      .reorderable,
    false,
  );

  app.query = 'viewed page';
  await update();
  assert.match(root.textContent, /No unread pages/);
  assert.equal(root.querySelectorAll('reading-list-item').length, 1);
  app.settings = { ...app.settings, viewAll: true };
  app.query = '';
  await update();
  assert.equal(root.querySelector('.viewed-toggle'), null);
  assert.equal(root.querySelectorAll('reading-list-item').length, 2);

  app.items = originalItems;
  app.settings = originalSettings;
  app.query = originalQuery;
  app.viewedOpen = false;
  await update();
});

test('Title sort uses the matching downward Lucide icons and A-to-Z comes first', async () => {
  const previousSettings = app.settings;
  app.settings = { ...app.settings, sortOption: 'title', sortOrder: 'up' };
  app.sortOpen = false;
  app.sortClosing = false;
  await update();
  let sort = root.querySelector('.sort-button');
  assert.equal(
    sort.querySelector('svg').innerHTML,
    icon(ArrowDownAZ, 18).innerHTML,
  );

  sort.click();
  await update();
  const orderLabels = [...root.querySelectorAll('.sort-menu .menu-item')]
    .map((button) => button.textContent.trim())
    .filter((label) => label === 'A to Z' || label === 'Z to A');
  assert.deepEqual(orderLabels, ['A to Z', 'Z to A']);

  app.settings = { ...app.settings, sortOrder: 'down' };
  await update();
  sort = root.querySelector('.sort-button');
  assert.equal(
    sort.querySelector('svg').innerHTML,
    icon(ArrowDownZA, 18).innerHTML,
  );
  app.sortOpen = false;
  app.sortClosing = false;
  app.settings = previousSettings;
  await update();
});

test('every listed language covers the interface and renders its translated controls', async () => {
  const englishKeys = Object.keys(catalogs.en);
  const originalItems = app.items;
  const originalSettings = app.settings;
  const options = document.createElement('reading-list-options');
  document.body.append(options);
  await new Promise((resolve) => setTimeout(resolve, 15));
  await options.updateComplete;
  app.items = [saved];
  app.settings = { ...app.settings, viewAll: true };
  for (const locale of ['de', 'es', 'fr', 'it', 'bg', 'zh_CN']) {
    const catalog = catalogs[locale];
    assert.deepEqual(Object.keys(catalog).sort(), englishKeys.slice().sort());
    for (const key of englishKeys) {
      const source = catalogs.en[key];
      const translated = catalog[key];
      assert.ok(translated?.message, `${locale}: ${key} is missing`);
      assert.deepEqual(
        Object.keys(translated.placeholders ?? {}).sort(),
        Object.keys(source.placeholders ?? {}).sort(),
        `${locale}: ${key} placeholders differ`,
      );
    }
    currentLocale = locale;
    app.requestUpdate();
    await update();
    assert.match(
      root.querySelector('.list-label').textContent,
      new RegExp(catalog.myList.message),
    );
    assert.equal(
      root.querySelector('.settings-toggle').getAttribute('aria-label'),
      catalog.openSettings.message,
    );
    assert.equal(
      root.querySelector('.sheet-head h2').textContent,
      catalog.settings.message,
    );
    assert.equal(
      root
        .querySelector('.setting-copy')
        .textContent.includes(catalog.provideFeedback.message),
      true,
    );
    assert.equal(
      root.querySelector('.sheet-foot').textContent.trim(),
      localize('versionLabel', '3.1.0'),
    );
    app.localOnly = 1000;
    await update();
    const count = new Intl.NumberFormat(locale.replace('_', '-')).format(1000);
    assert.equal(
      root.querySelector('reading-list-notice').message,
      localize('localOnlyOther', count),
    );
    app.localOnly = 0;
    options.requestUpdate();
    await options.updateComplete;
    assert.equal(
      options.shadowRoot.querySelector('h1').textContent,
      catalog.appName.message,
    );
    assert.match(
      options.shadowRoot.textContent,
      new RegExp(catalog.downloadBackup.message),
    );
  }
  currentLocale = 'en';
  app.items = originalItems;
  app.settings = originalSettings;
  options.remove();
  await update();
});
