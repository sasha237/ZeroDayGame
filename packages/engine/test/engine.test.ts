import { describe, expect, it } from 'vitest';
import {
  applyAction,
  areAdjacent,
  BOARD_SPACES,
  deserializeState,
  getAdjacent,
  getInitialState,
  getInsurgentVictory,
  getLegalActions,
  getPlayerView,
  replay,
  RuleError,
  serializeState,
  validateAction,
  type GameAction,
  type GameState,
  type Side,
  type SpaceId,
} from '@aw/engine';

const starting = ['E1', 'E3', 'E5', 'E7', 'E9'] as SpaceId[];

function act(state: GameState, actor: Side, action: GameAction): GameState {
  return applyAction(state, actor, action);
}

function setup(): GameState {
  let state = getInitialState();
  starting.forEach((to, index) => {
    state = act(state, 'insurgent', { type: 'place', pieceId: `I${index + 1}`, to });
  });
  return act(state, 'insurgent', { type: 'finishSetup' });
}

function end(state: GameState, actor: Side): GameState {
  return act(state, actor, { type: 'endTurn' });
}

function positions(state: GameState, values: Record<string, SpaceId | null>): GameState {
  return {
    ...state,
    pieces: {
      ...state.pieces,
      ...Object.fromEntries(
        Object.entries(values).map(([id, position]) => [id, { ...state.pieces[id], position }]),
      ),
    },
  };
}

describe('board', () => {
  it('contains the Capital and 48 ring spaces', () => {
    expect(BOARD_SPACES).toHaveLength(49);
    expect(BOARD_SPACES.filter((space) => space.ring === 'Capital')).toHaveLength(1);
    for (const ring of ['B', 'C', 'D', 'E']) {
      expect(BOARD_SPACES.filter((space) => space.ring === ring)).toHaveLength(12);
    }
  });

  it('has reciprocal adjacency and documented degree ranges', () => {
    for (const space of BOARD_SPACES) {
      for (const neighbor of space.adjacent) {
        expect(getAdjacent(neighbor)).toContain(space.id);
      }
      if (space.ring === 'E') expect(space.adjacent).toHaveLength(4);
      if (space.ring === 'C' || space.ring === 'D') expect(space.adjacent).toHaveLength(6);
      if (space.ring === 'B') expect(space.adjacent).toHaveLength(5);
    }
    expect(getAdjacent('Capital')).toHaveLength(12);
  });

  it('wraps sectors and crosses staggered rings', () => {
    expect(areAdjacent('B1', 'B12')).toBe(true);
    expect(areAdjacent('B1', 'C2')).toBe(true);
    expect(areAdjacent('C2', 'B1')).toBe(true);
    expect(areAdjacent('E1', 'D12')).toBe(true);
    expect(areAdjacent('E1', 'D11')).toBe(false);
  });

  it.each(Array.from({ length: 12 }, (_, index) => index + 1))(
    'connects D%i to the next C sector in both directions',
    (sector) => {
      const from = `D${sector}` as SpaceId;
      const to = `C${sector % 12 + 1}` as SpaceId;
      expect(areAdjacent(from, to)).toBe(true);
      expect(areAdjacent(to, from)).toBe(true);
    },
  );
});

describe('setup and turns', () => {
  it('places five distinct starting Hackers freely in ring E', () => {
    const state = setup();
    expect(state.phase).toBe('playing');
    expect(state.activeSide).toBe('insurgent');
    expect(state.actionsRemaining).toBe(2);
    expect(starting.map((id, index) => state.pieces[`I${index + 1}`].position)).toEqual(starting);
    expect(state.insurgentAvailable).toBe(10);
  });

  it('rejects initial stacking and placement outside E', () => {
    let state = getInitialState();
    state = act(state, 'insurgent', { type: 'place', pieceId: 'I1', to: 'E1' });
    expect(validateAction(state, 'insurgent', { type: 'place', pieceId: 'I2', to: 'E1' })).toContain(
      'Initial Hacker stacking is prohibited',
    );
    expect(validateAction(state, 'insurgent', { type: 'place', pieceId: 'I2', to: 'D2' })).toContain(
      'Starting Hackers must be placed in ring E',
    );
  });

  it('requires five pieces and prevents State setup actions', () => {
    const state = getInitialState();
    expect(validateAction(state, 'insurgent', { type: 'finishSetup' })).toContain(
      'Place exactly five Hackers before starting',
    );
    expect(validateAction(state, 'state', { type: 'endTurn' })).toContain('It is not your turn');
  });

  it('alternates after explicit end turn and allows passing with unused actions', () => {
    let state = setup();
    state = end(state, 'insurgent');
    expect(state.activeSide).toBe('state');
    expect(state.actionsRemaining).toBe(2);
    state = end(state, 'state');
    expect(state.activeSide).toBe('insurgent');
    expect(state.turn).toBe(2);
  });
});

