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
  LoaderCircle,
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
import type { ReadingListItemElement } from './reading-list-item.js';
import './reading-list-item.js';
import './reading-list-notice.js';

type TopNotice = {
  variant: 'warning' | 'error';
  message: string;
  action?: () => Promise<void> | void;
  actionLabel?: string;
  key?: string;
};

@customElement('reading-list-app')
export class ReadingListAppElement extends LitElement {
  static override styles = [
    designTokens,
    css`
      :host {
        --footer-height: 52px;
        display: flex;
        flex-direction: column;
        position: relative;
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
      .save.saved svg {
        animation: save-pop var(--motion-smooth) cubic-bezier(0.22, 1, 0.36, 1)
          both;
      }
      @keyframes save-pop {
        from {
          opacity: 0;
          transform: scale(0.65);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
        border: 0;
      }
      .list-head {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px var(--content-gutter);
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
        scrollbar-width: thin;
        scrollbar-color: transparent transparent;
      }
      .list:hover,
      .list:focus-within,
      .sheet-body:hover,
      .sheet-body:focus-within {
        scrollbar-color: var(--color-surface) transparent;
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
        background: var(--color-surface);
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
      .loading {
        height: 100%;
        min-height: 235px;
        display: grid;
        place-items: center;
        color: var(--color-muted);
      }
      .loading svg {
        animation: loader-spin 850ms linear infinite;
      }
      @keyframes loader-spin {
        to {
          transform: rotate(360deg);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .loading svg {
          animation: none !important;
        }
      }
      footer {
        position: relative;
        z-index: 1;
        flex: none;
        height: var(--footer-height);
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px var(--content-gutter) 12px var(--content-gutter);
        background: var(--color-bg);
      }
      footer::before {
        content: '';
        position: absolute;
        bottom: 100%;
        left: 0;
        right: 0;
        height: 32px;
        background: linear-gradient(to bottom, transparent, var(--color-bg));
        pointer-events: none;
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
      }
      .search-toggle svg {
        transform: translate(-1px, -1px);
      }
      .search-field {
        min-width: 0;
        flex: 1;
        border: 0;
        padding: 6px;
        color: var(--color-text);
        background: transparent;
        font-size: var(--text-md);
        -webkit-appearance: none;
        appearance: none;
      }
      .search-field:focus {
        outline: 0;
      }
      .search-field::-webkit-search-cancel-button,
      .search-field::-webkit-search-decoration {
        -webkit-appearance: none;
        appearance: none;
        display: none;
      }
      .search-field::-moz-search-clear-button {
        display: none;
      }
      .footer-end {
        position: relative;
        flex: 0 0 32px;
        width: 32px;
        height: 32px;
        margin-left: auto;
      }
      .footer-end .close-search,
      .footer-end .settings-toggle {
        position: absolute;
        inset: 0;
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
      footer.search-open .close-search {
        animation: search-rise 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      .search-box.closing .search-field,
      footer.search-closing .close-search {
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
      .toast-stack {
        position: absolute;
        z-index: 3;
        bottom: 16px;
        left: var(--content-gutter);
        right: var(--content-gutter);
        display: flex;
        flex-direction: column;
        gap: 6px;
        pointer-events: none;
      }
      .toast {
        min-height: 40px;
        background: var(--color-text);
        color: var(--color-bg);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 5px 7px 5px 12px;
        border-radius: var(--radius-sm);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22);
        font-size: var(--text-sm);
        pointer-events: auto;
        animation: toast-in var(--motion-smooth) cubic-bezier(0.22, 1, 0.36, 1)
          both;
      }
      .toast.closing {
        pointer-events: none;
        animation: toast-out var(--motion-fast) ease-in both;
      }
      @keyframes toast-in {
        from {
          opacity: 0;
          transform: translateY(7px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes toast-out {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(7px);
        }
      }
      .toast-label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .toast-actions {
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .toast button {
        border: 0;
        background: transparent;
        color: inherit;
        font-weight: var(--weight-medium);
        padding: 6px;
        border-radius: 6px;
      }
      .toast button:hover {
        background: rgba(127, 127, 127, 0.16);
      }
      .toast .dismiss {
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        opacity: 0.65;
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
  @state() private topNotice: TopNotice | null = null;
  @state() private dismissedWarningKeys: string[] = [];
  @state() private noticeBusy = false;
  @state() private justSaved = false;
  @state() private recentlySavedUrl: string | null = null;
  @state() private loadError = false;
  @state() private localOnly = 0;
  @state() private syncUnavailable = false;
  @state() private conflictNeedsBackup = false;
  @state() private deleted: ListItemData | null = null;
  @state() private undoClosing = false;
  @state() private infoToast: string | null = null;
  @state() private infoClosing = false;
  @state() private draggedUrl: string | null = null;
  @state() private dragInsertIndex: number | null = null;
  private dragHeight = 68;
  private refreshTimer: number | null = null;
  private searchCloseTimer: number | null = null;
  private sortCloseTimer: number | null = null;
  private sheetCloseTimer: number | null = null;
  private saveFeedbackTimer: number | null = null;
  private savedHighlightTimer: number | null = null;
  private undoAutoTimer: number | null = null;
  private undoCloseTimer: number | null = null;
  private infoAutoTimer: number | null = null;
  private infoCloseTimer: number | null = null;
  private reordering = false;
  private themeMedia = window.matchMedia('(prefers-color-scheme: dark)');

  override connectedCallback() {
    super.connectedCallback();
    document.title = i18n.getMessage('appName', 'Reading List');
    chrome.storage.onChanged.addListener(this.onStorageChanged);
    this.addEventListener('keydown', this.onKeydown);
    document.addEventListener('keydown', this.onSaveShortcut);
    document.addEventListener('pointerdown', this.onOutsidePointer);
    this.themeMedia.addEventListener('change', this.onSystemTheme);
    void this.load();
  }
  override disconnectedCallback() {
    chrome.storage.onChanged.removeListener(this.onStorageChanged);
    this.removeEventListener('keydown', this.onKeydown);
    document.removeEventListener('keydown', this.onSaveShortcut);
    document.removeEventListener('pointerdown', this.onOutsidePointer);
    this.themeMedia.removeEventListener('change', this.onSystemTheme);
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (this.searchCloseTimer) clearTimeout(this.searchCloseTimer);
    if (this.sortCloseTimer) clearTimeout(this.sortCloseTimer);
    if (this.sheetCloseTimer) clearTimeout(this.sheetCloseTimer);
    if (this.saveFeedbackTimer) clearTimeout(this.saveFeedbackTimer);
    if (this.savedHighlightTimer) clearTimeout(this.savedHighlightTimer);
    if (this.undoAutoTimer) clearTimeout(this.undoAutoTimer);
    if (this.undoCloseTimer) clearTimeout(this.undoCloseTimer);
    if (this.infoAutoTimer) clearTimeout(this.infoAutoTimer);
    if (this.infoCloseTimer) clearTimeout(this.infoCloseTimer);
    super.disconnectedCallback();
  }
  private onSystemTheme = () => this.applyTheme();
  private onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.searchOpen) {
      event.preventDefault();
      event.stopPropagation();
      this.closeSearch();
      return;
    }
    if (event.key === 'Escape' && this.sortOpen) {
      event.preventDefault();
      event.stopPropagation();
      this.closeSort();
      this.focusSort();
    }
  };
  private onSaveShortcut = (event: KeyboardEvent) => {
    if (
      event.key.toLowerCase() !== 'a' ||
      event.repeat ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      this.items === null ||
      this.searchOpen ||
      this.searchClosing ||
      this.sortOpen ||
      this.shadowRoot?.querySelector<HTMLDialogElement>('dialog')?.open
    )
      return;
    const editing = event
      .composedPath()
      .some(
        (target) =>
          target instanceof HTMLElement &&
          (target.matches('input, textarea, select, [contenteditable]') ||
            target.isContentEditable),
      );
    if (editing) return;
    event.preventDefault();
    void this.saveCurrent();
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
      ) &&
      !path.includes(
        this.shadowRoot?.querySelector('.footer-end') as EventTarget,
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
      if (this.localOnly === 0) this.conflictNeedsBackup = false;
      this.loadError = false;
      this.topNotice = null;
    } catch (error) {
      console.error(error);
      this.loadError = true;
      this.showError("We couldn't open your list.", () => this.load());
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
          this.showError("We couldn't update your list.", async () => {
            await rl.refresh();
            await this.load();
          });
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
  private get warningNotices(): TopNotice[] {
    const notices: TopNotice[] = [];
    if (this.localOnly > 0) {
      const count = this.localOnly;
      notices.push({
        variant: 'warning',
        key: `${this.conflictNeedsBackup ? 'backup' : 'pages'}:${count}`,
        message: this.conflictNeedsBackup
          ? `${count} page${count === 1 ? ' is' : 's are'} only on this device. Open settings to save a backup.`
          : `${count} page${count === 1 ? ' is' : 's are'} only on this device.`,
        actionLabel: this.conflictNeedsBackup ? 'Open settings' : 'Try again',
        action: this.conflictNeedsBackup
          ? () => chrome.runtime.openOptionsPage()
          : () => this.retrySync(),
      });
    } else if (this.syncUnavailable) {
      notices.push({
        variant: 'warning',
        key: 'sync-unavailable',
        message: "Chrome can't sync right now. Your pages are safe here.",
        action: () => this.retrySync(),
      });
    }
    return notices;
  }
  private get activeNotice(): TopNotice | null {
    if (this.topNotice) return this.topNotice;
    return (
      this.warningNotices.find(
        (notice) => !this.dismissedWarningKeys.includes(notice.key ?? ''),
      ) ?? null
    );
  }
  private showError(message: string, action?: () => Promise<void> | void) {
    this.topNotice = { variant: 'error', message, action };
  }
  private async onNoticeAction(notice: TopNotice) {
    if (!notice.action || this.noticeBusy) return;
    this.noticeBusy = true;
    try {
      await notice.action();
      if (this.topNotice === notice) this.topNotice = null;
    } catch (error) {
      console.error(error);
      this.showError("We couldn't try again.", notice.action);
    } finally {
      this.noticeBusy = false;
    }
  }
  private onNoticeDismiss(notice: TopNotice) {
    if (this.topNotice === notice) this.topNotice = null;
    else if (notice.key)
      this.dismissedWarningKeys = [...this.dismissedWarningKeys, notice.key];
  }
  private get sortLabel() {
    const mode = { manual: 'Manual', date: 'Date', title: 'Title' }[
      this.settings.sortOption
    ];
    const direction =
      this.settings.sortOption === 'date'
        ? this.settings.sortOrder === 'up'
          ? ', oldest first'
          : ', newest first'
        : this.settings.sortOption === 'title'
          ? this.settings.sortOrder === 'up'
            ? ', A to Z'
            : ', Z to A'
          : '';
    return `Sort: ${mode}${direction}`;
  }
  override render() {
    const visible = this.visibleItems;
    const notice = this.activeNotice;
    return html`
      <header>
        <h1>Reading List</h1>
        <button
          class=${`save ${this.justSaved ? 'saved' : ''}`}
          aria-label="Save current page"
          aria-keyshortcuts="A"
          title="Save current page (A)"
          ?disabled=${this.items === null}
          @click=${this.saveCurrent}
        >
          ${icon(this.justSaved ? Check : Plus, 23)}
        </button>
      </header>
      <div class="visually-hidden" role="status">
        ${this.justSaved ? 'Page saved' : ''}
      </div>
      ${notice
        ? html`<reading-list-notice
            data-theme=${resolvedTheme(this.settings.theme)}
            .variant=${notice.variant}
            .message=${notice.message}
            .actionLabel=${notice.action
              ? (notice.actionLabel ?? 'Try again')
              : ''}
            .busy=${this.noticeBusy}
            @notice-action=${() => this.onNoticeAction(notice)}
            @notice-dismiss=${() => this.onNoticeDismiss(notice)}
          ></reading-list-notice>`
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
                          <div class="menu-label">Order</div>
                          ${(['down', 'up'] as const).map(
                            (order) =>
                              html`<button
                                class="menu-item"
                                role="menuitemradio"
                                aria-checked=${this.settings.sortOrder ===
                                order}
                                @click=${() => this.changeOrder(order)}
                              >
                                ${this.settings.sortOption === 'date'
                                  ? order === 'down'
                                    ? 'Newest first'
                                    : 'Oldest first'
                                  : order === 'down'
                                    ? 'Z to A'
                                    : 'A to Z'}${this.settings.sortOrder ===
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
      <div
        class="list"
        @dragenter=${this.onListDragEnter}
        @dragover=${this.onListDragOver}
        @drop=${this.onListDrop}
      >
        ${this.loadError
          ? html`<div class="empty"></div>`
          : this.items === null
            ? html`<div
                class="loading"
                role="status"
                aria-label="Loading your pages"
              >
                ${icon(LoaderCircle, 24)}
              </div>`
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
                        .recentlySaved=${this.recentlySavedUrl === item.url}
                        .last=${index === visible.length - 1}
                        style=${`--drag-offset: ${this.dragOffset(item.url, visible)}px`}
                        ?drag-active=${this.draggedUrl === item.url}
                        data-theme=${resolvedTheme(this.settings.theme)}
                        @delete-item=${this.deleteItem}
                        @update-title=${this.updateTitle}
                        @move-item=${this.moveItem}
                        @reorder-start=${this.reorderStart}
                        @reorder-preview=${this.reorderPreview}
                        @reorder-end=${this.finishDrag}
                        @reorder-drop=${this.reorderDrop}
                        @viewed-item=${this.markViewed}
                        @item-message=${this.onItemMessage}
                      ></reading-list-item>`,
                  )}
      </div>
      <footer
        class=${this.searchOpen
          ? 'search-active search-open'
          : this.searchClosing
            ? 'search-active search-closing'
            : ''}
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
              />`
            : ''}
        </div>
        <div class="footer-end">
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
          ${this.searchOpen || this.searchClosing
            ? html`<button
                class="footer-button close-search"
                aria-label="Close search"
                title="Close search"
                @click=${() => this.closeSearch()}
              >
                ${icon(X, 18)}
              </button>`
            : ''}
        </div>
      </footer>
      ${this.deleted || this.infoToast
        ? html`<div class="toast-stack">
            ${this.infoToast
              ? html`<div
                  class=${`toast info ${this.infoClosing ? 'closing' : ''}`}
                  role="status"
                  ?inert=${this.infoClosing}
                >
                  <span class="toast-label">${this.infoToast}</span>
                  <button
                    class="dismiss"
                    aria-label="Dismiss notification"
                    title="Dismiss"
                    @click=${this.dismissInfoToast}
                  >
                    ${icon(X, 16)}
                  </button>
                </div>`
              : ''}
            ${this.deleted
              ? html`<div
                  class=${`toast undo ${this.undoClosing ? 'closing' : ''}`}
                  role="status"
                  ?inert=${this.undoClosing}
                  @pointerenter=${this.pauseUndoDismiss}
                  @pointerleave=${this.resumeUndoDismiss}
                  @focusin=${this.pauseUndoDismiss}
                  @focusout=${this.resumeUndoDismiss}
                >
                  <span class="toast-label" title=${this.deleted.url}
                    >${this.hostname(this.deleted.url)} deleted</span
                  >
                  <div class="toast-actions">
                    <button @click=${this.undoDelete}>Undo</button
                    ><button
                      class="dismiss"
                      aria-label="Dismiss Undo"
                      title="Dismiss"
                      @click=${this.dismissUndo}
                    >
                      ${icon(X, 16)}
                    </button>
                  </div>
                </div>`
              : ''}
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
      event.preventDefault();
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
      this.topNotice = null;
      if (!synced) this.showInfoToast('Setting saved here');
    } catch (error) {
      console.error(error);
      this.showError("We couldn't save this change.", () =>
        this.saveSettings(settings),
      );
    }
  }
  private changeTheme(theme: ReadingListSettings['theme']) {
    void this.saveSettings({ ...this.settings, theme });
  }
  private showSavedFeedback() {
    if (this.saveFeedbackTimer) clearTimeout(this.saveFeedbackTimer);
    this.justSaved = true;
    this.saveFeedbackTimer = window.setTimeout(() => {
      this.justSaved = false;
      this.saveFeedbackTimer = null;
    }, 1400);
  }
  private async saveCurrent() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.url || !tab.title) {
        this.showError("This page can't be saved. Open a website and try again.");
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
      if (this.localOnly === 0) this.conflictNeedsBackup = false;
      this.dismissedWarningKeys = [];
      this.topNotice = null;
      this.showSavedFeedback();
      this.recentlySavedUrl = result.item.url;
      if (this.savedHighlightTimer) clearTimeout(this.savedHighlightTimer);
      this.savedHighlightTimer = window.setTimeout(() => {
        this.recentlySavedUrl = null;
        this.savedHighlightTimer = null;
      }, 2400);
      await this.updateComplete;
      const row = [
        ...(this.shadowRoot?.querySelectorAll<ReadingListItemElement>(
          'reading-list-item',
        ) ?? []),
      ].find((item) => item.href === result.item.url);
      row?.scrollIntoView?.({
        block: 'center',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      });
    } catch (error) {
      console.error(error);
      this.showError("We couldn't save this page.", () => this.saveCurrent());
    }
  }
  private async retrySync() {
    try {
      const result = await rl.retrySync();
      this.localOnly = result.remaining;
      this.syncUnavailable = false;
      this.conflictNeedsBackup = result.remaining > 0 && result.conflicts > 0;
      this.dismissedWarningKeys = [];
      this.topNotice = null;
    } catch (error) {
      console.error(error);
      this.syncUnavailable = true;
      this.showError("We couldn't sync your pages.", () => this.retrySync());
    }
  }
  private hostname(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '') || url;
    } catch {
      return url;
    }
  }
  private onItemMessage(event: CustomEvent<string>) {
    this.topNotice = null;
    this.showInfoToast(
      event.detail === 'URL copied.' ? 'URL copied' : event.detail,
    );
  }
  private showInfoToast(message: string) {
    this.clearInfoToast();
    this.infoToast = message;
    this.infoAutoTimer = window.setTimeout(() => this.dismissInfoToast(), 3000);
  }
  private clearInfoToast() {
    if (this.infoAutoTimer) clearTimeout(this.infoAutoTimer);
    if (this.infoCloseTimer) clearTimeout(this.infoCloseTimer);
    this.infoAutoTimer = null;
    this.infoCloseTimer = null;
    this.infoToast = null;
    this.infoClosing = false;
  }
  private dismissInfoToast() {
    if (!this.infoToast || this.infoClosing) return;
    if (this.infoAutoTimer) clearTimeout(this.infoAutoTimer);
    this.infoAutoTimer = null;
    this.infoClosing = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.clearInfoToast();
      return;
    }
    this.infoCloseTimer = window.setTimeout(() => this.clearInfoToast(), 150);
  }
  private scheduleUndoDismiss(delay = 6000) {
    this.pauseUndoDismiss();
    this.undoAutoTimer = window.setTimeout(() => this.dismissUndo(), delay);
  }
  private pauseUndoDismiss() {
    if (this.undoAutoTimer) clearTimeout(this.undoAutoTimer);
    this.undoAutoTimer = null;
  }
  private resumeUndoDismiss(event: Event) {
    const toast = this.shadowRoot?.querySelector('.undo');
    const related = (event as FocusEvent).relatedTarget;
    if (related && toast?.contains(related as Node)) return;
    queueMicrotask(() => {
      if (!this.deleted || this.undoClosing) return;
      const focused = this.shadowRoot?.activeElement;
      if ((focused && toast?.contains(focused)) || toast?.matches(':hover'))
        return;
      this.scheduleUndoDismiss(3000);
    });
  }
  private clearUndo() {
    this.pauseUndoDismiss();
    if (this.undoCloseTimer) clearTimeout(this.undoCloseTimer);
    this.undoCloseTimer = null;
    this.deleted = null;
    this.undoClosing = false;
  }
  private dismissUndo() {
    if (!this.deleted || this.undoClosing) return;
    this.pauseUndoDismiss();
    this.undoClosing = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.clearUndo();
      return;
    }
    this.undoCloseTimer = window.setTimeout(() => this.clearUndo(), 150);
  }
  private async deleteItem(event: CustomEvent<{ url: string }>) {
    const item = this.items?.find((entry) => entry.url === event.detail.url);
    if (!item) return;
    try {
      await rl.removeReadingItem(item.url);
      this.items = (this.items ?? []).filter((entry) => entry.url !== item.url);
      this.clearUndo();
      this.deleted = item;
      this.scheduleUndoDismiss();
      this.localOnly = rl.localOnlyCount;
      this.syncUnavailable = !rl.isSyncAvailable;
      this.topNotice = null;
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
      this.showError("We couldn't delete this page.", () =>
        this.deleteItem(event),
      );
    }
  }
  private async undoDelete() {
    const item = this.deleted;
    if (!item || this.undoClosing) return;
    this.pauseUndoDismiss();
    try {
      const result = await rl.addReadingItem(item);
      this.items = [
        result.item,
        ...(this.items ?? []).filter((entry) => entry.url !== item.url),
      ];
      this.clearUndo();
      this.localOnly = rl.localOnlyCount;
      this.syncUnavailable = !rl.isSyncAvailable;
      this.topNotice = null;
      void this.updateComplete.then(() =>
        this.shadowRoot
          ?.querySelector<HTMLButtonElement>('.sort-button, .save')
          ?.focus(),
      );
    } catch (error) {
      console.error(error);
      this.showError("We couldn't bring back this page.", () =>
        this.undoDelete(),
      );
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
      this.topNotice = null;
      this.showInfoToast('Title saved');
    } catch (error) {
      console.error(error);
      this.showError("We couldn't change the title.", () =>
        this.updateTitle(event),
      );
    }
  }
  private async moveItem(
    event: CustomEvent<{ url: string; direction: -1 | 1 }>,
  ) {
    if (this.reordering) return;
    this.reordering = true;
    try {
      await rl.moveItem(event.detail.url, event.detail.direction);
      this.items = await rl.getListItems();
      this.localOnly = rl.localOnlyCount;
      this.topNotice = null;
      this.showInfoToast('Order updated');
    } catch (error) {
      console.error(error);
      this.showError("We couldn't move this page.", () => this.moveItem(event));
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
  private finishDrag(event: CustomEvent<{ x: number; y: number }>) {
    if (
      this.draggedUrl &&
      !this.reordering &&
      this.pointerInList(event.detail?.x ?? -1, event.detail?.y ?? -1)
    )
      this.commitPreview();
    if (!this.reordering) this.reorderEnd();
  }
  private pointerInList(x: number, y: number) {
    const bounds = this.shadowRoot
      ?.querySelector('.list')
      ?.getBoundingClientRect();
    return (
      !!bounds &&
      x >= bounds.left &&
      x <= bounds.right &&
      y >= bounds.top &&
      y <= bounds.bottom
    );
  }
  private reorderEnd() {
    this.draggedUrl = null;
    this.dragInsertIndex = null;
  }
  private onListDragEnter(event: DragEvent) {
    if (!this.draggedUrl || this.settings.sortOption !== 'manual') return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }
  private onListDragOver(event: DragEvent) {
    if (!this.draggedUrl || this.settings.sortOption !== 'manual') return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (event.target !== event.currentTarget) return;
    const list = event.currentTarget as HTMLElement;
    const others = [
      ...list.querySelectorAll<ReadingListItemElement>('reading-list-item'),
    ].filter((row) => row.href !== this.draggedUrl);
    this.dragInsertIndex = others.filter((row) => {
      const bounds = row.getBoundingClientRect();
      return event.clientY > bounds.top + bounds.height / 2;
    }).length;
  }
  private onListDrop(event: DragEvent) {
    if (
      !this.draggedUrl ||
      this.reordering ||
      this.settings.sortOption !== 'manual'
    )
      return;
    event.preventDefault();
    this.commitPreview();
  }
  private commitPreview() {
    if (
      !this.draggedUrl ||
      this.reordering ||
      this.settings.sortOption !== 'manual'
    )
      return;
    const visible = this.visibleItems;
    const sourceIndex = visible.findIndex(
      (item) => item.url === this.draggedUrl,
    );
    const others = visible.filter((item) => item.url !== this.draggedUrl);
    const index = Math.max(
      0,
      Math.min(this.dragInsertIndex ?? sourceIndex, others.length),
    );
    if (sourceIndex < 0 || !others.length || index === sourceIndex) {
      this.reorderEnd();
      return;
    }
    const target = others[Math.min(index, others.length - 1)];
    void this.reorderDrop(
      new CustomEvent('reorder-drop', {
        detail: {
          sourceUrl: this.draggedUrl,
          targetUrl: target.url,
          placement: index === others.length ? 'after' : 'before',
        },
      }),
    );
  }
  private async reorderDrop(
    event: CustomEvent<{
      sourceUrl?: string;
      targetUrl: string;
      placement: 'before' | 'after';
    }>,
  ) {
    const sourceUrl = event.detail.sourceUrl || this.draggedUrl;
    if (
      this.reordering ||
      this.settings.sortOption !== 'manual' ||
      !sourceUrl ||
      sourceUrl === event.detail.targetUrl
    ) {
      if (!this.reordering) this.reorderEnd();
      return;
    }
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
      const from = ordered.findIndex((item) => item.url === sourceUrl);
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
      await rl.reorderItem(
        sourceUrl,
        event.detail.targetUrl,
        event.detail.placement,
      );
      this.items = await rl.getListItems();
      this.localOnly = rl.localOnlyCount;
      this.topNotice = null;
      this.showInfoToast('Order updated');
    } catch (error) {
      console.error(error);
      this.items = previous;
      this.showError("We couldn't move this page.", () =>
        this.reorderDrop(
          new CustomEvent('reorder-drop', {
            detail: {
              sourceUrl,
              targetUrl: event.detail.targetUrl,
              placement: event.detail.placement,
            },
          }),
        ),
      );
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
