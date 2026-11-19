import { areAdjacent, getAdjacent, isSpaceId, SPACE_IDS } from './board.js';
import type { SpaceId } from './board.js';
import type {
  ActionRecord,
  GameAction,
  GameState,
  Piece,
  ReplayInput,
  Side,
} from './types.js';
import { getInsurgentVictory } from './victory.js';

export class RuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuleError';
  }
}

const STATE_IDS = Array.from({ length: 5 }, (_, index) => `S${index + 1}`);
const INSURGENT_IDS = Array.from({ length: 15 }, (_, index) => `I${index + 1}`);

export function getInitialState(): GameState {
  const pieces: Record<string, Piece> = {};
  for (const id of STATE_IDS) pieces[id] = { id, side: 'state', position: 'Capital' };
  for (const id of INSURGENT_IDS) pieces[id] = { id, side: 'insurgent', position: null };
  return {
    version: 1,
    phase: 'setup',
    activeSide: 'insurgent',
    actionsRemaining: 0,
    turn: 1,
    pieces,
    insurgentAvailable: 10,
    killedTotal: 0,
    winner: null,
    history: [],
  };
}

function piecesAt(state: GameState, at: SpaceId, side?: Side): Piece[] {
  return Object.values(state.pieces).filter(
    (piece) => piece.position === at && (!side || piece.side === side),
  );
}

function baseValidation(state: GameState, actor: Side, action: GameAction): string[] {
  if (state.phase === 'gameover') return ['The game is over'];
  if (state.activeSide !== actor) return ['It is not your turn'];
  if (state.phase === 'setup') {
    if (actor !== 'insurgent') return ['Only the Hackers perform setup'];
    if (action.type !== 'place' && action.type !== 'finishSetup') {
      return ['Complete setup before using play actions'];
    }
  } else if (action.type === 'place' || action.type === 'finishSetup') {
    return ['Setup is already complete'];
  }
  return [];
}

export function validateAction(state: GameState, actor: Side, action: GameAction): string[] {
  const errors = baseValidation(state, actor, action);
  if (errors.length > 0) return errors;

  if (action.type === 'finishSetup') {
    const placed = Object.values(state.pieces).filter(
      (piece) => piece.side === 'insurgent' && piece.position !== null,
    );
    if (placed.length !== 5) errors.push('Place exactly five Hackers before starting');
    return errors;
  }

  if (action.type === 'place') {
    const piece = state.pieces[action.pieceId];
    if (!piece || piece.side !== 'insurgent' || !INSURGENT_IDS.slice(0, 5).includes(piece.id)) {
      errors.push('Choose one of the five starting Hackers');
    } else if (piece.position !== null) {
      errors.push('That starting Hacker is already placed');
    }
    if (!action.to.startsWith('E')) errors.push('Starting Hackers must be placed in ring E');
    if (piecesAt(state, action.to, 'insurgent').length > 0) {
      errors.push('Initial Hacker stacking is prohibited');
    }
    return errors;
  }

  if (action.type === 'endTurn') return errors;
  if (state.actionsRemaining <= 0) return ['No actions remain; end the turn'];

  if (action.type === 'move') {
    const piece = state.pieces[action.pieceId];
    if (!piece || piece.side !== actor || piece.position === null) {
      errors.push('Choose one of your living pieces');
      return errors;
    }
    if (!isSpaceId(action.to)) errors.push('Unknown destination');
    else {
      if (action.to === 'Capital') errors.push('No piece may enter the Data Core');
      if (!areAdjacent(piece.position, action.to)) errors.push('Destination is not adjacent');
    }
    return errors;
  }

  const at = action.at;
  if (!isSpaceId(at)) return ['Unknown space'];

  if (action.type === 'grow') {
    if (actor !== 'insurgent') errors.push('Only the Hackers may Propagate');
    if (piecesAt(state, at, 'insurgent').length !== 2) {
      errors.push('Propagate requires exactly two Hackers in the space');
    }
    if (state.insurgentAvailable <= 0) errors.push('No Hackers are available');
  } else {
    if (actor !== 'state') errors.push('Only the Corporation may Purge or Trace');
    if (piecesAt(state, at, 'state').length === 0) errors.push('No Corporation piece occupies that space');
    if (piecesAt(state, at, 'insurgent').length === 0) errors.push('No Hacker occupies that space');
  }
  return errors;
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    pieces: Object.fromEntries(
      Object.entries(state.pieces).map(([id, piece]) => [id, { ...piece }]),
    ),
    history: [...state.history],
  };
}

