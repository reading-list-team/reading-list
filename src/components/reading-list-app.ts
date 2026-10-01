import { LitElement, html, css } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { customElement, state } from 'lit/decorators.js';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowDownUp,
  CalendarDays,
  Check,
  ChevronDown,
  Monitor,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  X,
} from 'lucide';
import { icon } from '../lib/icon.js';
import { designTokens, resolvedTheme } from '../lib/design-tokens.js';
import { i18n } from '../lib/i18n.js';
import { rl, ListItemData } from '../lib/rl.js';
import {
  DEFAULT_SETTINGS,
  ReadingListSettings,
  sortList,
} from '../lib/settings.js';
import './reading-list-item.js';

@customElement('reading-list-app')
export class ReadingListAppElement extends LitElement {
  static override styles = [
    designTokens,
    css`
      :host {
        display: flex;
        flex-direction: column;
        width: 360px;
        height: 520px;
        max-height: 600px;
        overflow: hidden;
      }
      header {
        flex: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 22px 20px 18px;
        border-bottom: 1px solid var(--color-line);
      }
      h1 {
        margin: 0;
        font-size: var(--text-lg);
        font-weight: 650;
        letter-spacing: -0.035em;
      }
      .save {
        width: 36px;
        height: 36px;
        border: 0;
        border-radius: 50%;
        display: grid;
        place-items: center;
        color: #fff;
        background: var(--color-accent);
        transition:
          transform var(--motion-fast),
          background var(--motion-fast);
      }
      .save:hover {
        background: var(--color-accent-hover);
        transform: scale(1.06);
      }
      .save:disabled {
        opacity: 0.55;
        cursor: default;
      }
      .warning {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 20px;
        background: #fff8e9;
        color: #67480c;
        font-size: var(--text-xs);
        line-height: 1.35;
      }
      :host([data-theme='dark']) .warning {
        background: #3a321f;
        color: #ffe4a8;
      }
      .warning span {
        flex: 1;
      }
      .warning button {
        border: 0;
        background: transparent;
        color: inherit;
        text-decoration: underline;
        font-weight: 650;
        padding: 4px;
      }
      .feedback {
        margin: 0;
        padding: 6px 20px;
        color: var(--color-muted);
        font-size: var(--text-xs);
      }
      .list-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 18px 8px 20px;
      }
      .list-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: var(--text-md);
        font-weight: 650;
      }
      .count {
        border-radius: var(--radius-pill);
        background: var(--color-surface);
        padding: 2px 7px;
        font-size: var(--text-xs);
        font-weight: 600;
      }
      .sort-wrap {
        position: relative;
      }
      .sort-button,
      .footer-button {
        border: 0;
        background: transparent;
        color: var(--color-text);
        display: grid;
        place-items: center;
        border-radius: var(--radius-sm);
        width: 32px;
        height: 32px;
      }
      .sort-button:hover,
      .footer-button:hover {
        background: var(--color-surface);
      }
      .sort-button {
        display: flex;
        width: auto;
        gap: 2px;
      }
      .sort-menu {
        position: absolute;
        z-index: 5;
        top: 38px;
        right: 0;
        width: 194px;
        background: var(--color-bg);
        border: 1px solid var(--color-line);
        border-radius: var(--radius-md);
        box-shadow: 0 12px 30px rgba(20, 30, 45, 0.16);
        padding: 6px;
      }
      .menu-label {
        color: var(--color-muted);
        font-size: var(--text-xs);
        padding: 8px 9px 4px;
      }
      .menu-item {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border: 0;
        border-radius: 6px;
        padding: 8px 9px;
        background: transparent;
        color: var(--color-text);
        text-align: left;
        font-size: var(--text-sm);
      }
      .menu-item:hover,
      .menu-item[aria-checked='true'] {
        background: var(--color-surface);
      }
      .divider {
        border-top: 1px solid var(--color-line);
        margin: 5px 0;
      }
      .list {
        flex: 1;
        overflow-y: auto;
        padding: 0 20px;
        scrollbar-width: thin;
      }
      .empty {
        height: 100%;
        min-height: 235px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        padding: 0 24px 34px;
      }
      .empty h2 {
        font-size: 18px;
        letter-spacing: -0.03em;
        margin: 0 0 9px;
        font-weight: 600;
      }
      .empty p {
        margin: 0;
        color: var(--color-muted);
        font-size: var(--text-md);
        line-height: 1.5;
      }
      footer {
        flex: none;
        min-height: 58px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 16px;
        background: var(--color-bg);
        border-top: 1px solid var(--color-line);
      }
      .search-box {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        flex: 1;
      }
      .search-field {
        min-width: 0;
        width: 0;
        opacity: 0;
        border: 0;
        padding: 0;
        color: var(--color-text);
        background: transparent;
        transition:
          width var(--motion-smooth) ease,
          opacity var(--motion-smooth) ease;
      }
      .search-box.open .search-field {
        width: 100%;
        opacity: 1;
        padding: 6px;
      }
      .search-field:focus {
        outline: 0;
        box-shadow: inset 0 -2px var(--color-accent);
      }
      .search-box.open {
        flex: 1;
      }
      .search-box:not(.open) {
        flex: 0;
      }
      .search-box:not(.open) .search-field,
      .search-box:not(.open) .close-search {
        display: none;
      }
      .undo {
        position: absolute;
        bottom: 66px;
        left: 16px;
        right: 16px;
        background: var(--color-text);
        color: var(--color-bg);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 12px;
        border-radius: var(--radius-sm);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
        font-size: var(--text-sm);
      }
      .undo button {
        border: 0;
        background: transparent;
        color: inherit;
        font-weight: 700;
        padding: 4px;
      }
      dialog {
        width: 100%;
        height: 60%;
        max-height: 410px;
        max-width: none;
        margin: auto 0 0;
        border: 0;
        border-radius: 20px 20px 0 0;
        padding: 0;
        background: var(--color-bg);
        color: var(--color-text);
        box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
      }
      dialog::backdrop {
        background: rgba(17, 25, 39, 0.32);
        backdrop-filter: blur(3px);
      }
      .sheet-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px;
        border-bottom: 1px solid var(--color-line);
      }
      .sheet-head h2 {
        margin: 0;
        font-size: 16px;
      }
      .sheet-body {
        padding: 8px 20px 20px;
      }
      .setting-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 17px 0;
        border-bottom: 1px solid var(--color-line);
        font-size: var(--text-md);
      }
      .theme-options {
        display: flex;
        gap: 5px;
      }
      .theme-options button {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        border: 1px solid var(--color-line);
        background: var(--color-bg);
        color: var(--color-text);
      }
      .theme-options button[aria-pressed='true'] {
        background: var(--color-text);
        color: var(--color-bg);
      }
      .setting-row input {
        accent-color: var(--color-accent);
        width: 17px;
        height: 17px;
      }
      .details {
        display: block;
        margin-top: 22px;
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--color-accent);
      }
      .sheet-foot {
        padding: 0 20px 20px;
        color: var(--color-muted);
        font-size: var(--text-xs);
      }
    `,
  ];

