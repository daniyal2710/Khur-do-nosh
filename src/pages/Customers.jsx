import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fmtPKR, tierOf, tierLabel, tierClass, timeAgo } from '../lib/format';
import AddCustomerModal from '../components/AddCustomerModal';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from('customers').select('*').order('total_spent', { ascending: false });
    setCustomers(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = customers.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  function waLink(c) {
    const phone = c.phone.replace(/[^0-9]/g, '').replace(/^0/, '92');
    return `https://wa.me/${phone}`;
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading…</div>;

  return (
    <div className="max-w-[1200px] mx-auto p-5">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[22px] font-black text-maroon flex items-center gap-2">
          👥 Customers <span className="text-sm font-medium text-gray-400">({customers.length} total)</span>
        </h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or phone…"
          className="ml-auto px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-orange w-56"
        />
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-orange text-white rounded-lg text-[13px] font-bold"
        >
          + Add New
        </button>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' }}>
        {filtered.map((c) => {
          const tier = tierOf(c.total_orders);
          return (
            <div key={c.id} className="bg-white rounded-[13px] p-3.5 border-2 border-gray-100">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-[42px] h-[42px] rounded-full bg-gold text-white text-[17px] font-black flex items-center justify-center flex-shrink-0">
                  {c.name[0]}
                </div>
                <div>
                  <div className="text-sm font-extrabold">{c.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">📱 {c.phone}</div>
                </div>
              </div>
              <div className="text-[11px] text-gray-600 mb-2.5">📍 {c.address || '—'}</div>
              <div className="flex border-2 border-gray-100 rounded-lg overflow-hidden mb-2.5">
                <div className="flex-1 text-center py-1.5 border-r-2 border-gray-100">
                  <div className="text-sm font-black">{c.total_orders}</div>
                  <div className="text-[10px] text-gray-400 font-bold">Orders</div>
                </div>
                <div className="flex-1 text-center py-1.5 border-r-2 border-gray-100">
                  <div className="text-xs font-black">{fmtPKR(c.total_spent)}</div>
                  <div className="text-[10px] text-gray-400 font-bold">Spent</div>
                </div>
                <div className="flex-1 text-center py-1.5">
                  <div className="text-[11px] font-black">{timeAgo(c.last_visit_at)}</div>
                  <div className="text-[10px] text-gray-400 font-bold">Last Visit</div>
                </div>
              </div>
              <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full inline-block mb-2 ${tierClass[tier]}`}>
                {tierLabel[tier]}
              </span>
              <a
                href={waLink(c)}
                target="_blank"
                rel="noreferrer"
                className="block w-full text-center py-2 bg-[#25D366] text-white rounded-lg font-bold text-xs"
              >
                📲 WhatsApp
              </a>
            </div>
          );
        })}
        {!filtered.length && (
          <div className="col-span-full text-center text-gray-400 py-10">Koi customer nahi mila</div>
        )}
      </div>

      {showAdd && (
        <AddCustomerModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
    </div>
  );
}
