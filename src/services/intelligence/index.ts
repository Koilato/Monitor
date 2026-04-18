/**
 * Unified intelligence service module.
 *
 * Re-exports from legacy service files that have complex client-side logic
 * (DEFCON calculation, circuit breakers, batch classification, GDELT DOC API).
 * Server-side edge functions are consolidated in the handler.
 */

// GDELT intelligence
export {
  fetchGdeltArticles,
  fetchTopicIntelligence,
  fetchAllTopicIntelligence,
  fetchHotspotContext,
  formatArticleDate,
  extractDomain,
} from '../gdelt-intel';
export type { GdeltArticle } from '../gdelt-intel';
