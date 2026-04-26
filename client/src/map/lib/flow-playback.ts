import type { CanvasArcDatum } from 'map/lib/arc-data';
import type { FlowPlaybackMode } from 'map/state/map-state';

export const MAX_CONCURRENT_FLOW_STARTS = 4;
export const FLOW_START_SPACING_MS = 220;
export const FLOW_REPLAY_DELAY_MS = 5000;

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

  return ordered.map((datum, index) => ({
    ...datum,
    sourceIndex: index,
    startAt: now + (Math.floor(index / MAX_CONCURRENT_FLOW_STARTS) * FLOW_START_SPACING_MS),
  }));
}

export function resetFlowSchedule(
  datum: ScheduledFlowDatum,
  now: number,
): ScheduledFlowDatum {
  return {
    ...datum,
    startAt: now + FLOW_REPLAY_DELAY_MS,
  };
}
