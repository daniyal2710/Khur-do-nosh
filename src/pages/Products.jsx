import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fmtPKR } from '../lib/format';
import BarRow from '../components/BarRow';

export default function Products() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('v_product_performance').select('*').limit(10);
      setRows(data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-400">Loading…</div>;

  const max = Math.max(1, ...rows.map((r) => Number(r.units_sold)));
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="max-w-[1200px] mx-auto p-5">
      <h2 className="text-[22px] font-black text-maroon mb-4 flex items-center gap-2">📦 Products</h2>

      <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100 mb-3.5">
        <h3 className="text-sm font-extrabold mb-3">🏆 Top Products</h3>
        <div className="flex flex-col gap-2">
          {rows.map((p, i) => (
            <BarRow
              key={p.item_name}
              label={`${p.icon} ${p.item_name}`}
              value={p.units_sold}
              valueLabel={`${p.units_sold} sold`}
              max={max}
              color={i < 3 ? '#e8590c' : '#f59f00'}
            />
          ))}
          {!rows.length && <p className="text-gray-400 text-sm text-center py-3">Abhi tak koi completed order nahi</p>}
        </div>
      </div>

      <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100">
        <h3 className="text-sm font-extrabold mb-3">💰 Revenue Table</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-extrabold text-gray-400 uppercase border-b-2 border-gray-100">
              <th className="text-left py-1.5">#</th><th className="text-left py-1.5">Product</th>
              <th className="text-left py-1.5">Units</th><th className="text-left py-1.5">Revenue</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.item_name} className="border-b border-gray-50 last:border-0">
                <td className="py-2">{i + 1}</td>
                <td className="py-2 font-extrabold">{p.icon} {p.item_name}</td>
                <td className="py-2">{p.units_sold}</td>
                <td className="py-2 font-extrabold">{fmtPKR(p.revenue)}</td>
                <td className="py-2">{medals[i] || ''}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="text-center text-gray-400 py-4">Koi data nahi</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
