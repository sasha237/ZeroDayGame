import { describe, expect, it } from 'vitest';
import { getInitialState, getPlayerView } from '@aw/engine';
import { chooseStateAction } from '../src/bots.js';
import { assertInvariants } from '../src/invariants.js';
import { mulberry32 } from '../src/prng.js';
import { markdownReport } from '../src/report.js';
import { runGame } from '../src/runner.js';

describe('simulation', () => {
  it('generates repeatable random sequences', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect(Array.from({ length: 10 }, a)).toEqual(Array.from({ length: 10 }, b));
  });

  it('requires State bots to receive a filtered view', () => {
    expect(() => chooseStateAction(getInitialState(), getPlayerView(getInitialState(), 'facilitator'), mulberry32(1))).toThrow('State bot requires');
  });

  it('runs deterministic games with invariants', () => {
    const first = runGame(7, 300);
    const second = runGame(7, 300);
    expect(first).toEqual(second);
    expect(first.actions).toBeGreaterThan(0);
  });

  it('checks initial and completed games', () => {
    expect(() => assertInvariants(getInitialState())).not.toThrow();
    const result = runGame(11);
    expect([true, false]).toContain(result.capped);
  });

  it('reports session win/loss/draw proportions and the cap separately', () => {
    const report = markdownReport([
      { seed: 1, winner: 'state', capped: false, actions: 20, turns: 5, killed: 12 },
      { seed: 2, winner: 'insurgent', capped: false, actions: 30, turns: 7, killed: 4 },
      { seed: 3, winner: null, capped: true, actions: 10, turns: 3, killed: 0 },
    ]);
    expect(report).toContain('| Corporation win / Hackers loss | 1 | 33.3% |');
    expect(report).toContain('| Hackers win / Corporation loss | 1 | 33.3% |');
    expect(report).toContain('| Draw | 0 | 0.0% |');
    expect(report).toContain('| Unfinished at diagnostic cap | 1 | 33.3% |');
    expect(report).toContain('Corporation win rate among decisive sessions: 50.0%');
    expect(report).toContain('not an in-game draw');
  });
});
