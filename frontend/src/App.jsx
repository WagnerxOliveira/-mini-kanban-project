import { Board } from './components/Board';

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="header__content">
          <div className="header__brand">
            <span className="header__logo">⬡</span>
            <div>
              <h1 className="header__title">MINI KANBAN</h1>
              <p className="header__subtitle">// TASK_MANAGEMENT_SYSTEM v1.0</p>
            </div>
            <div className="header__status">
              <span className="header__status-dot" />
              SYSTEM ONLINE
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <Board />
      </main>
    </div>
  );
}
