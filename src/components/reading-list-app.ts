import { LitElement, html, css } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { customElement, state } from 'lit/decorators.js';
import { i18n } from '../lib/i18n';
import { rl, ListItemData } from '../lib/rl';
import { ReadingListItemElement } from './reading-list-item';
import { parseBackup, ImportPreview } from '../lib/backup';
import './reading-list-item.js';

@customElement('reading-list-app')
export class ReadingListAppElement extends LitElement {
  static override styles = css`
    :host {
      --base-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
        Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
      --base-font-size: 13px;
      --base-line-height: 1.4;
      --container-width: 360px;
      --spacer: 15px;
      --rl-bg-color: #f7f7f7;
      --rl-shadow: 0 1px 1px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.05);
      --rl-link-color: #555;
      --rl-link-hover-bg: #fff;
      --primary-color: #66cc98;
      --primary-color-focus: #44aa76;
    }

    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    :focus-visible {
      outline: 3px solid lightblue;
    }

    .visually-hidden:not(caption) {
      position: absolute !important;
    }

    .visually-hidden {
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }

    h1 {
      margin: 0;
      font-size: 1.6rem;
      line-height: 1.25;
    }

    header {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      width: 100%;
      gap: 1rem;
      padding-bottom: 0.5rem;
    }

    .save-button {
      --button-size: 2rem;

      color: #fff;
      background: var(--primary-color);
      width: var(--button-size);
      height: var(--button-size);
      line-height: var(--button-size);
      font-weight: bold;
      border: 0;
      border-radius: 9999px;
      text-align: center;
    }

    .save-button:hover,
    .save-button:focus {
      background-color: var(--primary-color-focus);
    }

    .save-button:focus {
      outline: 3px solid lightblue;
    }

    search {
      margin: 0;
      padding-bottom: 0.5rem;
    }

    /* label {
      display: block;
      margin-top: 0;
      margin-bottom: 0.125rem;
      padding: 0;
      font-size: inherit;
    } */

    input {
      font-size: inherit;
      border: 1px solid #eee;
      border-radius: 0.25rem;
      padding: 0.5rem;
      background: transparent;
      width: 100%;
      margin: 0;
    }

    input:focus {
      outline: 3px solid lightblue;
      border-color: var(--primary-color);
    }

    [type='search'] {
      -webkit-appearance: textfield;
    }
    [type='search']::-webkit-search-cancel-button,
    [type='search']::-webkit-search-decoration {
      -webkit-appearance: none;
    }

    reading-list-item {
      display: block;
    }

    reading-list-item:not(:first-child) {
      margin-top: 0.5rem;
    }

    .status {
      margin: 0 0 0.5rem;
      color: #555;
    }

    .backup-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }

    .backup-actions button {
      padding: 0.4rem 0.65rem;
      background: white;
      border: 1px solid #aaa;
      border-radius: 0.25rem;
      cursor: pointer;
    }

    .import-preview {
      margin-top: 0.5rem;
    }
  `;

  constructor() {
    super();
    rl.getListItems().then(
      (listItems) => {
        this._listItems = listItems;
        if (!rl.isSyncAvailable) {
          this.statusText = 'Chrome sync is unavailable. Your local list is shown.';
        }
      },
      (error) => {
        console.error(error);
        this.statusText = 'Could not load your list. Please reopen Reading List.';
      },
    );
  }

  override connectedCallback(): void {
    super.connectedCallback();
    document.title = i18n.getMessage('appName', 'Reading List');
  }

  @state()
  _listItems: ListItemData[] | null = null;

  @state()
  searchQuery = '';

  @state()
  statusText = '';

  @state()
  importPreview: ImportPreview | null = null;

