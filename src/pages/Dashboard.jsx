import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/ToastContext';
import { fmtPKR, timeAgo } from '../lib/format';
import BarRow from '../components/BarRow';

function nextStatusFor(order) {
  const isDelivery = order.order_type === 'delivery' || order.order_type === 'foodpanda';
  const flow = isDelivery
    ? { queued: 'cooking', cooking: 'dispatched', dispatched: 'completed' }
    : { queued: 'cooking', cooking: 'completed' };
  return flow[order.status];
}
const STATUS_LABEL = { queued: 'Queued', cooking: 'Cooking', ready: 'Ready', dispatched: 'Dispatched', completed: 'Completed' };
const STATUS_CLS = {
  queued: 'bg-gray-100',
  cooking: 'bg-orange-50',
  ready: 'bg-green-50',
  dispatched: 'bg-blue-50',
};
const STATUS_BADGE = {
  queued: 'bg-gray-200 text-gray-700',
  cooking: 'bg-orange-200 text-amber-800',
  ready: 'bg-green-200 text-green-800',
  dispatched: 'bg-blue-200 text-blue-800',
};

const TYPE_META = {
  'dine-in': { icon: '🍽️', label: 'Dine-in', color: '#f59f00' },
  takeaway: { icon: '🥡', label: 'Takeaway', color: '#2b8a3e' },
  delivery: { icon: '🛵', label: 'Delivery', color: '#e8590c' },
  foodpanda: { icon: '🐼', label: 'Food Panda', color: '#d6336c' },
};

