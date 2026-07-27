import { useEffect, useMemo, useState, Fragment } from 'react';
import { supabase } from '../lib/supabase';
import { fmtPKR } from '../lib/format';
import SlipModal from '../components/SlipModal';

const STATUS_BADGE = {
  queued: 'bg-gray-200 text-gray-700',
  cooking: 'bg-orange-200 text-amber-800',
  ready: 'bg-green-200 text-green-800',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
};
const TYPE_ICON = { 'dine-in': '🍽️', takeaway: '🥡', delivery: '🛵' };

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Last 7 Days' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom Range' },
];

function presetRange(preset, from, to) {
  const now = new Date();
  if (preset === 'today') {
    return [new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(), null];
  }
  if (preset === 'week') {
    return [new Date(now.getTime() - 6 * 86400000).toISOString(), null];
  }
  if (preset === 'month') {
    return [new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), null];
  }
  if (preset === 'custom') {
    return [
      from ? new Date(from).toISOString() : null,
      to ? new Date(new Date(to).getTime() + 86400000 - 1).toISOString() : null,
    ];
  }
  return [null, null];
}

export default function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [slipOrder, setSlipOrder] = useState(null);

  const [orderNumberQ, setOrderNumberQ] = useState('');
  const [customerQ, setCustomerQ] = useState('');
  const [preset, setPreset] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  async function load() {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*, customers(name, phone), order_items(*)')
      .order('created_at', { ascending: false });

    if (orderNumberQ.trim()) {
      query = query.ilike('order_number', `%${orderNumberQ.trim()}%`);
    }
    const [from, to] = presetRange(preset, customFrom, customTo);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error } = await query.limit(300);
    if (!error) {
      let rows = data || [];
      if (customerQ.trim()) {
        const q = customerQ.trim().toLowerCase();
        rows = rows.filter(
          (o) => o.customers?.name?.toLowerCase().includes(q) || o.customers?.phone?.includes(q)
        );
      }
      setOrders(rows);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  const totals = useMemo(() => {
    const revenue = orders.filter((o) => o.status === 'completed').reduce((s, o) => s + Number(o.total), 0);
    return { count: orders.length, revenue };
  }, [orders]);

  function applyFilters(e) {
    e?.preventDefault();
    load();
  }

  function resetFilters() {
    setOrderNumberQ('');
    setCustomerQ('');
    setPreset('today');
    setCustomFrom('');
    setCustomTo('');
    setTimeout(load, 0);
  }

  return (
    <div className="max-w-[1200px] mx-auto p-5">
      <h2 className="text-[22px] font-black text-maroon mb-4 flex items-center gap-2">
        🧾 Orders <span className="text-sm font-medium text-gray-400">({totals.count} shown · {fmtPKR(totals.revenue)} completed)</span>
      </h2>

      {/* FILTERS */}
      <form onSubmit={applyFilters} className="bg-white rounded-[13px] p-4 border-2 border-gray-100 mb-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold border-2 transition-all ${
                preset === p.id ? 'bg-orange text-white border-orange' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex gap-2 items-center flex-wrap">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="block mt-1 px-2.5 py-1.5 border-2 border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">To</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="block mt-1 px-2.5 py-1.5 border-2 border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Order Number</label>
            <input
              value={orderNumberQ}
              onChange={(e) => setOrderNumberQ(e.target.value)}
              placeholder="#3007"
              className="w-full mt-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-orange"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Customer Name / Phone</label>
            <input
              value={customerQ}
              onChange={(e) => setCustomerQ(e.target.value)}
              placeholder="Ahmed Khan"
              className="w-full mt-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-orange"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-orange text-white rounded-lg text-sm font-bold">
            Apply
          </button>
          <button type="button" onClick={resetFilters} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold">
            Reset
          </button>
        </div>
      </form>

      {/* ORDERS TABLE */}
      <div className="bg-white rounded-[13px] border-2 border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center text-gray-400 py-10">Loading…</div>
        ) : !orders.length ? (
          <div className="text-center text-gray-400 py-10">Koi order nahi mila in filters ke sath</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-extrabold text-gray-400 uppercase border-b-2 border-gray-100 bg-gray-50">
                <th className="text-left py-2.5 px-3">Order #</th>
                <th className="text-left py-2.5 px-3">Customer</th>
                <th className="text-left py-2.5 px-3">Type</th>
                <th className="text-left py-2.5 px-3">Status</th>
                <th className="text-left py-2.5 px-3">Total</th>
                <th className="text-left py-2.5 px-3">Date</th>
                <th className="text-left py-2.5 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <Fragment key={o.id}>
                  <tr
                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                    className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-orange-50/40"
                  >
                    <td className="py-2.5 px-3 font-extrabold">{o.order_number}</td>
                    <td className="py-2.5 px-3">{o.customers?.name || <span className="text-gray-300">Walk-in</span>}</td>
                    <td className="py-2.5 px-3">{TYPE_ICON[o.order_type]} {o.order_type}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${STATUS_BADGE[o.status]}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-extrabold">{fmtPKR(o.total)}</td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs">
                      {new Date(o.created_at).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSlipOrder(o); }}
                        className="text-[11px] font-bold px-2.5 py-1 bg-gray-100 rounded-md"
                      >
                        🖨️ Slip
                      </button>
                    </td>
                  </tr>
                  {expanded === o.id && (
                    <tr className="bg-orange-50/30">
                      <td colSpan={7} className="px-6 py-3">
                        <div className="flex flex-wrap gap-2">
                          {(o.order_items || []).map((it) => (
                            <span key={it.id} className="text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1">
                              {it.icon} {it.quantity}× {it.item_name}
                            </span>
                          ))}
                        </div>
                        {o.customers?.phone && (
                          <div className="text-xs text-gray-500 mt-2">📱 {o.customers.phone}</div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {slipOrder && (
        <SlipModal
          order={slipOrder}
          items={slipOrder.order_items || []}
          customer={slipOrder.customers}
          onClose={() => setSlipOrder(null)}
        />
      )}
    </div>
  );
}
