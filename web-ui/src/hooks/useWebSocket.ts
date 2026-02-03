import { useEffect, useRef, useState, useCallback } from 'react';
import { Message } from '../types';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

export const useWebSocket = () => {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('cynicalclaw_token');
    if (!token) {
      console.error('No token found. Please register device first.');
      return;
    }

    const socket = new WebSocket(WS_URL, [token]);
    ws.current = socket;

    socket.onopen = () => {
      setConnected(true);
      console.log('Connected to CynicalClaw. Abandon hope.');
    };

    socket.onclose = () => {
      setConnected(false);
      console.log('Disconnected. The void claims all connections.');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleMessage(data);
    };

    return () => {
      socket.close();
    };
  }, []);

  const handleMessage = useCallback((data: any) => {
    if (data.type === 'chat_response') {
      if (data.metadata?.streaming) {
        setStreamingContent(prev => prev + data.content);
      } else if (data.metadata?.loading) {
        // Loading message, ignore
      } else {
        setMessages(prev => [...prev, {
          id: data.id,
          content: data.content,
          role: 'assistant',
          timestamp: data.timestamp,
          metadata: data.metadata
        }]);
        setStreamingContent('');
      }
    } else if (data.type === 'error') {
      setMessages(prev => [...prev, {
        id: data.id,
        content: `Error: ${data.error}`,
        role: 'system',
        timestamp: data.timestamp
      }]);
    }
  }, []);

  const sendMessage = useCallback((content: string, options: any = {}) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;

    const msg = {
      type: 'chat',
      id: Math.random().toString(36).substring(7),
      payload: {
        content,
        complexity: options.complexity || 'low',
        budget: options.budget || 'free',
        personality: options.personality || 'sarcastic',
        useTools: options.useTools || false
      }
    };

    setMessages(prev => [...prev, {
      id: msg.id,
      content,
      role: 'user',
      timestamp: new Date().toISOString()
    }]);

    ws.current.send(JSON.stringify(msg));
  }, []);

  return { connected, messages, streamingContent, sendMessage };
};
