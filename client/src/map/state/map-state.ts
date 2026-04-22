import type { DateRange } from '@shared/types';

export type MapViewMode = '2d' | '3d';
export type TimePreset = '1h' | '6h' | '24h' | '48h' | '7d';

export interface TimeFilterState {
  mode: 'preset' | 'custom';
  preset: TimePreset | null;
  startDate: string | null;
  endDate: string | null;
}

export interface MapCameraState {
  lng: number;
  lat: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface MapState {
  view: MapViewMode;
  camera: MapCameraState;
  activeLayerIds: string[];
  timeFilter: TimeFilterState;
}

export const MIN_2D_ZOOM = -2;
export const MAX_2D_ZOOM = 6;
export const MIN_3D_ZOOM = 1.2;
export const MAX_3D_ZOOM = 5;
export const MAX_3D_PITCH = 55;

export const PUBLIC_LAYER_IDS = [
  'countries-base',
  'threat-highlight',
  'threat-labels',
  'attack-arcs',
] as const;

export const DEFAULT_LAYER_IDS = [...PUBLIC_LAYER_IDS];

const LAYER_ID_ALIASES: Record<string, string | null> = {
  'countries-base': 'countries-base',
  'threat-highlight': 'threat-highlight',
  'threat-labels': 'threat-labels',
  'attack-arcs': 'attack-arcs',
  'threat-fill': 'threat-highlight',
  'threat-outline': 'threat-highlight',
  'attack-arrowheads': 'attack-arcs',
  'hover-highlight': null,
};

function getUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDefaultTimeFilter(): TimeFilterState {
  const today = getUtcDateString(new Date());
  return {
    mode: 'custom',
    preset: null,
    startDate: today,
    endDate: today,
  };
}

export const DEFAULT_MAP_STATE: MapState = {
  view: '2d',
  camera: {
    lng: 0,
    lat: 0,
    zoom: 0,
    bearing: 0,
    pitch: 0,
  },
  activeLayerIds: [...DEFAULT_LAYER_IDS],
  timeFilter: getDefaultTimeFilter(),
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseNumber(value: string | null): number | null {
  if (value == null || value.trim() === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isTimePreset(value: string | null): value is TimePreset {
  return value === '1h'
    || value === '6h'
    || value === '24h'
    || value === '48h'
    || value === '7d';
}

function isIsoDate(value: string | null): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeCamera(camera: Partial<MapCameraState>, view: MapViewMode): MapCameraState {
  return {
    lng: clamp(camera.lng ?? DEFAULT_MAP_STATE.camera.lng, -180, 180),
    lat: clamp(camera.lat ?? DEFAULT_MAP_STATE.camera.lat, -90, 90),
    zoom: clamp(
      camera.zoom ?? DEFAULT_MAP_STATE.camera.zoom,
      view === '3d' ? MIN_3D_ZOOM : MIN_2D_ZOOM,
      view === '3d' ? MAX_3D_ZOOM : MAX_2D_ZOOM,
    ),
    bearing: clamp(camera.bearing ?? DEFAULT_MAP_STATE.camera.bearing, -180, 180),
    pitch: clamp(
      camera.pitch ?? (view === '3d' ? MAX_3D_PITCH : 0),
      0,
      view === '3d' ? MAX_3D_PITCH : 0,
    ),
  };
}

function normalizeTimeFilter(timeFilter: Partial<TimeFilterState> | undefined): TimeFilterState {
  if (timeFilter?.mode === 'preset' && isTimePreset(timeFilter.preset ?? null)) {
    const preset = timeFilter.preset as TimePreset;
    return {
      mode: 'preset',
      preset,
      startDate: null,
      endDate: null,
    };
  }

  if (timeFilter?.mode === 'custom') {
    const startDate = isIsoDate(timeFilter.startDate ?? null) ? timeFilter.startDate ?? null : null;
    const endDate = isIsoDate(timeFilter.endDate ?? null) ? timeFilter.endDate ?? null : null;
    return {
      mode: 'custom',
      preset: null,
      startDate,
      endDate,
    };
  }

  return getDefaultTimeFilter();
}

function normalizeActiveLayerIds(activeLayerIds: unknown): string[] {
  if (!Array.isArray(activeLayerIds) || activeLayerIds.length === 0) {
    return [...DEFAULT_LAYER_IDS];
  }

  const normalized = activeLayerIds
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((value) => LAYER_ID_ALIASES[value] ?? value)
    .filter((value): value is string => typeof value === 'string')
    .filter((value): value is (typeof PUBLIC_LAYER_IDS)[number] =>
      (PUBLIC_LAYER_IDS as readonly string[]).includes(value))
    .filter((value, index, values) => values.indexOf(value) === index);

  return normalized.length > 0 ? normalized : [...DEFAULT_LAYER_IDS];
}

export function normalizeMapState(input: Partial<MapState>): MapState {
  const view = input.view === '3d' ? '3d' : '2d';
  const timeFilter = normalizeTimeFilter(input.timeFilter);
  const activeLayerIds = normalizeActiveLayerIds(input.activeLayerIds);

  return {
    view,
    camera: normalizeCamera(input.camera ?? DEFAULT_MAP_STATE.camera, view),
    activeLayerIds,
    timeFilter,
  };
}

export function serializeMapStateToSearch(state: MapState): string {
  const normalized = normalizeMapState(state);
  const params = new URLSearchParams();
  params.set('view', normalized.view);
  params.set('lat', normalized.camera.lat.toFixed(4));
  params.set('lon', normalized.camera.lng.toFixed(4));
  params.set('zoom', normalized.camera.zoom.toFixed(2));
  params.set('bearing', normalized.camera.bearing.toFixed(2));
  params.set('pitch', normalized.camera.pitch.toFixed(2));
  params.set('layers', normalized.activeLayerIds.join(','));
  params.set('timeMode', normalized.timeFilter.mode);

  if (normalized.timeFilter.mode === 'preset' && normalized.timeFilter.preset) {
    params.set('timePreset', normalized.timeFilter.preset);
  }

  if (normalized.timeFilter.mode === 'custom') {
    if (normalized.timeFilter.startDate) {
      params.set('startDate', normalized.timeFilter.startDate);
    }
    if (normalized.timeFilter.endDate) {
      params.set('endDate', normalized.timeFilter.endDate);
    }
  }

  return `?${params.toString()}`;
}

export function parseMapStateFromSearch(search: string): MapState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const view = params.get('view') === '3d' ? '3d' : '2d';
  const lat = parseNumber(params.get('lat'));
  const lon = parseNumber(params.get('lon'));
  const zoom = parseNumber(params.get('zoom'));
  const bearing = parseNumber(params.get('bearing'));
  const pitch = parseNumber(params.get('pitch'));
  const layerParam = params.get('layers');
  const activeLayerIds = layerParam
    ? layerParam.split(',').map((value) => value.trim()).filter(Boolean)
    : [...DEFAULT_LAYER_IDS];

  const timeMode = params.get('timeMode');
  const timePreset = params.get('timePreset');
  const timeFilter = timeMode === 'preset'
    ? normalizeTimeFilter({
      mode: 'preset',
      preset: isTimePreset(timePreset) ? timePreset : undefined,
    })
    : timeMode === 'custom'
      ? normalizeTimeFilter({
        mode: 'custom',
        startDate: params.get('startDate'),
        endDate: params.get('endDate'),
      })
      : getDefaultTimeFilter();

  return normalizeMapState({
    view,
    camera: {
      lat: lat !== null && lat >= -90 && lat <= 90 ? lat : DEFAULT_MAP_STATE.camera.lat,
      lng: lon !== null && lon >= -180 && lon <= 180 ? lon : DEFAULT_MAP_STATE.camera.lng,
      zoom: zoom !== null
        && zoom >= (view === '3d' ? MIN_3D_ZOOM : MIN_2D_ZOOM)
        && zoom <= (view === '3d' ? MAX_3D_ZOOM : MAX_2D_ZOOM)
        ? zoom
        : DEFAULT_MAP_STATE.camera.zoom,
      bearing: bearing !== null && bearing >= -180 && bearing <= 180
        ? bearing
        : DEFAULT_MAP_STATE.camera.bearing,
      pitch: pitch !== null && pitch >= 0 && pitch <= (view === '3d' ? MAX_3D_PITCH : 0)
        ? pitch
        : (view === '3d' ? MAX_3D_PITCH : 0),
    },
    activeLayerIds,
    timeFilter,
  });
}

export function timeFilterToDateRange(timeFilter: TimeFilterState, now = new Date()): DateRange {
  if (timeFilter.mode === 'custom') {
    return {
      startDate: timeFilter.startDate,
      endDate: timeFilter.endDate,
    };
  }

  const hoursByPreset: Record<TimePreset, number> = {
    '1h': 1,
    '6h': 6,
    '24h': 24,
    '48h': 48,
    '7d': 7 * 24,
  };
  const end = now;
  const start = new Date(end.getTime() - (hoursByPreset[timeFilter.preset ?? '24h'] * 60 * 60 * 1000));
  return {
    startDate: getUtcDateString(start),
    endDate: getUtcDateString(end),
  };
}

export function switchMapStateView(state: MapState, targetView: MapViewMode): MapState {
  const normalized = normalizeMapState(state);
  if (normalized.view === targetView) {
    return normalized;
  }

  return normalizeMapState({
    ...normalized,
    view: targetView,
    camera: {
      lng: normalized.camera.lng,
      lat: normalized.camera.lat,
      zoom: normalized.camera.zoom,
      bearing: 0,
      pitch: targetView === '3d' ? MAX_3D_PITCH : 0,
    },
  });
}
