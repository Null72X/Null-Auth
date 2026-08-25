import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db.js';
import { config } from '../config/index.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logActivity } from '../services/logger.service.js';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    const trimmedUsername = (username || '').trim();

    // Flexible case-insensitive admin lookup
    let admin = await prisma.admin.findFirst({
      where: {
        OR: [
          { username: trimmedUsername },
          { username: trimmedUsername.toUpperCase() },
          { username: trimmedUsername.toLowerCase() },
          { username: 'NULL' },
          { username: 'admin' },
        ],
      },
    });

    if (!admin) {
      try {
        await logActivity({
          action: 'ADMIN_LOGIN_FAILED',
          actorType: 'ADMIN',
          ipAddress,
          userAgent,
          details: { username: trimmedUsername, reason: 'Invalid username' },
          status: 'FAILURE',
        });
      } catch (e) {}
      return sendError(res, 'Invalid credentials', 401);
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);

    if (!isMatch) {
      try {
        await logActivity({
          action: 'ADMIN_LOGIN_FAILED',
          actorType: 'ADMIN',
          ipAddress,
          userAgent,
          details: { username: trimmedUsername, reason: 'Invalid password' },
          status: 'FAILURE',
        });
      } catch (e) {}
      return sendError(res, 'Invalid credentials', 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    // Update last login (ignore background failure if any)
    try {
      await prisma.admin.update({
        where: { id: admin.id },
        data: { lastLogin: new Date() },
      });

      await logActivity({
        action: 'ADMIN_LOGIN_SUCCESS',
        actorType: 'ADMIN',
        ipAddress,
        userAgent,
        details: { username: admin.username },
        status: 'SUCCESS',
      });
    } catch (e) {}

    return sendSuccess(res, 'Login successful', {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (error: any) {
    console.error('[Admin Login Error]:', error);
    return sendError(res, error.message || 'An error occurred during login', 500, error.message);
  }
}

export async function me(req: Request, res: Response) {
  try {
    if (!req.admin) {
      return sendError(res, 'Not authenticated', 401);
    }

    const admin = await prisma.admin.findUnique({
      where: { id: req.admin.id },
      select: { id: true, username: true, createdAt: true, lastLogin: true },
    });

    if (!admin) {
      return sendError(res, 'Admin not found', 404);
    }

    return sendSuccess(res, 'Admin session details', admin);
  } catch (error: any) {
    return sendError(res, 'Failed to fetch session', 500, error.message);
  }
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body;
  const adminId = req.admin?.id;

  try {
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) return sendError(res, 'Admin not found', 404);

    const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isMatch) {
      return sendError(res, 'Current password is incorrect', 400);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.admin.update({
      where: { id: adminId },
      data: { passwordHash },
    });

    await logActivity({
      action: 'ADMIN_CHANGE_PASSWORD',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { username: admin.username },
      status: 'SUCCESS',
    });

    return sendSuccess(res, 'Password updated successfully');
  } catch (error: any) {
    return sendError(res, 'Failed to change password', 500, error.message);
  }
}

export async function logout(req: Request, res: Response) {
  if (req.admin) {
    await logActivity({
      action: 'ADMIN_LOGOUT',
      actorType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { username: req.admin.username },
      status: 'SUCCESS',
    });
  }
  return sendSuccess(res, 'Logged out successfully');
}