  override render() {
    return html`
      <header>
        <h1>${i18n.getMessage('appName', 'Reading List')}</h1>
        <button
          class="save-button"
          id="save-button"
          aria-label=${i18n.getMessage('addPage', 'Add page to Reading List')}
          @click=${this._onSaveButtonClick}
        >
          +
        </button>
      </header>

      ${this.statusText
        ? html`<p class="status" role="status">${this.statusText}</p>`
        : ''}

      <search class="search">
        <label class="visually-hidden" for="list-search"
          >${i18n.getMessage('search', 'Search')}</label
        >
        <input
          type="search"
          id="list-search"
          name="search"
          placeholder=${i18n.getMessage('search', 'Search')}
          autocomplete="off"
          @input=${this._onSearchInput}
        />
      </search>

      <div class="reading-list">
        ${repeat(
          this._listItems?.filter(
            (item) =>
              !this.searchQuery ||
              item.url.toLocaleUpperCase().includes(this.searchQuery) ||
              item.title.toLocaleUpperCase().includes(this.searchQuery),
          ) ?? [],
          (item) => item.url,
          (listItem) =>
            html`<reading-list-item
              .name=${listItem.title}
              .href=${listItem.url}
              @delete-item=${this._onDeleteItemClicked}
            ></reading-list-item>`,
        )}
      </div>

      <div class="backup-actions">
        <button type="button" @click=${this._exportBackup}>
          ${i18n.getMessage('export', 'Export')}
        </button>
        <button type="button" @click=${this._chooseImport}>
          ${i18n.getMessage('import', 'Import')}
        </button>
        <input
          class="visually-hidden"
          type="file"
          accept=".json,application/json"
          id="import-file"
          @change=${this._prepareImport}
        />
      </div>
      ${this.importPreview
        ? html`<div class="import-preview">
            <p>
              ${this.importPreview.items.length} valid pages found;
              ${this.importPreview.skipped} other or invalid records skipped.
              Existing pages will be kept.
            </p>
            <div class="backup-actions">
              <button type="button" @click=${this._confirmImport}>Import pages</button>
              <button type="button" @click=${this._cancelImport}>Cancel</button>
            </div>
          </div>`
        : ''}
    `;
  }

  private async _exportBackup() {
    try {
      const backup = await rl.exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reading-list-backup-${backup.exportedAt.slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      this.statusText = backup.rawSync
        ? 'Backup downloaded.'
        : 'Local backup downloaded. Chrome sync data was unavailable.';
    } catch (error) {
      console.error(error);
      this.statusText = 'Could not create a backup. Please try again.';
    }
  }

  private _chooseImport() {
    this.renderRoot.querySelector<HTMLInputElement>('#import-file')?.click();
  }

  private async _prepareImport(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      this.importPreview = parseBackup(await file.text());
      this.statusText = '';
    } catch (error) {
      console.error(error);
      this.importPreview = null;
      this.statusText = 'This is not a supported Reading List backup.';
    } finally {
      input.value = '';
    }
  }

  private async _confirmImport() {
    if (!this.importPreview) return;
    try {
      const result = await rl.importItems(this.importPreview.items);
      this._listItems = await rl.getListItems();
      this.statusText = `${result.imported} pages imported; ${result.alreadyPresent} already present. ${
        result.synced ? '' : 'Imported pages are saved on this device; Chrome sync is full or unavailable.'
      }`;
      this.importPreview = null;
    } catch (error) {
      console.error(error);
      this.statusText = 'Import failed. Your existing pages were kept.';
    }
  }

  private _cancelImport() {
    this.importPreview = null;
  }

  private _onSearchInput(event: InputEvent) {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value.trim().toLocaleUpperCase();
  }

  private async _onDeleteItemClicked(event: Event) {
    if (!this._listItems) return;
    const url = (event.target as ReadingListItemElement).href;
    try {
      const synced = await rl.removeReadingItem(url);
      this._listItems = this._listItems.filter((item) => item.url !== url);
      this.statusText = synced
        ? ''
        : 'Removed on this device. Chrome sync is unavailable.';
    } catch (error) {
      console.error(error);
      this.statusText = 'Could not remove this page. Please try again.';
    }
  }

  private async _addReadingItem(url: string, title: string) {
    if (this._listItems) {
      const listItem: ListItemData = { url, title, addedAt: Date.now() };

      try {
        const result = await rl.addReadingItem(listItem);
        this._listItems = [
          result.item,
          ...this._listItems.filter((item) => item.url !== url),
        ];
        this.statusText = result.synced
          ? 'Saved in Chrome sync storage.'
          : 'Saved on this device. Chrome sync is unavailable or full.';
      } catch (e) {
        console.error(e);
        this.statusText = 'Could not save this page. Please try again.';
        return;
      }
    }
  }

  private async _onSaveButtonClick() {
    const tab = await this._getActiveTab();
    if (tab && tab.url && tab.title && this._listItems) {
      return this._addReadingItem(tab.url, tab.title);
    }
  }

  private async _getActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      return tab;
    } catch (e) {
      console.error(e);
    }
    return null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'reading-list-app': ReadingListAppElement;
    'reading-list-item': ReadingListItemElement;
  }
}
