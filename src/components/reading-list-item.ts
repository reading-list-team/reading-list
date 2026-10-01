import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Check, Copy, Pencil, Trash, X, GripVertical } from 'lucide';
import { icon } from '../lib/icon.js';
import { rl } from '../lib/rl.js';
import { designTokens } from '../lib/design-tokens.js';

@customElement('reading-list-item')
export class ReadingListItemElement extends LitElement {
  static override styles = [
    designTokens,
    css`
      :host {
        display: block;
      }
      .row {
        min-height: 68px;
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: 8px 2px;
        border-bottom: 1px solid var(--color-line);
        position: relative;
      }
      .row.drop-before::before,
      .row.drop-after::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--color-accent);
        border-radius: 2px;
        z-index: 3;
      }
      .row.drop-before::before {
        top: 0;
      }
      .row.drop-after::after {
        bottom: 0;
      }
      .drag-handle {
        flex: 0 0 18px;
        width: 18px;
        height: 32px;
        padding: 0;
        border: 0;
        border-radius: 6px;
        display: grid;
        place-items: center;
        background: transparent;
        color: var(--color-muted);
        cursor: grab;
        opacity: 0.28;
        transition:
          opacity var(--motion-fast) ease,
          background var(--motion-fast) ease;
      }
      .drag-handle:active {
        cursor: grabbing;
      }
      .row:hover .drag-handle,
      .row:focus-within .drag-handle {
        opacity: 1;
      }
      .drag-handle:hover {
        background: var(--color-surface);
      }
      .row.dragging {
        opacity: 0.55;
      }
      .favicon {
        flex: 0 0 30px;
        width: 30px;
        height: 30px;
        border-radius: 8px;
        object-fit: contain;
        background: var(--color-surface);
      }
      .fallback {
        display: grid;
        place-items: center;
        color: var(--color-accent);
        font-weight: var(--weight-heading);
      }
      .content {
        min-width: 0;
        flex: 1;
        position: relative;
      }
      .link {
        display: block;
        text-decoration: none;
        color: var(--color-text);
        font-size: var(--text-md);
        font-weight: var(--weight-medium);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      :host([viewed]) .link {
        font-weight: 400;
      }
      .link:hover {
        color: var(--color-accent);
      }
      .host {
        margin-top: 4px;
        color: var(--color-muted);
        font-size: var(--text-xs);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .actions {
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        gap: 1px;
        padding-left: 18px;
        background: linear-gradient(90deg, transparent, var(--color-bg) 16px);
        opacity: 0;
        pointer-events: none;
        transition: opacity var(--motion-fast) ease;
      }
      .row:hover .actions,
      .row:focus-within .actions {
        opacity: 1;
        pointer-events: auto;
      }
      .icon-button {
        width: 29px;
        height: 30px;
        display: grid;
        place-items: center;
        border: 0;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--color-muted);
      }
      .icon-button:hover {
        color: var(--color-text);
        background: var(--color-surface);
      }
      .delete:hover {
        color: var(--color-danger);
      }
      .editor {
        min-width: 0;
        width: 100%;
        display: flex;
        align-items: center;
        gap: 2px;
        animation: enter var(--motion-smooth) ease both;
      }
      .editor input {
        width: 100%;
        min-width: 0;
        height: 34px;
        padding: 0 8px;
        border: 1px solid var(--color-line);
        border-radius: var(--radius-sm);
        background: var(--color-bg);
        color: var(--color-text);
      }
      .editor input:focus {
        border-color: var(--color-accent);
        box-shadow: var(--focus-ring);
        outline: 0;
      }
      @keyframes enter {
        from {
          opacity: 0.5;
          transform: translateY(3px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ];

  @property() name = '';
  @property() href = '';
  @property({ type: Boolean }) newtab = false;
  @property({ type: Boolean }) reorderable = false;
  @property({ type: Boolean, reflect: true }) viewed = false;
  @state() private editing = false;
  @state() private draft = '';
  @state() private faviconFailed = false;
  @state() private dragging = false;
  @state() private dropPlacement: 'before' | 'after' | null = null;

  private get hostname(): string {
    try {
      return new URL(this.href).hostname;
    } catch {
      return this.href;
    }
  }

  override render() {
    return html`<div
      class=${`row ${this.dragging ? 'dragging' : ''} ${this.dropPlacement ? `drop-${this.dropPlacement}` : ''}`}
      @dragover=${this.onDragOver}
      @dragleave=${this.onDragLeave}
      @drop=${this.onDrop}
    >
      ${this.reorderable
        ? html`<button
            class="drag-handle"
            .draggable=${true}
            aria-label=${`Drag to reorder ${this.name}. Use arrow keys to move it.`}
            aria-keyshortcuts="ArrowUp ArrowDown"
            title="Drag to reorder"
            @dragstart=${this.onDragStart}
            @dragend=${this.onDragEnd}
            @keydown=${this.onHandleKeydown}
          >
            ${icon(GripVertical, 16)}
          </button>`
        : ''}
      ${this.faviconFailed || !this.hostname
        ? html`<span class="favicon fallback" aria-hidden="true"
            >${this.hostname.charAt(0).toUpperCase()}</span
          >`
        : html`<img
            class="favicon"
            alt=""
            src=${`https://icons.duckduckgo.com/ip2/${this.hostname}.ico`}
            @error=${() => (this.faviconFailed = true)}
          />`}
      <div class="content">
        ${this.editing
          ? html`<div class="editor">
              <input
                aria-label="Page title"
                .value=${this.draft}
                @input=${(event: Event) =>
                  (this.draft = (event.target as HTMLInputElement).value)}
                @keydown=${this.onEditKeydown}
              />
              <button
                class="icon-button"
                aria-label="Save title"
                title="Save title"
                @click=${this.saveTitle}
              >
                ${icon(Check, 17)}
              </button>
              <button
                class="icon-button"
                aria-label="Cancel editing"
                title="Cancel editing"
                @click=${this.cancelEdit}
              >
                ${icon(X, 17)}
              </button>
            </div>`
          : html`<a
                class="link"
                href=${this.href}
                title=${this.name}
                @click=${this.openItem}
                >${this.name}</a
              >
              <div class="host">${this.hostname}</div>`}
      </div>
      ${this.editing
        ? ''
        : html`<div class="actions">
            <button
              class="icon-button"
              aria-label=${`Edit ${this.name}`}
              title="Edit title"
              @click=${this.startEdit}
            >
              ${icon(Pencil, 16)}
            </button>
            <button
              class="icon-button"
              aria-label=${`Copy URL for ${this.name}`}
              title="Copy URL"
              @click=${this.copyUrl}
            >
              ${icon(Copy, 16)}
            </button>
            <button
              class="icon-button delete"
              aria-label=${`Delete ${this.name}`}
              title="Delete"
              @click=${this.deleteItem}
            >
              ${icon(Trash, 16)}
            </button>
          </div>`}
    </div>`;
  }

  private dispatch(name: string, detail?: unknown) {
    this.dispatchEvent(
      new CustomEvent(name, { bubbles: true, composed: true, detail }),
    );
  }
  private startEdit() {
    this.draft = this.name;
    this.editing = true;
    void this.updateComplete.then(() =>
      this.shadowRoot
        ?.querySelector<HTMLInputElement>('.editor input')
        ?.focus(),
    );
  }
  private restoreEditFocus() {
    void this.updateComplete.then(() =>
      this.shadowRoot
        ?.querySelector<HTMLButtonElement>('[title="Edit title"]')
        ?.focus(),
    );
  }
  private saveTitle() {
    const title = this.draft.trim();
    if (!title) return;
    if (title !== this.name)
      this.dispatch('update-title', { url: this.href, title });
    this.editing = false;
    this.restoreEditFocus();
  }
  private cancelEdit() {
    this.editing = false;
    this.restoreEditFocus();
  }
  private onEditKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveTitle();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.cancelEdit();
    }
  }
  private async copyUrl() {
    try {
      await navigator.clipboard.writeText(this.href);
      this.dispatch('item-message', 'URL copied.');
    } catch {
      this.dispatch('item-message', 'Could not copy the URL.');
    }
  }
  private deleteItem() {
    this.dispatch('delete-item', { url: this.href });
  }
  private move(direction: -1 | 1) {
    this.dispatch('move-item', { url: this.href, direction });
  }
  private onHandleKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      this.move(event.key === 'ArrowUp' ? -1 : 1);
    }
  }
  private onDragStart(event: DragEvent) {
    if (!this.reorderable || !event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-reading-list-item', this.href);
    this.dragging = true;
  }
  private onDragEnd() {
    this.dragging = false;
    this.dropPlacement = null;
  }
  private onDragOver(event: DragEvent) {
    if (
      !this.reorderable ||
      !event.dataTransfer?.types.includes('application/x-reading-list-item')
    )
      return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const row = event.currentTarget as HTMLElement;
    this.dropPlacement =
      event.clientY <
      row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2
        ? 'before'
        : 'after';
  }
  private onDragLeave(event: DragEvent) {
    if (
      !(event.currentTarget as HTMLElement).contains(
        event.relatedTarget as Node,
      )
    )
      this.dropPlacement = null;
  }
  private onDrop(event: DragEvent) {
    if (!this.reorderable || !event.dataTransfer) return;
    const sourceUrl = event.dataTransfer.getData(
      'application/x-reading-list-item',
    );
    if (!sourceUrl) return;
    event.preventDefault();
    const placement = this.dropPlacement ?? 'before';
    this.dropPlacement = null;
    if (sourceUrl !== this.href)
      this.dispatch('reorder-drop', {
        sourceUrl,
        targetUrl: this.href,
        placement,
      });
  }
  private async openItem(event: MouseEvent) {
    event.preventDefault();
    try {
      await rl.markViewed(this.href);
      this.dispatch('viewed-item', { url: this.href });
    } catch (error) {
      console.error('Could not mark page as viewed', error);
    }
    if (event.ctrlKey || event.metaKey || this.newtab) {
      await chrome.tabs.create({ url: this.href, active: false });
    } else {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) await chrome.tabs.update(tab.id, { url: this.href });
      if (document.body.classList.contains('popup-page')) window.close();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'reading-list-item': ReadingListItemElement;
  }
}
