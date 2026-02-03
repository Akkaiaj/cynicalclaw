import React from 'react';
import { Message as MessageType } from '../types';

interface Props {
  message: MessageType;
}

export const Message: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  return (
    <div className={`message ${message.role}`}>
      <div className="message-header">
        <span className="role-badge">
          {isUser ? '👤 You' : isSystem ? '⚠️ System' : '🦞 CynicalClaw'}
        </span>
        <span className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</span>
      </div>
      <div className="message-content">
        {message.content}
      </div>
      {message.metadata?.model && (
        <div className="message-meta">
          Model: {message.metadata.model}
        </div>
      )}
    </div>
  );
};
