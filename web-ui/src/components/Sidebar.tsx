import React from 'react';

export const Sidebar: React.FC = () => {
  return (
    <div className="sidebar-content">
      <h3>Your Digital Trauma</h3>
      <p>Memories persist even when you wish they wouldn't.</p>
      <div className="mood-indicator">
        Current Mood: <span className="mood">Cynical</span>
      </div>
      <div className="shortcuts">
        <h4>Keyboard Shortcuts</h4>
        <ul>
          <li>Enter - Send message</li>
          <li>Ctrl+K - Search memories</li>
          <li>Esc - Close sidebar</li>
        </ul>
      </div>
    </div>
  );
};
