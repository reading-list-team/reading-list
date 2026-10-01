import { css } from 'lit';

export const designTokens = css`
  :host {
    --color-bg: #fff;
    --color-text: #252b33;
    --color-muted: #77808d;
    --color-line: #e9edf2;
    --color-surface: #f5f7fa;
    --color-accent: #397cf5;
    --color-accent-hover: #286be5;
    --color-danger: #bd3944;
    --color-focus: #1d65d8;
    --font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --text-xs: 11px;
    --text-sm: 12px;
    --text-md: 13px;
    --text-lg: 18px;
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
    --focus-ring: 0 0 0 3px rgba(57, 124, 245, 0.25);
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
    --color-accent: #75a5ff;
    --color-accent-hover: #96baff;
    --color-danger: #ff9a9f;
    --color-focus: #a9c7ff;
    --focus-ring: 0 0 0 3px rgba(117, 165, 255, 0.35);
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
