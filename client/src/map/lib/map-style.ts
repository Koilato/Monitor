export const BASEMAP_STYLE_PATH = 'map/style.json';

export function getBasemapStyleUrl(baseUrl = import.meta.env.BASE_URL ?? '/'): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  return new URL(BASEMAP_STYLE_PATH, new URL(baseUrl, origin)).toString();
}
