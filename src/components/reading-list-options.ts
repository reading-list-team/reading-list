import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Download, Upload } from 'lucide';
import { icon } from '../lib/icon.js';
import { designTokens, resolvedTheme } from '../lib/design-tokens.js';
import { i18n } from '../lib/i18n.js';
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
        padding: 7px 34px 7px 12px;
        border: 1px solid var(--color-line);
        border-radius: var(--radius-sm);
        background-color: var(--color-bg);
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2377808d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        background-size: 16px 16px;
        color: var(--color-text);
        -webkit-appearance: none;
        appearance: none;
      }
      :host([data-theme='dark']) select {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a3a3a3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
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
    document.documentElement.lang = i18n.language();
    document.title = i18n.getMessage('optionsTitle');
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
      this.showError(
        i18n.getMessage('openListError'),
        i18n.getMessage('tryAgain'),
        () => this.load(),
      );
    } finally {
      this.loading = false;
    }
  }
  override render() {
    return html`<main>
      <h1>${i18n.getMessage('appName')}</h1>
      <p class="lead">${i18n.getMessage('optionsLead')}</p>
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
        ? html`<p>${i18n.getMessage('loadingSettings')}</p>`
        : this.loadError
          ? ''
          : html` <section>
                <h2>${i18n.getMessage('settings')}</h2>
                <label class="row"
                  ><span>${i18n.getMessage('themeLabel')}</span
                  ><select
                    .value=${this.settings.theme}
                    @change=${(event: Event) =>
                      this.updateSetting(
                        'theme',
                        (event.target as HTMLSelectElement)
                          .value as ReadingListSettings['theme'],
                      )}
                  >
                    <option value="system">${i18n.getMessage('system')}</option>
                    <option value="light">${i18n.getMessage('light')}</option>
                    <option value="dark">${i18n.getMessage('dark')}</option>
                  </select></label
                >
                <label class="row"
                  ><span>${i18n.getMessage('openLinksNewTab')}</span
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
                  ><span>${i18n.getMessage('showViewedPages')}</span
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
                  ><span>${i18n.getMessage('sortBy')}</span
                  ><select
                    .value=${this.settings.sortOption}
                    @change=${(event: Event) =>
                      this.updateSetting(
                        'sortOption',
                        (event.target as HTMLSelectElement)
                          .value as ReadingListSettings['sortOption'],
                      )}
                  >
                    <option value="manual">
                      ${i18n.getMessage('manualOrder')}
                    </option>
                    <option value="date">
                      ${i18n.getMessage('dateAdded')}
                    </option>
                    <option value="title">
                      ${i18n.getMessage('sortTitle')}
                    </option>
                  </select></label
                >
                ${this.settings.sortOption === 'manual'
                  ? ''
                  : html`<label class="row"
                      ><span>${i18n.getMessage('order')}</span
                      ><select
                        .value=${this.settings.sortOrder}
                        @change=${(event: Event) =>
                          this.updateSetting(
                            'sortOrder',
                            (event.target as HTMLSelectElement)
                              .value as ReadingListSettings['sortOrder'],
                          )}
                      >
                        ${this.settings.sortOption === 'date'
                          ? html`<option value="down">
                                ${i18n.getMessage('newestFirst')}
                              </option>
                              <option value="up">
                                ${i18n.getMessage('oldestFirst')}
                              </option>`
                          : html`<option value="up">
                                ${i18n.getMessage('aToZ')}
                              </option>
                              <option value="down">
                                ${i18n.getMessage('zToA')}
                              </option>`}
                      </select></label
                    >`}
              </section>
              <section>
                <h2>${i18n.getMessage('backups')}</h2>
                <p class="muted">
                  ${i18n.getMessage(
                    this.count === 1 ? 'savedHereOne' : 'savedHereOther',
                    i18n.number(this.count),
                  )}
                  ${this.localOnly || this.syncUnavailable
                    ? ''
                    : i18n.getMessage('otherDevicesLater')}
                </p>
                ${!this.errorNotice &&
                (this.localOnly || this.syncUnavailable) &&
                !this.dismissedStorageWarning
                  ? html`<reading-list-notice
                      data-theme=${resolvedTheme(this.settings.theme)}
                      .message=${this.localOnly
                        ? i18n.getMessage(
                            this.localOnly === 1
                              ? 'localOnlyOne'
                              : 'localOnlyOther',
                            i18n.number(this.localOnly),
                          )
                        : i18n.getMessage('syncUnavailable')}
                      .actionLabel=${i18n.getMessage('tryAgain')}
                      @notice-action=${this.retry}
                      @notice-dismiss=${() =>
                        (this.dismissedStorageWarning = true)}
                    ></reading-list-notice>`
                  : ''}
                ${this.conflicts && !this.dismissedConflict
                  ? html`<reading-list-notice
                      data-theme=${resolvedTheme(this.settings.theme)}
                      .message=${i18n.getMessage(
                        this.conflicts === 1 ? 'conflictOne' : 'conflictOther',
                      )}
                      .actionLabel=${i18n.getMessage('downloadBackup')}
                      @notice-action=${this.exportBackup}
                      @notice-dismiss=${() => (this.dismissedConflict = true)}
                    ></reading-list-notice>`
                  : ''}
                <div class="actions">
                  <button class="text-button" @click=${this.exportBackup}>
                    ${icon(Download, 16)} ${i18n.getMessage('downloadBackup')}</button
                  ><button class="text-button" @click=${this.chooseImport}>
                    ${icon(Upload, 16)} ${i18n.getMessage('addFromBackup')}
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
                      <p><strong>${i18n.getMessage('checkBackup')}</strong></p>
                      <p>
                        ${i18n.getMessage(
                          this.preview.items.length === 1
                            ? 'readyToAddOne'
                            : 'readyToAddOther',
                          i18n.number(this.preview.items.length),
                        )}
                        ${this.preview.skipped
                          ? i18n.getMessage(
                              'skippedCount',
                              i18n.number(this.preview.skipped),
                            )
                          : ''}
                        ${i18n.getMessage('existingPagesStay')}
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
                            ${i18n.getMessage('useBackupSettings')}</label
                          >`
                        : ''}
                      <div class="actions">
                        <button
                          class="text-button text-button--primary"
                          @click=${this.confirmImport}
                        >
                          ${i18n.getMessage('importPages')}</button
                        ><button
                          class="text-button"
                          @click=${() => (this.preview = null)}
                        >
                          ${i18n.getMessage('cancel')}
                        </button>
                      </div>
                    </div>`
                  : ''}
              </section>
              <section>
                <h2>${i18n.getMessage('feedback')}</h2>
                <p class="muted">${i18n.getMessage('feedbackHelp')}</p>
                <a
                  class="feedback-link text-button"
                  href="https://forms.gle/faEkwySqvE3ebfev6"
                  target="_blank"
                  rel="noopener noreferrer"
                  >${i18n.getMessage('sendFeedback')}</a
                >
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
        i18n.getMessage('retryError'),
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
      this.message = synced ? '' : i18n.getMessage('settingSavedHere');
      this.errorNotice = null;
    } catch (error) {
      console.error(error);
      this.showError(
        i18n.getMessage('saveSettingError'),
        i18n.getMessage('tryAgain'),
        () => this.updateSetting(key, value),
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
      this.showError(
        i18n.getMessage('syncPagesError'),
        i18n.getMessage('tryAgain'),
        () => this.retry(),
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
        ? i18n.getMessage('backupDownloaded')
        : i18n.getMessage('backupDownloadedPartial');
      this.errorNotice = null;
    } catch (error) {
      console.error(error);
      this.showError(
        i18n.getMessage('backupError'),
        i18n.getMessage('tryAgain'),
        () => this.exportBackup(),
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
      this.showError(
        i18n.getMessage('readBackupError'),
        i18n.getMessage('chooseFile'),
        () => this.chooseImport(),
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
          settingsMessage = i18n.getMessage(
            synced ? 'settingsAdded' : 'settingSavedHere',
          );
        } catch (error) {
          console.error(error);
          settingsError = {
            message: i18n.getMessage('useSettingsError'),
            actionLabel: i18n.getMessage('tryAgain'),
            action: async () => {
              const synced = await rl.saveSettings(desiredSettings);
              this.settings = desiredSettings;
              this.applyTheme();
              this.message = i18n.getMessage(
                synced ? 'settingsAdded' : 'settingSavedHere',
              );
            },
          };
        }
      }
      this.message = [
        i18n.getMessage(
          result.imported === 1 ? 'importResultOne' : 'importResultOther',
          [i18n.number(result.imported), i18n.number(result.alreadyPresent)],
        ),
        settingsMessage,
      ]
        .filter(Boolean)
        .join(' ');
      this.errorNotice = settingsError;
      this.preview = null;
    } catch (error) {
      console.error(error);
      this.showError(
        i18n.getMessage('importError'),
        i18n.getMessage('tryAgain'),
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
