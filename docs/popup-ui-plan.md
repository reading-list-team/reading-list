# Popup UI flow and component plan

Visual direction: the supplied three-frame wireframe. The popup uses a compact 360 × 520 px canvas, a quiet empty state, blue save action, understated rows, and a bottom search/settings rail.

## Flows

- **Popup load:** a centered, reduced-motion-aware Lucide spinner → empty, populated, or error. Local-only and sync-unavailable notices appear below the header. Retry attempts another Chrome sync storage write; it does not claim cross-device delivery.
- **Save:** compact + button (or A when focus is outside text fields and menus) reads the active tab → local-first repository save → list update. The button briefly shows a checkmark, and the list scrolls to and highlights the saved row even when sorting places it below the initial viewport. Unsupported tabs show an error; local-only saves show the reliability warning.
- **Find and open:** footer search icon reveals and focuses a field with a short upward fade → results filter by title or URL → row link opens the page and marks it viewed. X or Escape fades the field and X downward before closing and returning focus to the search button; clicking elsewhere closes it without stealing focus. A gradient attached to the borderless footer softens the last part of the list without adding scroll space; the final row has no divider.
- **Manage:** hover or keyboard focus reveals edit, copy URL, and delete. Manual sort adds a drag grip; as it moves, adjacent rows shift into a live insertion preview. Its Up and Down keyboard shortcuts provide the same movement without visible arrow buttons. Edit swaps title for a quiet underlined input without changing row height; Enter saves, Escape cancels, and focus returns to Edit. Delete shows a one-item Undo toast over the footer; it fades after six seconds, pauses on hover or focus, and has a close button. Undo restores through the existing repository save method.
- **Sort:** labeled button opens manual/date/title and direction choices, with direction hidden for manual order. The menu animates in and out; Escape or outside pointer closes it. Date mode uses directional calendar icons.
- **Quick settings:** footer settings opens a sliding modal sheet with System/Light/Dark, animated switches for new-tab behavior and viewed-page visibility, and a link to the options page. Reduced-motion preference removes the transition.
- **Options:** full tab holds detailed preferences, retry, backup export, import preview and confirmation, and recovery information.

## Components and tokens

- `reading-list-app`: popup shell, feedback, search, sort, sheet, and Undo state.
- `reading-list-item`: page identity, link, focusable actions, and inline title editor.
- `reading-list-options`: detailed settings and backup controls.
- `design-tokens.ts`: shared CSS variables for colors, typography, a single horizontal content gutter, spacing, radii, motion, and focus. Dark theme and reduced motion are handled here. Inter's Latin variable font is bundled locally, with system fonts as fallback.
- `icon.ts`: Lucide SVG creation. Callers import only the icon nodes they use.

## Data boundary

The storage format and migration code are unchanged. Persisting System theme extends the existing settings value. Manual drag and drop uses a repository `reorderItem` method that writes the same indexed item records in one local-first operation. Single-item Undo uses `addReadingItem` to clear the current tombstone and restore the saved record. Chrome sync storage write success is reported as a write, not proof of delivery to another device.
