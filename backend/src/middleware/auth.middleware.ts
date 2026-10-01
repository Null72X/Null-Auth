import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../db.js';
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

export async function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
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
    
    // Verify admin still exists in database
    const adminExists = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true },
    });

    if (!adminExists) {
      return sendError(res, 'Session invalid. Admin account no longer exists.', 401);
    }

    req.admin = { id: adminExists.id, username: adminExists.username };
    return next();
  } catch (error) {
    return sendError(res, 'Invalid or expired session token.', 401);
  }
}

