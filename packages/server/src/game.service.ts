import { randomBytes, randomUUID } from 'node:crypto';
import {
  applyAction,
  getInitialState,
  getLegalActions,
  getPlayerView,
  replay,
  RuleError,
  type GameAction,
  type Side,
} from '@aw/engine';
import type { Repository } from './repo.js';
import type {
  GameRecord,
  GameSummary,
  ObserverGameResponse,
  PlayerGameResponse,
  UserRow,
} from './types.js';
import type { WsHub } from './ws.js';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export class ServiceError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ServiceError';
  }
}

function inviteCode(): string {
  return [...randomBytes(5)].map((byte) => ALPHABET[byte % 32]).join('');
}

function publicUser(user: UserRow) {
  return { id: user.id, email: user.email, displayName: user.displayName };
}

export class GameService {
  constructor(private readonly repo: Repository, private readonly hub: WsHub) {}

  private sideFor(game: GameRecord, userId: string): Side {
    if (game.stateUserId === userId) return 'state';
    if (game.insurgentUserId === userId) return 'insurgent';
    throw new ServiceError(404, 'Game not found');
  }

  private playerResponse(game: GameRecord, userId: string, debrief = false): PlayerGameResponse {
    const side = this.sideFor(game, userId);
    const joined = Boolean(game.stateUserId && game.insurgentUserId);
    return {
      id: game.id,
      inviteCode: game.inviteCode,
      side,
      opponentJoined: joined,
      legalActions: joined ? getLegalActions(game.state, side) : [],
      view: getPlayerView(game.state, side, debrief),
    };
  }

  private observerResponse(game: GameRecord): ObserverGameResponse {
    return { id: game.id, view: getPlayerView(game.state, 'facilitator') };
  }

  private push(game: GameRecord): void {
    for (const userId of [game.stateUserId, game.insurgentUserId]) {
      if (userId) this.hub.sendUser(game.id, userId, { type: 'game', payload: this.playerResponse(game, userId) });
    }
    this.hub.sendObservers(game.id, { type: 'observer', payload: this.observerResponse(game) });
  }

