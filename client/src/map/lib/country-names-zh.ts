const COUNTRY_NAME_OVERRIDES_ZH: Record<string, string> = {
  CN: '中国',
  CZ: '捷克',
  KR: '韩国',
  KP: '朝鲜',
  NL: '荷兰',
  RU: '俄罗斯',
  US: '美国',
  XK: '科索沃',
};

const displayNames = typeof Intl !== 'undefined'
  ? new Intl.DisplayNames(['zh-Hans'], { type: 'region' })
  : null;

export function getChineseCountryName(code: string): string | null {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }

  const override = COUNTRY_NAME_OVERRIDES_ZH[normalizedCode];
  if (override) {
    return override;
  }

  const localized = displayNames?.of(normalizedCode);
  if (
    typeof localized === 'string'
    && localized.trim().length > 0
    && localized !== normalizedCode
    && localized !== '未知地区'
  ) {
    return localized;
  }

  return null;
}
