import type { GameAction, GameView, Side } from '@aw/engine';

export interface PublicUser { id: string; email: string; displayName: string | null }
export interface GameSummary {
  id: string;
  inviteCode: string;
  side: Side;
  phase: GameView['phase'];
  turn: number;
  opponentJoined: boolean;
  winner: Side | null;
}
export interface PlayerGameResponse {
  id: string;
  inviteCode: string;
  side: Side;
  opponentJoined: boolean;
  legalActions: GameAction[];
  view: GameView;
}
export interface ObserverGameResponse { id: string; view: GameView }
