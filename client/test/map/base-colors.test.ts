import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COUNTRY_BASE_FILL_COLOR,
  COUNTRY_BASE_LINE_COLOR,
} from '../../src/map/layers/tokens';

test('base map colors swap country fill while keeping boundary line color unchanged', () => {
  assert.equal(COUNTRY_BASE_FILL_COLOR, '#141414');
  assert.equal(COUNTRY_BASE_LINE_COLOR, '#707070');
});
