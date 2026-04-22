import type { StyleSpecification } from 'maplibre-gl';

export const BASEMAP_STYLE_PATH = 'map/style.json';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

function getRuntimeBaseUrl(baseUrl: string | undefined = getConfiguredBaseUrl()): string {
  const origin = globalThis.location?.origin ?? 'http://localhost';
  return new URL(baseUrl ?? '/', origin).toString();
}

function getConfiguredBaseUrl(): string {
  return typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
}

function isAbsoluteUrl(value: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value);
}

function rewriteStyleUrl(value: string, baseUrl: string): string {
  return isAbsoluteUrl(value) ? value : new URL(value, baseUrl).toString();
}

function rewriteStyleValue<T>(value: T, baseUrl: string, key?: string): T {
  if (typeof value === 'string') {
    if (key === 'sprite' || key === 'glyphs' || key === 'url' || key === 'tiles') {
      return rewriteStyleUrl(value, baseUrl) as T;
    }

    return value;
  }

  if (Array.isArray(value)) {
    if (key === 'tiles') {
      return value.map((item) => (typeof item === 'string' ? rewriteStyleUrl(item, baseUrl) : item)) as T;
    }

    return value.map((item) => rewriteStyleValue(item, baseUrl)) as T;
  }

  if (value && typeof value === 'object') {
    const rewritten: JsonObject = {};

    for (const [key, nestedValue] of Object.entries(value as JsonObject)) {
      if (key === 'tiles' && Array.isArray(nestedValue)) {
        rewritten[key] = nestedValue.map((tile) => (
          typeof tile === 'string' ? rewriteStyleUrl(tile, baseUrl) : tile
        ));
        continue;
      }

      rewritten[key] = rewriteStyleValue(nestedValue, baseUrl, key);
    }

    return rewritten as T;
  }

  return value;
}

export function getBasemapStyleUrl(baseUrl: string | undefined = getConfiguredBaseUrl()): string {
  return new URL(BASEMAP_STYLE_PATH, getRuntimeBaseUrl(baseUrl)).toString();
}

export async function loadBasemapStyle(
  baseUrl: string | undefined = getConfiguredBaseUrl(),
): Promise<StyleSpecification> {
  const styleUrl = getBasemapStyleUrl(baseUrl);
  const response = await fetch(styleUrl);

  if (!response.ok) {
    throw new Error(`Failed to load basemap style from ${styleUrl}: ${response.status} ${response.statusText}`);
  }

  const style = (await response.json()) as StyleSpecification;
  return rewriteStyleValue(style, new URL('.', styleUrl).toString()) as StyleSpecification;
}
