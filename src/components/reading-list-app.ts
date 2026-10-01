import { LitElement, html, css } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { customElement, state } from 'lit/decorators.js';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowDownUp,
  CalendarArrowDown,
  CalendarArrowUp,
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
        padding: 22px var(--content-gutter) 18px;
        border-bottom: 1px solid var(--color-line);
      }
      h1 {
        margin: 0;
        font-size: var(--text-lg);
        font-weight: var(--weight-medium);
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
        padding: 8px var(--content-gutter);
        background: #fef7e0;
        color: #67480c;
        font-size: var(--text-xs);
        line-height: 1.35;
        border-left: 3px solid var(--color-warning);
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
        font-weight: var(--weight-medium);
        padding: 4px;
      }
      .feedback {
        margin: 0;
        padding: 6px var(--content-gutter);
        color: var(--color-muted);
        font-size: var(--text-xs);
      }
      .list-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px var(--content-gutter) 8px;
      }
      .list-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: var(--text-md);
        font-weight: var(--weight-medium);
      }
      .count {
        border-radius: var(--radius-pill);
        background: var(--color-surface);
        padding: 2px 7px;
        font-size: var(--text-xs);
        font-weight: var(--weight-medium);
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
        transform-origin: top right;
        animation: menu-in var(--motion-fast) cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      .sort-menu.closing {
        pointer-events: none;
        animation: menu-out var(--motion-fast) ease-in both;
      }
      @keyframes menu-in {
        from {
          opacity: 0;
          transform: translateY(-5px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      @keyframes menu-out {
        from {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        to {
          opacity: 0;
          transform: translateY(-5px) scale(0.97);
        }
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
        padding: 0 var(--content-gutter) 28px;
        -webkit-mask-image: linear-gradient(
          to bottom,
          #000 0,
          #000 calc(100% - 28px),
          transparent 100%
        );
        mask-image: linear-gradient(
          to bottom,
          #000 0,
          #000 calc(100% - 28px),
          transparent 100%
        );
        scrollbar-width: thin;
        scrollbar-color: transparent transparent;
      }
      .list:hover,
      .list:focus-within,
      .sheet-body:hover,
      .sheet-body:focus-within {
        scrollbar-color: var(--color-muted) transparent;
      }
      .list::-webkit-scrollbar,
      .sheet-body::-webkit-scrollbar {
        width: 6px;
      }
      .list::-webkit-scrollbar-track,
      .sheet-body::-webkit-scrollbar-track {
        background: transparent;
      }
      .list::-webkit-scrollbar-thumb,
      .sheet-body::-webkit-scrollbar-thumb {
        background: transparent;
        border-radius: 999px;
      }
      .list:hover::-webkit-scrollbar-thumb,
      .list:focus-within::-webkit-scrollbar-thumb,
      .sheet-body:hover::-webkit-scrollbar-thumb,
      .sheet-body:focus-within::-webkit-scrollbar-thumb {
        background: var(--color-muted);
      }
      .empty {
        height: 100%;
        min-height: 235px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        padding: 0 var(--content-gutter) 34px;
      }
      .empty h2 {
        font-size: 18px;
        margin: 0 0 9px;
        font-weight: var(--weight-medium);
      }
      .empty p {
        margin: 0;
        color: var(--color-muted);
        font-size: var(--text-md);
        line-height: 1.5;
      }
      footer {
        position: relative;
        flex: none;
        min-height: 58px;
        display: flex;
        align-items: center;
        padding: 8px var(--content-gutter);
        background: var(--color-bg);
      }
      .search-box {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        flex: 0 1 auto;
        transition: flex-grow var(--motion-smooth)
          cubic-bezier(0.22, 1, 0.36, 1);
      }
      .search-box.open,
      .search-box.closing {
        flex-grow: 1;
        padding-right: 40px;
      }
      .search-field {
        min-width: 0;
        flex: 1;
        border: 0;
        padding: 6px;
        color: var(--color-text);
        background: transparent;
        font-size: var(--text-md);
      }
      .search-field:focus {
        outline: 0;
      }
      .close-search,
      .settings-toggle {
        position: absolute;
        right: var(--content-gutter);
        top: 13px;
      }
      .settings-toggle {
        transition:
          opacity var(--motion-smooth) ease,
          transform var(--motion-smooth) ease;
      }
      footer.search-active .settings-toggle {
        opacity: 0;
        transform: translateY(8px);
        pointer-events: none;
      }
      .search-box.open .search-field,
      .search-box.open .close-search {
        animation: search-rise 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      .search-box.closing .search-field,
      .search-box.closing .close-search {
        animation: search-fall var(--motion-smooth) cubic-bezier(0.4, 0, 1, 1)
          both;
      }
      @keyframes search-rise {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes search-fall {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(8px);
        }
      }
      .undo {
        position: absolute;
        bottom: 66px;
        left: var(--content-gutter);
        right: var(--content-gutter);
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
        font-weight: var(--weight-medium);
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
        overflow: hidden;
        flex-direction: column;
      }
      dialog[open] {
        display: flex;
        animation: sheet-in var(--motion-smooth) cubic-bezier(0.2, 0.8, 0.2, 1)
          both;
      }
      dialog[open].closing {
        animation: sheet-out var(--motion-smooth) ease-in both;
      }
      @keyframes sheet-in {
        from {
          opacity: 0;
          transform: translateY(100%);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes sheet-out {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(100%);
        }
      }
      dialog::backdrop {
        background: rgba(17, 25, 39, 0.32);
        backdrop-filter: blur(3px);
        animation: backdrop-in var(--motion-smooth) ease-out both;
      }
      dialog.closing::backdrop {
        animation: backdrop-out var(--motion-smooth) ease-in both;
      }
      @keyframes backdrop-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes backdrop-out {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }
      .sheet-head,
      .sheet-foot {
        flex: none;
      }
      .sheet-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px var(--content-gutter);
        border-bottom: 1px solid var(--color-line);
      }
      .sheet-head h2 {
        margin: 0;
        font-size: 20px;
        font-weight: var(--weight-medium);
      }
      .sheet-body {
        padding: 8px var(--content-gutter) 20px;
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: transparent transparent;
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
      .details {
        display: block;
        margin-top: 22px;
        font-size: var(--text-sm);
        font-weight: var(--weight-medium);
        color: var(--color-accent);
      }
      .sheet-foot {
        padding: 0 var(--content-gutter) 20px;
        color: var(--color-muted);
        font-size: var(--text-xs);
      }
    `,
  ];

  @state() private items: ListItemData[] | null = null;
  @state() private settings: ReadingListSettings = DEFAULT_SETTINGS;
  @state() private searchOpen = false;
  @state() private searchClosing = false;
  @state() private query = '';
  @state() private sortOpen = false;
  @state() private sortClosing = false;
  @state() private message = '';
  @state() private loadError = false;
  @state() private localOnly = 0;
  @state() private syncUnavailable = false;
  @state() private conflicts = 0;
  @state() private deleted: ListItemData | null = null;
  @state() private draggedUrl: string | null = null;
  @state() private dragInsertIndex: number | null = null;
  private dragHeight = 68;
  private refreshTimer: number | null = null;
  private searchCloseTimer: number | null = null;
  private sortCloseTimer: number | null = null;
  private sheetCloseTimer: number | null = null;
  private reordering = false;
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
    if (this.searchCloseTimer) clearTimeout(this.searchCloseTimer);
    if (this.sortCloseTimer) clearTimeout(this.sortCloseTimer);
    if (this.sheetCloseTimer) clearTimeout(this.sheetCloseTimer);
    super.disconnectedCallback();
  }
  private onSystemTheme = () => this.applyTheme();
  private onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.sortOpen) {
      this.closeSort();
      this.focusSort();
    }
  };
  private onOutsidePointer = (event: PointerEvent) => {
    const path = event.composedPath();
    if (
      this.sortOpen &&
      !path.includes(
        this.shadowRoot?.querySelector('.sort-wrap') as EventTarget,
      )
    )
      this.closeSort();
    if (
      this.searchOpen &&
      !path.includes(
        this.shadowRoot?.querySelector('.search-box') as EventTarget,
      )
    )
      window.setTimeout(() => this.closeSearch(false), 0);
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
  private dragOffset(url: string, visible: ListItemData[]): number {
    if (
      !this.draggedUrl ||
      this.dragInsertIndex === null ||
      url === this.draggedUrl
    )
      return 0;
    const source = visible.findIndex((item) => item.url === this.draggedUrl);
    const current = visible.findIndex((item) => item.url === url);
    if (source < 0 || current < 0) return 0;
    if (
      this.dragInsertIndex > source &&
      current > source &&
      current <= this.dragInsertIndex
    )
      return -this.dragHeight;
    if (
      this.dragInsertIndex < source &&
      current >= this.dragInsertIndex &&
      current < source
    )
      return this.dragHeight;
    return 0;
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
                      ? this.settings.sortOrder === 'up'
                        ? CalendarArrowUp
                        : CalendarArrowDown
                      : ArrowDownUp,
                  18,
                )}${icon(ChevronDown, 13)}</button
              >${this.sortOpen || this.sortClosing
                ? html`<div
                    class=${`sort-menu ${this.sortClosing ? 'closing' : ''}`}
                    role="menu"
                    aria-label="Sort pages"
                    ?inert=${this.sortClosing}
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
                    ${this.settings.sortOption === 'manual'
                      ? ''
                      : html` <div class="divider"></div>
                          <div class="menu-label">Direction</div>
                          ${(['down', 'up'] as const).map(
                            (order) =>
                              html`<button
                                class="menu-item"
                                role="menuitemradio"
                                aria-checked=${this.settings.sortOrder ===
                                order}
                                @click=${() => this.changeOrder(order)}
                              >
                                ${order === 'down'
                                  ? 'Descending'
                                  : 'Ascending'}${this.settings.sortOrder ===
                                order
                                  ? icon(Check, 15)
                                  : ''}
                              </button>`,
                          )}`}
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
                    (item, index) =>
                      html`<reading-list-item
                        .name=${item.title}
                        .href=${item.url}
                        .newtab=${this.settings.openNewTab}
                        .reorderable=${this.settings.sortOption === 'manual'}
                        .viewed=${!!item.viewed}
                        .last=${index === visible.length - 1}
                        style=${`--drag-offset: ${this.dragOffset(item.url, visible)}px`}
                        ?drag-active=${this.draggedUrl === item.url}
                        data-theme=${resolvedTheme(this.settings.theme)}
                        @delete-item=${this.deleteItem}
                        @update-title=${this.updateTitle}
                        @move-item=${this.moveItem}
                        @reorder-start=${this.reorderStart}
                        @reorder-preview=${this.reorderPreview}
                        @reorder-end=${this.reorderEnd}
                        @reorder-drop=${this.reorderDrop}
                        @viewed-item=${this.markViewed}
                        @item-message=${(event: CustomEvent<string>) =>
                          (this.message = event.detail)}
                      ></reading-list-item>`,
                  )}
      </div>
      <footer
        class=${this.searchOpen || this.searchClosing ? 'search-active' : ''}
      >
        <div
          class=${`search-box ${this.searchOpen ? 'open' : this.searchClosing ? 'closing' : ''}`}
        >
          <button
            class="footer-button search-toggle"
            aria-label=${this.searchOpen ? 'Search pages' : 'Open search'}
            title="Search"
            @click=${this.openSearch}
          >
            ${icon(Search, 20)}
          </button>
          ${this.searchOpen || this.searchClosing
            ? html`<input
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
                  @click=${() => this.closeSearch()}
                >
                  ${icon(X, 18)}
                </button>`
            : ''}
        </div>
        <button
          class="footer-button settings-toggle"
          aria-label="Open settings"
          aria-hidden=${this.searchOpen || this.searchClosing}
          tabindex=${this.searchOpen || this.searchClosing ? -1 : 0}
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
      <dialog
        @close=${this.restoreSettingsFocus}
        @cancel=${this.onDialogCancel}
        @click=${this.onDialogClick}
      >
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
              role="switch"
              class="switch"
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
              role="switch"
              class="switch"
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
    if (this.sortOpen) {
      this.closeSort();
      return;
    }
    if (this.sortCloseTimer) clearTimeout(this.sortCloseTimer);
    this.sortClosing = false;
    this.sortOpen = true;
    void this.updateComplete.then(() =>
      this.shadowRoot
        ?.querySelector<HTMLButtonElement>('.sort-menu button')
        ?.focus(),
    );
  }
  private closeSort() {
    if (!this.sortOpen) return;
    this.sortOpen = false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.sortClosing = false;
      return;
    }
    this.sortClosing = true;
    if (this.sortCloseTimer) clearTimeout(this.sortCloseTimer);
    this.sortCloseTimer = window.setTimeout(() => {
      this.sortClosing = false;
      this.sortCloseTimer = null;
    }, 150);
  }
  private async changeSort(sortOption: ReadingListSettings['sortOption']) {
    this.closeSort();
    this.focusSort();
    await this.saveSettings({ ...this.settings, sortOption });
  }
  private async changeOrder(sortOrder: ReadingListSettings['sortOrder']) {
    this.closeSort();
    this.focusSort();
    await this.saveSettings({ ...this.settings, sortOrder });
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
    if (this.searchCloseTimer) clearTimeout(this.searchCloseTimer);
    this.searchCloseTimer = null;
    this.searchClosing = false;
    this.searchOpen = true;
    void this.updateComplete.then(() =>
      this.shadowRoot
        ?.querySelector<HTMLInputElement>('.search-field')
        ?.focus(),
    );
  }
  private closeSearch(restoreFocus = true) {
    if (!this.searchOpen) return;
    this.searchOpen = false;
    const finish = () => {
      this.query = '';
      this.searchClosing = false;
      this.searchCloseTimer = null;
      if (restoreFocus)
        void this.updateComplete.then(() =>
          this.shadowRoot
            ?.querySelector<HTMLButtonElement>('.search-toggle')
            ?.focus(),
        );
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else {
      this.searchClosing = true;
      this.searchCloseTimer = window.setTimeout(finish, 220);
    }
  }
  private searchKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.closeSearch();
    }
  }
  private openSettings() {
    const dialog = this.shadowRoot?.querySelector<HTMLDialogElement>('dialog');
    if (!dialog || dialog.open) return;
    dialog.showModal();
    void this.updateComplete.then(() =>
      this.shadowRoot
        ?.querySelector<HTMLButtonElement>('.sheet-head button')
        ?.focus(),
    );
  }
  private closeSettings() {
    const dialog = this.shadowRoot?.querySelector<HTMLDialogElement>('dialog');
    if (!dialog?.open || dialog.classList.contains('closing')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dialog.close();
      return;
    }
    dialog.classList.add('closing');
    this.sheetCloseTimer = window.setTimeout(() => {
      dialog.close();
      dialog.classList.remove('closing');
      this.sheetCloseTimer = null;
    }, 220);
  }
  private onDialogCancel(event: Event) {
    event.preventDefault();
    this.closeSettings();
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
    if (this.reordering) return;
    this.reordering = true;
    try {
      const synced = await rl.moveItem(
        event.detail.url,
        event.detail.direction,
      );
      this.items = await rl.getListItems();
      this.localOnly = rl.localOnlyCount;
      this.message = synced
        ? 'Manual order updated.'
        : 'Order saved only on this device.';
    } catch (error) {
      console.error(error);
      this.message = 'Could not change the order.';
    } finally {
      this.reordering = false;
    }
  }
  private reorderStart(event: CustomEvent<{ url: string }>) {
    if (this.settings.sortOption !== 'manual' || this.reordering) return;
    const visible = this.visibleItems;
    this.dragHeight = Math.max(
      (event.target as HTMLElement).getBoundingClientRect().height,
      68,
    );
    this.draggedUrl = event.detail.url;
    this.dragInsertIndex = visible.findIndex(
      (item) => item.url === event.detail.url,
    );
  }
  private reorderPreview(
    event: CustomEvent<{ targetUrl: string; placement: 'before' | 'after' }>,
  ) {
    if (!this.draggedUrl || event.detail.targetUrl === this.draggedUrl) return;
    const others = this.visibleItems.filter(
      (item) => item.url !== this.draggedUrl,
    );
    const target = others.findIndex(
      (item) => item.url === event.detail.targetUrl,
    );
    if (target < 0) return;
    const next = target + (event.detail.placement === 'after' ? 1 : 0);
    if (next !== this.dragInsertIndex) this.dragInsertIndex = next;
  }
  private reorderEnd() {
    this.draggedUrl = null;
    this.dragInsertIndex = null;
  }
  private async reorderDrop(
    event: CustomEvent<{
      sourceUrl: string;
      targetUrl: string;
      placement: 'before' | 'after';
    }>,
  ) {
    if (this.reordering || this.settings.sortOption !== 'manual') return;
    this.reordering = true;
    const previous = this.items;
    const oldRects = new Map(
      [
        ...(this.shadowRoot?.querySelectorAll<HTMLElement>(
          'reading-list-item',
        ) ?? []),
      ].map((row) => [
        (row as HTMLElement & { href: string }).href,
        row.getBoundingClientRect(),
      ]),
    );
    try {
      const ordered = sortList(previous ?? [], {
        ...this.settings,
        sortOption: 'manual',
      });
      const from = ordered.findIndex(
        (item) => item.url === event.detail.sourceUrl,
      );
      if (from < 0) return;
      const [moved] = ordered.splice(from, 1);
      const target = ordered.findIndex(
        (item) => item.url === event.detail.targetUrl,
      );
      if (target < 0) return;
      ordered.splice(
        target + (event.detail.placement === 'after' ? 1 : 0),
        0,
        moved,
      );
      this.items = ordered.map((item, index) => ({
        ...item,
        index: index + 1,
      }));
      this.reorderEnd();
      await this.updateComplete;
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        for (const row of this.shadowRoot?.querySelectorAll<HTMLElement>(
          'reading-list-item',
        ) ?? []) {
          const before = oldRects.get(
            (row as HTMLElement & { href: string }).href,
          );
          if (!before || typeof row.animate !== 'function') continue;
          const delta = before.top - row.getBoundingClientRect().top;
          if (Math.abs(delta) > 1)
            row.animate(
              [
                { transform: `translateY(${delta}px)` },
                { transform: 'translateY(0)' },
              ],
              {
                duration: 180,
                easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
              },
            );
        }
      }
      const synced = await rl.reorderItem(
        event.detail.sourceUrl,
        event.detail.targetUrl,
        event.detail.placement,
      );
      this.items = await rl.getListItems();
      this.localOnly = rl.localOnlyCount;
      this.message = synced
        ? 'Manual order updated.'
        : 'Order saved only on this device.';
    } catch (error) {
      console.error(error);
      this.items = previous;
      this.message = 'Could not change the order.';
    } finally {
      this.reorderEnd();
      this.reordering = false;
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
