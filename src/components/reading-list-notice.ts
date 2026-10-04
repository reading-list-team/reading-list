import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { X } from 'lucide';
import { icon } from '../lib/icon.js';

@customElement('reading-list-notice')
export class ReadingListNoticeElement extends LitElement {
  static override styles = css`
    :host {
      --notice-bg: #fff5df;
      --notice-text: #6e4b0b;
      --notice-edge: var(--color-warning, #c48a2f);
      display: block;
      font-family: var(--font-ui);
    }
    :host([variant='error']) {
      --notice-bg: #fff0ef;
      --notice-text: #7e2a2d;
      --notice-edge: var(--color-danger, #c65b5e);
    }
    :host([data-theme='dark']) {
      --notice-bg: #352a18;
      --notice-text: #ffd996;
    }
    :host([data-theme='dark'][variant='error']) {
      --notice-bg: #3b2225;
      --notice-text: #ffc3c4;
    }
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }
    .notice {
      width: 100%;
      min-height: 40px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px var(--content-gutter, 20px);
      border-left: 3px solid var(--notice-edge);
      background: var(--notice-bg);
      color: var(--notice-text);
      font-size: var(--text-sm, 12px);
      line-height: 1.4;
    }
    .message {
      flex: 1;
      min-width: 0;
    }
    button {
      flex: none;
      border: 0;
      border-radius: 6px;
      padding: 5px 3px;
      background: transparent;
      color: inherit;
      font: inherit;
      font-weight: var(--weight-medium, 500);
      cursor: pointer;
    }
    button:hover {
      text-decoration: underline;
    }
    button:focus-visible {
      outline: 2px solid var(--color-focus, #187f61);
      outline-offset: 2px;
    }
    .dismiss {
      width: 24px;
      height: 28px;
      display: grid;
      place-items: center;
      opacity: 0.75;
    }
    .dismiss:hover {
      opacity: 1;
    }
    button:disabled {
      opacity: 0.6;
      cursor: default;
    }
  `;

  @property({ reflect: true }) variant: 'warning' | 'error' = 'warning';
  @property() message = '';
  @property({ attribute: 'action-label' }) actionLabel = '';
  @property({ type: Boolean }) busy = false;
  @property({ type: Boolean }) dismissible = true;

  override render() {
    return html`<div
      class="notice"
      role=${this.variant === 'error' ? 'alert' : 'status'}
    >
      <span class="message">${this.message}</span>
      ${this.actionLabel
        ? html`<button
            class="action"
            type="button"
            ?disabled=${this.busy}
            @click=${this.onAction}
          >
            ${this.busy ? 'Trying…' : this.actionLabel}
          </button>`
        : ''}
      ${this.dismissible
        ? html`<button
            class="dismiss"
            type="button"
            aria-label="Close notice"
            title="Close notice"
            @click=${this.onDismiss}
          >
            ${icon(X, 15)}
          </button>`
        : ''}
    </div>`;
  }
  private onAction() {
    this.dispatchEvent(
      new CustomEvent('notice-action', { bubbles: true, composed: true }),
    );
  }
  private onDismiss() {
    this.dispatchEvent(
      new CustomEvent('notice-dismiss', { bubbles: true, composed: true }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'reading-list-notice': ReadingListNoticeElement;
  }
}
