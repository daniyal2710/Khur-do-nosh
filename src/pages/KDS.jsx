import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/ToastContext';

const TYPE_META = {
  'dine-in': { icon: '🍽️', label: 'Dine-in' },
  takeaway: { icon: '🥡', label: 'Takeaway' },
  delivery: { icon: '🛵', label: 'Delivery' },
  foodpanda: { icon: '🐼', label: 'Food Panda' },
};

const COLUMNS = [
  { status: 'queued', title: 'New Orders', icon: '🆕', headerCls: 'bg-gray-600' },
  { status: 'cooking', title: 'Cooking', icon: '🔥', headerCls: 'bg-orange' },
  { status: 'dispatched', title: 'Dispatched', icon: '🛵', headerCls: 'bg-blue-600' },
];

function nextStatusFor(order) {
  const isDelivery = order.order_type === 'delivery' || order.order_type === 'foodpanda';
  const flow = isDelivery
    ? { queued: 'cooking', cooking: 'dispatched', dispatched: 'completed' }
    : { queued: 'cooking', cooking: 'completed' };
  return flow[order.status];
}

function nextActionLabel(order) {
  const next = nextStatusFor(order);
  if (next === 'cooking') return '🔥 Start Cooking';
  if (next === 'dispatched') return '🛵 Mark Dispatched';
  if (next === 'completed') {
    const isDelivery = order.order_type === 'delivery' || order.order_type === 'foodpanda';
    return isDelivery ? '✅ Mark Delivered' : '✅ Mark Served';
  }
  return null;
}

function elapsedMinutes(createdAt) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function urgencyCls(mins) {
  if (mins >= 15) return { badge: 'bg-red-100 text-red-700', border: 'border-red-300' };
  if (mins >= 5) return { badge: 'bg-amber-100 text-amber-700', border: 'border-amber-300' };
  return { badge: 'bg-green-100 text-green-700', border: 'border-gray-100' };
}

export default function KDS() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  async function load() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), customers(name, phone)')
      .in('status', ['queued', 'cooking', 'dispatched'])
      .order('created_at', { ascending: true });
    setOrders(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel('kds-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe();
    const tickId = setInterval(() => setTick((t) => t + 1), 30000); // refresh elapsed-time colors
    return () => {
      supabase.removeChannel(channel);
      clearInterval(tickId);
    };
  }, []);

  async function advance(order) {
    const next = nextStatusFor(order);
    if (!next) return;
    const patch = { status: next };
    if (next === 'completed') patch.completed_at = new Date().toISOString();
    const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
    if (error) showToast(error.message, 'error');
  }

  if (loading) {
    return <div className="p-10 text-center text-gray-400">Loading kitchen board…</div>;
  }

  return (
    <div className="h-[calc(100vh-62px)] overflow-hidden bg-[#f0f0f0] flex flex-col">
      <div className="bg-white border-b-2 border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-black text-maroon flex items-center gap-2">🔥 Kitchen Display</h2>
        <span className="text-xs font-bold text-gray-400">{orders.length} active orders</span>
      </div>

      <div className="flex-1 flex gap-3 p-3 overflow-x-auto">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.status);
          return (
            <div key={col.status} className="flex-1 min-w-[300px] flex flex-col bg-gray-100 rounded-2xl overflow-hidden">
              <div className={`${col.headerCls} text-white px-4 py-2.5 flex items-center justify-between flex-shrink-0`}>
                <span className="font-black text-sm flex items-center gap-1.5">
                  {col.icon} {col.title}
                </span>
                <span className="bg-white/25 rounded-full px-2 py-0.5 text-xs font-black">{colOrders.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                {colOrders.map((o) => {
                  const mins = elapsedMinutes(o.created_at);
                  const urgency = urgencyCls(mins);
                  const type = TYPE_META[o.order_type] || TYPE_META['dine-in'];
                  return (
                    <div key={o.id} className={`bg-white rounded-xl p-3.5 border-2 shadow-sm ${urgency.border}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-base">{o.order_number}</span>
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${urgency.badge}`}>
                          {mins}m ago
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                        {o.customers?.name && <span className="text-gray-300">· {o.customers.name}</span>}
                      </div>

                      <div className="space-y-1 mb-2.5">
                        {(o.order_items || []).map((it) => (
                          <div key={it.id} className="flex items-start gap-2">
                            <span className="w-6 h-6 bg-orange-100 text-orange rounded-md font-black text-xs flex items-center justify-center flex-shrink-0">
                              {it.quantity}
                            </span>
                            <div>
                              <div className="text-sm font-bold leading-tight">{it.item_name}</div>
                              {it.description && <div className="text-[10px] text-gray-400 leading-tight">↳ {it.description}</div>}
                            </div>
                          </div>
                        ))}
                      </div>

                      {o.notes && (
                        <div className="bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-lg px-2.5 py-1.5 mb-2.5">
                          <div className="text-[10px] font-black text-amber-700 uppercase">📝 Note</div>
                          <div className="text-xs font-bold text-amber-800">{o.notes}</div>
                        </div>
                      )}

                      <button
                        onClick={() => advance(o)}
                        className="w-full py-2.5 rounded-lg bg-maroon text-white font-black text-xs"
                      >
                        {nextActionLabel(o)}
                      </button>
                    </div>
                  );
                })}
                {!colOrders.length && (
                  <div className="text-center text-gray-300 text-xs font-semibold py-8">Koi order nahi</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
