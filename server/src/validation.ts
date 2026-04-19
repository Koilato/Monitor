const ISO2_PATTERN = /^[A-Z]{2}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
    throw new ValidationError(`${fieldName} must be an ISO2 country code`);
  }
  return normalized;
}

export function normalizeDate(value: unknown, fieldName: string): string | null {
  if (value == null || value === '') {
    return null;
  }

  const normalized = String(value).trim();
  if (!DATE_PATTERN.test(normalized) || Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))) {
    throw new ValidationError(`${fieldName} must be a valid YYYY-MM-DD date`);
  }
  return normalized;
}

export function assertDateRange(startDate: string | null, endDate: string | null): void {
  if (startDate && endDate && startDate > endDate) {
    throw new ValidationError('startDate must be earlier than or equal to endDate');
  }
}
