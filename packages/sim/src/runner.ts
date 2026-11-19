import { applyAction, getInitialState, type Side } from '@aw/engine';
import { chooseAction } from './bots.js';
import { assertInvariants } from './invariants.js';
import { mulberry32 } from './prng.js';

export interface GameRun {
  seed: number;
  winner: Side | null;
  capped: boolean;
  actions: number;
  turns: number;
  killed: number;
}

export function runGame(seed: number, maxActions = 2000): GameRun {
  const random = mulberry32(seed);
  let state = getInitialState();
  assertInvariants(state);
  for (let actionIndex = 0; actionIndex < maxActions; actionIndex += 1) {
    if (state.phase === 'gameover') {
      return { seed, winner: state.winner, capped: false, actions: actionIndex, turns: state.turn, killed: state.killedTotal };
    }
    const action = chooseAction(state, random);
    try {
      state = applyAction(state, state.activeSide, action);
      assertInvariants(state);
    } catch (error) {
      throw new Error(`Simulation failed at seed ${seed}, action ${actionIndex}: ${JSON.stringify(action)} — ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { seed, winner: null, capped: true, actions: maxActions, turns: state.turn, killed: state.killedTotal };
}

export function runBatch(count: number, seed = 42, maxActions = 2000): GameRun[] {
  return Array.from({ length: count }, (_, index) => runGame(seed + index, maxActions));
}
