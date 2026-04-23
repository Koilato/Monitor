export interface RequestTrackerTicket {
  id: number;
  signal: AbortSignal;
}

export interface RequestTracker {
  next(): RequestTrackerTicket;
  abort(): void;
  isCurrent(requestId: number): boolean;
}

export function createRequestTracker(): RequestTracker {
  let currentController: AbortController | null = null;
  let currentRequestId = 0;

  return {
    next() {
      currentController?.abort();

      const controller = new AbortController();
      currentController = controller;
      currentRequestId += 1;

      return {
        id: currentRequestId,
        signal: controller.signal,
      };
    },
    abort() {
      currentController?.abort();
      currentController = null;
      currentRequestId += 1;
    },
    isCurrent(requestId: number) {
      return requestId === currentRequestId;
    },
  };
}
