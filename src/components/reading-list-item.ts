import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { rl } from '../lib/rl.js';

@customElement('reading-list-item')
export class ReadingListItemElement extends LitElement {
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
      --rl-item-gap: 0.5rem;

      font-family: var(--base-font);
      font-size: var(--base-font-size);
      line-height: var(--base-line-height);
    }

    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    :focus-visible {
      outline: 3px solid lightblue;
    }

    .reading-list-item {
      border-radius: 3px;
      padding: 0;
      margin: 0;
      position: relative;
      overflow: hidden;
      transition: all 0.5s ease 0s;
      color: var(--rl-link-color);
      background-color: var(--rl-bg-color);
      box-shadow: var(--rl-shadow);
    }

    .favicon {
      position: absolute;
      top: var(--rl-item-gap);
      left: var(--rl-item-gap);
      width: 36px;
      height: 36px;
      border-radius: 0.25rem;
      border: 1px solid #ccc;
      padding: 1px;
    }

    .favicon-img {
      width: 100%;
      height: 100%;
      border-radius: 2px;
    }

    .item-content {
      text-decoration: none;
      display: block;
      width: 100%;
      padding: 10px 50px 10px 56px;
      min-height: 56px;
      position: relative;
    }

    .item-content:hover,
    .item-content:focus {
      color: var(--primary-color);
      background-color: var(--rl-link-hover-bg);
    }

    .item-content:hover .favicon,
    .item-content:focus .favicon {
      border-color: var(--primary-color);
    }

    .title,
    .host {
      overflow-wrap: break-word;
      color: inherit;
    }

    @media screen and (max-width: 200px) {
      .title,
      .host {
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
      }
    }

    .title {
      display: block;
      font-weight: bold;
      text-decoration: none;
      border-radius: 0.25rem;
    }

    .title::after {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      z-index: 1;
      content: '';
    }

    .host {
      display: block;
    }

    .delete-button {
      position: absolute;
      text-align: center;
      font-weight: bold;
      top: 0;
      right: 0;
      padding: 0;
      border-radius: 0;
      width: 1.5rem;
      height: 1.5rem;
      border: 0;
      background: transparent;
      z-index: 2;
    }

    .item-actions {
      position: absolute;
      right: 0;
      bottom: 0;
      z-index: 2;
      display: flex;
    }

    .item-actions button {
      border: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      padding: 0.3rem;
    }

    .title-editor {
      display: flex;
      gap: 0.25rem;
      position: relative;
      z-index: 2;
    }

    .title-editor input { min-width: 0; flex: 1; }

    :host([data-theme='dark']) {
      --rl-bg-color: #30343b;
      --rl-link-color: #eee;
      --rl-link-hover-bg: #454b55;
    }

    :host([viewed]) .title { font-weight: normal; }

    .delete-button-content {
      color: #ccc;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      transform: rotateZ(0) scale(1);
      background: transparent;
      transition:
        transform 0.3s ease,
        box-shadow 0.5s ease;
    }

    .delete-button:focus-visible {
      outline: none;
    }

    .delete-button:focus-visible .delete-button-content {
      outline: 3px solid lightblue;
    }

    .delete-button:focus-visible .delete-button-content,
    .delete-button:hover .delete-button-content {
      color: #fff;
      transform: rotateZ(90deg) scale(2);
      box-shadow: 1px 0 1px rgba(0, 0, 0, 0.15);
      background: #ccc;
    }
  `;

  /**
   * The URL title text.
   */
  @property()
  name = '';

  /**
   * The URL to link to.
   */
  @property({ type: String })
  href = '';

  @property({ type: Boolean })
  newtab = false;

  @property({ type: Boolean })
  reorderable = false;

  @property({ type: Boolean, reflect: true })
  viewed = false;

  private get url() {
    if (!this.href) return null;
    try {
      return new URL(this.href);
    } catch {
      return null;
    }
  }

  /**
   * The src for the favicon image.
   */
  private get favicon() {
    return this.url
      ? `https://icons.duckduckgo.com/ip2/${this.url.hostname}.ico`
      : null;
  }

  @state()
  faviconError = false;

  @state()
  editingTitle = false;

  @state()
  draftTitle = '';

  override render() {
    return html`
      <div class="reading-list-item">
        <div class="item-content">
          ${this.editingTitle
            ? html`<div class="title-editor">
                <input aria-label="Page title" .value=${this.draftTitle}
                  @input=${this._onTitleInput} @keydown=${this._onTitleKeydown} />
                <button type="button" @click=${this._saveTitle}>Save</button>
                <button type="button" @click=${this._cancelTitle}>Cancel</button>
              </div>`
            : html`<a class="title" href=${this.href} @click=${this._onLinkClick}
                >${this.name}</a>`}
          <div class="host">${this.url?.hostname ?? this.href}</div>
          <div class="favicon">
            ${this.favicon && !this.faviconError
              ? html`<img
                  class="favicon-img"
                  onerror="this.onerror=null;this.hidden=true"
                  src=${this.favicon}
                />`
              : ''}
          </div>
        </div>
        <button class="delete-button" @click=${this._onDeleteClick}>
          <span class="delete-button-content">&times;</span>
        </button>
        <div class="item-actions">
          ${this.reorderable
            ? html`<button aria-label="Move up" @click=${() => this._move(-1)}>↑</button>
                <button aria-label="Move down" @click=${() => this._move(1)}>↓</button>`
            : ''}
          <button aria-label="Edit title" @click=${this._editTitle}>Edit</button>
        </div>
      </div>
    `;
  }

  private async _onLinkClick(event: MouseEvent) {
    if (this.href) {
      event.preventDefault();
      // If the control or meta key (⌘ on Mac, ⊞ on Windows) is pressed or if options is selected…
      const modifierDown = event.ctrlKey || event.metaKey || this.newtab;
      try {
        await rl.markViewed(this.href);
        this.dispatchEvent(new CustomEvent('viewed-item', {
          bubbles: true,
          composed: true,
          detail: { url: this.href },
        }));
      } catch (error) {
        console.error('Could not mark Reading List page as viewed', error);
      }
      openLink(this.href, modifierDown);
    }
  }

  private _onDeleteClick() {
    this.dispatchEvent(
      new Event('delete-item', { bubbles: true, composed: true }),
    );
  }

  private _editTitle() {
    this.draftTitle = this.name;
    this.editingTitle = true;
    void this.updateComplete.then(() => {
      this.shadowRoot?.querySelector<HTMLInputElement>('.title-editor input')?.focus();
    });
  }

  private _onTitleInput(event: Event) {
    this.draftTitle = (event.target as HTMLInputElement).value;
  }

  private _onTitleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') this._saveTitle();
    if (event.key === 'Escape') this._cancelTitle();
  }

  private _saveTitle() {
    const title = this.draftTitle.trim();
    if (!title) return;
    this.dispatchEvent(new CustomEvent('update-title', {
      bubbles: true,
      composed: true,
      detail: { url: this.href, title },
    }));
    this.editingTitle = false;
  }

  private _cancelTitle() {
    this.editingTitle = false;
  }

  private _move(direction: -1 | 1) {
    this.dispatchEvent(new CustomEvent('move-item', {
      bubbles: true,
      composed: true,
      detail: { url: this.href, direction },
    }));
  }
}

function openLink(url: string, newTab: boolean) {
  if (newTab) {
    // Create a new tab with the URL
    chrome?.tabs.create({ url: url, active: false });
  } else {
    // Query for the active tab
    chrome?.tabs.query(
      {
        active: true,
        currentWindow: true,
      },
      (tabs) => {
        const tab = tabs[0];

        if (tab.id) {
          // Update the URL of the current tab
          chrome.tabs.update(tab.id, { url: url });

          // Close the popup
          const isPopup = document.body.classList.contains('popup-page');
          if (isPopup) {
            window.close();
          }
        }
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'reading-list-item': ReadingListItemElement;
  }
}
