import { randomBytes } from 'node:crypto';
import type { WebSocket } from 'ws';
import type { ServerMessage } from './types.js';

export class WsHub {
  private slots = new Map<string, WebSocket>();
  onPresence: ((gameId: string, userId: string, connected: boolean) => void) | null = null;

  add(gameId: string, userId: string, socket: WebSocket): void {
    const key = `${gameId}:user:${userId}`;
    this.slots.get(key)?.close(4000, 'replaced');
    this.slots.set(key, socket);
    socket.on('close', () => {
      if (this.slots.get(key) === socket) {
        this.slots.delete(key);
        this.onPresence?.(gameId, userId, false);
      }
    });
    socket.on('error', () => socket.close());
    this.onPresence?.(gameId, userId, true);
  }

  addObserver(gameId: string, socket: WebSocket): void {
    const key = `${gameId}:observer:${randomBytes(6).toString('hex')}`;
    this.slots.set(key, socket);
    socket.on('close', () => {
      if (this.slots.get(key) === socket) this.slots.delete(key);
    });
    socket.on('error', () => socket.close());
  }

  sendUser(gameId: string, userId: string, message: ServerMessage): void {
    const socket = this.slots.get(`${gameId}:user:${userId}`);
    if (socket && socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
  }

  sendObservers(gameId: string, message: ServerMessage): void {
    for (const [key, socket] of this.slots) {
      if (key.startsWith(`${gameId}:observer:`) && socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    }
  }

  closeAll(): void {
    for (const socket of this.slots.values()) socket.close(1001, 'server shutdown');
    this.slots.clear();
  }
}
