import type {
  ActionRecord,
  GameState,
  GameView,
  Piece,
  ViewEvent,
  Viewer,
} from './types.js';

function livingPieces(state: GameState, side: 'state' | 'insurgent'): Piece[] {
  return Object.values(state.pieces)
    .filter((piece) => piece.side === side && piece.position !== null)
    .map((piece) => ({ ...piece }));
}

function visibleInsurgents(state: GameState): Piece[] {
  const living = livingPieces(state, 'insurgent');
  const counts = new Map<string, number>();
  for (const piece of living) {
    counts.set(piece.position!, (counts.get(piece.position!) ?? 0) + 1);
  }
  const stateSpaces = new Set(
    livingPieces(state, 'state').map((piece) => piece.position!),
  );
  return living.filter(
    (piece) => (counts.get(piece.position!) ?? 0) >= 2 || stateSpaces.has(piece.position!),
  );
}

function fullEvent(record: ActionRecord): ViewEvent {
  const event: ViewEvent = {
    seq: record.seq,
    turn: record.turn,
    actor: record.actor,
    type: record.action.type,
  };
  if ('from' in record && record.from) event.from = record.from;
  if (record.action.type === 'move') event.to = record.action.to;
  if (record.action.type === 'grow' || record.action.type === 'kill' || record.action.type === 'interrogate') {
    event.at = record.action.at;
  }
  if (record.action.type === 'place') event.to = record.action.to;
  if (record.killed !== undefined) event.killed = record.killed;
  if (record.revealed) event.revealed = [...record.revealed];
  return event;
}

function stateEvent(record: ActionRecord): ViewEvent {
  if (record.actor === 'state' || record.action.type === 'grow') return fullEvent(record);
  return {
    seq: record.seq,
    turn: record.turn,
    actor: record.actor,
    type: record.action.type,
  };
}

export function getPlayerView(
  state: GameState,
  viewer: Viewer,
  debrief = false,
): GameView {
  const full = viewer === 'facilitator' || (debrief && state.phase === 'gameover');
  return {
    version: 1,
    viewer,
    phase: state.phase,
    activeSide: state.activeSide,
    actionsRemaining: state.actionsRemaining,
    turn: state.turn,
    statePieces: livingPieces(state, 'state'),
    insurgents: full ? livingPieces(state, 'insurgent') : viewer === 'insurgent' ? livingPieces(state, 'insurgent') : visibleInsurgents(state),
    insurgentAvailable: full || viewer === 'insurgent' ? state.insurgentAvailable : null,
    killedTotal: state.killedTotal,
    winner: state.winner,
    history: state.history.map((record) => full || viewer === 'insurgent' ? fullEvent(record) : stateEvent(record)),
    debrief: full,
  };
}
