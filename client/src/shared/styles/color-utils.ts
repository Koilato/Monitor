export type DeckColor = [number, number, number, number];

const RGBA_COLOR_PATTERN = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*((?:\d+\.?\d*)|(?:\d*\.\d+))\s*\)$/i;
const RGB_COLOR_PATTERN = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;

export function rgbaStringToDeckColor(color: string): DeckColor {
  const match = color.match(RGBA_COLOR_PATTERN);
  if (match) {
    const red = Math.min(255, Math.max(0, Number(match[1])));
    const green = Math.min(255, Math.max(0, Number(match[2])));
    const blue = Math.min(255, Math.max(0, Number(match[3])));
    const alpha = Math.min(1, Math.max(0, Number(match[4])));

    return [red, green, blue, Math.round(alpha * 255)];
  }

  const rgbMatch = color.match(RGB_COLOR_PATTERN);
  if (rgbMatch) {
    const red = Math.min(255, Math.max(0, Number(rgbMatch[1])));
    const green = Math.min(255, Math.max(0, Number(rgbMatch[2])));
    const blue = Math.min(255, Math.max(0, Number(rgbMatch[3])));

    return [red, green, blue, 255];
  }

  return [255, 255, 255, 255];
}

export function deckColorToRgbaString(color: DeckColor): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${Math.round((color[3] / 255) * 1000) / 1000})`;
}

export function scaleDeckColorAlpha(color: DeckColor, factor: number): DeckColor {
  const alpha = Math.round(Math.min(255, Math.max(0, color[3] * factor)));
  return [color[0], color[1], color[2], alpha];
}

export function normalizeCssColor(color: string): string {
  const trimmed = color.trim();
  if (trimmed.length === 0 || typeof document === 'undefined') {
    return trimmed;
  }

  const element = document.createElement('span');
  element.style.color = trimmed;
  element.style.position = 'absolute';
  element.style.left = '-9999px';
  element.style.top = '-9999px';
  element.style.visibility = 'hidden';

  const parent = document.body ?? document.documentElement;
  parent.appendChild(element);
  const resolved = window.getComputedStyle(element).color.trim();
  element.remove();
  return resolved || trimmed;
}
