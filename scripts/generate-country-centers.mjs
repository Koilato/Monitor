import fs from 'node:fs';
import path from 'node:path';
import polylabel from '@mapbox/polylabel';

const repoRoot = process.cwd();
const geojsonPath = path.join(repoRoot, 'client/public/data/countries.geojson');
const outputPath = path.join(repoRoot, 'client/src/map/lib/country-centers.ts');
const COUNTRY_INTERIOR_POINT_PRECISION = 0.25;

function normalizeCode(properties) {
  const raw = properties?.['ISO3166-1-Alpha-2'] ?? properties?.ISO_A2 ?? properties?.iso_a2;
  const code = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function toCoord(point) {
  if (!Array.isArray(point) || point.length < 2) {
    return null;
  }

  const lon = Number(point[0]);
  const lat = Number(point[1]);
  return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null;
}

function normalizeRings(rings) {
  return rings
    .map((ring) => ring.map(toCoord).filter(Boolean))
    .filter((ring) => ring.length >= 3);
}

function normalizeGeometry(geometry) {
  if (!geometry) {
    return [];
  }

  if (geometry.type === 'Polygon') {
    const polygon = normalizeRings(geometry.coordinates);
    return polygon.length > 0 ? [polygon] : [];
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates
      .map((polygon) => normalizeRings(polygon))
      .filter((polygon) => polygon.length > 0);
  }

  return [];
}

function computeBbox(polygons) {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  let hasPoint = false;

  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [lon, lat] of ring) {
        hasPoint = true;
        if (lon < minLon) minLon = lon;
        if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }

  return hasPoint ? [minLon, minLat, maxLon, maxLat] : null;
}

function computeRingArea(ring) {
  if (ring.length < 3) {
    return 0;
  }

  let area = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    if (!current || !next) {
      continue;
    }

    area += (current[0] * next[1]) - (next[0] * current[1]);
  }

  return area / 2;
}

function computeRingCentroid(ring) {
  const area = computeRingArea(ring);
  if (!Number.isFinite(area) || Math.abs(area) < 1e-9) {
    return null;
  }

  let lon = 0;
  let lat = 0;

  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    if (!current || !next) {
      continue;
    }

    const cross = (current[0] * next[1]) - (next[0] * current[1]);
    lon += (current[0] + next[0]) * cross;
    lat += (current[1] + next[1]) * cross;
  }

  const factor = 1 / (6 * area);
  return {
    lon: lon * factor,
    lat: lat * factor,
  };
}

function distanceSquaredToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    const offsetX = px - x1;
    const offsetY = py - y1;
    return (offsetX * offsetX) + (offsetY * offsetY);
  }

  const t = ((px - x1) * dx + (py - y1) * dy) / ((dx * dx) + (dy * dy));
  let closestX = x1;
  let closestY = y1;

  if (t >= 1) {
    closestX = x2;
    closestY = y2;
  } else if (t > 0) {
    closestX = x1 + (dx * t);
    closestY = y1 + (dy * t);
  }

  const offsetX = px - closestX;
  const offsetY = py - closestY;
  return (offsetX * offsetX) + (offsetY * offsetY);
}

function distanceToRingOutlineSquared(point, ring) {
  let minDistance = Infinity;

  for (let index = 1; index < ring.length; index += 1) {
    const previous = ring[index - 1];
    const current = ring[index];
    if (!previous || !current) {
      continue;
    }

    const distance = distanceSquaredToSegment(point[0], point[1], previous[0], previous[1], current[0], current[1]);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance;
}

function getPolygonInteriorCandidate(polygon) {
  const outerRing = polygon[0];
  if (!outerRing || outerRing.length < 3) {
    return null;
  }

  try {
    const [lon, lat] = polylabel(polygon, COUNTRY_INTERIOR_POINT_PRECISION);
    let minDistanceSquared = Infinity;

    for (const ring of polygon) {
      const ringDistance = distanceToRingOutlineSquared([lon, lat], ring);
      if (ringDistance < minDistanceSquared) {
        minDistanceSquared = ringDistance;
      }
    }

    return {
      point: { lon, lat },
      score: Math.sqrt(minDistanceSquared),
    };
  } catch {
    return null;
  }
}

function getLargestPolygonOuterRing(polygons) {
  let largestRing = null;
  let largestArea = -Infinity;

  for (const polygon of polygons) {
    const outerRing = polygon[0];
    if (!outerRing) {
      continue;
    }

    const area = Math.abs(computeRingArea(outerRing));
    if (area > largestArea) {
      largestArea = area;
      largestRing = outerRing;
    }
  }

  return largestRing;
}

function getFallbackPoint(polygons) {
  const outerRing = getLargestPolygonOuterRing(polygons);
  if (outerRing) {
    const centroid = computeRingCentroid(outerRing);
    if (centroid) {
      return centroid;
    }
  }

  const bbox = computeBbox(polygons);
  if (!bbox) {
    return null;
  }

  return {
    lon: (bbox[0] + bbox[2]) / 2,
    lat: (bbox[1] + bbox[3]) / 2,
  };
}

function resolveCountryPoint(polygons) {
  let bestCandidate = null;

  for (const polygon of polygons) {
    const candidate = getPolygonInteriorCandidate(polygon);
    if (!candidate) {
      continue;
    }

    if (!bestCandidate || candidate.score > bestCandidate.score) {
      bestCandidate = candidate;
    }
  }

  return bestCandidate?.point ?? getFallbackPoint(polygons);
}

const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
const centers = [];

for (const feature of geojson.features) {
  const code = normalizeCode(feature.properties);
  if (!code) {
    continue;
  }

  const polygons = normalizeGeometry(feature.geometry);
  if (polygons.length === 0) {
    continue;
  }

  const point = resolveCountryPoint(polygons);
  if (!point) {
    continue;
  }

  centers.push([
    code,
    {
      lon: Number(point.lon.toFixed(6)),
      lat: Number(point.lat.toFixed(6)),
    },
  ]);
}

centers.sort((left, right) => left[0].localeCompare(right[0]));

const lines = [
  'export interface CountryCenterPoint {',
  '  lon: number;',
  '  lat: number;',
  '}',
  '',
  'export const COUNTRY_CENTERS: Record<string, CountryCenterPoint> = {',
  ...centers.map(([code, point]) => `  ${JSON.stringify(code)}: { lon: ${point.lon}, lat: ${point.lat} },`),
  '};',
  '',
];

fs.writeFileSync(outputPath, lines.join('\n'));
console.log(`Wrote ${centers.length} country centers to ${outputPath}`);
