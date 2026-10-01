import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Download, Upload, RotateCw } from 'lucide';
import { icon } from '../lib/icon.js';
import { designTokens, resolvedTheme } from '../lib/design-tokens.js';
import { parseBackup, ImportPreview } from '../lib/backup.js';
import { rl } from '../lib/rl.js';
import { DEFAULT_SETTINGS, ReadingListSettings } from '../lib/settings.js';

@customElement('reading-list-options')
export class ReadingListOptionsElement extends LitElement {
  static override styles = [
    designTokens,
    css`
      :host {
        display: block;
        min-height: 100vh;
        padding: 32px 20px 60px;
      }
      main {
        max-width: 640px;
        margin: auto;
      }
      h1 {
        margin: 0;
        font-size: 28px;
        letter-spacing: -0.04em;
      }
      .lead {
        color: var(--color-muted);
        margin: 8px 0 30px;
        font-size: 14px;
      }
      section {
        border: 1px solid var(--color-line);
        border-radius: var(--radius-md);
        padding: 20px;
        margin: 16px 0;
        background: var(--color-bg);
      }
      h2 {
        margin: 0 0 15px;
        font-size: 17px;
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
      input[type='checkbox'] {
        accent-color: var(--color-accent);
        width: 18px;
        height: 18px;
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
  @state() private count = 0;
  @state() private localOnly = 0;
  @state() private conflicts = 0;
  @state() private loading = true;
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
      this.conflicts = rl.conflictCount;
      this.applyTheme();
    } catch (error) {
      console.error(error);
      this.message = 'Could not load Reading List data.';
    } finally {
      this.loading = false;
    }
  }
  override render() {
    return html`<main>
      <h1>Reading List settings</h1>
      <p class="lead">Manage your list, preferences, and backups.</p>
      ${this.message
        ? html`<p class="status" role="status">${this.message}</p>`
        : ''}
      ${this.loading
        ? html`<p>Loading settings…</p>`
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
              <label class="row"
                ><span>Direction</span
                ><select
                  .value=${this.settings.sortOrder}
                  ?disabled=${this.settings.sortOption === 'manual'}
                  @change=${(event: Event) =>
                    this.updateSetting(
                      'sortOrder',
                      (event.target as HTMLSelectElement)
                        .value as ReadingListSettings['sortOrder'],
                    )}
                >
                  <option value="down">Descending</option>
                  <option value="up">Ascending</option>
                </select></label
              >
            </section>
            <section>
              <h2>Storage and recovery</h2>
              <p class="muted">
                ${this.count} page${this.count === 1 ? '' : 's'} on this device.
                ${this.localOnly
                  ? `${this.localOnly} saved only on this device.`
                  : 'All visible pages were written to Chrome sync storage.'}
                A successful Chrome sync storage write does not confirm delivery
                to another device.
              </p>
              ${this.conflicts
                ? html`<p class="muted">
                    ${this.conflicts} conflicting
                    version${this.conflicts === 1 ? '' : 's'} kept in backup
                    data. Export a backup before further changes.
                  </p>`
                : ''}
              <div class="actions">
                <button @click=${this.retry}>
                  ${icon(RotateCw, 16)} Retry sync</button
                ><button @click=${this.exportBackup}>
                  ${icon(Download, 16)} Export backup</button
                ><button @click=${this.chooseImport}>
                  ${icon(Upload, 16)} Import backup
                </button>
              </div>
              <input
                class="file"
                id="import-file"
                type="file"
                accept=".json,application/json"
                @change=${this.prepareImport}
              />
              ${this.preview
                ? html`<div class="preview">
                    <p><strong>Import preview</strong></p>
                    <p>
                      ${this.preview.items.length} valid
                      page${this.preview.items.length === 1 ? '' : 's'} found;
                      ${this.preview.skipped} other or invalid records skipped.
                      Existing pages will be kept.
                    </p>
                    ${this.preview.settings
                      ? html`<label
                          ><input
                            type="checkbox"
                            .checked=${this.restoreSettings}
                            @change=${(event: Event) =>
                              (this.restoreSettings = (
                                event.target as HTMLInputElement
                              ).checked)}
                          />
                          Restore settings from backup</label
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
  private async updateSetting<K extends keyof ReadingListSettings>(
    key: K,
    value: ReadingListSettings[K],
  ) {
    const next = { ...this.settings, [key]: value };
    try {
      const synced = await rl.saveSettings(next);
      this.settings = next;
      this.applyTheme();
      this.message = synced
        ? 'Settings saved on this device and written to Chrome sync storage.'
        : 'Settings saved only on this device.';
    } catch (error) {
      console.error(error);
      this.message = 'Could not save settings.';
    }
  }
  private async retry() {
    try {
      const result = await rl.retrySync();
      this.localOnly = result.remaining;
      this.conflicts = result.conflicts;
      this.message = `${result.synced} written to Chrome sync storage; ${result.remaining} saved only on this device.`;
    } catch (error) {
      console.error(error);
      this.message =
        'Could not reach Chrome sync storage. Your local pages are safe.';
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
        : 'Local backup downloaded. Chrome sync data was unavailable.';
    } catch (error) {
      console.error(error);
      this.message = 'Could not create a backup.';
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
    } catch (error) {
      console.error(error);
      this.preview = null;
      this.message = 'This is not a supported Reading List backup.';
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
      if (this.restoreSettings && this.preview.settings) {
        try {
          await rl.saveSettings(this.preview.settings);
          this.settings = this.preview.settings;
          this.applyTheme();
          settingsMessage = ' Settings restored.';
        } catch (error) {
          console.error(error);
          settingsMessage = ' Settings could not be restored.';
        }
      }
      this.message = `${result.imported} pages imported; ${result.alreadyPresent} already present.${result.synced ? '' : ' Imported pages are saved only on this device.'}${settingsMessage}`;
      this.preview = null;
    } catch (error) {
      console.error(error);
      this.message = 'Import failed. Your existing pages were kept.';
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'reading-list-options': ReadingListOptionsElement;
  }
}
