import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const StaffContext = createContext(null);

export function StaffProvider({ children }) {
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = logged out

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from('staff_profiles').select('*').eq('id', user.id).single();
    setProfile(data || { id: user.id, email: user.email, full_name: user.email, role: 'cashier', is_active: true });
  }, []);

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  return (
    <StaffContext.Provider value={{ profile, refresh }}>
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error('useStaff must be used within StaffProvider');
  return ctx;
}
