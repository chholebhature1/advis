export class BookingValidationError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "BookingValidationError";
    this.status = status;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseRequiredString(
  value: unknown,
  fieldName: string,
  options?: { minLength?: number; maxLength?: number },
): string {
  if (typeof value !== "string") {
    throw new BookingValidationError(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();
  const minLength = options?.minLength ?? 1;
  const maxLength = options?.maxLength ?? 500;

  if (trimmed.length < minLength) {
    throw new BookingValidationError(`${fieldName} must be at least ${minLength} characters.`);
  }

  if (trimmed.length > maxLength) {
    throw new BookingValidationError(`${fieldName} must be at most ${maxLength} characters.`);
  }

  return trimmed;
}

export function parseOptionalString(
  value: unknown,
  fieldName: string,
  options?: { maxLength?: number },
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new BookingValidationError(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const maxLength = options?.maxLength ?? 5000;
  if (trimmed.length > maxLength) {
    throw new BookingValidationError(`${fieldName} must be at most ${maxLength} characters.`);
  }

  return trimmed;
}

export function parseEmail(value: unknown, fieldName = "email"): string {
  const email = parseRequiredString(value, fieldName, { minLength: 3, maxLength: 320 }).toLowerCase();
  const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

  if (!emailPattern.test(email)) {
    throw new BookingValidationError(`${fieldName} is invalid.`);
  }

  return email;
}

export function parseOptionalPhoneE164(value: unknown, fieldName = "phone"): string | null {
  const normalized = parseOptionalString(value, fieldName, { maxLength: 25 });
  if (!normalized) {
    return null;
  }

  const compact = normalized.replace(/[\s()-]/g, "");
  const withPlus = compact.startsWith("+") ? compact : `+${compact}`;

  if (!/^\+[1-9]\d{7,14}$/.test(withPlus)) {
    throw new BookingValidationError(`${fieldName} must be a valid E.164 number.`);
  }

  return withPlus;
}

export function parseIsoDateTime(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new BookingValidationError(`${fieldName} must be an ISO date string.`);
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new BookingValidationError(`${fieldName} must be a valid date.`);
  }

  return date.toISOString();
}

export function parseOptionalIsoDateTime(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return parseIsoDateTime(value, fieldName);
}

export function parsePositiveInteger(
  value: unknown,
  fieldName: string,
  options?: { min?: number; max?: number },
): number {
  const min = options?.min ?? 1;
  const max = options?.max ?? Number.MAX_SAFE_INTEGER;

  let parsed: number;

  if (typeof value === "number" && Number.isFinite(value)) {
    parsed = Math.trunc(value);
  } else if (typeof value === "string" && value.trim().length > 0) {
    parsed = Number.parseInt(value, 10);
  } else {
    throw new BookingValidationError(`${fieldName} must be an integer.`);
  }

  if (!Number.isInteger(parsed)) {
    throw new BookingValidationError(`${fieldName} must be an integer.`);
  }

  if (parsed < min || parsed > max) {
    throw new BookingValidationError(`${fieldName} must be between ${min} and ${max}.`);
  }

  return parsed;
}

export function parseDateKey(value: unknown, fieldName: string): string {
  const dateKey = parseRequiredString(value, fieldName, { minLength: 10, maxLength: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new BookingValidationError(`${fieldName} must use YYYY-MM-DD format.`);
  }

  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) {
    throw new BookingValidationError(`${fieldName} must be a valid date.`);
  }

  return dateKey;
}

export function parseBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  throw new BookingValidationError(`${fieldName} must be a boolean.`);
}
