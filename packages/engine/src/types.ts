import type { SpaceId } from './board.js';

export type Side = 'state' | 'insurgent';
export type Viewer = Side | 'facilitator';
export type Phase = 'setup' | 'playing' | 'gameover';

export interface Piece {
  id: string;
  side: Side;
  position: SpaceId | null;
}

export type GameAction =
  | { type: 'place'; pieceId: string; to: SpaceId }
  | { type: 'finishSetup' }
  | { type: 'move'; pieceId: string; to: SpaceId }
  | { type: 'grow'; at: SpaceId }
  | { type: 'kill'; at: SpaceId }
  | { type: 'interrogate'; at: SpaceId }
  | { type: 'endTurn' };

export interface ActionRecord {
  seq: number;
  turn: number;
  actor: Side;
  action: GameAction;
  killed?: number;
  from?: SpaceId;
  revealed?: SpaceId[];
}

export interface GameState {
  version: 1;
  phase: Phase;
  activeSide: Side;
  actionsRemaining: number;
  turn: number;
  pieces: Record<string, Piece>;
  insurgentAvailable: number;
  killedTotal: number;
  winner: Side | null;
  history: ActionRecord[];
}

export interface ViewEvent {
  seq: number;
  turn: number;
  actor: Side;
  type: GameAction['type'];
  from?: SpaceId;
  to?: SpaceId;
  at?: SpaceId;
  killed?: number;
  revealed?: SpaceId[];
}

export interface GameView {
  version: 1;
  viewer: Viewer;
  phase: Phase;
  activeSide: Side;
  actionsRemaining: number;
  turn: number;
  statePieces: Piece[];
  insurgents: Piece[];
  insurgentAvailable: number | null;
  killedTotal: number;
  winner: Side | null;
  history: ViewEvent[];
  debrief: boolean;
}

export interface ReplayInput {
  actor: Side;
  action: GameAction;
}
