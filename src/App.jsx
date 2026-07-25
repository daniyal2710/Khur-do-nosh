import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { ToastProvider } from './lib/ToastContext';
import TopBar from './components/TopBar';
import Login from './pages/Login';
import POS from './pages/POS';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Products from './pages/Products';
import AreaReport from './pages/AreaReport';
import Customers from './pages/Customers';

const PAGES = {
  pos: POS,
  dashboard: Dashboard,
  sales: Sales,
  products: Products,
  area: AreaReport,
  customers: Customers,
};

export default function App() {
  const [page, setPage] = useState('pos');
  const [session, setSession] = useState(undefined); // undefined = checking, null = logged out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  }

  if (!session) {
    return <Login />;
  }

  const Page = PAGES[page];

  return (
    <ToastProvider>
      <TopBar page={page} setPage={setPage} onLogout={() => supabase.auth.signOut()} />
      <Page />
    </ToastProvider>
  );
}
