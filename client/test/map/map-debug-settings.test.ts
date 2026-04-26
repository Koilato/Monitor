import test from 'node:test';
import assert from 'node:assert/strict';

import {
  coerceMapDebugSettings,
  parseActiveCountryCodesInput,
} from '../../src/map/hooks/useMapDebugSettings';

test('parseActiveCountryCodesInput normalizes iso2 entries', () => {
  assert.deepEqual(
    parseActiveCountryCodesInput(' cn, us, cn, jp , invalid, a, br1, de '),
    ['CN', 'US', 'JP', 'DE'],
  );
});

test('coerceMapDebugSettings keeps normalized active country codes', () => {
  const settings = coerceMapDebugSettings({
    latestSectionHeight: 180,
    minZoom: -1,
    maxZoom: 5,
    activeCountryCodes: ['cn', 'us', 'US', '', 'Jp'],
    threatColorsEnabled: false,
    threatOutlineVisible: false,
    threatOutlineWidth: 2.4,
    attackArc: {
      bundleCount: 6,
      bundleSpreadRatio: 0.12,
      curvatureRatio: 0.22,
      lineWidth: 2.1,
      segmentCount: 120,
      flightDuration: 1500,
      holdDuration: 2100,
      fadeoutDuration: 900,
      replayDelayMs: 6000,
      bundleIntervalMs: 260,
      maxConcurrentStarts: 5,
      ringRadius: 18,
      ringCount: 3,
      ringSpacing: 4,
      ringLineWidth: 2.8,
      ringDotRadius: 7,
      arcWidthScale3d: 1.2,
      arrowSizeScale3d: 1.4,
    },
  });

  assert.deepEqual(settings, {
    latestSectionHeight: 180,
    minZoom: -1,
    maxZoom: 5,
    activeCountryCodes: ['CN', 'US', 'JP'],
    threatColorsEnabled: false,
    threatOutlineVisible: false,
    threatOutlineWidth: 2.4,
    attackArc: {
      bundleCount: 6,
      bundleSpreadRatio: 0.12,
      curvatureRatio: 0.22,
      lineWidth: 2.1,
      segmentCount: 120,
      flightDuration: 1500,
      holdDuration: 2100,
      fadeoutDuration: 900,
      replayDelayMs: 6000,
      bundleIntervalMs: 260,
      maxConcurrentStarts: 5,
      ringRadius: 18,
      ringCount: 3,
      ringSpacing: 4,
      ringLineWidth: 2.8,
      ringDotRadius: 7,
      arcWidthScale3d: 1.2,
      arrowSizeScale3d: 1.4,
    },
  });
});
