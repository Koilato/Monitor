import test from 'node:test';
import assert from 'node:assert/strict';

import { createHoverAnchor } from '../../src/map/lib/hover-anchor';

test('creates a right-placed hover anchor on the left half of the viewport', () => {
  const windowOwner = globalThis as typeof globalThis & { window?: unknown };
  const originalWindow = windowOwner.window;
  Object.defineProperty(windowOwner, 'window', {
    configurable: true,
    value: { innerWidth: 1200 },
  });

  try {
    assert.deepEqual(createHoverAnchor('2d', 250, 400), {
      x: 250,
      y: 400,
      mode: '2d',
      placement: 'right',
    });
  } finally {
    if (originalWindow === undefined) {
      delete windowOwner.window;
    } else {
      Object.defineProperty(windowOwner, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }
  }
});

test('creates a left-placed hover anchor on the right half of the viewport', () => {
  const windowOwner = globalThis as typeof globalThis & { window?: unknown };
  const originalWindow = windowOwner.window;
  Object.defineProperty(windowOwner, 'window', {
    configurable: true,
    value: { innerWidth: 1200 },
  });

  try {
    assert.deepEqual(createHoverAnchor('3d', 900, 320), {
      x: 900,
      y: 320,
      mode: '3d',
      placement: 'left',
    });
  } finally {
    if (originalWindow === undefined) {
      delete windowOwner.window;
    } else {
      Object.defineProperty(windowOwner, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }
  }
});
