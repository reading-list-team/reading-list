import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBackup } from '../extension/scripts/lib/backup.js';

const item = {
  url: 'https://example.com/one',
  title: 'One',
  addedAt: 100,
  viewed: true,
  index: 2,
};

test('imports v2 raw sync backups and reports malformed records', () => {
  const result = parseBackup(JSON.stringify({
    [item.url]: item,
    settings: { theme: 'dark' },
    malformed: { url: 'different', title: 'No', addedAt: 100 },
  }));
  assert.deepEqual(result, {
    items: [item], skipped: 1, source: 'v2',
    settings: {
      theme: 'dark', openNewTab: false, sortOption: 'manual',
      sortOrder: 'down', viewAll: true,
    },
  });
});

test('reads versioned backups and rejects unknown versions', () => {
  const backup = {
    format: 'reading-list-backup',
    version: 1,
    items: [item, { url: 123, title: 'Bad', addedAt: 100 }],
  };
  assert.deepEqual(parseBackup(JSON.stringify(backup)), {
    items: [item], skipped: 1, source: 'v3.1', settings: undefined,
  });
  assert.throws(() => parseBackup(JSON.stringify({ ...backup, version: 2 })),
    /Unsupported/);
  assert.throws(() => parseBackup('{broken'), SyntaxError);
});

test('versioned backup restores locally saved settings when requested', () => {
  const result = parseBackup(JSON.stringify({
    format: 'reading-list-backup', version: 1, items: [item],
    rawLocal: { 'rl:v1:settings': { theme: 'dark', openNewTab: true } },
  }));
  assert.equal(result.settings.theme, 'dark');
  assert.equal(result.settings.openNewTab, true);
});
