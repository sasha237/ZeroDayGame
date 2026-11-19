import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { authenticateBearer } from './auth.js';
import { parseAction } from './actions.js';
import type { Config } from './config.js';
import { eventsCsv } from './csv.js';
import { HttpApiEmailProvider, LogEmailProvider } from './email.js';
import { GameService, ServiceError } from './game.service.js';
import type { Repository } from './repo.js';
import { registerAuthRoutes, requireAuth } from './routes.auth.js';
import type { ServerMessage } from './types.js';
import { WsHub } from './ws.js';

export async function buildApp(
  repo: Repository,
  config: Config,
  options: { healthCheck?: () => Promise<boolean> } = {},
) {
  const app = Fastify({ bodyLimit: 16 * 1024, trustProxy: config.trustProxy });
  const hub = new WsHub();
  const service = new GameService(repo, hub);
  const email = config.emailApiUrl && config.emailApiKey
    ? new HttpApiEmailProvider(config.emailApiUrl, config.emailApiKey, config.emailFrom)
    : new LogEmailProvider((message, meta) => app.log.info(meta ?? {}, message));

  await app.register(helmet);
  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.includes(origin)) callback(null, true);
      else callback(new Error('Origin not allowed'), false);
    },
  });
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });
  await app.register(websocket);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ServiceError) return reply.code(error.status).send({ error: error.message });
    const failure = error as Error & { statusCode?: number };
    const status = failure.statusCode ?? 500;
    if (status >= 500) app.log.error(failure);
    return reply.code(status).send({ error: status >= 500 ? 'Internal server error' : failure.message });
  });

  registerAuthRoutes(app, repo, config, email);
  hub.onPresence = (gameId, userId, connected) => void service.presence(gameId, userId, connected);

  app.get('/healthz', async (_request, reply) => {
    const healthy = options.healthCheck ? await options.healthCheck() : true;
    return reply.code(healthy ? 200 : 503).send({ ok: healthy });
  });

  app.post('/games', async (request, reply) => {
    const auth = await requireAuth(request, repo);
    const side = (request.body as any)?.side;
    if (side !== 'state' && side !== 'insurgent') throw new ServiceError(400, 'Choose Corporation or Hackers');
    return reply.code(201).send(await service.createGame(auth.user, side));
  });

  app.post('/games/join', async (request) => {
    const auth = await requireAuth(request, repo);
    const code = (request.body as any)?.code;
    if (typeof code !== 'string') throw new ServiceError(400, 'Invite code required');
    return service.joinGame(auth.user, code);
  });

  app.get('/games/active', async (request) => {
    const auth = await requireAuth(request, repo);
    return { games: await service.listGames(auth.user) };
  });

  app.post('/games/:id/observer-link', async (request) => {
    const auth = await requireAuth(request, repo);
    return service.createObserverLink(auth.user, (request.params as any).id, config.clientUrl);
  });

  app.get('/games/:id', async (request) => {
    const auth = await requireAuth(request, repo);
    const query = request.query as any;
    return service.getGame(auth.user, (request.params as any).id, query.debrief === '1');
  });

  app.post('/games/:id/action', async (request) => {
    const auth = await requireAuth(request, repo);
    const action = parseAction((request.body as any)?.action);
    if (!action) throw new ServiceError(400, 'Valid action required');
    return service.submitAction(auth.user, (request.params as any).id, action);
  });

  app.get('/games/:id/replay', async (request) => {
    const auth = await requireAuth(request, repo);
    const query = request.query as any;
    return service.getReplay(auth.user, (request.params as any).id, Number(query.seq ?? 0), query.debrief === '1');
  });

  app.get('/games/:id/export.csv', async (request, reply) => {
    const auth = await requireAuth(request, repo);
    const query = request.query as any;
    const game = await service.getGame(auth.user, (request.params as any).id, query.debrief === '1');
    return reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="asymmetric-warfare-${game.id}.csv"`)
      .send(eventsCsv(game.view.history));
  });

  app.get('/observe/:token', async (request) => service.getObserver((request.params as any).token));
  app.get('/observe/:token/replay', async (request) => {
    return service.getObserverReplay((request.params as any).token, Number((request.query as any).seq ?? 0));
  });
  app.get('/observe/:token/export.csv', async (request, reply) => {
    const game = await service.getObserver((request.params as any).token);
    return reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="asymmetric-warfare-${game.id}.csv"`)
      .send(eventsCsv(game.view.history));
  });

  app.get('/ws', { websocket: true }, async (socket, request) => {
    const query = request.query as any;
    if (typeof query.observe === 'string') {
      let observer;
      try {
        observer = await service.getObserver(query.observe);
      } catch {
        socket.close(4001, 'unauthorized');
        return;
      }
      hub.addObserver(observer.id, socket);
      socket.send(JSON.stringify({ type: 'observer', payload: observer } satisfies ServerMessage));
      return;
    }
    if (typeof query.token !== 'string' || typeof query.gameId !== 'string') {
      socket.close(4001, 'unauthorized');
      return;
    }
    const auth = await authenticateBearer(repo, query.token);
    if (!auth) {
      socket.close(4001, 'unauthorized');
      return;
    }
    try {
      const payload = await service.getGame(auth.user, query.gameId);
      hub.add(query.gameId, auth.user.id, socket);
      socket.send(JSON.stringify({ type: 'game', payload } satisfies ServerMessage));
    } catch {
      socket.close(4001, 'unauthorized');
    }
  });

  app.addHook('onClose', async () => hub.closeAll());
  return { app, hub, service };
}
