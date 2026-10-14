import { useEffect, useState } from 'react';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function App() {
  const [health, setHealth] = useState<string>('checking...');

  useEffect(() => {
    fetch(`${apiUrl}/health`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.statusText)))
      .then((data) => setHealth(data.status ?? 'ok'))
      .catch(() => setHealth('unreachable'));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-3xl font-bold">Pastebin</h1>
        <p className="mt-2 text-gray-600">
          Phase 1 project setup. Paste creation arrives in a later phase.
        </p>
        <p className="mt-4 rounded border bg-white p-4 text-sm">
          Backend health: <span className="font-mono">{health}</span>
        </p>
      </main>
    </div>
  );
}

export default App;
