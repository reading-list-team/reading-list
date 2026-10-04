import { css } from 'lit';

export const designTokens = css`
  :host {
    --color-bg: #fff;
    --color-text: #252b33;
    --color-muted: #77808d;
    --color-line: #e9edf2;
    --color-surface: #f5f7fa;
    --color-highlight: #e7f6f0;
    --color-highlight-hover: #d8efe5;
    --color-accent: #219d78;
    --color-accent-hover: #187f61;
    --color-accent-strong: #187f61;
    --color-accent-strong-hover: #126b50;
    --color-accent-text: #187f61;
    --color-danger: #c65b5e;
    --color-success: #19865f;
    --color-warning: #c48a2f;
    --color-focus: #187f61;
    --font-ui: 'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI',
      sans-serif;
    --text-xs: 11px;
    --text-sm: 12px;
    --text-md: 14px;
    --text-lg: 20px;
    --weight-medium: 500;
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;
    --content-gutter: 20px;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-pill: 999px;
    --motion-fast: 150ms;
    --motion-smooth: 220ms;
    --focus-ring: 0 0 0 3px rgba(33, 157, 120, 0.28);
    font-family: var(--font-ui);
    color: var(--color-text);
    background: var(--color-bg);
  }
  :host([data-theme='dark']) {
    --color-bg: #171717;
    --color-text: #f4f4f4;
    --color-muted: #a3a3a3;
    --color-line: #333333;
    --color-surface: #262626;
    --color-highlight: #19382e;
    --color-highlight-hover: #23503f;
    --color-accent: #219d78;
    --color-accent-hover: #187f61;
    --color-accent-strong: #187f61;
    --color-accent-strong-hover: #126b50;
    --color-accent-text: #71d6aa;
    --color-danger: #e08083;
    --color-success: #66cda1;
    --color-warning: #e4ac57;
    --color-focus: #71d6aa;
    --focus-ring: 0 0 0 3px rgba(113, 214, 170, 0.35);
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  button,
  input,
  select {
    font: inherit;
  }
  button {
    cursor: pointer;
  }
  :focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
  .text-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    flex: none;
    min-height: 36px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-line);
    border-radius: var(--radius-pill);
    background: var(--color-bg);
    color: var(--color-text);
    font-size: var(--text-md);
    font-weight: var(--weight-medium);
    line-height: 1.2;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    transition: background var(--motion-fast) ease;
  }
  .text-button:hover {
    background: var(--color-surface);
  }
  .text-button--primary {
    border-color: var(--color-accent-strong);
    background: var(--color-accent-strong);
    color: #fff;
  }
  .text-button--primary:hover {
    background: var(--color-accent-strong-hover);
  }
  .switch {
    appearance: none;
    position: relative;
    flex: 0 0 auto;
    width: 38px;
    height: 22px;
    margin: 0;
    border: 1px solid var(--color-muted);
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    cursor: pointer;
    transition:
      background var(--motion-smooth) ease,
      border-color var(--motion-smooth) ease;
  }
  .switch::before {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--color-muted);
    transition:
      transform var(--motion-smooth) cubic-bezier(0.2, 0.8, 0.2, 1),
      background var(--motion-smooth) ease;
  }
  .switch:checked {
    border-color: var(--color-accent);
    background: var(--color-accent);
  }
  .switch:checked::before {
    transform: translateX(16px);
    background: #fff;
  }
  .switch:focus-visible {
    outline: 0;
    box-shadow: var(--focus-ring);
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

export function resolvedTheme(
  theme: 'system' | 'light' | 'dark',
): 'light' | 'dark' {
  return theme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : theme;
}
