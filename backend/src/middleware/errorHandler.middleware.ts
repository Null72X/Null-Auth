import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';
import { config } from '../config/index.js';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('[Global Error Handler]:', err);
  const status = err.statusCode || err.status || 500;
  
  let message = err.message || 'Internal Server Error';
  if (status === 500 && config.env === 'production') {
    message = 'An unexpected internal server error occurred.';
  }

  return sendError(res, message, status);
}

