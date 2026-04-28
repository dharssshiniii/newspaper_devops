import { useEffect, useState } from 'react';

function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then(setHealth)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Newspaper Delivery System</h1>
        <p>DevOps-first Node.js + React application demo</p>
      </header>

      <main>
        <section className="status-card">
          <h2>Service Status</h2>
          {error && <p className="error">Unable to reach backend: {error}</p>}
          {health ? (
            <div>
              <p>Status: <strong>{health.status}</strong></p>
              <p>Service: {health.service}</p>
              <p>Server time: {new Date(health.timestamp).toLocaleString()}</p>
            </div>
          ) : (
            <p>Loading service health...</p>
          )}
        </section>

        <section className="feature-list">
          <h2>DevOps Demo Scope</h2>
          <ul>
            <li>GitHub Actions CI/CD</li>
            <li>Docker Compose local environment</li>
            <li>Kubernetes deployment manifests</li>
            <li>Prometheus / Grafana monitoring</li>
            <li>Loki centralized logs</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

export default App;