export default function Dashboard() {
  const { showToast } = useToast();
  const [kpis, setKpis] = useState({ today: { orders: 0, revenue: 0 }, week: { orders: 0, revenue: 0 } });
  const [live, setLive] = useState([]);
  const [daily, setDaily] = useState([]);
  const [payments, setPayments] = useState([]);
  const [typeSummary, setTypeSummary] = useState({});
  const [peakHours, setPeakHours] = useState(Array(24).fill(0));
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startWeek = new Date(now.getTime() - 6 * 86400000).toISOString();

    const [todayQ, weekQ, liveQ, dailyQ, payQ, allOrdersQ] = await Promise.all([
      supabase.from('orders').select('total').eq('status', 'completed').gte('created_at', startToday),
      supabase.from('orders').select('total').eq('status', 'completed').gte('created_at', startWeek),
      supabase.from('orders').select('*, order_items(*)').in('status', ['queued', 'cooking', 'ready', 'dispatched']).order('created_at', { ascending: false }),
      supabase.from('v_daily_sales').select('*').limit(7),
      supabase.from('v_payment_breakdown').select('*'),
      supabase.from('orders').select('order_type, status, total, created_at').limit(5000),
    ]);

    const sum = (rows) => (rows || []).reduce((s, r) => s + Number(r.total), 0);
    setKpis({
      today: { orders: (todayQ.data || []).length, revenue: sum(todayQ.data) },
      week: { orders: (weekQ.data || []).length, revenue: sum(weekQ.data) },
    });
    setLive(liveQ.data || []);
    setDaily(dailyQ.data || []);
    setPayments(payQ.data || []);

    // Sale-mode summary: total orders + completed revenue, per order type
    const summary = {};
    Object.keys(TYPE_META).forEach((t) => { summary[t] = { orders: 0, revenue: 0 }; });
    const hourly = Array(24).fill(0);
    (allOrdersQ.data || []).forEach((o) => {
      if (summary[o.order_type]) {
        summary[o.order_type].orders += 1;
        if (o.status === 'completed') summary[o.order_type].revenue += Number(o.total);
      }
      const hr = new Date(o.created_at).getHours();
      hourly[hr] += 1;
    });
    setTypeSummary(summary);
    setPeakHours(hourly);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel('orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadAll)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function advanceStatus(order) {
    const next = nextStatusFor(order);
    if (!next) return;
    const patch = { status: next };
    if (next === 'completed') patch.completed_at = new Date().toISOString();
    const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
    if (error) showToast(error.message, 'error');
    else showToast(`${order.order_number} → ${STATUS_LABEL[next]}`);
  }

  if (loading) return <div className="pwrap p-10 text-center text-gray-400">Loading dashboard…</div>;

  const maxDaily = Math.max(1, ...daily.map((d) => Number(d.revenue)));
  const totalPay = payments.reduce((s, p) => s + Number(p.revenue), 0) || 1;
  const totalTypeOrders = Object.values(typeSummary).reduce((s, t) => s + t.orders, 0) || 1;
  const maxHourly = Math.max(1, ...peakHours);
  const peakHourIdx = peakHours.indexOf(Math.max(...peakHours));

  return (
    <div className="pwrap max-w-[1200px] mx-auto p-5">
      <h2 className="text-[22px] font-black text-maroon mb-4 flex items-center gap-2">📊 Dashboard</h2>

      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
        {[
          { icon: '📅', label: 'Today', v: kpis.today, color: 'text-orange' },
          { icon: '📆', label: 'This Week', v: kpis.week },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-[13px] p-4 border-2 border-gray-100">
            <div className="text-[28px] mb-1.5">{k.icon}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{k.label}</div>
            <div className={`text-2xl font-black mt-0.5 ${k.color || ''}`}>{fmtPKR(k.v.revenue)}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{k.v.orders} orders</div>
          </div>
        ))}
      </div>

      {/* SALE MODE SUMMARY */}
      <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100 mb-3.5">
        <h3 className="text-sm font-extrabold mb-3">🧾 Orders by Sale Mode</h3>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
          {Object.entries(TYPE_META).map(([key, meta]) => {
            const t = typeSummary[key] || { orders: 0, revenue: 0 };
            const pct = Math.round((t.orders / totalTypeOrders) * 100);
            return (
              <div key={key} className="border-2 border-gray-100 rounded-[11px] p-3 text-center">
                <div className="text-2xl mb-1">{meta.icon}</div>
                <div className="text-[11px] font-bold text-gray-500">{meta.label}</div>
                <div className="text-xl font-black mt-1">{t.orders}</div>
                <div className="text-[10px] text-gray-400">orders · {pct}%</div>
                <div className="text-[12px] font-extrabold mt-1" style={{ color: meta.color }}>{fmtPKR(t.revenue)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100 mb-3.5">
        <h3 className="text-sm font-extrabold mb-3 flex items-center gap-1.5">🔴 Live Orders ({live.length})</h3>
        {!live.length && <p className="text-gray-400 text-sm py-3 text-center">Abhi koi active order nahi hai</p>}
        {live.map((o) => (
          <div key={o.id} className={`flex items-center justify-between p-2.5 rounded-lg mb-2 ${STATUS_CLS[o.status]}`}>
            <div>
              <div className="text-sm font-extrabold">{o.order_number} <span className="text-xs font-normal text-gray-400">{TYPE_META[o.order_type]?.icon} {TYPE_META[o.order_type]?.label}</span></div>
              <div className="text-xs text-gray-500 mt-0.5">
                {(o.order_items || []).map((it) => `${it.quantity}× ${it.item_name}`).join(', ')}
              </div>
            </div>
            <div className="text-right flex items-center gap-2">
              <div>
                <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full ${STATUS_BADGE[o.status]}`}>
                  {STATUS_LABEL[o.status]}
                </span>
                <div className="text-[11px] text-gray-400 mt-1">{timeAgo(o.created_at)}</div>
              </div>
              <button
                onClick={() => advanceStatus(o)}
                className="text-xs font-bold px-2.5 py-1.5 bg-maroon text-white rounded-lg"
              >
                {nextStatusFor(o) === 'completed' ? '✅ Complete' : `${STATUS_LABEL[nextStatusFor(o)]} →`}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PEAK HOURS */}
      <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100 mb-3.5">
        <h3 className="text-sm font-extrabold mb-1">⏰ Peak Hours</h3>
        <p className="text-[11px] text-gray-400 mb-3">Orders taken per hour · busiest: {peakHourIdx}:00–{peakHourIdx + 1}:00</p>
        <div className="flex flex-col gap-1.5">
          {peakHours.map((count, hr) => {
            if (count === 0 && (hr < 6 || hr > 23)) return null;
            return (
              <BarRow
                key={hr}
                label={`${String(hr).padStart(2, '0')}:00`}
                value={count}
                valueLabel={`${count} orders`}
                max={maxHourly}
                color={hr === peakHourIdx ? '#e8590c' : '#f59f00'}
              />
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100 mb-3.5">
        <h3 className="text-sm font-extrabold mb-3">📅 Last 7 Days</h3>
        <div className="flex flex-col gap-2">
          {daily.map((d) => (
            <BarRow
              key={d.day}
              label={new Date(d.day).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric' })}
              value={d.orders}
              valueLabel={`${fmtPKR(d.revenue)} · ${d.orders} orders`}
              max={maxDaily}
              color="#e8590c"
            />
          ))}
          {!daily.length && <p className="text-gray-400 text-sm text-center py-3">Abhi tak koi completed order nahi</p>}
        </div>
      </div>

      <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100">
        <h3 className="text-sm font-extrabold mb-3">💳 Payment Methods</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-extrabold text-gray-400 uppercase border-b-2 border-gray-100">
              <th className="text-left py-1.5">Method</th><th className="text-left py-1.5">%</th><th className="text-left py-1.5">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.payment_method} className="border-b border-gray-50 last:border-0">
                <td className="py-2">{{ cash: '💵 Cash', jazzcash: '📱 JazzCash', easypaisa: '📲 EasyPaisa', card: '💳 Card' }[p.payment_method]}</td>
                <td className="py-2">{Math.round((p.revenue / totalPay) * 100)}%</td>
                <td className="py-2 font-extrabold">{fmtPKR(p.revenue)}</td>
              </tr>
            ))}
            {!payments.length && <tr><td colSpan={3} className="text-center text-gray-400 py-3">Koi data nahi</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
