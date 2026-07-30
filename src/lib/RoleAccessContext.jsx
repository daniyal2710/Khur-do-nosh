import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const RoleAccessContext = createContext(null);

export function RoleAccessProvider({ children }) {
  const [access, setAccess] = useState(null); // null = loading; else Map<role, Set<page_id>>

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('role_page_access').select('*');
    const map = {};
    (data || []).forEach((row) => {
      if (!row.allowed) return;
      if (!map[row.role]) map[row.role] = new Set();
      map[row.role].add(row.page_id);
    });
    setAccess(map);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <RoleAccessContext.Provider value={{ access, refresh }}>
      {children}
    </RoleAccessContext.Provider>
  );
}

export function useRoleAccess() {
  const ctx = useContext(RoleAccessContext);
  if (!ctx) throw new Error('useRoleAccess must be used within RoleAccessProvider');
  return ctx;
}