  @state() private items: ListItemData[] | null = null;
  @state() private settings: ReadingListSettings = DEFAULT_SETTINGS;
  @state() private searchOpen = false;
  @state() private query = '';
  @state() private sortOpen = false;
  @state() private message = '';
  @state() private loadError = false;
  @state() private localOnly = 0;
  @state() private syncUnavailable = false;
  @state() private conflicts = 0;
  @state() private deleted: ListItemData | null = null;
  private refreshTimer: number | null = null;
  private themeMedia = window.matchMedia('(prefers-color-scheme: dark)');

  override connectedCallback() {
    super.connectedCallback();
    document.title = i18n.getMessage('appName', 'Reading List');
    chrome.storage.onChanged.addListener(this.onStorageChanged);
    this.addEventListener('keydown', this.onKeydown);
    document.addEventListener('pointerdown', this.onOutsidePointer);
    this.themeMedia.addEventListener('change', this.onSystemTheme);
    void this.load();
  }
  override disconnectedCallback() {
    chrome.storage.onChanged.removeListener(this.onStorageChanged);
    this.removeEventListener('keydown', this.onKeydown);
    document.removeEventListener('pointerdown', this.onOutsidePointer);
    this.themeMedia.removeEventListener('change', this.onSystemTheme);
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    super.disconnectedCallback();
  }
  private onSystemTheme = () => this.applyTheme();
  private onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.sortOpen) {
      this.sortOpen = false;
      this.focusSort();
    }
  };
  private onOutsidePointer = (event: PointerEvent) => {
    if (
      this.sortOpen &&
      !event
        .composedPath()
        .includes(this.shadowRoot?.querySelector('.sort-wrap') as EventTarget)
    )
      this.sortOpen = false;
  };
  private applyTheme() {
    this.dataset.theme = resolvedTheme(this.settings.theme);
  }
  private async load() {
    try {
      this.items = await rl.getListItems();
      this.settings = await rl.getSettings();
      this.applyTheme();
      this.localOnly = rl.localOnlyCount;
      this.syncUnavailable = !rl.isSyncAvailable;
      this.conflicts = rl.conflictCount;
      this.loadError = false;
    } catch (error) {
      console.error(error);
      this.loadError = true;
      this.message = 'Could not load your list.';
    }
  }
  private onStorageChanged = (
    _changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    if (area !== 'sync') return;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void rl
        .refresh()
        .then(() => this.load())
        .catch((error) => {
          console.error(error);
          this.message = 'Could not refresh the list.';
        });
    }, 100);
  };
  private get visibleItems() {
    return sortList(this.items ?? [], this.settings).filter(
      (item) =>
        (this.settings.viewAll || !item.viewed) &&
        (!this.query ||
          `${item.title} ${item.url}`
            .toLocaleLowerCase()
            .includes(this.query.toLocaleLowerCase())),
    );
  }
  private get warningText() {
    const parts = [];
    if (this.localOnly)
      parts.push(
        `${this.localOnly} page${this.localOnly === 1 ? '' : 's'} saved only on this device.`,
      );
    if (this.syncUnavailable && !this.localOnly)
      parts.push('Chrome sync is unavailable. Your local list is shown.');
    if (this.conflicts)
      parts.push(
        `${this.conflicts} conflicting version${this.conflicts === 1 ? '' : 's'} kept in backup data.`,
      );
    return parts.join(' ');
  }
  private get sortLabel() {
    const mode = { manual: 'Manual', date: 'Date', title: 'Title' }[
      this.settings.sortOption
    ];
    const direction =
      this.settings.sortOption === 'manual'
        ? ''
        : this.settings.sortOrder === 'up'
          ? ', ascending'
          : ', descending';
    return `Sort: ${mode}${direction}`;
  }
  override render() {
    const visible = this.visibleItems;
    return html`
      <header>
        <h1>Reading List</h1>
        <button
          class="save"
          aria-label="Save current page"
          title="Save current page"
          ?disabled=${this.items === null}
          @click=${this.saveCurrent}
        >
          ${icon(Plus, 23)}
        </button>
      </header>
      ${this.localOnly || this.syncUnavailable || this.conflicts
        ? html`<div class="warning" role="status">
            <span>${this.warningText}</span
            ><button @click=${this.retrySync}>Retry</button>
          </div>`
        : ''}
      ${this.message
        ? html`<p class="feedback" role="status">${this.message}</p>`
        : ''}
      ${this.items !== null && this.items.length
        ? html`<div class="list-head">
            <span class="list-label"
              >My List <span class="count">${this.items.length}</span></span
            >
            <div class="sort-wrap">
              <button
                class="sort-button"
                aria-label=${this.sortLabel}
                aria-haspopup="menu"
                aria-expanded=${this.sortOpen}
                @click=${this.toggleSort}
              >
                ${icon(
                  this.settings.sortOption === 'title'
                    ? this.settings.sortOrder === 'up'
                      ? ArrowUpAZ
                      : ArrowDownAZ
                    : this.settings.sortOption === 'date'
                      ? CalendarDays
                      : ArrowDownUp,
                  18,
                )}${icon(ChevronDown, 13)}</button
              >${this.sortOpen
                ? html`<div
                    class="sort-menu"
                    role="menu"
                    aria-label="Sort pages"
                    @keydown=${this.onSortMenuKeydown}
                  >
                    <div class="menu-label">Sort by</div>
                    ${(['manual', 'date', 'title'] as const).map(
                      (mode) =>
                        html`<button
                          class="menu-item"
                          role="menuitemradio"
                          aria-checked=${this.settings.sortOption === mode}
                          @click=${() => this.changeSort(mode)}
                        >
                          ${{
                            manual: 'Manual order',
                            date: 'Date added',
                            title: 'Title',
                          }[mode]}${this.settings.sortOption === mode
                            ? icon(Check, 15)
                            : ''}
                        </button>`,
                    )}
                    <div class="divider"></div>
                    <div class="menu-label">Direction</div>
                    ${(['down', 'up'] as const).map(
                      (order) =>
                        html`<button
                          class="menu-item"
                          role="menuitemradio"
                          aria-checked=${this.settings.sortOrder === order}
                          ?disabled=${this.settings.sortOption === 'manual'}
                          @click=${() => this.changeOrder(order)}
                        >
                          ${order === 'down' ? 'Descending' : 'Ascending'}${this
                            .settings.sortOrder === order
                            ? icon(Check, 15)
                            : ''}
                        </button>`,
                    )}
                  </div>`
                : ''}
            </div>
          </div>`
        : ''}
      <div class="list">
        ${this.loadError
          ? html`<div class="empty">
              <h2>Couldn’t load your list</h2>
              <p>Try reopening Reading List.</p>
            </div>`
          : this.items === null
            ? html`<div class="empty"><p>Loading your pages…</p></div>`
            : !this.items.length
              ? html`<div class="empty">
                  <h2>Save your first page</h2>
                  <p>Click the + button to save your first page.</p>
                </div>`
              : !visible.length
                ? html`<div class="empty">
                    <h2>No pages found</h2>
                    <p>Try another search or show all pages in settings.</p>
                  </div>`
                : repeat(
                    visible,
                    (item) => item.url,
                    (item) =>
                      html`<reading-list-item
                        .name=${item.title}
                        .href=${item.url}
                        .newtab=${this.settings.openNewTab}
                        .reorderable=${this.settings.sortOption === 'manual'}
                        .viewed=${!!item.viewed}
                        data-theme=${resolvedTheme(this.settings.theme)}
                        @delete-item=${this.deleteItem}
                        @update-title=${this.updateTitle}
                        @move-item=${this.moveItem}
                        @viewed-item=${this.markViewed}
                        @item-message=${(event: CustomEvent<string>) =>
                          (this.message = event.detail)}
                      ></reading-list-item>`,
                  )}
      </div>
      <footer>
        <div class=${`search-box ${this.searchOpen ? 'open' : ''}`}>
          <button
            class="footer-button search-toggle"
            aria-label=${this.searchOpen ? 'Search pages' : 'Open search'}
            title="Search"
            @click=${this.openSearch}
          >
            ${icon(Search, 20)}</button
          ><input
            class="search-field"
            type="search"
            aria-label="Search saved pages"
            placeholder="Find a page"
            .value=${this.query}
            @input=${(event: Event) =>
              (this.query = (event.target as HTMLInputElement).value)}
            @keydown=${this.searchKeydown}
          /><button
            class="footer-button close-search"
            aria-label="Close search"
            title="Close search"
            @click=${this.closeSearch}
          >
            ${icon(X, 18)}
          </button>
        </div>
        <button
          class="footer-button settings-toggle"
          aria-label="Open settings"
          title="Settings"
          @click=${this.openSettings}
        >
          ${icon(Settings, 20)}
        </button>
      </footer>
      ${this.deleted
        ? html`<div class="undo" role="status">
            <span>Page deleted</span
            ><button @click=${this.undoDelete}>Undo</button>
          </div>`
        : ''}
      <dialog @close=${this.restoreSettingsFocus} @click=${this.onDialogClick}>
        <div class="sheet-head">
          <h2>Settings</h2>
          <button
            class="footer-button"
            aria-label="Close settings"
            @click=${this.closeSettings}
          >
            ${icon(X, 20)}
          </button>
        </div>
        <div class="sheet-body">
          <div class="setting-row">
            <span
              >Theme
              (${this.settings.theme.charAt(0).toUpperCase() +
              this.settings.theme.slice(1)})</span
            >
            <div class="theme-options">
              <button
                aria-label="System theme"
                title="System"
                aria-pressed=${this.settings.theme === 'system'}
                @click=${() => this.changeTheme('system')}
              >
                ${icon(Monitor, 17)}</button
              ><button
                aria-label="Light theme"
                title="Light"
                aria-pressed=${this.settings.theme === 'light'}
                @click=${() => this.changeTheme('light')}
              >
                ${icon(Sun, 17)}</button
              ><button
                aria-label="Dark theme"
                title="Dark"
                aria-pressed=${this.settings.theme === 'dark'}
                @click=${() => this.changeTheme('dark')}
              >
                ${icon(Moon, 17)}
              </button>
            </div>
          </div>
          <label class="setting-row"
            ><span>Open links in a new tab</span
            ><input
              type="checkbox"
              .checked=${this.settings.openNewTab}
              @change=${(event: Event) =>
                this.saveSettings({
                  ...this.settings,
                  openNewTab: (event.target as HTMLInputElement).checked,
                })} /></label
          ><label class="setting-row"
            ><span>Show viewed pages</span
            ><input
              type="checkbox"
              .checked=${this.settings.viewAll}
              @change=${(event: Event) =>
                this.saveSettings({
                  ...this.settings,
                  viewAll: (event.target as HTMLInputElement).checked,
                })} /></label
          ><a class="details" href="options.html" target="_blank" rel="noopener"
            >Backups, import, and detailed settings →</a
          >
        </div>
        <div class="sheet-foot">Version 3.1.0</div>
      </dialog>
    `;
  }
  private onSortMenuKeydown(event: KeyboardEvent) {
    if (
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowUp' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    )
      return;
    event.preventDefault();
    const buttons = [
      ...(this.shadowRoot?.querySelectorAll<HTMLButtonElement>(
        '.sort-menu button:not(:disabled)',
      ) ?? []),
    ];
    if (!buttons.length) return;
    const current = buttons.indexOf(event.target as HTMLButtonElement);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
            buttons.length;
    buttons[next].focus();
  }
  private toggleSort() {
    this.sortOpen = !this.sortOpen;
    if (this.sortOpen)
      void this.updateComplete.then(() =>
        this.shadowRoot
          ?.querySelector<HTMLButtonElement>('.sort-menu button')
          ?.focus(),
      );
  }
  private async changeSort(sortOption: ReadingListSettings['sortOption']) {
    await this.saveSettings({ ...this.settings, sortOption });
    this.sortOpen = false;
    this.focusSort();
  }
  private async changeOrder(sortOrder: ReadingListSettings['sortOrder']) {
    await this.saveSettings({ ...this.settings, sortOrder });
    this.sortOpen = false;
    this.focusSort();
  }
  private focusSort() {
    void this.updateComplete.then(() =>
      this.shadowRoot
        ?.querySelector<HTMLButtonElement>('.sort-button')
        ?.focus(),
    );
  }
  private openSearch() {
    if (this.searchOpen) {
      this.shadowRoot
        ?.querySelector<HTMLInputElement>('.search-field')
        ?.focus();
      return;
    }
    this.searchOpen = true;
    void this.updateComplete.then(() =>
      this.shadowRoot
        ?.querySelector<HTMLInputElement>('.search-field')
        ?.focus(),
    );
  }
  private closeSearch() {
    this.query = '';
    this.searchOpen = false;
    void this.updateComplete.then(() =>
      this.shadowRoot
        ?.querySelector<HTMLButtonElement>('.search-toggle')
        ?.focus(),
    );
  }
  private searchKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.closeSearch();
    }
  }
  private openSettings() {
    this.shadowRoot?.querySelector<HTMLDialogElement>('dialog')?.showModal();
    void this.updateComplete.then(() =>
      this.shadowRoot
        ?.querySelector<HTMLButtonElement>('.sheet-head button')
        ?.focus(),
    );
  }
  private closeSettings() {
    this.shadowRoot?.querySelector<HTMLDialogElement>('dialog')?.close();
  }
  private restoreSettingsFocus() {
    this.shadowRoot
      ?.querySelector<HTMLButtonElement>('.settings-toggle')
      ?.focus();
  }
  private onDialogClick(event: MouseEvent) {
    if (event.target === this.shadowRoot?.querySelector('dialog'))
      this.closeSettings();
  }
  private async saveSettings(settings: ReadingListSettings) {
    try {
      const synced = await rl.saveSettings(settings);
      this.settings = settings;
      this.applyTheme();
      this.message = synced
        ? ''
        : 'Settings saved on this device. Chrome sync is unavailable.';
    } catch (error) {
      console.error(error);
      this.message = 'Could not save settings.';
    }
  }
  private changeTheme(theme: ReadingListSettings['theme']) {
    void this.saveSettings({ ...this.settings, theme });
  }
  private async saveCurrent() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.url || !tab.title) {
        this.message = 'This page cannot be saved.';
        return;
      }
      const result = await rl.addReadingItem({
        url: tab.url,
        title: tab.title,
        addedAt: Date.now(),
      });
      this.items = [
        result.item,
        ...(this.items ?? []).filter((item) => item.url !== tab.url),
      ];
      this.localOnly = rl.localOnlyCount;
      this.syncUnavailable = !rl.isSyncAvailable;
      this.message = result.synced
        ? 'Saved on this device and written to Chrome sync storage.'
        : 'Saved only on this device.';
    } catch (error) {
      console.error(error);
      this.message = 'Could not save this page.';
    }
  }
  private async retrySync() {
    try {
      const result = await rl.retrySync();
      this.localOnly = result.remaining;
      this.syncUnavailable = false;
      this.conflicts = result.conflicts;
      this.message = `${result.synced} written to Chrome sync storage; ${result.remaining} saved only on this device.`;
    } catch (error) {
      console.error(error);
      this.message = 'Chrome sync is unavailable. Your local pages are safe.';
    }
  }
  private async deleteItem(event: CustomEvent<{ url: string }>) {
    const item = this.items?.find((entry) => entry.url === event.detail.url);
    if (!item) return;
    try {
      const synced = await rl.removeReadingItem(item.url);
      this.items = (this.items ?? []).filter((entry) => entry.url !== item.url);
      this.deleted = item;
      this.localOnly = rl.localOnlyCount;
      this.syncUnavailable = !rl.isSyncAvailable;
      this.message = synced
        ? ''
        : 'Removed on this device. Chrome sync is unavailable.';
      void this.updateComplete.then(() => {
        const next =
          this.shadowRoot
            ?.querySelector<HTMLElement>('reading-list-item')
            ?.shadowRoot?.querySelector<HTMLElement>('.link') ??
          this.shadowRoot?.querySelector<HTMLButtonElement>('.save');
        next?.focus();
      });
    } catch (error) {
      console.error(error);
      this.message = 'Could not delete this page.';
    }
  }
  private async undoDelete() {
    const item = this.deleted;
    if (!item) return;
    try {
      const result = await rl.addReadingItem(item);
      this.items = [
        result.item,
        ...(this.items ?? []).filter((entry) => entry.url !== item.url),
      ];
      this.deleted = null;
      this.localOnly = rl.localOnlyCount;
      this.syncUnavailable = !rl.isSyncAvailable;
      this.message = result.synced
        ? 'Page restored on this device and written to Chrome sync storage.'
        : 'Page restored only on this device.';
      void this.updateComplete.then(() =>
        this.shadowRoot
          ?.querySelector<HTMLButtonElement>('.sort-button, .save')
          ?.focus(),
      );
    } catch (error) {
      console.error(error);
      this.message = 'Could not restore the page. Try Undo again.';
    }
  }
  private async updateTitle(
    event: CustomEvent<{ url: string; title: string }>,
  ) {
    try {
      const result = await rl.updateTitle(event.detail.url, event.detail.title);
      this.items = (this.items ?? []).map((item) =>
        item.url === result.item.url ? result.item : item,
      );
      this.localOnly = rl.localOnlyCount;
      this.message = result.synced
        ? 'Title saved on this device and written to Chrome sync storage.'
        : 'Title saved only on this device.';
    } catch (error) {
      console.error(error);
      this.message = 'Could not change the title.';
    }
  }
  private async moveItem(
    event: CustomEvent<{ url: string; direction: -1 | 1 }>,
  ) {
    try {
      const synced = await rl.moveItem(
        event.detail.url,
        event.detail.direction,
      );
      this.items = await rl.getListItems();
      this.localOnly = rl.localOnlyCount;
      this.message = synced ? '' : 'Order saved only on this device.';
    } catch (error) {
      console.error(error);
      this.message = 'Could not change the order.';
    }
  }
  private markViewed(event: CustomEvent<{ url: string }>) {
    this.items = (this.items ?? []).map((item) =>
      item.url === event.detail.url ? { ...item, viewed: true } : item,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'reading-list-app': ReadingListAppElement;
  }
}
