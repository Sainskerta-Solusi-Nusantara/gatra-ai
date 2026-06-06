import { useEffect, useRef, useState } from 'react';
import { getToken } from './api';

export interface WsMessage {
  kind: string;
  payload: unknown;
}

export function useWebSocket(): { messages: WsMessage[]; status: 'connecting' | 'open' | 'closed' } {
  const [messages, setMessages] = useState<WsMessage[]>([]);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const url = `${proto}://${location.host}/ws/events?token=${encodeURIComponent(getToken())}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => setStatus('open');
      ws.onclose = () => {
        setStatus('closed');
        if (!cancelled) setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as WsMessage;
          setMessages((prev) => [msg, ...prev].slice(0, 200));
        } catch {
          // ignore non-json
        }
      };
    };
    connect();
    return () => {
      cancelled = true;
      wsRef.current?.close();
    };
  }, []);

  return { messages, status };
}
