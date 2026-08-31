import type { ServerResponse } from 'node:http';
import { AppError } from '../errors/AppError.ts';

export function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

export function sendSuccess(res: ServerResponse, data: unknown, statusCode = 200): void {
  sendJson(res, statusCode, data);
}

/** Matches Phase 3 §30's required error shape exactly: {code, message, details}. */
export function sendError(res: ServerResponse, error: AppError): void {
  sendJson(res, error.httpStatus, {
    code: error.code,
    message: error.message,
    details: error.details,
  });
}
