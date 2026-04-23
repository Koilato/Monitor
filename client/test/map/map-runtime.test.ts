import test from 'node:test';
import assert from 'node:assert/strict';

import { createMapEventBridge } from '../../src/map/lib/map-runtime';

test('createMapEventBridge reads the latest view mode for hover anchors', () => {
  let viewMode: '2d' | '3d' = '2d';
  const hoverEvents: Array<{ country: { code: string; name: string } | null; anchor: { mode: '2d' | '3d' } | null }> = [];
  const previousWindow = globalThis.window;
  Object.defineProperty(globalThis, 'window', {
    value: { innerWidth: 800 },
    configurable: true,
    writable: true,
  });

  try {
    const bridge = createMapEventBridge({
      getViewMode: () => viewMode,
      getCountryHoverHandler: () => (event) => {
        hoverEvents.push(event);
      },
      getCameraChangeHandler: () => () => {},
      suppressMoveSyncRef: { current: false },
    });

    const canvas = {
      style: { cursor: '' },
      getBoundingClientRect() {
        return { left: 12, top: 24 };
      },
    };
    const map = {
      queryRenderedFeatures() {
        return [{
          properties: {
            'ISO3166-1-Alpha-2': 'US',
            name: 'United States',
          },
        }];
      },
      getCanvas() {
        return canvas;
      },
    };

    bridge.handleMouseMove(map as never, { point: { x: 8, y: 9 } } as never);
    viewMode = '3d';
    bridge.handleMouseMove(map as never, { point: { x: 8, y: 9 } } as never);
    bridge.handleMouseOut(map as never);

    assert.equal(canvas.style.cursor, '');
    assert.deepEqual(hoverEvents.map((event) => event.anchor?.mode ?? null), ['2d', '3d', null]);
    assert.deepEqual(hoverEvents.map((event) => event.country?.code ?? null), ['US', 'US', null]);
  } finally {
    if (previousWindow === undefined) {
      delete (globalThis as typeof globalThis & { window?: Window }).window;
    } else {
      Object.defineProperty(globalThis, 'window', {
        value: previousWindow,
        configurable: true,
        writable: true,
      });
    }
  }
});

test('createMapEventBridge reads the latest camera change handler and respects suppression', () => {
  let useSecondaryHandler = false;
  const primaryCameraEvents: Array<Record<string, number>> = [];
  const secondaryCameraEvents: Array<Record<string, number>> = [];
  const bridge = createMapEventBridge({
    getViewMode: () => '2d',
    getCountryHoverHandler: () => () => {},
    getCameraChangeHandler: () => (
      useSecondaryHandler
        ? (camera) => {
          secondaryCameraEvents.push(camera as Record<string, number>);
        }
        : (camera) => {
          primaryCameraEvents.push(camera as Record<string, number>);
        }
    ),
    suppressMoveSyncRef: { current: false },
  });

  const map = {
    getCenter() {
      return { lng: 10, lat: 20 };
    },
    getZoom() {
      return 4;
    },
    getBearing() {
      return 5;
    },
    getPitch() {
      return 6;
    },
  };

  bridge.handleMoveEnd(map as never);
  useSecondaryHandler = true;
  bridge.handleMoveEnd(map as never);

  assert.deepEqual(primaryCameraEvents, [{ lng: 10, lat: 20, zoom: 4, bearing: 5, pitch: 6 }]);
  assert.deepEqual(secondaryCameraEvents, [{ lng: 10, lat: 20, zoom: 4, bearing: 5, pitch: 6 }]);

  const suppressedRef = { current: true };
  const suppressedBridge = createMapEventBridge({
    getViewMode: () => '2d',
    getCountryHoverHandler: () => () => {},
    getCameraChangeHandler: () => () => {
      throw new Error('should not be called');
    },
    suppressMoveSyncRef: suppressedRef,
  });

  suppressedBridge.handleMoveEnd(map as never);
  assert.equal(suppressedRef.current, false);
});
