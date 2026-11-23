import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { pool } from './db';
import type { UserProfile, UserRole } from '../src/types/folio';

export const MAX_CONCURRENT_SESSIONS = 1;
const SESSION_TTL_DAYS = 30;

export interface AuthenticatedRequest extends Request {
  authUser?: UserProfile;
  authSessionId?: string;
}

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length >= 20 ? token : null;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Creates a new session in CockroachDB and enforces strict single-device security:
 * Maximum 1 active device per account — logging in on a new device automatically
 * revokes all previous sessions for that account.
 */
export async function createSessionWithDeviceLimit(
  userId: string,
  deviceLabel: string
): Promise<{ token: string; activeSessions: number; evictedOldSession: boolean }> {
  if (!pool) throw new Error('Base de dados indisponível');

  const rawToken = generateSessionToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clean expired sessions for this user
    await client.query(
      `DELETE FROM user_sessions WHERE user_id = $1 AND expires_at <= now()`,
      [userId]
    );

    // Check active sessions and revoke any exceeding MAX_CONCURRENT_SESSIONS - 1 (all previous when limit is 1)
    const activeRes = await client.query(
      `
      SELECT id
      FROM user_sessions
      WHERE user_id = $1
      ORDER BY last_seen_at DESC, created_at DESC
      `,
      [userId]
    );

    let evictedOldSession = false;
    if (activeRes.rows.length >= MAX_CONCURRENT_SESSIONS) {
      const keepCount = Math.max(0, MAX_CONCURRENT_SESSIONS - 1);
      const toEvict = activeRes.rows.slice(keepCount).map((r) => String(r.id));
      if (toEvict.length > 0) {
        await client.query(`DELETE FROM user_sessions WHERE id = ANY($1::uuid[])`, [toEvict]);
        evictedOldSession = true;
      }
    }

    await client.query(
      `
      INSERT INTO user_sessions (user_id, token_hash, device_label, expires_at)
      VALUES ($1, $2, $3, $4)
      `,
      [userId, tokenHash, deviceLabel.slice(0, 80) || 'Dispositivo móvel', expiresAt]
    );

    const countRes = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM user_sessions WHERE user_id = $1 AND expires_at > now()`,
      [userId]
    );

    await client.query('COMMIT');
    return {
      token: rawToken,
      activeSessions: Number(countRes.rows[0]?.cnt ?? 1),
      evictedOldSession,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function revokeSessionByToken(rawToken: string): Promise<void> {
  if (!pool) return;
  const tokenHash = hashToken(rawToken);
  await pool.query(`DELETE FROM user_sessions WHERE token_hash = $1`, [tokenHash]);
}

export async function resolveUserFromRequest(
  req: Request
): Promise<{ user: UserProfile; sessionId: string; activeSessions: number } | null> {
  if (!pool) return null;
  const rawToken = extractBearerToken(req);
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);
  const res = await pool.query(
    `
    SELECT
      s.id AS session_id,
      u.id AS user_id,
      u.email,
      u.role,
      u.created_at
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = $1 AND s.expires_at > now()
    LIMIT 1
    `,
    [tokenHash]
  );

  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  // Update last_seen_at asynchronously (non-blocking)
  void pool.query(`UPDATE user_sessions SET last_seen_at = now() WHERE id = $1`, [row.session_id]);

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM user_sessions WHERE user_id = $1 AND expires_at > now()`,
    [row.user_id]
  );

  return {
    sessionId: String(row.session_id),
    activeSessions: Number(countRes.rows[0]?.cnt ?? 1),
    user: {
      id: String(row.user_id),
      email: String(row.email),
      role: (row.role === 'admin' ? 'admin' : 'student') as UserRole,
      createdAt: new Date(String(row.created_at)).toISOString(),
    },
  };
}

export async function attachOptionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const suppliedToken = extractBearerToken(req);
    const resolved = await resolveUserFromRequest(req);
    if (resolved) {
      req.authUser = resolved.user;
      req.authSessionId = resolved.sessionId;
    } else if (suppliedToken) {
      // Signal the previous device immediately so it auto-logs out even on public requests
      res.setHeader('X-Session-Revoked', '1');
    }
  } catch {
    // ignore optional auth failure
  }
  next();
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const suppliedToken = extractBearerToken(req);
    const resolved = await resolveUserFromRequest(req);
    if (!resolved) {
      if (suppliedToken) {
        res.setHeader('X-Session-Revoked', '1');
      }
      res.status(401).json({
        error: suppliedToken
          ? 'A tua sessão foi encerrada porque a conta iniciou sessão noutro dispositivo.'
          : 'Inicia sessão para continuar.',
        code: suppliedToken ? 'SESSION_REVOKED' : 'SESSION_REQUIRED',
      });
      return;
    }
    req.authUser = resolved.user;
    req.authSessionId = resolved.sessionId;
    next();
  } catch (err) {
    console.error('[requireAuth]', err);
    res.status(500).json({ error: 'Erro ao validar sessão' });
  }
}

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireAuth(req, res, () => {
    if (!req.authUser || req.authUser.role !== 'admin') {
      res.status(403).json({
        error: 'Acesso restrito a administradores autorizados.',
        code: 'ADMIN_REQUIRED',
      });
      return;
    }
    next();
  });
}
