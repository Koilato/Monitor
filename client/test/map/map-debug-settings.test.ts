import test from 'node:test';
import assert from 'node:assert/strict';

import {
  coerceMapDebugSettings,
  coerceStoredMapDebugSettings,
  parseActiveCountryCodesInput,
} from '../../src/map/hooks/useMapDebugSettings';
import {
  THREAT_GLOW_NEUTRAL_COLOR,
  THREAT_OUTLINE_NEUTRAL_COLOR,
} from '../../src/map/layers/tokens';

function createExpectedPreset(
  bundleSpreadRatio: number,
  curvatureRatio: number,
  lineWidth: number,
  segmentCount: number,
) {
  const stage = {
    lineAlpha: 1,
    ringAlpha: 1,
    dotAlpha: 1,
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
    bundleSpreadRatio,
    curvatureRatio,
    lineWidth,
    segmentCount,
    style: {
      lineColor: '#123456',
      ringColor: '#234567',
      dotColor: '#345678',
    },
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
    baseCountryFillColor: '#151515',
    baseCountryFillOpacity: 0.92,
    baseCountryOutlineColor: '#888888',
    baseCountryOutlineWidth: 1.4,
    baseCountryOutlineOpacity: 0.65,
    baseCountryGlowColor: '#999999',
    baseCountryGlowWidth: 3.2,
    baseCountryGlowOpacity: 0.4,
    activeCountryCodes: ['cn', 'us', 'US', '', 'Jp'],
    countryCenterOverrides: {
      cn: { lon: 120.5, lat: 31.2 },
      bad: { lon: 1, lat: 2 },
    },
    threatColorsEnabled: false,
    threatFillOpacity: 0.7,
    threatOutlineVisible: false,
    threatOutlineNeutralColor: '#767676',
    threatOutlineWidth: 2.4,
    threatOutlineOpacity: 0.66,
    threatGlowNeutralColor: '#6a6a6a',
    threatGlowWidth: 7.1,
    threatGlowOpacity: 0.52,
    hoverFillColor: '#123abc',
    hoverFillOpacity: 0.24,
    hoverThreatFillOpacity: 0.93,
    hoverGlowColor: '#456def',
    hoverGlowWidth: 6.5,
    hoverGlowOpacity: 0.31,
    hoverThreatGlowOpacity: 0.88,
    hoverBorderColor: '#89abcd',
    hoverBorderWidth: 2.9,
    hoverBorderOpacity: 0.73,
    hoverThreatBorderOpacity: 0.97,
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
    baseCountryFillColor: '#151515',
    baseCountryFillOpacity: 0.92,
    baseCountryOutlineColor: '#888888',
    baseCountryOutlineWidth: 1.4,
    baseCountryOutlineOpacity: 0.65,
    baseCountryGlowColor: '#999999',
    baseCountryGlowWidth: 3.2,
    baseCountryGlowOpacity: 0.4,
    activeCountryCodes: ['CN', 'US', 'JP'],
    countryCenterOverrides: {
      CN: { lon: 120.5, lat: 31.2 },
    },
    threatColorsEnabled: false,
    threatFillOpacity: 0.7,
    threatOutlineVisible: false,
    threatOutlineNeutralColor: '#767676',
    threatOutlineWidth: 2.4,
    threatOutlineOpacity: 0.66,
    threatGlowNeutralColor: '#6a6a6a',
    threatGlowWidth: 7.1,
    threatGlowOpacity: 0.52,
    hoverFillColor: '#123abc',
    hoverFillOpacity: 0.24,
    hoverThreatFillOpacity: 0.93,
    hoverGlowColor: '#456def',
    hoverGlowWidth: 6.5,
    hoverGlowOpacity: 0.31,
    hoverThreatGlowOpacity: 0.88,
    hoverBorderColor: '#89abcd',
    hoverBorderWidth: 2.9,
    hoverBorderOpacity: 0.73,
    hoverThreatBorderOpacity: 0.97,
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

test('coerceStoredMapDebugSettings marks incomplete stored attack arc config invalid', () => {
  const result = coerceStoredMapDebugSettings({
    attackArc: {
      presets: {
        short: {
          ...createExpectedPreset(0.09, 0.14, 1.6, 72),
          stages: {
            stage1: {
              ringRadius: 11,
              ringCount: 2,
              ringSpacing: 4,
              ringLineWidth: 2.4,
              ringDotRadius: 5,
            },
          },
        },
      },
    },
  });

  assert.equal(result.attackArcConfigState.isValid, false);
  assert.match(result.attackArcConfigState.errorMessage ?? '', /未应用已存样式/);
  assert.equal(result.settings.attackArc.presets.short.style.lineColor, '#f5a623');
});

test('coerceMapDebugSettings caps ring spacing so inner rings remain visible', () => {
  const settings = coerceMapDebugSettings({
    attackArc: {
      presets: {
        long: {
          stages: {
            stage2: {
              lineAlpha: 1,
              ringAlpha: 1,
              dotAlpha: 1,
              ringRadius: 15,
              ringCount: 2,
              ringSpacing: 15,
            },
          },
        },
      },
    },
  });

  assert.equal(settings.attackArc.presets.long.stages.stage2.ringRadius, 15);
  assert.equal(settings.attackArc.presets.long.stages.stage2.ringCount, 2);
  assert.equal(settings.attackArc.presets.long.stages.stage2.ringSpacing, 7.5);
});

test('coerceMapDebugSettings clamps attack arc line width to 0-10', () => {
  const lowSettings = coerceMapDebugSettings({
    attackArc: {
      presets: {
        short: {
          lineWidth: -2,
        },
      },
    },
  });

  const highSettings = coerceMapDebugSettings({
    attackArc: {
      presets: {
        short: {
          lineWidth: 12,
        },
      },
    },
  });

  assert.equal(lowSettings.attackArc.presets.short.lineWidth, 0);
  assert.equal(highSettings.attackArc.presets.short.lineWidth, 10);
});

test('coerceMapDebugSettings clamps base country outline settings', () => {
  const settings = coerceMapDebugSettings({
    baseCountryOutlineColor: 'not-a-color',
    baseCountryOutlineWidth: 12,
    baseCountryOutlineOpacity: -1,
    threatOutlineNeutralColor: 'bad',
    threatOutlineWidth: -1,
    threatGlowNeutralColor: 'bad',
    threatGlowWidth: 99,
    hoverGlowWidth: 99,
    hoverBorderWidth: -2,
  });

  assert.equal(settings.baseCountryOutlineColor, '#707070');
  assert.equal(settings.baseCountryOutlineWidth, 8);
  assert.equal(settings.baseCountryOutlineOpacity, 0);
  assert.equal(settings.threatOutlineNeutralColor, THREAT_OUTLINE_NEUTRAL_COLOR);
  assert.equal(settings.threatOutlineWidth, 0);
  assert.equal(settings.threatGlowNeutralColor, THREAT_GLOW_NEUTRAL_COLOR);
  assert.equal(settings.threatGlowWidth, 24);
  assert.equal(settings.hoverGlowWidth, 24);
  assert.equal(settings.hoverBorderWidth, 0);
});