describe('movement', () => {
  it('moves one piece one edge per action and permits using the same piece twice', () => {
    let state = setup();
    state = act(state, 'insurgent', { type: 'move', pieceId: 'I1', to: 'D1' });
    state = act(state, 'insurgent', { type: 'move', pieceId: 'I1', to: 'C1' });
    expect(state.pieces.I1.position).toBe('C1');
    expect(state.actionsRemaining).toBe(0);
    expect(validateAction(state, 'insurgent', { type: 'move', pieceId: 'I2', to: 'D3' })).toContain(
      'No actions remain; end the turn',
    );
  });

  it.each([
    ['D9', 'C10'],
    ['D10', 'C11'],
    ['D11', 'C12'],
  ] as const)('moves between %s and %s in both directions', (from, to) => {
    const forward = positions(setup(), { I1: from });
    expect(act(forward, 'insurgent', { type: 'move', pieceId: 'I1', to }).pieces.I1.position).toBe(to);

    const reverse = positions(setup(), { I1: to });
    expect(act(reverse, 'insurgent', { type: 'move', pieceId: 'I1', to: from }).pieces.I1.position).toBe(from);
  });

  it('rejects non-adjacent movement and opponent piece movement', () => {
    const state = setup();
    expect(validateAction(state, 'insurgent', { type: 'move', pieceId: 'I1', to: 'C1' })).toContain(
      'Destination is not adjacent',
    );
    expect(validateAction(state, 'insurgent', { type: 'move', pieceId: 'S1', to: 'B1' })).toContain(
      'Choose one of your living pieces',
    );
  });

  it('lets Corporation leave but never re-enter the Data Core', () => {
    let state = end(setup(), 'insurgent');
    state = act(state, 'state', { type: 'move', pieceId: 'S1', to: 'B1' });
    expect(state.pieces.S1.position).toBe('B1');
    expect(validateAction(state, 'state', { type: 'move', pieceId: 'S1', to: 'Capital' })).toContain(
      'No piece may enter the Data Core',
    );
  });
});

describe('propagation and visibility', () => {
  it('propagates exactly two pieces into three and consumes one action', () => {
    let state = positions(setup(), { I1: 'D4', I2: 'D4' });
    state = act(state, 'insurgent', { type: 'grow', at: 'D4' });
    expect(Object.values(state.pieces).filter((piece) => piece.position === 'D4')).toHaveLength(3);
    expect(state.insurgentAvailable).toBe(9);
    expect(state.actionsRemaining).toBe(1);
    const exhausted = { ...positions(setup(), { I1: 'D4', I2: 'D4' }), actionsRemaining: 0 };
    expect(validateAction(exhausted, 'insurgent', { type: 'grow', at: 'D4' })).toContain(
      'No actions remain; end the turn',
    );
  });

  it('rejects propagation at one, three, or with an empty pool', () => {
    let state = setup();
    expect(validateAction(state, 'insurgent', { type: 'grow', at: 'E1' })).toContain(
      'Propagate requires exactly two Hackers in the space',
    );
    state = positions(state, { I1: 'D4', I2: 'D4', I3: 'D4' });
    expect(validateAction(state, 'insurgent', { type: 'grow', at: 'D4' })).toContain(
      'Propagate requires exactly two Hackers in the space',
    );
    state = positions(state, { I3: 'E5' });
    state = { ...state, insurgentAvailable: 0 };
    expect(validateAction(state, 'insurgent', { type: 'grow', at: 'D4' })).toContain(
      'No Hackers are available',
    );
  });

  it('shows exact stack counts and hides lone pieces from State', () => {
    const state = positions(setup(), { I1: 'D4', I2: 'D4', I3: 'C8' });
    const view = getPlayerView(state, 'state');
    expect(view.insurgents.filter((piece) => piece.position === 'D4')).toHaveLength(2);
    expect(view.insurgents.some((piece) => piece.position === 'C8')).toBe(false);
    expect(view.insurgentAvailable).toBeNull();
  });

  it('reveals co-located Hackers and hides stack coordinates only in State history', () => {
    const state = positions(setup(), { I1: 'B1', S1: 'B1' });
    const view = getPlayerView(state, 'state');
    expect(view.insurgents.some((piece) => piece.id === 'I1')).toBe(true);
    const moveRecord = state.history[0];
    expect(moveRecord.action.type).toBe('place');
    expect(view.history[0].to).toBeUndefined();
    expect(getPlayerView(state, 'insurgent').history[0].to).toBe('E1');
  });

  it('offers optional full-information debrief only after game over', () => {
    const active = setup();
    expect(getPlayerView(active, 'state', true).debrief).toBe(false);
    const over = { ...active, phase: 'gameover' as const, winner: 'state' as const };
    expect(getPlayerView(over, 'state', true).debrief).toBe(true);
  });
});

