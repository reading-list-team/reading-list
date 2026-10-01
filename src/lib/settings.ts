export interface ReadingListSettings {
  theme: 'light' | 'dark';
  openNewTab: boolean;
  sortOption: 'manual' | 'date' | 'title';
  sortOrder: 'up' | 'down';
  viewAll: boolean;
}

export const DEFAULT_SETTINGS: ReadingListSettings = {
  theme: 'light',
  openNewTab: false,
  sortOption: 'manual',
  sortOrder: 'down',
  viewAll: true,
};

export function normalizeSettings(
  value: unknown,
  legacy = false,
): ReadingListSettings {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    theme: raw.theme === 'dark' ? 'dark' : 'light',
    openNewTab: raw.openNewTab === true,
    sortOption: raw.sortOption === 'date' || raw.sortOption === 'title'
      ? raw.sortOption : 'manual',
    sortOrder: legacy && raw.sortOption === 'title'
      ? raw.sortOrder === 'up' ? 'down' : 'up'
      : raw.sortOrder === 'up' ? 'up' : 'down',
    viewAll: raw.viewAll !== false,
  };
}

export function sortList<T extends { title: string; addedAt: number; index?: number }>(
  items: T[], settings: ReadingListSettings,
): T[] {
  return [...items].sort((a, b) => {
    if (settings.sortOption === 'date') {
      return settings.sortOrder === 'up'
        ? a.addedAt - b.addedAt : b.addedAt - a.addedAt;
    }
    if (settings.sortOption === 'title') {
      const result = a.title.localeCompare(b.title, undefined, {
        numeric: true, sensitivity: 'base',
      });
      return settings.sortOrder === 'up' ? result : -result;
    }
    return (a.index ?? Number.MAX_SAFE_INTEGER) -
      (b.index ?? Number.MAX_SAFE_INTEGER) || b.addedAt - a.addedAt;
  });
}

export function toLegacySettings(settings: ReadingListSettings): Record<string, unknown> {
  return {
    ...settings,
    sortOption: settings.sortOption === 'manual' ? '' : settings.sortOption,
    sortOrder: settings.sortOption === 'title'
      ? settings.sortOrder === 'up' ? 'down' : 'up'
      : settings.sortOrder,
  };
}
