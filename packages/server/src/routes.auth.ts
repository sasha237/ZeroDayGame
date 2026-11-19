import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  authenticateBearer,
  hashPassword,
  hashToken,
  issueToken,
  normalizeEmail,
  validPassword,
  verifyPassword,
} from './auth.js';
import type { Config } from './config.js';
import type { EmailProvider } from './email.js';
import { publicUser, ServiceError } from './game.service.js';
import type { Repository } from './repo.js';

export async function requireAuth(request: any, repo: Repository) {
  const header = request.headers.authorization;
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ServiceError(401, 'Authentication required');
  const auth = await authenticateBearer(repo, token);
  if (!auth) throw new ServiceError(401, 'Invalid or expired session');
  return auth;
}

export function registerAuthRoutes(
  app: FastifyInstance,
  repo: Repository,
  config: Config,
  email: EmailProvider,
): void {
  const createSession = async (userId: string) => {
    const issued = issueToken();
    const expiresAt = new Date(Date.now() + config.tokenTtlHours * 3600_000);
    await repo.createSession(userId, issued.tokenHash, expiresAt);
    return issued.token;
  };

  app.post('/auth/register', async (request, reply) => {
    const body = request.body as any;
    const emailAddress = normalizeEmail(body?.email);
    if (!emailAddress || !validPassword(body?.password)) {
      throw new ServiceError(400, 'Use a valid email and a password of 8–128 characters');
    }
    if (await repo.findUserByEmail(emailAddress)) throw new ServiceError(409, 'Email already registered');
    const displayName = typeof body?.displayName === 'string' && body.displayName.trim()
      ? body.displayName.trim().slice(0, 60)
      : null;
    const user = await repo.createUser(emailAddress, hashPassword(body.password), displayName);
    const token = await createSession(user.id);
    return reply.code(201).send({ token, user: publicUser(user) });
  });

  app.post('/auth/login', async (request) => {
    const body = request.body as any;
    const emailAddress = normalizeEmail(body?.email);
    const user = emailAddress ? await repo.findUserByEmail(emailAddress) : null;
    if (!user || !validPassword(body?.password) || !verifyPassword(body.password, user.passwordHash)) {
      throw new ServiceError(401, 'Invalid email or password');
    }
    return { token: await createSession(user.id), user: publicUser(user) };
  });

  app.post('/auth/logout', async (request) => {
    const auth = await requireAuth(request, repo);
    await repo.deleteSession(auth.session.id);
    return { ok: true };
  });

  app.get('/auth/me', async (request) => {
    const auth = await requireAuth(request, repo);
    return { user: publicUser(auth.user) };
  });

  app.post('/auth/forgot', async (request) => {
    const body = request.body as any;
    const emailAddress = normalizeEmail(body?.email);
    const user = emailAddress ? await repo.findUserByEmail(emailAddress) : null;
    if (user) {
      const issued = issueToken();
      await repo.createPasswordReset(randomUUID(), user.id, issued.tokenHash, new Date(Date.now() + 3600_000));
      const link = `${config.clientUrl}/#/reset/${issued.token}`;
      await email.send(user.email, 'ZERO DAY password reset', `Reset your password within one hour: ${link}`);
    } else {
      hashPassword('constant-timing-placeholder');
    }
    return { ok: true };
  });

  app.post('/auth/reset', async (request) => {
    const body = request.body as any;
    if (typeof body?.token !== 'string' || !validPassword(body?.password)) {
      throw new ServiceError(400, 'A token and valid new password are required');
    }
    const ok = await repo.resetPassword(hashToken(body.token), hashPassword(body.password), new Date());
    if (!ok) throw new ServiceError(400, 'Reset link is invalid, used, or expired');
    return { ok: true };
  });
}
