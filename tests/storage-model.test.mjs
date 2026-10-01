import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyLegacySnapshot,
  mergeItem,
} from '../extension/scripts/lib/storage-model.js';

test('classifies v2 records without losing settings or unusual URLs', () => {
  const item = {
    url: 'chrome://extensions/',
    title: 'Extensions',
    addedAt: 1720000000000,
    viewed: true,
    index: 4,
    customField: 'keep me',
  };
  const settings = { theme: 'dark', viewAll: false };
  const snapshot = classifyLegacySnapshot({
    [item.url]: item,
    settings,
    index: 5,
    malformed: { addedAt: 1, url: 'different', title: 'Bad' },
  });

  assert.deepEqual(snapshot.items, [item]);
  assert.deepEqual(snapshot.other, {
    settings,
    index: 5,
    malformed: { addedAt: 1, url: 'different', title: 'Bad' },
  });
});

test('title update preserves v2 metadata and unknown fields', () => {
  const old = {
    url: 'https://example.com',
    title: 'Old',
    addedAt: 100,
    viewed: true,
    index: 2,
    unknown: { source: 'v2' },
  };
  const updated = mergeItem(old, {
    url: old.url,
    title: 'New',
    addedAt: old.addedAt,
  });

  assert.deepEqual(updated, { ...old, title: 'New' });
  assert.equal(old.title, 'Old');
});

test('legacy pages without a title stay visible with their URL as fallback', () => {
  const url = 'https://example.com/untitled';
  const result = classifyLegacySnapshot({
    [url]: { url, addedAt: 100, viewed: false },
  });
  assert.deepEqual(result.items, [{ url, title: url, addedAt: 100, viewed: false }]);
});