  async createGame(user: UserRow, side: Side): Promise<PlayerGameResponse> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const now = new Date();
      const game: GameRecord = {
        id: randomUUID(),
        inviteCode: inviteCode(),
        stateUserId: side === 'state' ? user.id : null,
        insurgentUserId: side === 'insurgent' ? user.id : null,
        observerToken: null,
        state: getInitialState(),
        revision: 0,
        createdAt: now,
        updatedAt: now,
      };
      try {
        await this.repo.createGame(game);
        return this.playerResponse(game, user.id);
      } catch (error) {
        if (attempt === 9) throw error;
      }
    }
    throw new ServiceError(500, 'Could not allocate invite code');
  }

  async joinGame(user: UserRow, code: string): Promise<PlayerGameResponse> {
    const existing = await this.repo.findGameByInviteCode(code.trim().toUpperCase());
    if (!existing) throw new ServiceError(404, 'Invite not found');
    const updated = await this.repo.mutateGame(existing.id, (game) => {
      const alreadyMember = game.stateUserId === user.id || game.insurgentUserId === user.id;
      if (!alreadyMember) {
        if (game.stateUserId && game.insurgentUserId) throw new ServiceError(409, 'Game is full');
        if (game.stateUserId) game.insurgentUserId = user.id;
        else game.stateUserId = user.id;
        game.revision += 1;
        game.updatedAt = new Date();
      }
      return { game, value: null };
    });
    void updated;
    const game = (await this.repo.findGameById(existing.id))!;
    this.push(game);
    return this.playerResponse(game, user.id);
  }

  async listGames(user: UserRow): Promise<GameSummary[]> {
    const games = await this.repo.listGamesForUser(user.id);
    return games.map((game) => ({
      id: game.id,
      inviteCode: game.inviteCode,
      side: this.sideFor(game, user.id),
      phase: game.state.phase,
      turn: game.state.turn,
      opponentJoined: Boolean(game.stateUserId && game.insurgentUserId),
      winner: game.state.winner,
    }));
  }

  async getGame(user: UserRow, gameId: string, debrief = false): Promise<PlayerGameResponse> {
    const game = await this.repo.findGameById(gameId);
    if (!game) throw new ServiceError(404, 'Game not found');
    return this.playerResponse(game, user.id, debrief);
  }

  async submitAction(user: UserRow, gameId: string, action: GameAction): Promise<PlayerGameResponse> {
    const existing = await this.repo.findGameById(gameId);
    if (!existing) throw new ServiceError(404, 'Game not found');
    this.sideFor(existing, user.id);
    await this.repo.mutateGame(gameId, (game) => {
      const side = this.sideFor(game, user.id);
      if (!game.stateUserId || !game.insurgentUserId) throw new ServiceError(409, 'Waiting for opponent');
      try {
        game.state = applyAction(game.state, side, action);
      } catch (error) {
        if (error instanceof RuleError) throw new ServiceError(422, error.message);
        throw error;
      }
      game.revision += 1;
      game.updatedAt = new Date();
      return { game, value: null };
    });
    const game = (await this.repo.findGameById(gameId))!;
    this.push(game);
    return this.playerResponse(game, user.id);
  }

  async createObserverLink(user: UserRow, gameId: string, clientUrl: string): Promise<{ token: string; url: string }> {
    const game = await this.repo.findGameById(gameId);
    if (!game) throw new ServiceError(404, 'Game not found');
    this.sideFor(game, user.id);
    const token = randomBytes(32).toString('base64url');
    await this.repo.mutateGame(gameId, (current) => {
      this.sideFor(current, user.id);
      if (!current.observerToken) {
        current.observerToken = token;
        current.revision += 1;
        current.updatedAt = new Date();
      }
      return { game: current, value: null };
    });
    const updated = (await this.repo.findGameById(gameId))!;
    return { token: updated.observerToken!, url: `${clientUrl}/#/observe/${updated.observerToken}` };
  }

  async getObserver(token: string): Promise<ObserverGameResponse> {
    const game = await this.repo.findGameByObserverToken(token);
    if (!game) throw new ServiceError(404, 'Observer link not found');
    return this.observerResponse(game);
  }

  async getReplay(user: UserRow, gameId: string, seq: number, debrief: boolean): Promise<PlayerGameResponse> {
    const game = await this.repo.findGameById(gameId);
    if (!game) throw new ServiceError(404, 'Game not found');
    this.sideFor(game, user.id);
    const snapshot = this.snapshot(game, seq);
    return {
      ...this.playerResponse({ ...game, state: snapshot }, user.id, debrief && game.state.phase === 'gameover'),
      legalActions: [],
    };
  }

  async getObserverReplay(token: string, seq: number): Promise<ObserverGameResponse> {
    const game = await this.repo.findGameByObserverToken(token);
    if (!game) throw new ServiceError(404, 'Observer link not found');
    return { id: game.id, view: getPlayerView(this.snapshot(game, seq), 'facilitator') };
  }

  private snapshot(game: GameRecord, seq: number) {
    if (!Number.isInteger(seq) || seq < 0) throw new ServiceError(400, 'Invalid replay position');
    if (seq >= game.state.history.length) return game.state;
    return replay(game.state.history.slice(0, seq).map((record) => ({ actor: record.actor, action: record.action })));
  }

  async presence(gameId: string, userId: string, connected: boolean): Promise<void> {
    const game = await this.repo.findGameById(gameId);
    if (!game) return;
    try {
      const side = this.sideFor(game, userId);
      for (const player of [game.stateUserId, game.insurgentUserId]) {
        if (player) this.hub.sendUser(gameId, player, { type: 'presence', side, connected });
      }
    } catch {
      return;
    }
  }
}

export { publicUser };
