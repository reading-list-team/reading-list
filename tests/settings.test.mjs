import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeSettings, sortList, toLegacySettings,
} from '../extension/scripts/lib/settings.js';

test('v2 title sort preference keeps its visible direction', () => {
  const settings = normalizeSettings({ sortOption: 'title', sortOrder: 'down' }, true);
  assert.equal(settings.sortOrder, 'up');
  assert.deepEqual(sortList([
    { title: 'Z', addedAt: 2 },
    { title: 'A', addedAt: 1 },
  ], settings).map((item) => item.title), ['A', 'Z']);
  assert.equal(toLegacySettings(settings).sortOrder, 'down');
});

test('manual order uses saved indexes before date', () => {
  const settings = normalizeSettings({ sortOption: 'manual' });
  assert.deepEqual(sortList([
    { title: 'New', addedAt: 200, index: 2 },
    { title: 'Old', addedAt: 100, index: 1 },
  ], settings).map((item) => item.title), ['Old', 'New']);
});