function appendRecord(
  state: GameState,
  turn: number,
  actor: Side,
  action: GameAction,
  extra: Partial<ActionRecord> = {},
): void {
  state.history.push({ seq: state.history.length + 1, turn, actor, action, ...extra });
}

export function applyAction(state: GameState, actor: Side, action: GameAction): GameState {
  const errors = validateAction(state, actor, action);
  if (errors.length > 0) throw new RuleError(errors.join('; '));
  const next = cloneState(state);

  if (action.type === 'place') {
    next.pieces[action.pieceId].position = action.to;
    appendRecord(next, state.turn, actor, action);
    return next;
  }

  if (action.type === 'finishSetup') {
    next.phase = 'playing';
    next.actionsRemaining = 2;
    appendRecord(next, state.turn, actor, action);
    return next;
  }

  if (action.type === 'move') {
    const piece = next.pieces[action.pieceId];
    const from = piece.position!;
    piece.position = action.to;
    next.actionsRemaining -= 1;
    appendRecord(next, state.turn, actor, action, { from });
    return next;
  }

  if (action.type === 'grow') {
    const available = Object.values(next.pieces)
      .filter((piece) => piece.side === 'insurgent' && piece.position === null)
      .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)))[0];
    if (!available) throw new RuleError('No recyclable Hacker identity is available');
    available.position = action.at;
    next.insurgentAvailable -= 1;
    next.actionsRemaining -= 1;
    appendRecord(next, state.turn, actor, action);
    return next;
  }

  if (action.type === 'kill') {
    const killed = piecesAt(next, action.at, 'insurgent');
    for (const piece of killed) next.pieces[piece.id].position = null;
    next.killedTotal += killed.length;
    next.insurgentAvailable += killed.length;
    next.actionsRemaining -= 1;
    appendRecord(next, state.turn, actor, action, { killed: killed.length });
    if (next.killedTotal >= 12) {
      next.phase = 'gameover';
      next.winner = 'state';
      next.actionsRemaining = 0;
    }
    return next;
  }

  if (action.type === 'interrogate') {
    const revealed = getAdjacent(action.at).filter(
      (neighbor) => piecesAt(next, neighbor, 'insurgent').length > 0,
    );
    next.actionsRemaining -= 1;
    appendRecord(next, state.turn, actor, action, { revealed });
    return next;
  }

  appendRecord(next, state.turn, actor, action);
  if (actor === 'insurgent' && getInsurgentVictory(next)) {
    next.phase = 'gameover';
    next.winner = 'insurgent';
    next.actionsRemaining = 0;
    return next;
  }
  next.activeSide = actor === 'insurgent' ? 'state' : 'insurgent';
  next.actionsRemaining = 2;
  if (actor === 'state') next.turn += 1;
  return next;
}

export function getLegalActions(state: GameState, actor: Side): GameAction[] {
  if (state.phase === 'gameover' || state.activeSide !== actor) return [];
  const candidates: GameAction[] = [];

  if (state.phase === 'setup') {
    for (const id of INSURGENT_IDS.slice(0, 5)) {
      if (state.pieces[id].position === null) {
        for (const to of SPACE_IDS.filter((space) => space.startsWith('E'))) {
          candidates.push({ type: 'place', pieceId: id, to });
        }
      }
    }
    candidates.push({ type: 'finishSetup' });
  } else {
    for (const piece of Object.values(state.pieces)) {
      if (piece.side === actor && piece.position !== null) {
        for (const to of getAdjacent(piece.position)) {
          if (to !== 'Capital') candidates.push({ type: 'move', pieceId: piece.id, to });
        }
      }
    }
    for (const at of SPACE_IDS) {
      if (at === 'Capital') continue;
      if (actor === 'insurgent') candidates.push({ type: 'grow', at });
      else {
        candidates.push({ type: 'kill', at });
        candidates.push({ type: 'interrogate', at });
      }
    }
    candidates.push({ type: 'endTurn' });
  }

  return candidates.filter((action) => validateAction(state, actor, action).length === 0);
}

export function serializeState(state: GameState): string {
  return JSON.stringify(state);
}

export function deserializeState(serialized: string): GameState {
  const state = JSON.parse(serialized) as GameState;
  if (state.version !== 1 || !state.pieces || !Array.isArray(state.history)) {
    throw new Error('Unsupported game state');
  }
  return state;
}

export function replay(actions: readonly ReplayInput[]): GameState {
  return actions.reduce((state, input) => applyAction(state, input.actor, input.action), getInitialState());
}
