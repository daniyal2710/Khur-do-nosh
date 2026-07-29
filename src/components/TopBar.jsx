import { useEffect, useState } from 'react';
import { useShopSettings } from '../lib/ShopSettingsContext';

const NAV = [
  { id: 'pos', icon: '🛒', label: 'POS' },
  { id: 'orders', icon: '🧾', label: 'Orders' },
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'sales', icon: '💰', label: 'Sales' },
  { id: 'products', icon: '📦', label: 'Products' },
  { id: 'area', icon: '📍', label: 'Area' },
  { id: 'customers', icon: '👥', label: 'Customers' },
  { id: 'admin', icon: '⚙️', label: 'Admin' },
];

export default function TopBar({ page, setPage, onLogout }) {
  const [clock, setClock] = useState('');
  const { settings } = useShopSettings();

  useEffect(() => {
    const tick = () => {
      setClock(
        new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    };
    tick();
    const id = setInterval(tick, 1000 * 30);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-maroon h-[62px] flex items-center px-3.5 gap-2.5 sticky top-0 z-[999] shadow-lg">
      <div className="flex items-center gap-2 flex-shrink-0 mr-3">
        {settings?.logo_url ? (
          <img
            src={settings.logo_url}
            alt="Logo"
            className="w-[42px] h-[42px] rounded-[10px] object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-[42px] h-[42px] bg-gold rounded-[10px] text-white text-[15px] font-black flex items-center justify-center">
            KN
          </div>
        )}
        <div>
          <h1 className="text-white text-[15px] leading-tight font-bold">{settings?.shop_name || 'Khurd o Nosh'}</h1>
          <p className="text-yellow-300 text-[10px]">Order Management</p>
        </div>
      </div>
      <div className="flex gap-1.5 flex-1 overflow-x-auto hide-scrollbar">
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setPage(n.id)}
            className={`flex flex-col items-center px-3 py-1.5 rounded-[9px] min-w-[66px] flex-shrink-0 transition-all ${
              page === n.id
                ? 'bg-white text-maroon'
                : 'bg-white/10 text-amber-100 hover:bg-white/20'
            }`}
          >
            <span className="text-xl leading-none">{n.icon}</span>
            <span className="text-[10px] font-bold uppercase mt-0.5">{n.label}</span>
          </button>
        ))}
      </div>
      <div className="text-yellow-300 text-[13px] font-bold flex-shrink-0 ml-2">{clock}</div>
      <button
        onClick={onLogout}
        className="text-white/70 hover:text-white text-lg flex-shrink-0 ml-1"
        title="Logout"
      >
        ⏻
      </button>
    </div>
  );
}
