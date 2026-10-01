export interface StoredItem {
  url: string;
  title: string;
  addedAt: number;
  viewed?: boolean;
  index?: number;
  [key: string]: unknown;
}

export function isStoredItem(key: string, value: unknown): value is StoredItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (typeof key !== 'string' || !key || item.url !== key || typeof item.title !== 'string') return false;
  if (typeof item.addedAt !== 'number' || !Number.isFinite(item.addedAt)) {
    return false;
  }
  return true;
}

export interface LegacySnapshot {
  items: StoredItem[];
  other: Record<string, unknown>;
}

export function classifyLegacySnapshot(
  raw: Record<string, unknown>,
): LegacySnapshot {
  const items: StoredItem[] = [];
  const other: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (isStoredItem(key, value)) items.push(value);
    else other[key] = value;
  }
  return { items, other };
}

export function mergeItem(
  existing: StoredItem | undefined,
  incoming: StoredItem,
): StoredItem {
  return existing ? { ...existing, ...incoming } : { ...incoming };
}
