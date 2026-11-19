import type { GameRecord, SessionRow, UserRow } from './types.js';

export interface Repository {
  createUser(email: string, passwordHash: string, displayName: string | null): Promise<UserRow>;
  findUserByEmail(email: string): Promise<UserRow | null>;
  findUserById(id: string): Promise<UserRow | null>;
  createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<SessionRow>;
  findActiveSessionByTokenHash(tokenHash: string, now: Date): Promise<SessionRow | null>;
  deleteSession(id: string): Promise<void>;
  createPasswordReset(id: string, userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  resetPassword(tokenHash: string, passwordHash: string, now: Date): Promise<boolean>;
  createGame(game: GameRecord): Promise<void>;
  findGameById(id: string): Promise<GameRecord | null>;
  findGameByInviteCode(code: string): Promise<GameRecord | null>;
  findGameByObserverToken(token: string): Promise<GameRecord | null>;
  listGamesForUser(userId: string): Promise<GameRecord[]>;
  mutateGame<T>(id: string, mutator: (game: GameRecord) => Promise<{ game: GameRecord; value: T }> | { game: GameRecord; value: T }): Promise<T>;
}
