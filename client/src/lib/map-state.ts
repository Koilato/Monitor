import type { DateRange } from '@shared/types';

export type MapViewMode = '2d' | '3d';

export interface MapTimePresetFilter {
  kind: 'preset';
  preset: string;
}

export interface MapCustomTimeFilter extends DateRange {
  kind: 'custom';
}

export type MapTimeFilterState = MapTimePresetFilter | MapCustomTimeFilter;

export interface Map2DCameraState {
  kind: '2d';
  centerLng: number;
  centerLat: number;
  zoom: number;
}

export interface Map3DCameraState {
  kind: '3d';
  povLng: number;
  povLat: number;
  povAltitude: number;
}

export type MapCameraState = Map2DCameraState | Map3DCameraState;

export interface MapUrlState {
  viewMode: MapViewMode;
  timeFilter: MapTimeFilterState;
  camera: MapCameraState;
}

const TWO_D_DEFAULTS: Map2DCameraState = {
  kind: '2d',
  centerLng: 0,
  centerLat: 0,
  zoom: 0,
};

const THREE_D_DEFAULTS: Map3DCameraState = {
  kind: '3d',
  povLng: 105,
  povLat: 24,
  povAltitude: 2.45,
};

export const DEFAULT_MAP_URL_STATE: MapUrlState = {
  viewMode: '2d',
  timeFilter: {
    kind: 'custom',
    startDate: null,
    endDate: null,
  },
  camera: TWO_D_DEFAULTS,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseFiniteNumber(value: string | null): number | null {
  if (value == null || value.trim() === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isMapViewMode(value: string | null | undefined): value is MapViewMode {
  return value === '2d' || value === '3d';
}

function isNonEmptyString(value: string | null): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function normalizeMap2DCamera(
  input: Partial<Omit<Map2DCameraState, 'kind'>> = {},
): Map2DCameraState {
  return {
    kind: '2d',
    centerLng: clamp(input.centerLng ?? TWO_D_DEFAULTS.centerLng, -180, 180),
    centerLat: clamp(input.centerLat ?? TWO_D_DEFAULTS.centerLat, -90, 90),
    zoom: clamp(input.zoom ?? TWO_D_DEFAULTS.zoom, -2, 6),
  };
}

export function normalizeMap3DCamera(
  input: Partial<Omit<Map3DCameraState, 'kind'>> = {},
): Map3DCameraState {
  return {
    kind: '3d',
    povLng: clamp(input.povLng ?? THREE_D_DEFAULTS.povLng, -180, 180),
    povLat: clamp(input.povLat ?? THREE_D_DEFAULTS.povLat, -90, 90),
    povAltitude: Math.max(0.2, input.povAltitude ?? THREE_D_DEFAULTS.povAltitude),
  };
}

export function normalizeMapTimeFilter(
  input: Partial<MapTimeFilterState> | null | undefined,
): MapTimeFilterState {
  if (input?.kind === 'preset') {
    const presetInput = input as Partial<MapTimePresetFilter> | undefined;
    const preset = presetInput?.preset ?? '';
    return {
      kind: 'preset',
      preset: isNonEmptyString(preset) ? preset.trim() : 'all',
    };
  }

  const customInput = input as Partial<MapCustomTimeFilter> | undefined;
  return {
    kind: 'custom',
    startDate: typeof customInput?.startDate === 'string' && customInput.startDate.trim() !== ''
      ? customInput.startDate.trim()
      : null,
    endDate: typeof customInput?.endDate === 'string' && customInput.endDate.trim() !== ''
      ? customInput.endDate.trim()
      : null,
  };
}

export function normalizeMapUrlState(input: Partial<MapUrlState> | null | undefined): MapUrlState {
  const requestedViewMode = input?.viewMode;
  const viewMode = isMapViewMode(requestedViewMode) ? requestedViewMode : DEFAULT_MAP_URL_STATE.viewMode;

  return {
    viewMode,
    timeFilter: normalizeMapTimeFilter(input?.timeFilter ?? DEFAULT_MAP_URL_STATE.timeFilter),
    camera: viewMode === '3d'
      ? normalizeMap3DCamera(input?.camera?.kind === '3d' ? input.camera : undefined)
      : normalizeMap2DCamera(input?.camera?.kind === '2d' ? input.camera : undefined),
  };
}

export function parseMapUrlState(search: string | URLSearchParams): MapUrlState {
  const params = typeof search === 'string'
    ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    : search;

  const rawViewMode = params.get('viewMode');
  const viewMode = isMapViewMode(rawViewMode)
    ? rawViewMode
    : DEFAULT_MAP_URL_STATE.viewMode;

  const timeMode = params.get('time');
  const timeFilter = timeMode === 'preset'
    ? normalizeMapTimeFilter({
      kind: 'preset',
      preset: params.get('preset') ?? undefined,
    })
    : timeMode === 'custom' || params.has('startDate') || params.has('endDate')
      ? normalizeMapTimeFilter({
        kind: 'custom',
        startDate: params.get('startDate'),
        endDate: params.get('endDate'),
      })
      : DEFAULT_MAP_URL_STATE.timeFilter;

  const camera = viewMode === '3d'
    ? normalizeMap3DCamera({
      povLng: parseFiniteNumber(params.get('povLng')) ?? undefined,
      povLat: parseFiniteNumber(params.get('povLat')) ?? undefined,
      povAltitude: parseFiniteNumber(params.get('povAltitude')) ?? undefined,
    })
    : normalizeMap2DCamera({
      centerLng: parseFiniteNumber(params.get('centerLng')) ?? undefined,
      centerLat: parseFiniteNumber(params.get('centerLat')) ?? undefined,
      zoom: parseFiniteNumber(params.get('zoom')) ?? undefined,
    });

  return {
    viewMode,
    timeFilter,
    camera,
  };
}

export function serializeMapUrlState(state: MapUrlState): URLSearchParams {
  const normalized = normalizeMapUrlState(state);
  const params = new URLSearchParams();
  params.set('viewMode', normalized.viewMode);

  if (normalized.timeFilter.kind === 'preset') {
    params.set('time', 'preset');
    params.set('preset', normalized.timeFilter.preset);
  } else {
    params.set('time', 'custom');
    if (normalized.timeFilter.startDate) {
      params.set('startDate', normalized.timeFilter.startDate);
    }
    if (normalized.timeFilter.endDate) {
      params.set('endDate', normalized.timeFilter.endDate);
    }
  }

  if (normalized.camera.kind === '3d') {
    params.set('povLng', String(normalized.camera.povLng));
    params.set('povLat', String(normalized.camera.povLat));
    params.set('povAltitude', String(normalized.camera.povAltitude));
  } else {
    params.set('centerLng', String(normalized.camera.centerLng));
    params.set('centerLat', String(normalized.camera.centerLat));
    params.set('zoom', String(normalized.camera.zoom));
  }

  return params;
}
