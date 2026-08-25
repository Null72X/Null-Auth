import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { sendError } from '../utils/response.js';

export interface AuthenticatedAdmin {
  id: string;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AuthenticatedAdmin;
    }
  }
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.null_auth_token) {
    token = req.cookies.null_auth_token;
  }

  if (!token) {
    return sendError(res, 'Unauthorized access. Authentication token required.', 401);
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthenticatedAdmin;
    req.admin = decoded;
    return next();
  } catch (error) {
    return sendError(res, 'Invalid or expired session token.', 401);
  }
}
