import type { StoryData } from './story-data';

// Removed: share/subscription feature — all social share URL generation functions cleared
// sanitizeCountryCode and sanitizeStoryType kept for potential future use
// but marked as unused to avoid TS errors

export function buildStoryUrl(_countryCode: string, _storyType: string): string {
  return '';
}

export function buildOgStoryImageUrl(_countryCode: string, _storyType: string): string {
  return '';
}

// Removed: share/subscription feature — generateStoryDeepLink now returns empty string
export function generateStoryDeepLink(
  _countryCode: string,
  _type?: 'ciianalysis' | 'convergence' | 'brief',
  _score?: number,
  _level?: string
): string {
  // Removed: share/subscription feature
  return '';
}

// Removed: share/subscription feature — parseStoryParams now returns null
export function parseStoryParams(_url: URL): { countryCode: string; type: string } | null {
  // Removed: share/subscription feature
  return null;
}

// Removed: share/subscription feature — generateQRCode cleared
export function generateQRCode(_data: string, _size: number = 200): string {
  // Removed: share/subscription feature
  return '';
}

// Removed: share/subscription feature — shareTexts cleared
export const shareTexts = {
  twitter: (_data: StoryData) => '',
  whatsapp: (_data: StoryData) => '',
  linkedin: (_data: StoryData) => '',
  telegram: (_data: StoryData) => '',
};

// Removed: share/subscription feature — getShareUrls now returns empty object
export function getShareUrls(_data: StoryData): Record<string, string> {
  // Removed: share/subscription feature
  return {
    twitter: '',
    linkedin: '',
    reddit: '',
    facebook: '',
    whatsapp: '',
    telegram: '',
  };
}
