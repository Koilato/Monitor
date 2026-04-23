import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('map style keeps a sources object even when the basemap is background-only', () => {
  const stylePath = resolve(process.cwd(), 'public/map/style.json');
  const style = JSON.parse(readFileSync(stylePath, 'utf8')) as {
    sources?: unknown;
    layers?: Array<{
      id?: string;
      paint?: {
        'background-color'?: string;
      };
    }>;
  };

  assert.deepEqual(style.sources, {});
  assert.ok(Array.isArray(style.layers));

  const backgroundLayer = style.layers.find((layer) => layer.id === 'background');
  assert.ok(backgroundLayer);
  assert.equal(backgroundLayer.paint?.['background-color'], '#333333');
});
