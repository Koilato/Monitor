export const BASEMAP_STYLE_PATH = 'map/style.json';

const DEFAULT_BASE_URL = (import.meta as ImportMeta & {
  env?: {
    BASE_URL?: string;
  };
}).env?.BASE_URL ?? '/';

export function getBasemapStyleUrl(baseUrl = DEFAULT_BASE_URL): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  return new URL(BASEMAP_STYLE_PATH, new URL(baseUrl, origin)).toString();
}
