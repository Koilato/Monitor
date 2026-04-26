import test from 'node:test';
import assert from 'node:assert/strict';

import {
  coerceMapDebugSettings,
  parseActiveCountryCodesInput,
} from '../../src/map/hooks/useMapDebugSettings';

function createExpectedPreset(
  bundleSpreadRatio: number,
  curvatureRatio: number,
  lineWidth: number,
  segmentCount: number,
) {
  const stage = {
    bundleSpreadRatio,
    curvatureRatio,
    lineWidth,
    segmentCount,
    ringRadius: 18,
    ringCount: 3,
    ringSpacing: 4,
    ringLineWidth: 2.8,
    ringDotRadius: 7,
  };

  return {
    bundleCount: 6,
    flightDuration: 1500,
    holdDuration: 2100,
    fadeoutDuration: 900,
    replayDelayMs: 6000,
    bundleIntervalMs: 260,
    maxConcurrentStarts: 5,
    stages: {
      stage1: { ...stage },
      stage2: { ...stage },
      stage3: { ...stage },
    },
  };
}

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
      lengthThresholds: {
        shortMax: 22,
        mediumMax: 68,
      },
      presets: {
        short: createExpectedPreset(0.07, 0.11, 1.4, 72),
        medium: createExpectedPreset(0.12, 0.22, 2.1, 120),
        long: createExpectedPreset(0.17, 0.28, 2.6, 160),
      },
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
      lengthThresholds: {
        shortMax: 22,
        mediumMax: 68,
      },
      presets: {
        short: createExpectedPreset(0.07, 0.11, 1.4, 72),
        medium: createExpectedPreset(0.12, 0.22, 2.1, 120),
        long: createExpectedPreset(0.17, 0.28, 2.6, 160),
      },
    },
  });
});
