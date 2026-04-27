import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COUNTRY_BASE_FILL_COLOR,
  COUNTRY_BASE_LINE_COLOR,
  THREAT_VISUAL_LEVEL_TOKENS,
} from '../../src/map/layers/tokens';

test('base map colors swap country fill while keeping boundary line color unchanged', () => {
  assert.equal(COUNTRY_BASE_FILL_COLOR, '#141414');
  assert.equal(COUNTRY_BASE_LINE_COLOR, '#707070');
});

test('threat palette uses the shared red, yellow, and cyan colors', () => {
  assert.equal(THREAT_VISUAL_LEVEL_TOKENS.low.stroke, 'rgba(20, 184, 166, 1)');
  assert.equal(THREAT_VISUAL_LEVEL_TOKENS.medium.stroke, 'rgba(255, 183, 46, 1)');
  assert.equal(THREAT_VISUAL_LEVEL_TOKENS.high.stroke, 'rgba(255, 29, 36, 1)');
  assert.equal(THREAT_VISUAL_LEVEL_TOKENS.critical.stroke, 'rgba(255, 29, 36, 1)');
});
