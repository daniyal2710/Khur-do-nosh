import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { ToastProvider } from './lib/ToastContext';
import { ShopSettingsProvider } from './lib/ShopSettingsContext';
import TopBar from './components/TopBar';
import Login from './pages/Login';
import POS from './pages/POS';
import OrdersList from './pages/OrdersList';
import KDS from './pages/KDS';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Products from './pages/Products';
import AreaReport from './pages/AreaReport';
import Customers from './pages/Customers';
import Admin from './pages/Admin';

const PAGES = {
  pos: POS,
  orders: OrdersList,
  kds: KDS,
  dashboard: Dashboard,
  sales: Sales,
  products: Products,
  area: AreaReport,
  customers: Customers,
  admin: Admin,
};

function AppShell() {
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

export default function App() {
  return (
    <ShopSettingsProvider>
      <AppShell />
    </ShopSettingsProvider>
  );
}
