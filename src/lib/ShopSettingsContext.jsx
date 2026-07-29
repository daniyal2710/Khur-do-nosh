import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const ShopSettingsContext = createContext(null);

export function ShopSettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('shop_settings').select('*').eq('id', 1).single();
    if (data) setSettings(data);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ShopSettingsContext.Provider value={{ settings, refresh }}>
      {children}
    </ShopSettingsContext.Provider>
  );
}

export function useShopSettings() {
  const ctx = useContext(ShopSettingsContext);
  if (!ctx) throw new Error('useShopSettings must be used within ShopSettingsProvider');
  return ctx;
}
