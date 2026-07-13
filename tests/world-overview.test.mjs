import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  calculateWorldOverviewBounds,
  normalizeWorldLongitude,
  WORLD_EAST_LONGITUDE,
  WORLD_SEAM_LONGITUDE,
} from '../client/src/map/lib/world-overview.ts';

const countries = JSON.parse(await readFile(
  new URL('../client/public/data/countries.geojson', import.meta.url),
  'utf8',
));

test('moves the Russian antimeridian geometry to the right of the canvas seam', () => {
  assert.equal(normalizeWorldLongitude(-180), 180);
  assert.ok(Math.abs(normalizeWorldLongitude(-169.7) - 190.3) < 1e-9);
  assert.equal(normalizeWorldLongitude(-168), -168);
  assert.equal(normalizeWorldLongitude(0), 0);
});

test('uses a single-world overview and excludes Antarctica from latitude bounds', () => {
  const bounds = calculateWorldOverviewBounds(countries);
  assert.ok(bounds);
  assert.equal(bounds[0][0], WORLD_SEAM_LONGITUDE);
  assert.equal(bounds[1][0], WORLD_EAST_LONGITUDE);
  assert.ok(bounds[1][0] - bounds[0][0] < 360);
  assert.ok(bounds[1][0] - bounds[0][0] > 359.999999);
  assert.ok(bounds[0][1] > -60);
  assert.ok(bounds[1][1] > 80);
});

test('places all Russian geometry right of Alaska', () => {
  const longitudesFor = (name) => {
    const feature = countries.features.find((candidate) => candidate.properties?.name === name);
    const longitudes = [];
    const visit = (value) => {
      if (!Array.isArray(value)) return;
      if (typeof value[0] === 'number') {
        longitudes.push(normalizeWorldLongitude(value[0]));
        return;
      }
      value.forEach(visit);
    };
    visit(feature.geometry.coordinates);
    return longitudes;
  };

  const russianLongitudes = longitudesFor('Russia');
  const americanLongitudes = longitudesFor('United States of America');
  assert.ok(Math.max(...russianLongitudes) > 190);
  assert.ok(Math.min(...russianLongitudes) > WORLD_SEAM_LONGITUDE);
  assert.ok(Math.min(...americanLongitudes) > WORLD_SEAM_LONGITUDE);
  assert.ok(Math.max(...americanLongitudes) < 0);
});
