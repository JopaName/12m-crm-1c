import { Router, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { AuthRequest, authMiddleware, requirePermission } from '../middleware/auth';
import { config } from '../config';
import { z } from 'zod';
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

const createInviteSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  roleId: z.string().min(1),
});

const registerWithInviteSchema = z.object({
  login: z.string().min(3).max(50).regex(/^[a-z0-9._-]+$/, 'Login must contain only lowercase letters, numbers, dots, underscores, hyphens'),
  password: z.string().min(6).max(128),
});

const INVITE_EXPIRY_HOURS = 24;
const EMAIL_DOMAIN = 'nik12m.ru';

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function buildEmail(login: string): string {
  return login + '@' + EMAIL_DOMAIN;
}

router.post('/invites', authMiddleware, asyncHandler(async (req, res) => {
    const data = createInviteSchema.parse(req.body);
    const token = generateToken();
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

    const invite = await prisma.invite.create({
      data: {
        token,
        firstName: data.firstName,
        lastName: data.lastName,
        roleId: data.roleId,
        createdById: req.user!.id,
        expiresAt,
      },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    const inviteLink = config.frontendUrl + '/register/' + token;

    res.status(201).json({
      token,
      inviteLink,
      firstName: invite.firstName,
      lastName: invite.lastName,
      expiresAt: invite.expiresAt,
    });
}));

router.get('/invites/:token', asyncHandler(async (req, res) => {
    const invite = await prisma.invite.findUnique({
      where: { token: req.params.token },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    if (invite.usedAt) {
      return res.status(410).json({ error: 'Invite already used' });
    }

    if (new Date() > new Date(invite.expiresAt)) {
      return res.status(410).json({ error: 'Invite expired' });
    }

    res.json({
      token: invite.token,
      firstName: invite.firstName,
      lastName: invite.lastName,
      expiresAt: invite.expiresAt,
    });
}));

router.post('/invites/:token/register', asyncHandler(async (req, res) => {
    const { login, password } = registerWithInviteSchema.parse(req.body);
    const invite = await prisma.invite.findUnique({ where: { token: req.params.token } });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    if (invite.usedAt) {
      return res.status(410).json({ error: 'Invite already used' });
    }

    if (new Date() > new Date(invite.expiresAt)) {
      return res.status(410).json({ error: 'Invite expired' });
    }

    const email = buildEmail(login);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Login is already taken. Please choose another one.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: invite.firstName,
        lastName: invite.lastName,
        roleId: invite.roleId,
      },
      include: { role: true },
    });

    await prisma.invite.update({
      where: { id: invite.id },
      data: { usedById: user.id, usedAt: new Date() },
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role.name },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any },
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: { name: user.role.name, permissions: [] },
        permissions: [],
      },
    });
}));

export default router;