describe('State actions', () => {
  it('interrogates every adjacent ring without removing pieces or exposing counts', () => {
    let state = positions(end(setup(), 'insurgent'), {
      S1: 'B1',
      I1: 'B1',
      I2: 'B2',
      I3: 'C2',
      I4: 'E12',
    });
    state = act(state, 'state', { type: 'interrogate', at: 'B1' });
    const record = state.history.at(-1)!;
    expect(record.revealed).toEqual(['B2', 'C2']);
    expect(state.pieces.I1.position).toBe('B1');
    expect(state.actionsRemaining).toBe(1);
    const view = getPlayerView(state, 'state');
    expect(view.history.at(-1)?.revealed).toEqual(['B2', 'C2']);
  });

  it('kills all co-located Hackers, recycles them, and counts cumulatively', () => {
    let state = positions(end(setup(), 'insurgent'), { S1: 'C3', I1: 'C3', I2: 'C3' });
    state = act(state, 'state', { type: 'kill', at: 'C3' });
    expect(state.pieces.I1.position).toBeNull();
    expect(state.pieces.I2.position).toBeNull();
    expect(state.killedTotal).toBe(2);
    expect(state.insurgentAvailable).toBe(12);
    expect(state.actionsRemaining).toBe(1);
    expect(state.winner).toBeNull();
  });

  it('removes an entire larger stack with one Kill action', () => {
    let state = positions(end(setup(), 'insurgent'), { S1: 'C3', I1: 'C3', I2: 'C3', I3: 'C3' });
    state = act(state, 'state', { type: 'kill', at: 'C3' });
    expect(state.killedTotal).toBe(3);
    expect(state.insurgentAvailable).toBe(13);
    expect(Object.values(state.pieces).filter(
      (piece) => piece.side === 'insurgent' && piece.position === 'C3',
    )).toHaveLength(0);
    expect(state.actionsRemaining).toBe(1);
  });

  it('spends action points on Kill and Interrogate and blocks them at zero', () => {
    let state = positions(end(setup(), 'insurgent'), { S1: 'C3', I1: 'C3', I2: 'C4' });
    state = act(state, 'state', { type: 'interrogate', at: 'C3' });
    expect(state.history.at(-1)?.revealed).toContain('C4');
    expect(state.actionsRemaining).toBe(1);
    state = act(state, 'state', { type: 'kill', at: 'C3' });
    expect(state.killedTotal).toBe(1);
    expect(state.actionsRemaining).toBe(0);
    expect(validateAction(state, 'state', { type: 'interrogate', at: 'C3' })).toContain(
      'No actions remain; end the turn',
    );
    const legal = getLegalActions(state, 'state');
    expect(legal.some((action) => action.type === 'interrogate')).toBe(false);
    expect(legal.some((action) => action.type === 'kill')).toBe(false);
    expect(legal.some((action) => action.type === 'move')).toBe(false);
    expect(legal.some((action) => action.type === 'endTurn')).toBe(true);
  });

  it('wins immediately when a stack kill crosses twelve', () => {
    let state = positions(end(setup(), 'insurgent'), { S1: 'C3', I1: 'C3', I2: 'C3' });
    state = { ...state, killedTotal: 11 };
    state = act(state, 'state', { type: 'kill', at: 'C3' });
    expect(state.killedTotal).toBe(13);
    expect(state.phase).toBe('gameover');
    expect(state.winner).toBe('state');
    expect(state.actionsRemaining).toBe(0);
    expect(() => end(state, 'state')).toThrow(RuleError);
  });
});

