/**
 * Every error the API can return, matching Phase 3 §29 (HTTP status coverage) and §30 (response
 * shape). Thrown anywhere in a route handler and caught once, centrally, by the error middleware
 * (see http/middleware.ts) — handlers never format error JSON themselves.
 */
export class AppError extends Error {
  public readonly httpStatus: number;
  public readonly code: string;
  public readonly details: Record<string, unknown>;

  constructor(httpStatus: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'AppError';
    this.httpStatus = httpStatus;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: Record<string, unknown>) {
    return new AppError(400, 'INVALID_REQUEST', message, details);
  }
  static unauthorized(message = 'نشست شما منقضی شده است. دوباره وارد شوید.') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'شما به این بخش دسترسی ندارید.') {
    return new AppError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'موردی یافت نشد.') {
    return new AppError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string, details?: Record<string, unknown>) {
    return new AppError(409, 'CONFLICT', message, details);
  }
  static validation(message: string, details?: Record<string, unknown>) {
    return new AppError(422, 'VALIDATION_ERROR', message, details);
  }
  static tooManyRequests(message = 'تعداد درخواست‌ها بیش از حد مجاز است.') {
    return new AppError(429, 'RATE_LIMITED', message);
  }
  static internal(message = 'خطایی در سرور رخ داد.') {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }
}
