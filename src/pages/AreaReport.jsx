import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fmtPKR } from '../lib/format';
import BarRow from '../components/BarRow';

export default function AreaReport() {
  const [rows, setRows] = useState([]);
  const [peakHour, setPeakHour] = useState(null);
  const [peakAreaBreakdown, setPeakAreaBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: areaOrders }] = await Promise.all([
        supabase.from('v_area_performance').select('*'),
        supabase.from('orders').select('created_at, areas(name, icon)').not('area_id', 'is', null).limit(5000),
      ]);
      setRows(data || []);

      const hourlyTotal = Array(24).fill(0);
      const hourAreaCounts = Array.from({ length: 24 }, () => ({}));
      (areaOrders || []).forEach((o) => {
        if (!o.areas) return;
        const hr = new Date(o.created_at).getHours();
        hourlyTotal[hr] += 1;
        const name = o.areas.name;
        if (!hourAreaCounts[hr][name]) hourAreaCounts[hr][name] = { icon: o.areas.icon, count: 0 };
        hourAreaCounts[hr][name].count += 1;
      });
      const maxCount = Math.max(...hourlyTotal);
      if (maxCount > 0) {
        const hr = hourlyTotal.indexOf(maxCount);
        setPeakHour(hr);
        setPeakAreaBreakdown(
          Object.entries(hourAreaCounts[hr])
            .map(([name, v]) => ({ name, icon: v.icon, count: v.count }))
            .sort((a, b) => b.count - a.count)
        );
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-400">Loading…</div>;

  const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue), 0) || 1;
  const maxRevenue = Math.max(1, ...rows.map((r) => Number(r.revenue)));

  return (
    <div className="max-w-[1200px] mx-auto p-5">
      <h2 className="text-[22px] font-black text-maroon mb-4 flex items-center gap-2">📍 Area Report</h2>

      <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100 mb-3.5">
        <h3 className="text-sm font-extrabold mb-3">📊 Order-Wise Area Report</h3>
        <div className="flex flex-col gap-2">
          {rows.map((a, i) => {
            const pct = Math.round((a.revenue / totalRevenue) * 100);
            return (
              <BarRow
                key={a.area_name}
                label={`${a.icon} ${a.area_name}`}
                value={Number(a.revenue)}
                valueLabel={`${pct}% — ${fmtPKR(a.revenue)}`}
                displayValue={`${pct}%`}
                max={maxRevenue}
                color={i === 0 ? '#e8590c' : '#f59f00'}
              />
            );
          })}
          {!rows.length && <p className="text-gray-400 text-sm text-center py-3">Koi delivery order nahi mila</p>}
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
        {rows.map((a) => {
          const pct = Math.round((a.revenue / totalRevenue) * 100);
          return (
            <div key={a.area_name} className="bg-white rounded-[13px] p-3.5 border-2 border-gray-100">
              <h4 className="text-[13px] font-extrabold mb-2">{a.icon} {a.area_name}</h4>
              <div className="flex gap-3.5 mb-2">
                <div className="text-center">
                  <div className="text-[15px] font-black">{a.orders}</div>
                  <div className="text-[10px] text-gray-400 font-bold">Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-[15px] font-black">{fmtPKR(a.revenue)}</div>
                  <div className="text-[10px] text-gray-400 font-bold">Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-[15px] font-black">{pct}%</div>
                  <div className="text-[10px] text-gray-400 font-bold">Share</div>
                </div>
              </div>
              <div className="h-[9px] bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-gold to-orange" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* PEAK HOUR AREA REPORT */}
      <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100 mt-3.5">
        <h3 className="text-sm font-extrabold mb-1">⏰ Peak Hour Area Report</h3>
        {peakHour !== null ? (
          <>
            <p className="text-[11px] text-gray-400 mb-3">
              Busiest hour for area orders: {String(peakHour).padStart(2, '0')}:00–{String(peakHour + 1).padStart(2, '0')}:00
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-extrabold text-gray-400 uppercase border-b-2 border-gray-100">
                  <th className="text-left py-1.5">Area</th><th className="text-left py-1.5">Orders in this hour</th>
                </tr>
              </thead>
              <tbody>
                {peakAreaBreakdown.map((a) => (
                  <tr key={a.name} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 font-extrabold">{a.icon} {a.name}</td>
                    <td className="py-2">{a.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-gray-400 text-sm text-center py-3">Abhi tak koi delivery/foodpanda order nahi jisme area ho</p>
        )}
      </div>
    </div>
  );
}
