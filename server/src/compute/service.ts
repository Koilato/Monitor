import type { StorageRepository } from '../storage/repository.js';
import { createMapComputeService } from './map.js';
import { createThreatIntelComputeService } from './threat-intel.js';

export function createComputeService(repository: StorageRepository) {
  return {
    ...createMapComputeService(repository),
    ...createThreatIntelComputeService(repository),
  };
}

export type ComputeService = ReturnType<typeof createComputeService>;
