import { describe, expect, it } from 'vitest';
import { getPlayerView, type GameAction } from '@aw/engine';
import { initStore, reducer, type StoreState } from '../src/game/store';

function act(state: StoreState, action: GameAction): StoreState {
  return reducer(state, { type: 'act', action });
}

function deployed(): StoreState {
  let state = initStore();
  ['E1', 'E3', 'E5', 'E7', 'E9'].forEach((to, index) => {
    state = act(state, { type: 'place', pieceId: `I${index + 1}`, to: to as 'E1' });
  });
  return act(state, { type: 'finishSetup' });
}

describe('hot-seat store', () => {
  it('runs deployment and starts with two Insurgent actions', () => {
    const state = deployed();
    expect(state.game.phase).toBe('playing');
    expect(state.game.actionsRemaining).toBe(2);
    expect(state.handoffTo).toBeNull();
  });

  it('inserts a privacy handoff after ending a turn', () => {
    let state = deployed();
    state = act(state, { type: 'endTurn' });
    expect(state.handoffTo).toBe('state');
    expect(getPlayerView(state.game, state.game.activeSide).viewer).toBe('state');
    state = reducer(state, { type: 'confirmHandoff' });
    expect(state.handoffTo).toBeNull();
  });

  it('blocks actions during handoff', () => {
    let state = act(deployed(), { type: 'endTurn' });
    const blocked = act(state, { type: 'move', pieceId: 'S1', to: 'B1' });
    expect(blocked).toEqual(state);
  });

  it('keeps invalid actions recoverable', () => {
    const state = act(deployed(), { type: 'move', pieceId: 'I1', to: 'C1' });
    expect(state.error).toContain('Destination is not adjacent');
    expect(state.game.pieces.I1.position).toBe('E1');
  });

  it('only enables full debrief after game over', () => {
    let state = reducer(deployed(), { type: 'setDebrief', value: true });
    expect(state.debrief).toBe(false);
    state = { ...state, game: { ...state.game, phase: 'gameover', winner: 'state' } };
    state = reducer(state, { type: 'setDebrief', value: true });
    expect(state.debrief).toBe(true);
  });
});
