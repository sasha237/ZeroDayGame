import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameAction } from '@aw/engine';
import { api, observerWsUrl, wsUrl } from './api';
import type { ObserverGameResponse, PlayerGameResponse } from './types';

export function useOnlineGame(gameId: string, debrief: boolean) {
  const [game, setGame] = useState<PlayerGameResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const debriefRef = useRef(debrief);
  debriefRef.current = debrief;

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const load = async () => {
      try {
        const payload = await api.game(gameId, debriefRef.current);
        if (!disposed) { setGame(payload); setError(null); }
      } catch (failure) {
        if (!disposed) setError(failure instanceof Error ? failure.message : 'Could not load game');
      }
    };
    const connect = () => {
      socket = new WebSocket(wsUrl(gameId));
      socket.onopen = () => { if (!disposed) setConnected(true); void load(); };
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'game' && !disposed) setGame(message.payload);
      };
      socket.onclose = () => {
        if (disposed) return;
        setConnected(false);
        retry = setTimeout(connect, 1200);
      };
      socket.onerror = () => socket?.close();
    };
    void load();
    connect();
    return () => {
      disposed = true;
      if (retry) clearTimeout(retry);
      socket?.close();
    };
  }, [gameId, debrief]);

  const submit = useCallback(async (action: GameAction) => {
    try {
      setGame(await api.action(gameId, action));
      setError(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Action failed');
      throw failure;
    }
  }, [gameId]);
  return { game, error, connected, submit, setError };
}

export function useObserver(token: string) {
  const [game, setGame] = useState<ObserverGameResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const load = async () => {
      try { if (!disposed) setGame(await api.observe(token)); }
      catch (failure) { if (!disposed) setError(failure instanceof Error ? failure.message : 'Observer load failed'); }
    };
    const connect = () => {
      socket = new WebSocket(observerWsUrl(token));
      socket.onopen = () => { if (!disposed) setConnected(true); void load(); };
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'observer' && !disposed) setGame(message.payload);
      };
      socket.onclose = () => {
        if (disposed) return;
        setConnected(false);
        retry = setTimeout(connect, 1200);
      };
      socket.onerror = () => socket?.close();
    };
    void load();
    connect();
    return () => { disposed = true; if (retry) clearTimeout(retry); socket?.close(); };
  }, [token]);
  return { game, error, connected };
}
