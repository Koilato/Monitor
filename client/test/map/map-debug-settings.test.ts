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
    countryCenterOverrides: {
      cn: { lon: 120.5, lat: 31.2 },
      bad: { lon: 1, lat: 2 },
    },
    threatColorsEnabled: false,
    threatOutlineVisible: false,
    threatOutlineWidth: 2.4,
    attackArc: {
      bundleCount: 6,
      lengthThresholds: {
        shortMax: 22,
        mediumMax: 68,
      },
      lengthPresets: {
        short: {
          bundleSpreadRatio: 0.07,
          curvatureRatio: 0.11,
          lineWidth: 1.4,
          segmentCount: 72,
        },
        medium: {
          bundleSpreadRatio: 0.12,
          curvatureRatio: 0.22,
          lineWidth: 2.1,
          segmentCount: 120,
        },
        long: {
          bundleSpreadRatio: 0.17,
          curvatureRatio: 0.28,
          lineWidth: 2.6,
          segmentCount: 160,
        },
      },
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
    },
  });

  assert.deepEqual(settings, {
    latestSectionHeight: 180,
    minZoom: -1,
    maxZoom: 5,
    activeCountryCodes: ['CN', 'US', 'JP'],
    countryCenterOverrides: {
      CN: { lon: 120.5, lat: 31.2 },
    },
    threatColorsEnabled: false,
    threatOutlineVisible: false,
    threatOutlineWidth: 2.4,
    attackArc: {
      bundleCount: 6,
      lengthThresholds: {
        shortMax: 22,
        mediumMax: 68,
      },
      lengthPresets: {
        short: {
          bundleSpreadRatio: 0.07,
          curvatureRatio: 0.11,
          lineWidth: 1.4,
          segmentCount: 72,
        },
        medium: {
          bundleSpreadRatio: 0.12,
          curvatureRatio: 0.22,
          lineWidth: 2.1,
          segmentCount: 120,
        },
        long: {
          bundleSpreadRatio: 0.17,
          curvatureRatio: 0.28,
          lineWidth: 2.6,
          segmentCount: 160,
        },
      },
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
    },
  });
});
