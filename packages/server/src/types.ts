import type { GameState, Side } from '@aw/engine';

export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string | null;
}

export interface SessionRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface GameRecord {
  id: string;
  inviteCode: string;
  stateUserId: string | null;
  insurgentUserId: string | null;
  observerToken: string | null;
  state: GameState;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface GameSummary {
  id: string;
  inviteCode: string;
  side: Side;
  phase: GameState['phase'];
  turn: number;
  opponentJoined: boolean;
  winner: Side | null;
}

export interface PlayerGameResponse {
  id: string;
  inviteCode: string;
  side: Side;
  opponentJoined: boolean;
  legalActions: import('@aw/engine').GameAction[];
  view: import('@aw/engine').GameView;
}

export interface ObserverGameResponse {
  id: string;
  view: import('@aw/engine').GameView;
}

export type ServerMessage =
  | { type: 'game'; payload: PlayerGameResponse }
  | { type: 'observer'; payload: ObserverGameResponse }
  | { type: 'presence'; side: Side; connected: boolean };
