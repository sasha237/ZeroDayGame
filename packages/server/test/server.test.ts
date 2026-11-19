import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createMemoryRepository } from '../src/repo.memory.js';

let app: FastifyInstance;

beforeEach(async () => {
  app = (await buildApp(createMemoryRepository(), { ...loadConfig({}), corsOrigins: [] })).app;
});
afterEach(async () => app.close());

async function register(email: string) {
  const response = await app.inject({
    method: 'POST', url: '/auth/register',
    payload: { email, password: 'correct-horse', displayName: email.split('@')[0] },
  });
  expect(response.statusCode).toBe(201);
  return response.json() as { token: string; user: { id: string; email: string } };
}

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

async function createGame(token: string, side: 'state' | 'insurgent' = 'state') {
  const response = await app.inject({ method: 'POST', url: '/games', headers: auth(token), payload: { side } });
  expect(response.statusCode).toBe(201);
  return response.json();
}

async function joinedGame() {
  const state = await register('state@example.com');
  const insurgent = await register('insurgent@example.com');
  const created = await createGame(state.token);
  const joined = await app.inject({
    method: 'POST', url: '/games/join', headers: auth(insurgent.token), payload: { code: created.inviteCode },
  });
  expect(joined.statusCode).toBe(200);
  return { state, insurgent, game: joined.json() };
}

async function deploy(token: string, gameId: string) {
  for (const [index, to] of ['E1', 'E3', 'E5', 'E7', 'E9'].entries()) {
    const response = await app.inject({
      method: 'POST', url: `/games/${gameId}/action`, headers: auth(token),
      payload: { action: { type: 'place', pieceId: `I${index + 1}`, to } },
    });
    expect(response.statusCode).toBe(200);
  }
  const response = await app.inject({
    method: 'POST', url: `/games/${gameId}/action`, headers: auth(token),
    payload: { action: { type: 'finishSetup' } },
  });
  expect(response.statusCode).toBe(200);
}

describe('auth and lobby', () => {
  it('registers, authenticates, and revokes a session', async () => {
    const account = await register('player@example.com');
    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: auth(account.token) });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe('player@example.com');
    const logout = await app.inject({ method: 'POST', url: '/auth/logout', headers: auth(account.token) });
    expect(logout.statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/auth/me', headers: auth(account.token) })).statusCode).toBe(401);
  });

  it('rejects invalid credentials without exposing account existence', async () => {
    expect((await app.inject({ method: 'POST', url: '/auth/register', payload: { email: 'bad', password: 'short' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'none@example.com', password: 'wrong-password' } })).statusCode).toBe(401);
    const forgot = await app.inject({ method: 'POST', url: '/auth/forgot', payload: { email: 'none@example.com' } });
    expect(forgot.statusCode).toBe(200);
    expect(forgot.json()).toEqual({ ok: true });
  });

  it('creates and joins a two-side private lobby', async () => {
    const { state, insurgent, game } = await joinedGame();
    expect(game.side).toBe('insurgent');
    expect(game.opponentJoined).toBe(true);
    const active = await app.inject({ method: 'GET', url: '/games/active', headers: auth(state.token) });
    expect(active.json().games).toHaveLength(1);
    expect(active.json().games[0].side).toBe('state');
    expect(insurgent.user.id).not.toBe(state.user.id);
  });

  it('serializes competing joins and admits only two players', async () => {
    const owner = await register('owner@example.com');
    const first = await register('first@example.com');
    const second = await register('second@example.com');
    const game = await createGame(owner.token);
    const [a, b] = await Promise.all([
      app.inject({ method: 'POST', url: '/games/join', headers: auth(first.token), payload: { code: game.inviteCode } }),
      app.inject({ method: 'POST', url: '/games/join', headers: auth(second.token), payload: { code: game.inviteCode } }),
    ]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([200, 409]);
  });
});

describe('authoritative game access', () => {
  it('rejects waiting-room actions and inactive-side actions', async () => {
    const owner = await register('owner@example.com');
    const game = await createGame(owner.token);
    expect((await app.inject({ method: 'POST', url: `/games/${game.id}/action`, headers: auth(owner.token), payload: { action: { type: 'endTurn' } } })).statusCode).toBe(409);
    const { state, game: joined } = await joinedGame();
    expect((await app.inject({ method: 'POST', url: `/games/${joined.id}/action`, headers: auth(state.token), payload: { action: { type: 'endTurn' } } })).statusCode).toBe(422);
  });

  it('blocks authenticated non-members from every game read', async () => {
    const outsider = await register('outsider@example.com');
    const { game } = await joinedGame();
    for (const url of [`/games/${game.id}`, `/games/${game.id}/replay?seq=0`, `/games/${game.id}/export.csv`]) {
      const response = await app.inject({ method: 'GET', url, headers: auth(outsider.token) });
      expect(response.statusCode).toBe(404);
    }
  });

  it('filters State setup, current pieces, history, replay, and CSV', async () => {
    const { state, insurgent, game } = await joinedGame();
    await deploy(insurgent.token, game.id);
    const response = await app.inject({ method: 'GET', url: `/games/${game.id}`, headers: auth(state.token) });
    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.view.insurgents).toEqual([]);
    expect(payload.view.insurgentAvailable).toBeNull();
    expect(payload.view.history.every((event: any) => event.to === undefined)).toBe(true);
    expect(JSON.stringify(payload)).not.toContain('E1');
    const replay = await app.inject({ method: 'GET', url: `/games/${game.id}/replay?seq=2`, headers: auth(state.token) });
    expect(JSON.stringify(replay.json())).not.toContain('E1');
    const csv = await app.inject({ method: 'GET', url: `/games/${game.id}/export.csv`, headers: auth(state.token) });
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.body).not.toContain('E1');
  });

  it('gives facilitators full live views, replay, and export by secret token', async () => {
    const { state, insurgent, game } = await joinedGame();
    await deploy(insurgent.token, game.id);
    const linkResponse = await app.inject({ method: 'POST', url: `/games/${game.id}/observer-link`, headers: auth(state.token) });
    const { token, url } = linkResponse.json();
    expect(url).toContain(`/#/observe/${token}`);
    const observed = await app.inject({ method: 'GET', url: `/observe/${token}` });
    expect(observed.statusCode).toBe(200);
    expect(observed.json().view.viewer).toBe('facilitator');
    expect(observed.json().view.insurgents).toHaveLength(5);
    expect(JSON.stringify(observed.json())).toContain('E1');
    const replay = await app.inject({ method: 'GET', url: `/observe/${token}/replay?seq=1` });
    expect(replay.json().view.insurgents).toHaveLength(1);
    const csv = await app.inject({ method: 'GET', url: `/observe/${token}/export.csv` });
    expect(csv.body).toContain('E1');
  });

  it('returns legal actions only to the owning active side', async () => {
    const { state, insurgent, game } = await joinedGame();
    await deploy(insurgent.token, game.id);
    const insurgentView = await app.inject({ method: 'GET', url: `/games/${game.id}`, headers: auth(insurgent.token) });
    const stateView = await app.inject({ method: 'GET', url: `/games/${game.id}`, headers: auth(state.token) });
    expect(insurgentView.json().legalActions.length).toBeGreaterThan(0);
    expect(stateView.json().legalActions).toEqual([]);
  });
});
