import { AppError } from '../errors/AppError.ts';

/**
 * Backend-side validation — Phase 3 §31: "Backend همیشه مرجع نهایی Validation باشد." Android
 * validates too (for instant feedback), but every rule here is re-checked independently; the
 * client's opinion is never trusted.
 */

const IRANIAN_PHONE_REGEX = /^09\d{9}$/;
const PLATE_REGEX = /^\d{2} \S+ \d{3} ایران \d{2}$/;

export function requireFields(body: unknown, fields: string[]): Record<string, unknown> {
  if (typeof body !== 'object' || body === null) {
    throw AppError.badRequest('بدنهٔ درخواست معتبر نیست.');
  }
  const record = body as Record<string, unknown>;
  const missing = fields.filter((f) => record[f] === undefined || record[f] === null || record[f] === '');
  if (missing.length > 0) {
    throw AppError.validation('فیلدهای الزامی خالی هستند.', { missingFields: missing });
  }
  return record;
}

export function validatePhone(phone: string): void {
  if (!IRANIAN_PHONE_REGEX.test(phone)) {
    throw AppError.validation('شماره موبایل معتبر نیست.', { field: 'phoneNumber' });
  }
}

export function validatePlate(plate: string): void {
  if (!PLATE_REGEX.test(plate)) {
    throw AppError.validation('فرمت شماره پلاک معتبر نیست.', { field: 'plate' });
  }
}

export function validatePositiveInteger(value: unknown, fieldName: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw AppError.validation(`مقدار ${fieldName} باید عدد صحیح و غیرمنفی باشد.`, { field: fieldName });
  }
  return n;
}

export function validateRole(role: unknown): 'owner' | 'driver' {
  if (role !== 'owner' && role !== 'driver') {
    throw AppError.validation('نقش نامعتبر است.', { field: 'role' });
  }
  return role;
}
