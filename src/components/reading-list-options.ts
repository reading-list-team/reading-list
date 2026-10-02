import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Download, Upload } from 'lucide';
import { icon } from '../lib/icon.js';
import { designTokens, resolvedTheme } from '../lib/design-tokens.js';
import { parseBackup, ImportPreview } from '../lib/backup.js';
import { rl } from '../lib/rl.js';
import { DEFAULT_SETTINGS, ReadingListSettings } from '../lib/settings.js';
import './reading-list-notice.js';

type OptionsError = {
  message: string;
  actionLabel?: string;
  action?: () => Promise<void> | void;
};

@customElement('reading-list-options')
export class ReadingListOptionsElement extends LitElement {
  static override styles = [
    designTokens,
    css`
      :host {
        display: block;
        min-height: 100vh;
        padding: 32px var(--content-gutter) 60px;
      }
      main {
        max-width: 640px;
        margin: auto;
      }
      h1 {
        margin: 0;
        font-size: 28px;
        font-weight: var(--weight-medium);
      }
      .lead {
        color: var(--color-muted);
        margin: 8px 0 30px;
        font-size: 14px;
      }
      section {
        border: 1px solid var(--color-line);
        border-radius: var(--radius-md);
        padding: var(--content-gutter);
        margin: 16px 0;
        background: var(--color-bg);
      }
      h2 {
        margin: 0 0 15px;
        font-size: 19px;
        font-weight: var(--weight-medium);
      }
      p {
        line-height: 1.5;
      }
      .muted {
        color: var(--color-muted);
        font-size: 13px;
      }
      .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 10px 0;
      }
      .row + .row {
        border-top: 1px solid var(--color-line);
      }
      select {
        min-width: 145px;
        padding: 7px 9px;
        border: 1px solid var(--color-line);
        border-radius: var(--radius-sm);
        background: var(--color-bg);
        color: var(--color-text);
      }
      button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--color-line);
        border-radius: var(--radius-sm);
        background: var(--color-bg);
        color: var(--color-text);
        padding: 8px 12px;
      }
      button:hover {
        background: var(--color-surface);
      }
      .primary {
        background: var(--color-accent);
        color: #fff;
        border-color: var(--color-accent);
      }
      .primary:hover {
        background: var(--color-accent-hover);
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .preview {
        background: var(--color-surface);
        border-radius: var(--radius-sm);
        padding: 14px;
        margin-top: 16px;
      }
      .preview p {
        margin-top: 0;
      }
      .preview strong {
        font-weight: var(--weight-medium);
      }
      .preview label {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 12px 0;
      }
      .status {
        color: var(--color-muted);
        font-size: 13px;
      }
      .file {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
      }
    `,
  ];
  @state() private settings: ReadingListSettings = DEFAULT_SETTINGS;
  @state() private preview: ImportPreview | null = null;
  @state() private restoreSettings = false;
  @state() private message = '';
  @state() private errorNotice: OptionsError | null = null;
  @state() private count = 0;
  @state() private localOnly = 0;
  @state() private syncUnavailable = false;
  @state() private conflicts = 0;
  @state() private dismissedConflict = false;
  @state() private dismissedStorageWarning = false;
  @state() private loading = true;
  @state() private loadError = false;
  private media = window.matchMedia('(prefers-color-scheme: dark)');
  override connectedCallback() {
    super.connectedCallback();
    this.media.addEventListener('change', this.applyTheme);
    void this.load();
  }
  override disconnectedCallback() {
    this.media.removeEventListener('change', this.applyTheme);
    super.disconnectedCallback();
  }
  private applyTheme = () => {
    this.dataset.theme = resolvedTheme(this.settings.theme);
    document.body.style.background =
      getComputedStyle(this).getPropertyValue('--color-bg');
  };
  private async load() {
    try {
      const items = await rl.getListItems();
      this.count = items.length;
      this.settings = await rl.getSettings();
      this.localOnly = rl.localOnlyCount;
      this.syncUnavailable = !rl.isSyncAvailable;
      this.conflicts = rl.conflictCount;
      this.applyTheme();
      this.loadError = false;
      this.errorNotice = null;
    } catch (error) {
      console.error(error);
      this.loadError = true;
      this.showError("We couldn't open your list.", 'Try again', () =>
        this.load(),
      );
    } finally {
      this.loading = false;
    }
  }
  override render() {
    return html`<main>
      <h1>Reading List settings</h1>
      <p class="lead">Manage your list, preferences, and backups.</p>
      ${this.errorNotice
        ? html`<reading-list-notice
            data-theme=${resolvedTheme(this.settings.theme)}
            variant="error"
            .message=${this.errorNotice.message}
            .actionLabel=${this.errorNotice.actionLabel ?? ''}
            @notice-action=${this.retryError}
            @notice-dismiss=${() => (this.errorNotice = null)}
          ></reading-list-notice>`
        : ''}
      ${this.loading
        ? html`<p>Loading settings…</p>`
        : this.loadError
          ? ''
          : html` <section>
                <h2>Preferences</h2>
                <label class="row"
                  ><span>Theme</span
                  ><select
                    .value=${this.settings.theme}
                    @change=${(event: Event) =>
                      this.updateSetting(
                        'theme',
                        (event.target as HTMLSelectElement)
                          .value as ReadingListSettings['theme'],
                      )}
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select></label
                >
                <label class="row"
                  ><span>Open links in a new tab</span
                  ><input
                    type="checkbox"
                    role="switch"
                    class="switch"
                    .checked=${this.settings.openNewTab}
                    @change=${(event: Event) =>
                      this.updateSetting(
                        'openNewTab',
                        (event.target as HTMLInputElement).checked,
                      )}
                /></label>
                <label class="row"
                  ><span>Show viewed pages</span
                  ><input
                    type="checkbox"
                    role="switch"
                    class="switch"
                    .checked=${this.settings.viewAll}
                    @change=${(event: Event) =>
                      this.updateSetting(
                        'viewAll',
                        (event.target as HTMLInputElement).checked,
                      )}
                /></label>
                <label class="row"
                  ><span>Sort by</span
                  ><select
                    .value=${this.settings.sortOption}
                    @change=${(event: Event) =>
                      this.updateSetting(
                        'sortOption',
                        (event.target as HTMLSelectElement)
                          .value as ReadingListSettings['sortOption'],
                      )}
                  >
                    <option value="manual">Manual order</option>
                    <option value="date">Date added</option>
                    <option value="title">Title</option>
                  </select></label
                >
                ${this.settings.sortOption === 'manual'
                  ? ''
                  : html`<label class="row"
                      ><span>Order</span
                      ><select
                        .value=${this.settings.sortOrder}
                        @change=${(event: Event) =>
                          this.updateSetting(
                            'sortOrder',
                            (event.target as HTMLSelectElement)
                              .value as ReadingListSettings['sortOrder'],
                          )}
                      >
                        <option value="down">
                          ${this.settings.sortOption === 'date'
                            ? 'Newest first'
                            : 'Z to A'}
                        </option>
                        <option value="up">
                          ${this.settings.sortOption === 'date'
                            ? 'Oldest first'
                            : 'A to Z'}
                        </option>
                      </select></label
                    >`}
              </section>
              <section>
                <h2>Backups and help</h2>
                <p class="muted">
                  ${this.count} page${this.count === 1 ? '' : 's'} saved here.
                  ${this.localOnly || this.syncUnavailable
                    ? ''
                    : 'They may show up on your other devices later.'}
                </p>
                ${!this.errorNotice &&
                (this.localOnly || this.syncUnavailable) &&
                !this.dismissedStorageWarning
                  ? html`<reading-list-notice
                      data-theme=${resolvedTheme(this.settings.theme)}
                      .message=${this.localOnly
                        ? `${this.localOnly} page${this.localOnly === 1 ? ' is' : 's are'} only on this device.`
                        : "Chrome can't sync right now. Your pages are safe here."}
                      action-label="Try again"
                      @notice-action=${this.retry}
                      @notice-dismiss=${() =>
                        (this.dismissedStorageWarning = true)}
                    ></reading-list-notice>`
                  : ''}
                ${this.conflicts && !this.dismissedConflict
                  ? html`<reading-list-notice
                      data-theme=${resolvedTheme(this.settings.theme)}
                      .message=${this.conflicts === 1
                        ? 'We found two copies of a page. Both are safe. Download a backup to keep them.'
                        : 'We found more than one copy of some pages. They are safe. Download a backup to keep them.'}
                      action-label="Download backup"
                      @notice-action=${this.exportBackup}
                      @notice-dismiss=${() => (this.dismissedConflict = true)}
                    ></reading-list-notice>`
                  : ''}
                <div class="actions">
                  <button @click=${this.exportBackup}>
                    ${icon(Download, 16)} Download backup</button
                  ><button @click=${this.chooseImport}>
                    ${icon(Upload, 16)} Add from backup
                  </button>
                </div>
                ${this.message
                  ? html`<p class="status" role="status">${this.message}</p>`
                  : ''}
                <input
                  class="file"
                  id="import-file"
                  type="file"
                  accept=".json,application/json"
                  @change=${this.prepareImport}
                />
                ${this.preview
                  ? html`<div class="preview">
                      <p><strong>Check backup</strong></p>
                      <p>
                        ${this.preview.items.length}
                        page${this.preview.items.length === 1 ? ' is' : 's are'}
                        ready to add.
                        ${this.preview.skipped
                          ? `${this.preview.skipped} could not be used.`
                          : ''}
                        Pages already here will stay.
                      </p>
                      ${this.preview.settings
                        ? html`<label
                            ><input
                              type="checkbox"
                              role="switch"
                              class="switch"
                              .checked=${this.restoreSettings}
                              @change=${(event: Event) =>
                                (this.restoreSettings = (
                                  event.target as HTMLInputElement
                                ).checked)}
                            />
                            Use settings from backup</label
                          >`
                        : ''}
                      <div class="actions">
                        <button class="primary" @click=${this.confirmImport}>
                          Import pages</button
                        ><button @click=${() => (this.preview = null)}>
                          Cancel
                        </button>
                      </div>
                    </div>`
                  : ''}
              </section>`}
    </main>`;
  }
  private showError(
    message: string,
    actionLabel = '',
    action?: () => Promise<void> | void,
  ) {
    this.errorNotice = { message, actionLabel, action };
    this.message = '';
  }
  private async retryError() {
    const notice = this.errorNotice;
    if (!notice?.action) return;
    try {
      await notice.action();
      if (this.errorNotice === notice) this.errorNotice = null;
    } catch (error) {
      console.error(error);
      this.showError(
        "We couldn't try again.",
        notice.actionLabel,
        notice.action,
      );
    }
  }
  private async updateSetting<K extends keyof ReadingListSettings>(
    key: K,
    value: ReadingListSettings[K],
  ) {
    const next = { ...this.settings, [key]: value };
    try {
      const synced = await rl.saveSettings(next);
      this.settings = next;
      this.applyTheme();
      this.message = synced ? '' : 'Setting saved here.';
      this.errorNotice = null;
    } catch (error) {
      console.error(error);
      this.showError("We couldn't save this change.", 'Try again', () =>
        this.updateSetting(key, value),
      );
    }
  }
  private async retry() {
    try {
      const result = await rl.retrySync();
      this.localOnly = result.remaining;
      this.syncUnavailable = false;
      this.dismissedStorageWarning = false;
      this.conflicts = Math.max(rl.conflictCount, result.conflicts);
      this.message = '';
      this.errorNotice = null;
    } catch (error) {
      console.error(error);
      this.syncUnavailable = true;
      this.showError("We couldn't sync your pages.", 'Try again', () =>
        this.retry(),
      );
    }
  }
  private async exportBackup() {
    try {
      const backup = await rl.exportBackup();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], {
          type: 'application/json',
        }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `reading-list-backup-${backup.exportedAt.slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      this.message = backup.rawSync
        ? 'Backup downloaded.'
        : 'Backup downloaded. Some sync data was not available.';
      this.errorNotice = null;
    } catch (error) {
      console.error(error);
      this.showError("We couldn't make a backup.", 'Try again', () =>
        this.exportBackup(),
      );
    }
  }
  private chooseImport() {
    this.shadowRoot?.querySelector<HTMLInputElement>('#import-file')?.click();
  }
  private async prepareImport(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      this.preview = parseBackup(await file.text());
      this.restoreSettings = false;
      this.message = '';
      this.errorNotice = null;
    } catch (error) {
      console.error(error);
      this.preview = null;
      this.showError("We couldn't read this backup.", 'Choose file', () =>
        this.chooseImport(),
      );
    } finally {
      input.value = '';
    }
  }
  private async confirmImport() {
    if (!this.preview) return;
    try {
      const result = await rl.importItems(this.preview.items);
      this.count = (await rl.getListItems()).length;
      this.localOnly = rl.localOnlyCount;
      let settingsMessage = '';
      let settingsError: OptionsError | null = null;
      if (this.restoreSettings && this.preview.settings) {
        const desiredSettings = this.preview.settings;
        try {
          const synced = await rl.saveSettings(desiredSettings);
          this.settings = desiredSettings;
          this.applyTheme();
          settingsMessage = synced
            ? ' Settings added.'
            : ' Setting saved here.';
        } catch (error) {
          console.error(error);
          settingsError = {
            message: "We couldn't use these settings.",
            actionLabel: 'Try again',
            action: async () => {
              const synced = await rl.saveSettings(desiredSettings);
              this.settings = desiredSettings;
              this.applyTheme();
              this.message = synced ? 'Settings added.' : 'Setting saved here.';
            },
          };
        }
      }
      this.message = `${result.imported} page${result.imported === 1 ? '' : 's'} added. ${result.alreadyPresent} already here.${settingsMessage}`;
      this.errorNotice = settingsError;
      this.preview = null;
    } catch (error) {
      console.error(error);
      this.showError(
        "We couldn't add these pages. Your list is safe.",
        'Try again',
        () => this.confirmImport(),
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'reading-list-options': ReadingListOptionsElement;
  }
}
