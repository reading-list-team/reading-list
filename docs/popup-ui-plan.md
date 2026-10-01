# Popup UI flow and component plan

Visual direction: the supplied three-frame wireframe. The popup uses a compact 360 × 520 px canvas, a quiet empty state, blue save action, understated rows, and a bottom search/settings rail.

## Flows

- **Popup load:** loading → empty, populated, or error. Local-only and sync-unavailable notices appear below the header. Retry attempts another Chrome sync storage write; it does not claim cross-device delivery.
- **Save:** header button reads the active tab → local-first repository save → list update and precise status. Unsupported tabs show an error.
- **Find and open:** footer search icon reveals and focuses a field → results filter by title or URL → row link opens the page and marks it viewed. X or Escape closes search and returns focus to the search button; clicking elsewhere closes it without stealing focus.
- **Manage:** hover or keyboard focus reveals edit, copy URL, and delete. Manual sort adds a drag grip; as it moves, adjacent rows shift into a live insertion preview. Its Up and Down keyboard shortcuts provide the same movement without visible arrow buttons. Edit swaps title for an input without changing row height; Enter saves, Escape cancels, and focus returns to Edit. Delete shows one-item Undo, restoring through the existing repository save method.
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
