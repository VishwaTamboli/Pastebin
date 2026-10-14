import { Link, Route, Routes } from 'react-router-dom';
import CreatePage from './pages/CreatePage.tsx';
import ViewPage from './pages/ViewPage.tsx';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-xl font-bold">
            Paste
          </Link>
          <Link
            to="/"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            New paste
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Routes>
          <Route path="/" element={<CreatePage />} />
          {/* NOTE: keep any future static routes above /:id. */}
          <Route path="/:id" element={<ViewPage />} />
          <Route
            path="*"
            element={
              <section aria-label="Page not found">
                <h2 className="text-2xl font-bold">Page not found</h2>
                <p className="mt-2 text-gray-600">
                  The page you are looking for does not exist.
                </p>
                <Link
                  to="/"
                  className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Go home
                </Link>
              </section>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