describe('Insurgent victory', () => {
  it.each([
    [['B2', 'B3', 'B4', 'B5'], 'paired-four'],
    [['B2', 'B3', 'B7', 'B8'], 'paired-four'],
    [['B1', 'B3', 'B5', 'B7', 'B9', 'B11'], 'six-spaces'],
  ] as const)('accepts %j', (spaces, expected) => {
    let state = setup();
    state = positions(state, Object.fromEntries(spaces.map((space, index) => [`I${index + 1}`, space])));
    expect(getInsurgentVictory(state)).toBe(expected);
    state = end(state, 'insurgent');
    expect(state.phase).toBe('gameover');
    expect(state.winner).toBe('insurgent');
  });

  it.each([
    ['B2', 'B3', 'B4', 'B8'],
    ['B2', 'B3', 'B6', 'B9'],
  ])('rejects unqualified four-space pattern %j', (...spaces) => {
    let state = setup();
    state = positions(state, Object.fromEntries(spaces.map((space, index) => [`I${index + 1}`, space as SpaceId])));
    expect(getInsurgentVictory(state)).toBeNull();
    state = end(state, 'insurgent');
    expect(state.phase).toBe('playing');
    expect(state.activeSide).toBe('state');
  });
});

describe('determinism and legal actions', () => {
  it('does not mutate the input state', () => {
    const state = setup();
    const before = serializeState(state);
    act(state, 'insurgent', { type: 'move', pieceId: 'I1', to: 'D1' });
    expect(serializeState(state)).toBe(before);
  });

  it('serializes and replays action-for-action', () => {
    const inputs = [
      ...starting.map((to, index) => ({
        actor: 'insurgent' as const,
        action: { type: 'place' as const, pieceId: `I${index + 1}`, to },
      })),
      { actor: 'insurgent' as const, action: { type: 'finishSetup' as const } },
      { actor: 'insurgent' as const, action: { type: 'move' as const, pieceId: 'I1', to: 'D1' as const } },
      { actor: 'insurgent' as const, action: { type: 'endTurn' as const } },
    ];
    const state = replay(inputs);
    expect(deserializeState(serializeState(state))).toEqual(state);
    expect(replay(state.history.map((record) => ({ actor: record.actor, action: record.action })))).toEqual(state);
  });

  it('lists only legal actions and no actions for the inactive side', () => {
    const state = setup();
    expect(getLegalActions(state, 'state')).toEqual([]);
    const legal = getLegalActions(state, 'insurgent');
    expect(legal.some((action) => action.type === 'move' && action.pieceId === 'I1' && action.to === 'D1')).toBe(true);
    expect(legal.some((action) => action.type === 'move' && action.to === 'Capital')).toBe(false);
    expect(legal.at(-1)?.type).toBe('endTurn');
  });
});

describe('complete legal-action Insurgent scenario', () => {
  it('travels from setup into two separated Inner Circle pairs and wins at end of turn', () => {
    let state = setup();
    const journeys: Array<[string, SpaceId[]]> = [
      ['I1', ['D1', 'C1', 'B1']],
      ['I2', ['D3', 'C3', 'B2']],
      ['I3', ['D5', 'C5', 'B4']],
      ['I4', ['D6', 'C6', 'B5']],
    ];
    for (const [pieceId, path] of journeys) {
      for (const to of path) {
        state = act(state, 'insurgent', { type: 'move', pieceId, to });
        if (state.actionsRemaining === 0) {
          state = end(state, 'insurgent');
          state = end(state, 'state');
        }
      }
      if (state.phase === 'playing') {
        state = end(state, 'insurgent');
        if (state.phase === 'playing') state = end(state, 'state');
      }
    }
    expect(state.phase).toBe('gameover');
    expect(state.winner).toBe('insurgent');
    expect(getInsurgentVictory(state)).toBe('paired-four');
    expect(['B1', 'B2', 'B4', 'B5'].every((space) =>
      Object.values(state.pieces).some((piece) => piece.position === space),
    )).toBe(true);
  });
});
