import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { ToastProvider, useToast } from './lib/ToastContext';
import { ShopSettingsProvider } from './lib/ShopSettingsContext';
import { StaffProvider, useStaff } from './lib/StaffContext';
import { canAccess, firstAllowedPage } from './lib/roles';
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

function AuthedShell() {
  const { showToast } = useToast();
  const { profile } = useStaff();
  const [page, setPage] = useState(null);

  useEffect(() => {
    if (!profile) return;
    if (profile.is_active === false) {
      showToast('Ye account deactivate ho chuka hai. Admin se rabta karein.', 'error');
      supabase.auth.signOut();
      return;
    }
    setPage((p) => (p && canAccess(profile.role, p) ? p : firstAllowedPage(profile.role)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  if (profile === undefined || !page) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  }
  if (profile === null) return null; // signing out

  const Page = PAGES[page];

  return (
    <>
      <TopBar page={page} setPage={setPage} onLogout={() => supabase.auth.signOut()} role={profile.role} />
      <Page />
    </>
  );
}

function AppShell() {
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

  return (
    <ToastProvider>
      <StaffProvider>
        <AuthedShell />
      </StaffProvider>
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
