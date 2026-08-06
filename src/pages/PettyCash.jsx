import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/ToastContext';
import { fmtPKR } from '../lib/format';
import ExpenseModal from '../components/ExpenseModal';

const CATEGORY_META = {
  purchasing: { icon: '🛒', label: 'Purchasing' },
  rent: { icon: '🏠', label: 'Rent' },
  utilities: { icon: '💡', label: 'Utilities' },
  salaries: { icon: '👷', label: 'Salaries' },
  maintenance: { icon: '🔧', label: 'Maintenance' },
  marketing: { icon: '📣', label: 'Marketing' },
  other: { icon: '📦', label: 'Other' },
};

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Last 7 Days' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom Range' },
];

function presetRange(preset, from, to) {
  const now = new Date();
  if (preset === 'today') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
    return [d, d];
  }
  if (preset === 'week') {
    return [new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10), now.toISOString().slice(0, 10)];
  }
  if (preset === 'month') {
    return [new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), now.toISOString().slice(0, 10)];
  }
  if (preset === 'custom') {
    return [from || null, to || null];
  }
  return [null, null];
}

export default function PettyCash() {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [salesTotal, setSalesTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const [preset, setPreset] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  async function load() {
    setLoading(true);
    const [from, to] = presetRange(preset, customFrom, customTo);

    let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false });
    if (from) query = query.gte('expense_date', from);
    if (to) query = query.lte('expense_date', to);
    if (categoryFilter) query = query.eq('category', categoryFilter);
    const { data } = await query.limit(500);
    setExpenses(data || []);

    // Matching sales total for the same range, for the Sale vs Expense comparison
    let salesQuery = supabase.from('orders').select('total').eq('status', 'completed');
    if (from) salesQuery = salesQuery.gte('created_at', `${from}T00:00:00`);
    if (to) salesQuery = salesQuery.lte('created_at', `${to}T23:59:59`);
    const { data: salesRows } = await salesQuery;
    setSalesTotal((salesRows || []).reduce((s, r) => s + Number(r.total), 0));

    setLoading(false);
  }

  useEffect(() => { load(); }, [preset, categoryFilter]);

  function applyCustom(e) {
    e.preventDefault();
    load();
  }

  async function deleteExpense(exp) {
    if (!window.confirm('Ye expense entry delete karna chahte hain?')) return;
    const { error } = await supabase.from('expenses').delete().eq('id', exp.id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Expense delete ho gaya');
    load();
  }

  const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const net = salesTotal - expenseTotal;

  // Category breakdown for the filtered range
  const catBreakdown = {};
  expenses.forEach((e) => {
    if (!catBreakdown[e.category]) catBreakdown[e.category] = 0;
    catBreakdown[e.category] += Number(e.amount);
  });

  return (
    <div className="max-w-[1000px] mx-auto p-5">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[22px] font-black text-maroon flex items-center gap-2">💸 Petty Cash</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="ml-auto px-4 py-2 bg-orange text-white rounded-lg text-[13px] font-bold"
        >
          + New Expense
        </button>
      </div>

      {/* FILTERS */}
      <form onSubmit={applyCustom} className="bg-white rounded-[13px] p-4 border-2 border-gray-100 mb-4 space-y-3">
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
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border-2 border-gray-200 rounded-lg text-[12px] font-bold ml-auto"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_META).map(([k, m]) => (
              <option key={k} value={k}>{m.icon} {m.label}</option>
            ))}
          </select>
        </div>

        {preset === 'custom' && (
          <div className="flex gap-2 items-end flex-wrap">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">From</label>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="block mt-1 px-2.5 py-1.5 border-2 border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">To</label>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="block mt-1 px-2.5 py-1.5 border-2 border-gray-200 rounded-lg text-sm" />
            </div>
            <button type="submit" className="px-4 py-2 bg-orange text-white rounded-lg text-sm font-bold">Apply</button>
          </div>
        )}
      </form>

      {loading ? (
        <div className="text-center text-gray-400 py-10">Loading…</div>
      ) : (
        <>
          {/* SALE vs EXPENSE SUMMARY */}
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
            <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100">
              <div className="text-[10px] font-bold text-gray-400 uppercase">Sale</div>
              <div className="text-2xl font-black text-greenok mt-0.5">{fmtPKR(salesTotal)}</div>
            </div>
            <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100">
              <div className="text-[10px] font-bold text-gray-400 uppercase">Expense</div>
              <div className="text-2xl font-black text-red-500 mt-0.5">{fmtPKR(expenseTotal)}</div>
            </div>
            <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100">
              <div className="text-[10px] font-bold text-gray-400 uppercase">Net</div>
              <div className={`text-2xl font-black mt-0.5 ${net >= 0 ? 'text-greenok' : 'text-red-500'}`}>{fmtPKR(net)}</div>
            </div>
          </div>

          {/* CATEGORY BREAKDOWN */}
          {Object.keys(catBreakdown).length > 0 && (
            <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100 mb-4">
              <h3 className="text-sm font-extrabold mb-3">📊 By Category</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(catBreakdown).map(([cat, amt]) => (
                  <span key={cat} className="text-xs font-bold bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5">
                    {CATEGORY_META[cat]?.icon} {CATEGORY_META[cat]?.label}: {fmtPKR(amt)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* EXPENSE LIST */}
          <div className="bg-white rounded-[13px] border-2 border-gray-100 overflow-hidden">
            {!expenses.length ? (
              <div className="text-center text-gray-400 py-10">Is range mein koi expense record nahi</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-extrabold text-gray-400 uppercase border-b-2 border-gray-100 bg-gray-50">
                    <th className="text-left py-2.5 px-3">Date</th>
                    <th className="text-left py-2.5 px-3">Category</th>
                    <th className="text-left py-2.5 px-3">Description</th>
                    <th className="text-left py-2.5 px-3">Amount</th>
                    <th className="text-left py-2.5 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 px-3 text-gray-500">{new Date(e.expense_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="py-2.5 px-3 font-bold">{CATEGORY_META[e.category]?.icon} {CATEGORY_META[e.category]?.label}</td>
                      <td className="py-2.5 px-3 text-gray-500">{e.description || '—'}</td>
                      <td className="py-2.5 px-3 font-extrabold text-red-500">{fmtPKR(e.amount)}</td>
                      <td className="py-2.5 px-3">
                        <button onClick={() => deleteExpense(e)} className="text-[11px] font-bold px-2.5 py-1 bg-red-50 text-red-600 rounded-md">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {showAdd && (
        <ExpenseModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(); }}
        />
      )}
    </div>
  );
}
