import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: any;
}

export function sendSuccess<T>(res: Response, message: string, data?: T, statusCode = 200, meta?: any): Response {
  const response: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
    ...(meta !== undefined && { meta }),
  };
  return res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  errorDetails?: string,
  data?: any
): Response {
  const response: ApiResponse = {
    success: false,
    message,
    ...(errorDetails && { error: errorDetails }),
    ...(data !== undefined && { data }),
  };
  return res.status(statusCode).json(response);
}
