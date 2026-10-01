import { css } from 'lit';

export const designTokens = css`
  :host {
    --color-bg: #fff;
    --color-text: #252b33;
    --color-muted: #77808d;
    --color-line: #e9edf2;
    --color-surface: #f5f7fa;
    --color-accent: #4285f4;
    --color-accent-hover: #3367d6;
    --color-danger: #ea4335;
    --color-success: #34a853;
    --color-warning: #fbbc05;
    --color-focus: #4285f4;
    --font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --text-xs: 11px;
    --text-sm: 12px;
    --text-md: 14px;
    --text-lg: 22px;
    --weight-medium: 500;
    --weight-heading: 600;
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-pill: 999px;
    --motion-fast: 150ms;
    --motion-smooth: 220ms;
    --focus-ring: 0 0 0 3px rgba(66, 133, 244, 0.25);
    font-family: var(--font-ui);
    color: var(--color-text);
    background: var(--color-bg);
  }
  :host([data-theme='dark']) {
    --color-bg: #1d222b;
    --color-text: #f2f4f7;
    --color-muted: #a8b1c0;
    --color-line: #363d49;
    --color-surface: #292f39;
    --color-accent: #8ab4f8;
    --color-accent-hover: #aecbfa;
    --color-danger: #f28b82;
    --color-success: #81c995;
    --color-warning: #fdd663;
    --color-focus: #8ab4f8;
    --focus-ring: 0 0 0 3px rgba(138, 180, 248, 0.35);
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
