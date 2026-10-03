# Popup UI flow and component plan

Visual direction: the supplied three-frame wireframe. The popup uses a compact 360 × 520 px canvas, a quiet empty state, blue save action, understated rows, and a bottom search/settings rail.

## Flows

- **Popup load:** a centered, reduced-motion-aware Lucide spinner → empty, populated, or error. Local-only and sync-unavailable notices appear below the header. Retry attempts another Chrome sync storage write; it does not claim cross-device delivery.
- **Save:** compact + button (or A when focus is outside text fields and menus) reads the active tab → local-first repository save → list update. The button briefly shows a checkmark, and the list scrolls to an inset, rounded highlight on the saved row even when sorting places it below the initial viewport. Saving the exact same URL again makes no storage change: it keeps the user's title, viewed state, date, and order, highlights that row, and says “Already saved.” Row actions use the same highlight surface and hover palette. Favicon images have transparent backgrounds, with a surface only for the fallback glyph. Unsupported tabs show an error; local-only saves show the reliability warning.
- **Viewed pages:** when “Show viewed pages” is off, unread pages remain in the main list and a collapsed “Viewed (count)” section appears below them. Opening the section is temporary and does not change the saved preference. When the preference is on, all pages appear in one list.
- **Find and open:** footer search icon reveals and focuses a field with a short upward fade → results filter by title or URL → row link opens the page and marks it viewed. X or Escape fades the field and X downward before closing and returning focus to the search button; clicking elsewhere closes it without stealing focus. A gradient attached to the borderless footer softens the last part of the list without adding scroll space; the final row has no divider.
- **Notices:** one full-width notice sits below the header. Yellow warns that pages are only on this device and offers Try again; red reports a failed action and offers a retry when possible. The X hides a notice for the current popup only. Retry updates or removes the warning without a separate result notice. If Retry finds a page it cannot send, the action changes to Open settings for a backup instead of asking for another Retry. The technical conflict notice is omitted from the popup; options gives a plain backup action for saved copies.
- **Manage:** hover or keyboard focus reveals edit, copy URL, and delete. Manual sort adds a drag grip; as it moves, adjacent rows shift into a live insertion preview. Its Up and Down keyboard shortcuts provide the same movement without visible arrow buttons. Edit swaps title for a quiet underlined input without changing row height; Enter saves, Escape cancels, and focus returns to Edit. Delete shows a domain-named Undo toast over the footer; it fades after six seconds, pauses on hover or focus, and has a close button. Undo restores through the existing repository save method without a second success notice. Copy, title edit, and order confirmations use short-lived toasts rather than shifting the list.
- **Sort:** labeled button opens manual/date/title and plain order choices (newest/oldest or A to Z/Z to A), with order hidden for manual sorting. The menu animates in and out; Escape or outside pointer closes it. Date mode uses directional calendar icons.
- **Quick settings:** footer settings opens a sliding modal sheet with System/Light/Dark, animated switches for new-tab behavior and viewed-page visibility, and a link to the options page. Reduced-motion preference removes the transition.
- **Options:** full tab holds detailed preferences, retry, backup export, import preview and confirmation, and recovery information.

## Components and tokens

- `reading-list-app`: popup shell, feedback, search, sort, sheet, and Undo state.
- `reading-list-item`: page identity, link, focusable actions, and inline title editor.
- `reading-list-notice`: shared yellow warning and red error layout, with optional action and close controls.
- `reading-list-options`: detailed settings and backup controls.
- `design-tokens.ts`: shared CSS variables for colors, typography, a single horizontal content gutter, spacing, radii, motion, and focus. Dark theme and reduced motion are handled here. Inter's Latin variable font is bundled locally, with system fonts as fallback.
- `icon.ts`: Lucide SVG creation. Callers import only the icon nodes they use.

## Data boundary

The storage format and migration code are unchanged. Persisting System theme extends the existing settings value. Manual drag and drop uses a repository `reorderItem` method that writes the same indexed item records in one local-first operation. Single-item Undo uses `addReadingItem` to clear the current tombstone and restore the saved record. Chrome sync storage write success is reported as a write, not proof of delivery to another device.
