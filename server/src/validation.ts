const ISO2_PATTERN = /^[A-Z]{2}$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export class ValidationError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
  }
}

export function normalizeCountryCode(value: unknown, fieldName: string): string {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!ISO2_PATTERN.test(normalized)) {
    throw new ValidationError('必须是有效的两位国家代码');
  }
  return normalized;
}

export function normalizeDate(value: unknown, fieldName: string): string | null {
  if (value == null || value === '') {
    return null;
  }

  const normalized = String(value).trim();
  const match = DATE_PATTERN.exec(normalized);
  if (!match) {
    throw new ValidationError('必须是有效的日期');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = [
    31,
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
    throw new ValidationError('必须是有效的日期');
  }
  return normalized;
}

export function assertDateRange(startDate: string | null, endDate: string | null): void {
  if (startDate && endDate && startDate > endDate) {
    throw new ValidationError('开始日期必须早于或等于结束日期');
  }
}

export function normalizeQueryText(value: unknown, fieldName: string, fallback?: string): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new ValidationError('必须提供必填内容');
  }
  return normalized;
}

export function normalizePositiveInt(
  value: unknown,
  fieldName: string,
  options: {
    fallback?: number;
    min?: number;
    max?: number;
  } = {},
): number {
  const { fallback, min = 0, max = Number.MAX_SAFE_INTEGER } = options;
  if (value == null || value === '') {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new ValidationError('必须提供整数值');
  }

  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) {
    throw new ValidationError(`必须是 ${min} 到 ${max} 之间的整数`);
  }

  return normalized;
}

export function normalizeSortOrder(value: unknown, fieldName: string, fallback: 'asc' | 'desc' = 'desc'): 'asc' | 'desc' {
  if (value == null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'asc' || normalized === 'desc') {
    return normalized;
  }

  throw new ValidationError('必须是 asc 或 desc');
}
