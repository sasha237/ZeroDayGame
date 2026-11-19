import {
  getAdjacent,
  getLegalActions,
  getPlayerView,
  RINGS,
  type GameAction,
  type GameState,
  type GameView,
  type SpaceId,
} from '@aw/engine';
import { choose, type Random } from './prng.js';

function ringScore(space: SpaceId): number {
  if (space === 'Capital') return -1;
  return RINGS.indexOf(space.charAt(0) as (typeof RINGS)[number]);
}

function distance(from: SpaceId, to: SpaceId): number {
  if (from === to) return 0;
  const seen = new Set<SpaceId>([from]);
  let frontier = [from];
  for (let depth = 1; depth < 20; depth += 1) {
    const next = frontier.flatMap((space) => getAdjacent(space)).filter((space) => space !== 'Capital');
    const unique: SpaceId[] = [...new Set(next)].filter((space) => !seen.has(space));
    if (unique.includes(to)) return depth;
    unique.forEach((space) => seen.add(space));
    frontier = unique;
  }
  return 99;
}

export function chooseInsurgentAction(state: GameState, random: Random): GameAction {
  const legal = getLegalActions(state, 'insurgent');
  if (state.phase === 'setup') {
    const finish = legal.find((action) => action.type === 'finishSetup');
    if (finish && Object.values(state.pieces).filter((piece) => piece.side === 'insurgent' && piece.position).length === 5) return finish;
    return choose(legal.filter((action) => action.type === 'place'), random);
  }
  const grows = legal.filter((action) => action.type === 'grow');
  if (grows.length && random() < 0.9) return choose(grows, random);
  if (!state.actionsRemaining) return { type: 'endTurn' };
  const moves = legal.filter((action): action is Extract<GameAction, { type: 'move' }> => action.type === 'move');
  if (moves.length) {
    const living = Object.values(state.pieces).filter((piece) => piece.side === 'insurgent' && piece.position !== null);
    const stateSpaces = new Set(Object.values(state.pieces).filter((piece) => piece.side === 'state').map((piece) => piece.position));
    const scored = moves.map((action) => {
      const piece = state.pieces[action.pieceId];
      const allies = living.filter((candidate) => candidate.id !== action.pieceId);
      const atDestination = allies.filter((candidate) => candidate.position === action.to).length;
      const cohesion = allies.length ? Math.min(...allies.map((candidate) => distance(action.to, candidate.position!))) : 0;
      const neighborAllies = allies.filter((candidate) => candidate.position?.startsWith('B') && getAdjacent(action.to).includes(candidate.position)).length;
      const regroup = living.length <= 5;
      const advance = regroup ? ringScore(action.to) : ringScore(action.to) * 4;
      const grouping = regroup ? cohesion * 5 : cohesion * 1.5 - atDestination * 3 - neighborAllies * 3;
      const threat = stateSpaces.has(action.to) ? 20 : getAdjacent(action.to).some((space) => stateSpaces.has(space)) ? 4 : 0;
      const backward = piece.position?.startsWith('B') && !action.to.startsWith('B') ? 8 : 0;
      return { action, score: advance + grouping + threat + backward + random() * 0.5 };
    }).sort((a, b) => a.score - b.score);
    return scored[0].action;
  }
  return { type: 'endTurn' };
}

export function chooseStateAction(state: GameState, view: GameView, random: Random): GameAction {
  if (view.viewer !== 'state') throw new Error('State bot requires a State-filtered view');
  const legal = getLegalActions(state, 'state');
  const kills = legal.filter((action) => action.type === 'kill');
  if (kills.length) return kills[0];
  const interrogations = legal.filter((action) => action.type === 'interrogate');
  if (interrogations.length && random() < 0.65) return interrogations[0];
  if (!state.actionsRemaining) return { type: 'endTurn' };
  const moves = legal.filter((action): action is Extract<GameAction, { type: 'move' }> => action.type === 'move');
  if (!moves.length) return { type: 'endTurn' };
  const currentTargets = [...new Set(view.insurgents.map((piece) => piece.position!))];
  const remembered = view.history.flatMap((event) => event.revealed ?? []);
  const targets = currentTargets.length ? currentTargets : [...new Set(remembered)].slice(-3);
  const scored = moves.map((action) => {
    const piece = view.statePieces.find((candidate) => candidate.id === action.pieceId)!;
    const targetDistance = targets.length ? Math.min(...targets.map((target) => distance(action.to, target))) : random() * 4;
    const stay = action.to === piece.position ? 2 : 0;
    return { action, score: targetDistance + stay + random() * 1.5 };
  }).sort((a, b) => a.score - b.score);
  return scored[0].action;
}

export function chooseAction(state: GameState, random: Random): GameAction {
  return state.activeSide === 'insurgent'
    ? chooseInsurgentAction(state, random)
    : chooseStateAction(state, getPlayerView(state, 'state'), random);
}
