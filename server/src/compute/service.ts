import type { StorageRepository } from '../storage/repository.js';
import { createCompatIncidentStore } from './compat-incidents.js';
import { createMapComputeService } from './map.js';
import { createThreatIntelComputeService } from './threat-intel.js';

export function createComputeService(repository: StorageRepository) {
  const compatIncidentStore = createCompatIncidentStore(repository);

  return {
    ...createMapComputeService(repository, compatIncidentStore),
    ...createThreatIntelComputeService(compatIncidentStore),
  };
}

export type ComputeService = ReturnType<typeof createComputeService>;
