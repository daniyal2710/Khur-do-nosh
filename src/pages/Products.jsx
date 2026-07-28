import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fmtPKR } from '../lib/format';
import BarRow from '../components/BarRow';

export default function Products() {
  const [mostSold, setMostSold] = useState([]);
  const [saleWise, setSaleWise] = useState([]);
  const [deals, setDeals] = useState([]);
  const [peakHour, setPeakHour] = useState(null); // { hour, heroProduct, qty }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: perf }, { data: dealRows }, { data: itemsWithTime }] = await Promise.all([
        supabase.from('v_product_performance').select('*').limit(50),
        supabase
          .from('order_items')
          .select('item_name, quantity, subtotal, orders!inner(status), menu_items!inner(price, categories!inner(name))')
          .eq('menu_items.categories.name', 'Deals')
          .eq('orders.status', 'completed'),
        supabase
          .from('order_items')
          .select('item_name, icon, quantity, orders!inner(created_at, status)')
          .eq('orders.status', 'completed')
          .limit(5000),
      ]);

      const rows = perf || [];
      setMostSold([...rows].sort((a, b) => b.units_sold - a.units_sold).slice(0, 10));
      setSaleWise([...rows].sort((a, b) => b.revenue - a.revenue).slice(0, 10));

      const grouped = {};
      (dealRows || []).forEach((r) => {
        if (!grouped[r.item_name]) grouped[r.item_name] = { name: r.item_name, price: r.menu_items?.price, orders: 0, revenue: 0 };
        grouped[r.item_name].orders += r.quantity;
        grouped[r.item_name].revenue += Number(r.subtotal);
      });
      setDeals(Object.values(grouped).sort((a, b) => b.revenue - a.revenue).slice(0, 5));

      // Peak hour + hero product for that hour
      const hourCounts = Array(24).fill(0);
      const hourProductQty = Array.from({ length: 24 }, () => ({}));
      (itemsWithTime || []).forEach((it) => {
        const hr = new Date(it.orders.created_at).getHours();
        hourCounts[hr] += it.quantity;
        if (!hourProductQty[hr][it.item_name]) hourProductQty[hr][it.item_name] = { icon: it.icon, qty: 0 };
        hourProductQty[hr][it.item_name].qty += it.quantity;
      });
      const peakHr = hourCounts.indexOf(Math.max(...hourCounts));
      const productsInPeakHr = hourProductQty[peakHr] || {};
      let hero = null;
      Object.entries(productsInPeakHr).forEach(([name, v]) => {
        if (!hero || v.qty > hero.qty) hero = { name, icon: v.icon, qty: v.qty };
      });
      if (Math.max(...hourCounts) > 0) {
        setPeakHour({ hour: peakHr, hero });
      }

      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-400">Loading…</div>;

  const maxUnits = Math.max(1, ...mostSold.map((r) => Number(r.units_sold)));

  return (
    <div className="max-w-[1200px] mx-auto p-5">
      <h2 className="text-[22px] font-black text-maroon mb-4 flex items-center gap-2">📦 Products</h2>

      {/* MOST SOLD — TOP 10 */}
      <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100 mb-3.5">
        <h3 className="text-sm font-extrabold mb-3">🏆 Most Sold Products (Top 10)</h3>
        <div className="flex flex-col gap-2">
          {mostSold.map((p, i) => (
            <BarRow
              key={p.item_name}
              label={`${p.icon} ${p.item_name}`}
              value={p.units_sold}
              valueLabel={`${p.units_sold} sold`}
              max={maxUnits}
              color={i < 3 ? '#e8590c' : '#f59f00'}
            />
          ))}
          {!mostSold.length && <p className="text-gray-400 text-sm text-center py-3">Abhi tak koi completed order nahi</p>}
        </div>
      </div>

      {/* PRODUCT WISE SALE — TOP 10, NUMBERS ONLY */}
      <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100 mb-3.5">
        <h3 className="text-sm font-extrabold mb-3">📊 Product Wise Sale (Top 10)</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-extrabold text-gray-400 uppercase border-b-2 border-gray-100">
              <th className="text-left py-1.5">Product</th><th className="text-left py-1.5">Orders</th><th className="text-left py-1.5">Sale</th>
            </tr>
          </thead>
          <tbody>
            {saleWise.map((p) => (
              <tr key={p.item_name} className="border-b border-gray-50 last:border-0">
                <td className="py-2 font-extrabold">{p.icon} {p.item_name}</td>
                <td className="py-2">{p.units_sold}</td>
                <td className="py-2 font-extrabold">{fmtPKR(p.revenue)}</td>
              </tr>
            ))}
            {!saleWise.length && <tr><td colSpan={3} className="text-center text-gray-400 py-4">Koi data nahi</td></tr>}
          </tbody>
        </table>
      </div>

      {/* DEAL WISE SALE — TOP 5, NUMBERS ONLY */}
      <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100 mb-3.5">
        <h3 className="text-sm font-extrabold mb-3">🎁 Deal Wise Sale (Top 5)</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-extrabold text-gray-400 uppercase border-b-2 border-gray-100">
              <th className="text-left py-1.5">Deal</th><th className="text-left py-1.5">Orders</th><th className="text-left py-1.5">Sale</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.name} className="border-b border-gray-50 last:border-0">
                <td className="py-2 font-extrabold">🎁 {d.name}</td>
                <td className="py-2">{d.orders}</td>
                <td className="py-2 font-extrabold">{fmtPKR(d.revenue)}</td>
              </tr>
            ))}
            {!deals.length && <tr><td colSpan={3} className="text-center text-gray-400 py-4">Abhi tak koi deal order nahi hui</td></tr>}
          </tbody>
        </table>
      </div>

      {/* PEAK HOUR HERO PRODUCT */}
      <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100">
        <h3 className="text-sm font-extrabold mb-3">⏰ Peak Hour Hero Product</h3>
        {peakHour?.hero ? (
          <div className="flex items-center gap-4">
            <div className="text-5xl">{peakHour.hero.icon}</div>
            <div>
              <div className="text-[11px] text-gray-400 font-bold uppercase">
                Busiest hour: {String(peakHour.hour).padStart(2, '0')}:00–{String(peakHour.hour + 1).padStart(2, '0')}:00
              </div>
              <div className="text-lg font-black">{peakHour.hero.name}</div>
              <div className="text-sm text-orange font-extrabold">{peakHour.hero.qty} sold in this hour</div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-3">Abhi tak koi completed order nahi</p>
        )}
      </div>
    </div>
  );
}
