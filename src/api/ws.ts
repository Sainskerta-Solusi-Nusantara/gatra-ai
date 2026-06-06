import http from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { URL } from 'node:url';
import { config } from '../config.js';
import { logger } from '../logger.js';
import type { SessionManager } from '../session/index.js';
import type { SessionEvent } from '../session/types.js';

export function attachWebSocket(server: http.Server, sessions: SessionManager): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  const broadcast = (msg: { kind: string; payload: unknown }) => {
    const data = JSON.stringify(msg);
    for (const c of wss.clients) {
      if (c.readyState === c.OPEN) {
        try {
          c.send(data);
        } catch (err) {
          logger.warn({ err }, 'ws send failed');
        }
      }
    }
  };

  sessions.on('event', (event: SessionEvent) => {
    broadcast({ kind: event.kind, payload: event });
  });
  sessions.on('progress', (event: { kind: string; payload: unknown }) => {
    broadcast({ kind: event.kind, payload: event.payload });
  });

  server.on('upgrade', (req, socket, head) => {
    if (!req.url) {
      socket.destroy();
      return;
    }
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/ws/events') {
      socket.destroy();
      return;
    }
    const token = url.searchParams.get('token') ?? req.headers.authorization?.replace(/^Bearer /, '');
    if (config.env === 'production' && (!token || token !== config.apiToken)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ kind: 'hello', payload: { instance: config.instanceId, ts: Date.now() } }));
    ws.on('error', (err) => logger.warn({ err }, 'ws client error'));
  });

  return wss;
}
