import { randomUUID } from 'node:crypto';
import { deserializeState, serializeState } from '@aw/engine';
import type { Repository } from './repo.js';
import type { GameRecord, SessionRow, UserRow } from './types.js';

interface ResetRow { id: string; userId: string; tokenHash: string; expiresAt: Date; usedAt: Date | null }

function cloneGame(game: GameRecord): GameRecord {
  return {
    ...game,
    state: deserializeState(serializeState(game.state)),
    createdAt: new Date(game.createdAt),
    updatedAt: new Date(game.updatedAt),
  };
}

export function createMemoryRepository(): Repository {
  const users = new Map<string, UserRow>();
  const sessions = new Map<string, SessionRow>();
  const resets = new Map<string, ResetRow>();
  const games = new Map<string, GameRecord>();
  const queues = new Map<string, Promise<void>>();

  return {
    async createUser(email, passwordHash, displayName) {
      if ([...users.values()].some((user) => user.email === email)) throw new Error('Email already registered');
      const user = { id: randomUUID(), email, passwordHash, displayName };
      users.set(user.id, user);
      return { ...user };
    },
    async findUserByEmail(email) {
      const user = [...users.values()].find((candidate) => candidate.email === email);
      return user ? { ...user } : null;
    },
    async findUserById(id) {
      const user = users.get(id);
      return user ? { ...user } : null;
    },
    async createSession(userId, tokenHash, expiresAt) {
      const session = { id: randomUUID(), userId, tokenHash, expiresAt };
      sessions.set(session.id, session);
      return { ...session };
    },
    async findActiveSessionByTokenHash(tokenHash, now) {
      const session = [...sessions.values()].find((candidate) => candidate.tokenHash === tokenHash && candidate.expiresAt > now);
      return session ? { ...session } : null;
    },
    async deleteSession(id) { sessions.delete(id); },
    async createPasswordReset(id, userId, tokenHash, expiresAt) {
      resets.set(id, { id, userId, tokenHash, expiresAt, usedAt: null });
    },
    async resetPassword(tokenHash, passwordHash, now) {
      const reset = [...resets.values()].find((candidate) => candidate.tokenHash === tokenHash);
      if (!reset || reset.usedAt || reset.expiresAt <= now) return false;
      const user = users.get(reset.userId);
      if (!user) return false;
      user.passwordHash = passwordHash;
      reset.usedAt = now;
      for (const [id, session] of sessions) if (session.userId === user.id) sessions.delete(id);
      return true;
    },
    async createGame(game) {
      if ([...games.values()].some((candidate) => candidate.inviteCode === game.inviteCode)) throw new Error('Invite already exists');
      games.set(game.id, cloneGame(game));
    },
    async findGameById(id) {
      const game = games.get(id);
      return game ? cloneGame(game) : null;
    },
    async findGameByInviteCode(code) {
      const game = [...games.values()].find((candidate) => candidate.inviteCode === code);
      return game ? cloneGame(game) : null;
    },
    async findGameByObserverToken(token) {
      const game = [...games.values()].find((candidate) => candidate.observerToken === token);
      return game ? cloneGame(game) : null;
    },
    async listGamesForUser(userId) {
      return [...games.values()]
        .filter((game) => game.stateUserId === userId || game.insurgentUserId === userId)
        .map(cloneGame);
    },
    async mutateGame<T>(id: string, mutator: (game: GameRecord) => Promise<{ game: GameRecord; value: T }> | { game: GameRecord; value: T }): Promise<T> {
      const previous = queues.get(id) ?? Promise.resolve();
      const operation = previous.then(async () => {
        const game = games.get(id);
        if (!game) throw new Error('Game not found');
        const result = await mutator(cloneGame(game));
        games.set(id, cloneGame(result.game));
        return result.value;
      });
      queues.set(id, operation.then(() => undefined, () => undefined));
      return operation;
    },
  };
}
