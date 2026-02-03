import React, { useState } from 'react';
import { Chat } from './components/Chat';
import { Sidebar } from './components/Sidebar';
import './App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🦞 CynicalClaw</h1>
        <p className="tagline">"Your personal AI assistant with existential dread"</p>
        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>
      </header>

      <div className="app-body">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <Sidebar />
        </aside>

        <main className="main-content">
          <Chat />
        </main>
      </div>

      <footer className="app-footer">
        <p>© 2024 CynicalClaw. All rights reserved. No lobsters were harmed.</p>
      </footer>
    </div>
  );
}

export default App;
