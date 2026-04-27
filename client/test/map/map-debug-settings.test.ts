import test from 'node:test';
import assert from 'node:assert/strict';

import {
  coerceMapDebugSettings,
  coerceStoredMapDebugSettings,
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
    stages: {
      stage1: { ...stage },
      stage2: { ...stage },
      stage3: { ...stage },
    },
  };
}

function createExpectedVisualStyles() {
  return {
    low: {
      lineColor: '#14b8a6',
      ringColor: '#14b8a6',
      dotColor: '#14b8a6',
    },
    medium: {
      lineColor: '#ffb72e',
      ringColor: '#ffb72e',
      dotColor: '#ffb72e',
    },
    high: {
      lineColor: '#ff1d24',
      ringColor: '#ff1d24',
      dotColor: '#ff1d24',
    },
  };
}

test('coerceMapDebugSettings normalizes values and preserves attack arc config', () => {
  const settings = coerceMapDebugSettings({
    latestSectionHeight: 180,
    trafficStats: {
      uiScale: 0.82,
      trendPanelWidth: 540,
      barsPanelWidth: 860,
      originsPanelWidth: 260,
      panelPaddingX: 22,
      panelPaddingTop: 10,
      panelPaddingBottom: 18,
      barGap: 9,
      barCount: 12,
      barWidth: 44,
      countryLabelScale: 1.15,
      trendAxisLabelScale: 1.1,
      trendAreaOpacity: 0.31,
      trendStrokeWidth: 2.6,
      summaryValueScale: 1.2,
      originCount: 4,
    },
    minZoom: -1,
    maxZoom: 5,
    countryDotPatternEnabled: false,
    countryDotPatternColor: '#aabbcc',
    countryDotPatternDensity: 19,
    countryDotPatternOpacity: 0.42,
    baseCountryFillColor: '#151515',
    baseCountryFillOpacity: 0.92,
    baseCountryOutlineColor: '#888888',
    baseCountryOutlineWidth: 1.4,
    baseCountryOutlineOpacity: 0.65,
    baseCountryGlowColor: '#999999',
    baseCountryGlowWidth: 3.2,
    baseCountryGlowOpacity: 0.4,
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
      visualStyles: createExpectedVisualStyles(),
      presets: {
        short: createExpectedPreset(0.07, 0.11, 1.4, 72),
        medium: createExpectedPreset(0.12, 0.22, 2.1, 120),
        long: createExpectedPreset(0.17, 0.28, 2.6, 160),
      },
    },
  });

  assert.deepEqual(settings, {
    latestSectionHeight: 180,
    trafficStats: {
      uiScale: 0.82,
      trendPanelWidth: 540,
      barsPanelWidth: 860,
      originsPanelWidth: 260,
      panelPaddingX: 22,
      panelPaddingTop: 10,
      panelPaddingBottom: 18,
      barGap: 9,
      barCount: 12,
      barWidth: 44,
      countryLabelScale: 1.15,
      trendAxisLabelScale: 1.1,
      trendAreaOpacity: 0.31,
      trendStrokeWidth: 2.6,
      summaryValueScale: 1.2,
      originCount: 4,
    },
    minZoom: -1,
    maxZoom: 5,
    countryDotPatternEnabled: false,
    countryDotPatternColor: '#aabbcc',
    countryDotPatternDensity: 19,
    countryDotPatternOpacity: 0.42,
    baseCountryFillColor: '#151515',
    baseCountryFillOpacity: 0.92,
    baseCountryOutlineColor: '#888888',
    baseCountryOutlineWidth: 1.4,
    baseCountryOutlineOpacity: 0.65,
    baseCountryGlowColor: '#999999',
    baseCountryGlowWidth: 3.2,
    baseCountryGlowOpacity: 0.4,
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
      visualStyles: createExpectedVisualStyles(),
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
  assert.equal(result.settings.attackArc.visualStyles.high.lineColor, '#ff1d24');
});

test('coerceStoredMapDebugSettings migrates legacy per-length colors to shared threat colors', () => {
  const result = coerceStoredMapDebugSettings({
    attackArc: {
      lengthThresholds: {
        shortMax: 20,
        mediumMax: 60,
      },
      presets: {
        short: {
          ...createExpectedPreset(0.09, 0.14, 1.6, 72),
          style: {
            lineColor: '#111111',
            ringColor: '#222222',
            dotColor: '#333333',
          },
        },
        medium: {
          ...createExpectedPreset(0.12, 0.22, 2.1, 120),
          style: {
            lineColor: '#444444',
            ringColor: '#555555',
            dotColor: '#666666',
          },
        },
        long: {
          ...createExpectedPreset(0.17, 0.28, 2.6, 160),
          style: {
            lineColor: '#777777',
            ringColor: '#888888',
            dotColor: '#999999',
          },
        },
      },
    },
  });

  assert.equal(result.attackArcConfigState.isValid, true);
  assert.deepEqual(result.settings.attackArc.visualStyles, createExpectedVisualStyles());
  assert.equal(result.settings.attackArc.presets.medium.lineWidth, 2.1);
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
    trafficStats: {
      uiScale: 9,
      trendPanelWidth: 999,
      barsPanelWidth: 9999,
      originsPanelWidth: 999,
      panelPaddingX: 0,
      panelPaddingTop: -5,
      panelPaddingBottom: 99,
      barGap: 0,
      barCount: 99,
      barWidth: 999,
      countryLabelScale: 9,
      trendAxisLabelScale: 9,
      trendAreaOpacity: 9,
      trendStrokeWidth: 9,
      summaryValueScale: 9,
      originCount: 0,
    },
    baseCountryOutlineColor: 'not-a-color',
    baseCountryOutlineWidth: 12,
    baseCountryOutlineOpacity: -1,
    threatOutlineNeutralColor: 'bad',
    threatOutlineWidth: -1,
    threatGlowNeutralColor: 'bad',
    threatGlowWidth: 99,
    hoverGlowWidth: 99,
    hoverBorderWidth: -2,
    countryDotPatternColor: 'bad',
    countryDotPatternDensity: 99,
    countryDotPatternOpacity: -0.4,
  });

  assert.equal(settings.baseCountryOutlineColor, '#707070');
  assert.equal(settings.baseCountryOutlineWidth, 8);
  assert.equal(settings.baseCountryOutlineOpacity, 0);
  assert.equal(settings.trafficStats.uiScale, 1.2);
  assert.equal(settings.trafficStats.trendPanelWidth, 720);
  assert.equal(settings.trafficStats.barsPanelWidth, 1200);
  assert.equal(settings.trafficStats.originsPanelWidth, 420);
  assert.equal(settings.trafficStats.panelPaddingX, 8);
  assert.equal(settings.trafficStats.panelPaddingTop, 0);
  assert.equal(settings.trafficStats.panelPaddingBottom, 40);
  assert.equal(settings.trafficStats.barGap, 4);
  assert.equal(settings.trafficStats.barCount, 16);
  assert.equal(settings.trafficStats.barWidth, 80);
  assert.equal(settings.trafficStats.countryLabelScale, 1.8);
  assert.equal(settings.trafficStats.trendAxisLabelScale, 1.8);
  assert.equal(settings.trafficStats.trendAreaOpacity, 0.6);
  assert.equal(settings.trafficStats.trendStrokeWidth, 4);
  assert.equal(settings.trafficStats.summaryValueScale, 1.8);
  assert.equal(settings.trafficStats.originCount, 1);
  assert.equal(settings.threatOutlineNeutralColor, THREAT_OUTLINE_NEUTRAL_COLOR);
  assert.equal(settings.threatOutlineWidth, 0);
  assert.equal(settings.threatGlowNeutralColor, THREAT_GLOW_NEUTRAL_COLOR);
  assert.equal(settings.threatGlowWidth, 24);
  assert.equal(settings.hoverGlowWidth, 24);
  assert.equal(settings.hoverBorderWidth, 0);
  assert.equal(settings.countryDotPatternColor, '#7a7a7a');
  assert.equal(settings.countryDotPatternDensity, 24);
  assert.equal(settings.countryDotPatternOpacity, 0);
});

test('coerceMapDebugSettings falls back to default country dot pattern settings for missing values', () => {
  const settings = coerceMapDebugSettings({});

  assert.equal(settings.countryDotPatternEnabled, true);
  assert.equal(settings.countryDotPatternColor, '#7a7a7a');
  assert.equal(settings.countryDotPatternDensity, 16);
  assert.equal(settings.countryDotPatternOpacity, 0.36);
});
