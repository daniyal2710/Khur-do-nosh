import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fmtPKR } from '../lib/format';

export default function Sales() {
  const [daily, setDaily] = useState([]);
  const [deals, setDeals] = useState([]);
  const [kpis, setKpis] = useState({ today: 0, todayOrders: 0, week: 0, weekOrders: 0, month: 0, monthOrders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startWeek = new Date(now.getTime() - 6 * 86400000).toISOString();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [{ data: dailyRows }, { data: todayRows }, { data: weekRows }, { data: monthRows }, { data: dealRows }] = await Promise.all([
        supabase.from('v_daily_sales').select('*').limit(28),
        supabase.from('orders').select('total').eq('status', 'completed').gte('created_at', startToday),
        supabase.from('orders').select('total').eq('status', 'completed').gte('created_at', startWeek),
        supabase.from('orders').select('total').eq('status', 'completed').gte('created_at', startMonth),
        supabase
          .from('order_items')
          .select('item_name, quantity, subtotal, orders!inner(status), menu_items!inner(price, categories!inner(name))')
          .eq('menu_items.categories.name', 'Deals')
          .eq('orders.status', 'completed'),
      ]);

      const sum = (rows) => (rows || []).reduce((s, r) => s + Number(r.total), 0);
      setKpis({
        today: sum(todayRows), todayOrders: (todayRows || []).length,
        week: sum(weekRows), weekOrders: (weekRows || []).length,
        month: sum(monthRows), monthOrders: (monthRows || []).length,
      });
      setDaily(dailyRows || []);

      const grouped = {};
      (dealRows || []).forEach((r) => {
        if (!grouped[r.item_name]) grouped[r.item_name] = { name: r.item_name, price: r.menu_items?.price, orders: 0, revenue: 0 };
        grouped[r.item_name].orders += r.quantity;
        grouped[r.item_name].revenue += Number(r.subtotal);
      });
      setDeals(Object.values(grouped).sort((a, b) => b.revenue - a.revenue));
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-400">Loading…</div>;

  return (
    <div className="max-w-[1200px] mx-auto p-5">
      <h2 className="text-[22px] font-black text-maroon mb-4 flex items-center gap-2">💰 Sales Report</h2>

      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
        <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100">
          <div className="text-[28px] mb-1.5">📅</div>
          <div className="text-[10px] font-bold text-gray-400 uppercase">Today</div>
          <div className="text-2xl font-black text-orange">{fmtPKR(kpis.today)}</div>
          <div className="text-[11px] text-gray-400">{kpis.todayOrders} orders</div>
        </div>
        <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100">
          <div className="text-[28px] mb-1.5">📆</div>
          <div className="text-[10px] font-bold text-gray-400 uppercase">This Week</div>
          <div className="text-2xl font-black">{fmtPKR(kpis.week)}</div>
          <div className="text-[11px] text-gray-400">{kpis.weekOrders} orders</div>
        </div>
        <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100">
          <div className="text-[28px] mb-1.5">🗓️</div>
          <div className="text-[10px] font-bold text-gray-400 uppercase">This Month</div>
          <div className="text-2xl font-black">{fmtPKR(kpis.month)}</div>
          <div className="text-[11px] text-gray-400">{kpis.monthOrders} orders</div>
        </div>
      </div>

      <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100 mb-3.5">
        <h3 className="text-sm font-extrabold mb-3">📆 Daily Breakdown</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-extrabold text-gray-400 uppercase border-b-2 border-gray-100">
              <th className="text-left py-1.5">Date</th><th className="text-left py-1.5">Orders</th><th className="text-left py-1.5">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((d) => (
              <tr key={d.day} className="border-b border-gray-50 last:border-0">
                <td className="py-2 font-extrabold">{new Date(d.day).toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'short' })}</td>
                <td className="py-2">{d.orders}</td>
                <td className="py-2 font-extrabold">{fmtPKR(d.revenue)}</td>
              </tr>
            ))}
            {!daily.length && <tr><td colSpan={3} className="text-center text-gray-400 py-4">Abhi tak koi completed order nahi</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100">
        <h3 className="text-sm font-extrabold mb-3">🎁 Deal Performance</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-extrabold text-gray-400 uppercase border-b-2 border-gray-100">
              <th className="text-left py-1.5">Deal</th><th className="text-left py-1.5">Price</th><th className="text-left py-1.5">Orders</th><th className="text-left py-1.5">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.name} className="border-b border-gray-50 last:border-0">
                <td className="py-2 font-extrabold">🎁 {d.name}</td>
                <td className="py-2">{fmtPKR(d.price)}</td>
                <td className="py-2">{d.orders}</td>
                <td className="py-2 font-extrabold">{fmtPKR(d.revenue)}</td>
              </tr>
            ))}
            {!deals.length && <tr><td colSpan={4} className="text-center text-gray-400 py-4">Abhi tak koi deal order nahi hui</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
