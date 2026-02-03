import React, { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { Message } from './Message';

export const Chat: React.FC = () => {
  const { connected, messages, streamingContent, sendMessage } = useWebSocket();
  const [input, setInput] = useState('');
  const [model, setModel] = useState('free');
  const [personality, setPersonality] = useState('sarcastic');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, streamingContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    sendMessage(input, {
      budget: model,
      personality: personality
    });
    setInput('');
  };

  return (
    <div className="chat-container">
      <div className="connection-status">
        {connected ? (
          <span className="connected">● Connected to the Void</span>
        ) : (
          <span className="disconnected">● Disconnected (The lobster is sleeping)</span>
        )}
      </div>

      <div className="messages">
        {messages.map((msg) => (
          <Message key={msg.id} message={msg} />
        ))}
        {streamingContent && (
          <div className="message assistant streaming">
            <div className="message-header">
              <span className="role-badge">🦞 CynicalClaw</span>
              <span className="timestamp">Now</span>
            </div>
            <div className="message-content">{streamingContent}</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <div className="controls">
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="free">Free Tier (Groq/Ollama)</option>
            <option value="premium">Premium (Claude/GPT)</option>
          </select>
          <select value={personality} onChange={(e) => setPersonality(e.target.value)}>
            <option value="sarcastic">Sarcastic</option>
            <option value="depressed">Depressed</option>
            <option value="chaotic">Chaotic Evil</option>
            <option value="clinical">Clinical</option>
          </select>
        </div>
        <div className="input-row">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something... or don't. The universe is indifferent."
            disabled={!connected}
          />
          <button type="submit" disabled={!connected || !input.trim()}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
};
