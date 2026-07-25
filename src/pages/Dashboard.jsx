import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/ToastContext';
import { fmtPKR, timeAgo } from '../lib/format';
import BarRow from '../components/BarRow';

const STATUS_FLOW = { queued: 'cooking', cooking: 'ready', ready: 'completed' };
const STATUS_LABEL = { queued: 'Queued', cooking: 'Cooking', ready: 'Ready', completed: 'Completed' };
const STATUS_CLS = {
  queued: 'bg-gray-100',
  cooking: 'bg-orange-50',
  ready: 'bg-green-50',
};
const STATUS_BADGE = {
  queued: 'bg-gray-200 text-gray-700',
  cooking: 'bg-orange-200 text-amber-800',
  ready: 'bg-green-200 text-green-800',
};

export default function Dashboard() {
  const { showToast } = useToast();
  const [kpis, setKpis] = useState({ today: { orders: 0, revenue: 0 }, week: { orders: 0, revenue: 0 }, month: { orders: 0, revenue: 0 } });
  const [live, setLive] = useState([]);
  const [daily, setDaily] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startWeek = new Date(now.getTime() - 6 * 86400000).toISOString();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [todayQ, weekQ, monthQ, liveQ, dailyQ, payQ] = await Promise.all([
      supabase.from('orders').select('total').eq('status', 'completed').gte('created_at', startToday),
      supabase.from('orders').select('total').eq('status', 'completed').gte('created_at', startWeek),
      supabase.from('orders').select('total').eq('status', 'completed').gte('created_at', startMonth),
      supabase.from('orders').select('*, order_items(*)').in('status', ['queued', 'cooking', 'ready']).order('created_at', { ascending: false }),
      supabase.from('v_daily_sales').select('*').limit(7),
      supabase.from('v_payment_breakdown').select('*'),
    ]);

    const sum = (rows) => (rows || []).reduce((s, r) => s + Number(r.total), 0);
    setKpis({
      today: { orders: (todayQ.data || []).length, revenue: sum(todayQ.data) },
      week: { orders: (weekQ.data || []).length, revenue: sum(weekQ.data) },
      month: { orders: (monthQ.data || []).length, revenue: sum(monthQ.data) },
    });
    setLive(liveQ.data || []);
    setDaily(dailyQ.data || []);
    setPayments(payQ.data || []);
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
    const next = STATUS_FLOW[order.status];
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

  return (
    <div className="pwrap max-w-[1200px] mx-auto p-5">
      <h2 className="text-[22px] font-black text-maroon mb-4 flex items-center gap-2">📊 Dashboard</h2>

      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
        {[
          { icon: '📅', label: 'Today', v: kpis.today, color: 'text-orange' },
          { icon: '📆', label: 'This Week', v: kpis.week },
          { icon: '🗓️', label: 'This Month', v: kpis.month },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-[13px] p-4 border-2 border-gray-100">
            <div className="text-[28px] mb-1.5">{k.icon}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{k.label}</div>
            <div className={`text-2xl font-black mt-0.5 ${k.color || ''}`}>{fmtPKR(k.v.revenue)}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{k.v.orders} orders</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100 mb-3.5">
        <h3 className="text-sm font-extrabold mb-3 flex items-center gap-1.5">🔴 Live Orders ({live.length})</h3>
        {!live.length && <p className="text-gray-400 text-sm py-3 text-center">Abhi koi active order nahi hai</p>}
        {live.map((o) => (
          <div key={o.id} className={`flex items-center justify-between p-2.5 rounded-lg mb-2 ${STATUS_CLS[o.status]}`}>
            <div>
              <div className="text-sm font-extrabold">{o.order_number}</div>
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
                {o.status === 'ready' ? 'Complete' : 'Advance →'}
              </button>
            </div>
          </div>
        ))}
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
