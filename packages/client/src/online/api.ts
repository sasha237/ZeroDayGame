import type { GameAction, Side } from '@aw/engine';
import type { GameSummary, ObserverGameResponse, PlayerGameResponse, PublicUser } from './types';

const TOKEN_KEY = 'aw.token';

export function getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('content-type', 'application/json');
  const token = getToken();
  if (authenticated && token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(path, { ...init, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: `Request failed (${response.status})` }));
    if (response.status === 401 && authenticated) setToken(null);
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  async register(email: string, password: string, displayName: string) {
    const result = await request<{ token: string; user: PublicUser }>('/auth/register', {
      method: 'POST', body: JSON.stringify({ email, password, displayName }),
    }, false);
    setToken(result.token);
    return result.user;
  },
  async login(email: string, password: string) {
    const result = await request<{ token: string; user: PublicUser }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }, false);
    setToken(result.token);
    return result.user;
  },
  me: () => request<{ user: PublicUser }>('/auth/me'),
  logout: async () => { await request('/auth/logout', { method: 'POST' }); setToken(null); },
  forgot: (email: string) => request('/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) }, false),
  reset: (token: string, password: string) => request('/auth/reset', { method: 'POST', body: JSON.stringify({ token, password }) }, false),
  createGame: (side: Side) => request<PlayerGameResponse>('/games', { method: 'POST', body: JSON.stringify({ side }) }),
  joinGame: (code: string) => request<PlayerGameResponse>('/games/join', { method: 'POST', body: JSON.stringify({ code }) }),
  activeGames: () => request<{ games: GameSummary[] }>('/games/active'),
  game: (id: string, debrief = false) => request<PlayerGameResponse>(`/games/${id}${debrief ? '?debrief=1' : ''}`),
  action: (id: string, action: GameAction) => request<PlayerGameResponse>(`/games/${id}/action`, { method: 'POST', body: JSON.stringify({ action }) }),
  observerLink: (id: string) => request<{ token: string; url: string }>(`/games/${id}/observer-link`, { method: 'POST' }),
  observe: (token: string) => request<ObserverGameResponse>(`/observe/${token}`, {}, false),
  replay: (id: string, seq: number, debrief: boolean) => request<PlayerGameResponse>(`/games/${id}/replay?seq=${seq}${debrief ? '&debrief=1' : ''}`),
  observerReplay: (token: string, seq: number) => request<ObserverGameResponse>(`/observe/${token}/replay?seq=${seq}`, {}, false),
};

export async function downloadCsv(path: string, authenticated = true): Promise<void> {
  const headers = new Headers();
  const token = getToken();
  if (authenticated && token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(path, { headers });
  if (!response.ok) throw new Error('CSV export failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'asymmetric-warfare.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function wsUrl(gameId: string): string {
  const url = new URL('/ws', location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.search = `?token=${encodeURIComponent(getToken() ?? '')}&gameId=${encodeURIComponent(gameId)}`;
  return url.toString();
}

export function observerWsUrl(token: string): string {
  const url = new URL('/ws', location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.search = `?observe=${encodeURIComponent(token)}`;
  return url.toString();
}
