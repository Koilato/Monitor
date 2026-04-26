export type AttackArcPhase = 'flight' | 'hold' | 'fade';

export interface AttackArcFrameWindow {
  phase: AttackArcPhase;
  startT: number;
  endT: number;
  alpha: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function resolveAttackArcFrameWindow(
  elapsed: number,
  flightDuration: number,
  holdDuration: number,
  fadeoutDuration: number,
): AttackArcFrameWindow {
  if (elapsed < flightDuration) {
    const progress = flightDuration <= 0 ? 1 : clamp(elapsed / flightDuration, 0, 1);
    return {
      phase: 'flight',
      startT: 0,
      endT: progress,
      alpha: 1,
    };
  }

  if (elapsed < flightDuration + holdDuration) {
    return {
      phase: 'hold',
      startT: 0,
      endT: 1,
      alpha: 1,
    };
  }

  const fadeElapsed = elapsed - flightDuration - holdDuration;
  const fadeProgress = fadeoutDuration <= 0 ? 1 : clamp(fadeElapsed / fadeoutDuration, 0, 1);

  return {
    phase: 'fade',
    startT: fadeProgress,
    endT: 1,
    alpha: 1 - fadeProgress,
  };
}
