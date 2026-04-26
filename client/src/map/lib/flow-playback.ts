import type { CanvasArcDatum } from 'map/lib/arc-data';
import type { FlowPlaybackMode } from 'map/state/map-state';

export const MAX_CONCURRENT_FLOW_STARTS = 4;
export const FLOW_START_SPACING_MS = 220;
export const FLOW_REPLAY_DELAY_MS = 5000;

export interface FlowPlaybackSettings {
  maxConcurrentStarts: number;
  flowStartSpacingMs: number;
  replayDelayMs: number;
}

export const DEFAULT_FLOW_PLAYBACK_SETTINGS: FlowPlaybackSettings = {
  maxConcurrentStarts: MAX_CONCURRENT_FLOW_STARTS,
  flowStartSpacingMs: FLOW_START_SPACING_MS,
  replayDelayMs: FLOW_REPLAY_DELAY_MS,
};

export interface ScheduledFlowDatum extends CanvasArcDatum {
  sourceIndex: number;
  startAt: number;
}

function compareNullableStrings(left: string | null | undefined, right: string | null | undefined): number {
  const leftValue = left ?? '';
  const rightValue = right ?? '';
  return leftValue.localeCompare(rightValue);
}

function compareByMode(left: CanvasArcDatum, right: CanvasArcDatum, mode: FlowPlaybackMode): number {
  if (mode === 'country') {
    const attackerDelta = left.attackerCountry.localeCompare(right.attackerCountry);
    if (attackerDelta !== 0) {
      return attackerDelta;
    }

    const victimDelta = left.victimCountry.localeCompare(right.victimCountry);
    if (victimDelta !== 0) {
      return victimDelta;
    }

    const countDelta = right.count - left.count;
    if (countDelta !== 0) {
      return countDelta;
    }

    return compareNullableStrings(left.firstDate, right.firstDate);
  }

  if (mode === 'time') {
    const firstDateDelta = compareNullableStrings(left.firstDate, right.firstDate);
    if (firstDateDelta !== 0) {
      return firstDateDelta;
    }
  }

  return 0;
}

function resolveFlowKey(datum: CanvasArcDatum): string {
  return datum.flowKey || `${datum.attackerCountry}->${datum.victimCountry}`;
}

export function sortFlowPlaybackData(
  data: CanvasArcDatum[],
  mode: FlowPlaybackMode,
): CanvasArcDatum[] {
  return data
    .map((datum, sourceIndex) => ({
      ...datum,
      sourceIndex,
    }))
    .sort((left, right) => {
      const modeDelta = compareByMode(left, right, mode);
      if (modeDelta !== 0) {
        return modeDelta;
      }

      return left.sourceIndex - right.sourceIndex;
    });
}

export function createInitialFlowSchedule(
  data: CanvasArcDatum[],
  mode: FlowPlaybackMode,
  now = performance.now(),
): ScheduledFlowDatum[] {
  const ordered = sortFlowPlaybackData(data, mode);
  const scheduled: ScheduledFlowDatum[] = [];
  const groupCounts = new Map<string, number>();

  for (let index = 0; index < ordered.length; index += 0) {
    const datum = ordered[index];
    if (!datum) {
      break;
    }

    const groupKey = resolveFlowKey(datum);
    const scheduleKey = datum.lengthPreset;
    const groupIndex = groupCounts.get(scheduleKey) ?? 0;
    const startAt = now + (Math.floor(groupIndex / datum.maxConcurrentStarts) * datum.bundleIntervalMs);
    groupCounts.set(scheduleKey, groupIndex + 1);

    let offset = 0;
    while (index + offset < ordered.length) {
      const bundledDatum = ordered[index + offset];
      if (!bundledDatum || resolveFlowKey(bundledDatum) !== groupKey) {
        break;
      }

      scheduled.push({
        ...bundledDatum,
        sourceIndex: index + offset,
        startAt,
      });

      offset += 1;
    }

    index += offset;
  }

  return scheduled;
}

export function resetFlowSchedule(
  datum: ScheduledFlowDatum,
  now: number,
  settings: Pick<FlowPlaybackSettings, 'replayDelayMs'> = DEFAULT_FLOW_PLAYBACK_SETTINGS,
): ScheduledFlowDatum {
  return {
    ...datum,
    startAt: now + (settings.replayDelayMs ?? datum.replayDelayMs),
  };
}
