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
  });

  assert.deepEqual(settings, {
    latestSectionHeight: 180,
    minZoom: -1,
    maxZoom: 5,
    activeCountryCodes: ['CN', 'US', 'JP'],
  });
});
