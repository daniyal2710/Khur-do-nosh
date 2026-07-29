import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/ToastContext';
import { fmtPKR, tierOf, tierLabel, tierClass } from '../lib/format';
import AddCustomerModal from '../components/AddCustomerModal';
import SlipModal from '../components/SlipModal';

const ORDER_TYPES = [
  { id: 'dine-in', icon: '🍽️', label: 'Dine-in' },
  { id: 'takeaway', icon: '🥡', label: 'Takeaway' },
  { id: 'delivery', icon: '🛵', label: 'Delivery' },
  { id: 'foodpanda', icon: '🐼', label: 'Food Panda' },
];
const STEPS = ['type', 'menu', 'review'];
const STEP_LABEL = { type: 'Order Type', menu: 'Menu', review: 'Review & Pay' };

export default function POS() {
  const { showToast } = useToast();

  const [categories, setCategories] = useState([]);
  const [menu, setMenu] = useState([]);
  const [areas, setAreas] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState('type');
  const [cart, setCart] = useState([]); // {menu_item_id, name, icon, price, qty, description}
  const [orderType, setOrderType] = useState(null);
  const [areaId, setAreaId] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  const [custQuery, setCustQuery] = useState('');
  const [custResults, setCustResults] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [showAddCust, setShowAddCust] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [justAdded, setJustAdded] = useState(null); // brief add-to-cart flash

  useEffect(() => {
    (async () => {
      const [{ data: cats }, { data: items }, { data: ar }] = await Promise.all([
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('menu_items').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('areas').select('*').order('name'),
      ]);
      setCategories(cats || []);
      setMenu(items || []);
      setAreas(ar || []);
      if (cats && cats.length) setActiveCat(cats[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const q = custQuery.trim();
    if (!q) { setCustResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(6);
      setCustResults(data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [custQuery]);

  const visibleMenu = useMemo(
    () => menu.filter((m) => m.category_id === activeCat),
    [menu, activeCat]
  );

  function addToCart(item) {
    setCart((c) => {
      const existing = c.find((x) => x.menu_item_id === item.id);
      if (existing) {
        return c.map((x) => (x.menu_item_id === item.id ? { ...x, qty: x.qty + 1 } : x));
      }
      return [...c, { menu_item_id: item.id, name: item.name, icon: item.icon, price: item.price, description: item.description, qty: 1 }];
    });
    setJustAdded(item.id);
    setTimeout(() => setJustAdded(null), 350);
  }

  function changeQty(id, delta) {
    setCart((c) =>
      c
        .map((x) => (x.menu_item_id === id ? { ...x, qty: x.qty + delta } : x))
        .filter((x) => x.qty > 0)
    );
  }

  const subtotal = cart.reduce((s, x) => s + x.price * x.qty, 0);
  const total = subtotal;
  const cartCount = cart.reduce((s, x) => s + x.qty, 0);

  function selectOrderType(t) {
    setOrderType(t);
    if ((t === 'delivery' || t === 'foodpanda') && customer?.address && !deliveryAddress) {
      setDeliveryAddress(customer.address);
    }
  }

  function selectCustomer(c) {
    setCustomer(c);
    setCustQuery('');
    setCustResults([]);
    if ((orderType === 'delivery' || orderType === 'foodpanda') && c.address) setDeliveryAddress(c.address);
  }

  function clearCustomer() {
    setCustomer(null);
  }

  function resetOrder() {
    setCart([]);
    setCustomer(null);
    setCustQuery('');
    setOrderType(null);
    setAreaId(null);
    setDeliveryAddress('');
    setNotes('');
    setPaymentMethod('cash');
    setStep('type');
  }

  function handleNewOrder() {
    setCompletedOrder(null);
    resetOrder();
  }

  function handleClearOrder() {
    if (cart.length && !window.confirm('Poora order clear karna chahte hain?')) return;
    setCart([]);
    setNotes('');
  }

  function canContinueFromType() {
    if (!orderType) return false;
    if ((orderType === 'delivery' || orderType === 'foodpanda') && !areaId) return false;
    if ((orderType === 'delivery' || orderType === 'foodpanda') && !deliveryAddress.trim()) return false;
    return true;
  }

  async function placeOrder() {
    if (!cart.length) return;
    if ((orderType === 'delivery' || orderType === 'foodpanda') && !customer) {
      showToast('Delivery/Food Panda ke liye customer number zaroori hai', 'error');
      setStep('review');
      return;
    }
    setPlacing(true);
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_id: customer?.id || null,
        order_type: orderType,
        area_id: (orderType === 'delivery' || orderType === 'foodpanda') ? areaId : null,
        delivery_address: (orderType === 'delivery' || orderType === 'foodpanda') ? deliveryAddress.trim() : null,
        payment_method: paymentMethod,
        subtotal,
        total,
        status: 'queued',
        notes: notes.trim() || null,
      })
      .select()
      .single();

    if (error) {
      setPlacing(false);
      showToast(error.message, 'error');
      return;
    }

    const itemRows = cart.map((x) => ({
      order_id: order.id,
      menu_item_id: x.menu_item_id,
      item_name: x.name,
      icon: x.icon,
      description: x.description || null,
      unit_price: x.price,
      quantity: x.qty,
      subtotal: x.price * x.qty,
    }));
    const { error: itemsErr } = await supabase.from('order_items').insert(itemRows);
    setPlacing(false);

    if (itemsErr) {
      showToast(itemsErr.message, 'error');
      return;
    }

    showToast(`Order ${order.order_number} place ho gaya`);
    setCompletedOrder({ order, items: itemRows, customer });
    resetOrder();
  }

  if (loading) {
    return <div className="p-10 text-center text-gray-400">Loading menu…</div>;
  }

  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="h-[calc(100vh-62px)] overflow-hidden bg-[#f7f7f7] flex flex-col">
      {/* KIOSK TOP BAR — progress + controls */}
      <div className="bg-white border-b-2 border-gray-100 px-5 py-2.5 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  i <= stepIdx ? 'bg-orange text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-xs font-bold hidden sm:inline ${i <= stepIdx ? 'text-maroon' : 'text-gray-400'}`}>
                {STEP_LABEL[s]}
              </span>
              {i < STEPS.length - 1 && <div className={`w-6 h-0.5 ${i < stepIdx ? 'bg-orange' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={handleClearOrder} className="text-xs font-bold px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg">
            🗑️ Clear
          </button>
          <button onClick={handleNewOrder} className="text-xs font-bold px-3 py-1.5 bg-maroon text-white rounded-lg">
            🆕 New Order
          </button>
        </div>
      </div>

      {/* ───────────────── STEP 1: ORDER TYPE ───────────────── */}
      {step === 'type' && (
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
          <div className="w-full max-w-[560px]">
            <h2 className="text-2xl font-black text-maroon text-center mb-1">Welcome! 👋</h2>
            <p className="text-gray-400 text-center text-sm mb-6">Order type select karein shuru karne ke liye</p>

            <div className="grid grid-cols-2 gap-4 mb-5">
              {ORDER_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectOrderType(t.id)}
                  className={`py-7 rounded-2xl border-4 transition-all flex flex-col items-center gap-2 ${
                    orderType === t.id
                      ? 'border-orange bg-orange-50 shadow-lg scale-[1.02]'
                      : 'border-gray-100 bg-white hover:border-orange-200'
                  }`}
                >
                  <span className="text-5xl">{t.icon}</span>
                  <span className="text-base font-black text-maroon">{t.label}</span>
                </button>
              ))}
            </div>

            {(orderType === 'delivery' || orderType === 'foodpanda') && (
              <div className="bg-white rounded-2xl p-4 border-2 border-gray-100 mb-5 space-y-3">
                <div>
                  <label className="text-[11px] font-black text-gray-500 uppercase">Delivery Area</label>
                  <select
                    value={areaId || ''}
                    onChange={(e) => setAreaId(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2.5 border-2 border-orange-200 rounded-lg text-sm outline-none focus:border-orange"
                  >
                    <option value="">Select area…</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                    ))}
                  </select>
                </div>
                {(orderType === 'delivery' || orderType === 'foodpanda') && (
                  <div>
                    <label className="text-[11px] font-black text-gray-500 uppercase">Guided Address</label>
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="House #, street, landmark…"
                      rows={2}
                      className="w-full mt-1 px-3 py-2.5 border-2 border-orange-200 rounded-lg text-sm outline-none focus:border-orange resize-none"
                    />
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setStep('menu')}
              disabled={!canContinueFromType()}
              className="w-full py-4 rounded-2xl font-black text-base text-white bg-orange hover:bg-orangedark disabled:bg-gray-300 transition-all shadow-md"
            >
              Continue to Menu →
            </button>
          </div>
        </div>
      )}

      {/* ───────────────── STEP 2: MENU BROWSING ───────────────── */}
      {step === 'menu' && (
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT SIDEBAR — running order */}
          <div className="w-[300px] flex-shrink-0 bg-white border-r-2 border-gray-100 flex flex-col">
            <div className="bg-maroon p-3.5 flex-shrink-0">
              <button onClick={() => setStep('type')} className="text-[11px] font-bold text-white/70 hover:text-white mb-1">
                ← Order Type
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xl">{ORDER_TYPES.find((t) => t.id === orderType)?.icon}</span>
                <span className="text-white font-black text-sm">{ORDER_TYPES.find((t) => t.id === orderType)?.label}</span>
              </div>
              <div className="text-yellow-300 text-[11px] font-bold mt-1">
                {cartCount ? `${cartCount} items in order` : 'Order is empty'}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5">
              {!cart.length ? (
                <div className="text-center py-10 px-4 text-gray-300">
                  <div className="text-5xl">🛒</div>
                  <p className="text-[13px] mt-2 font-semibold text-gray-300">Menu se items tap karein</p>
                </div>
              ) : (
                cart.map((x) => (
                  <div key={x.menu_item_id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2.5 mb-2 border border-gray-100">
                    <span className="text-xl flex-shrink-0">{x.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{x.name}</div>
                      <div className="text-[11px] text-orange font-bold mt-0.5">{fmtPKR(x.price)}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => changeQty(x.menu_item_id, -1)}
                        className="w-[26px] h-[26px] rounded-full bg-orange-100 text-orange font-black flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="text-sm font-black min-w-[18px] text-center">{x.qty}</span>
                      <button
                        onClick={() => changeQty(x.menu_item_id, 1)}
                        className="w-[26px] h-[26px] rounded-full bg-orange text-white font-black flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3.5 border-t-2 border-gray-100 flex-shrink-0">
              <div className="flex justify-between text-[13px] text-gray-500 mb-1">
                <span>Subtotal</span><span>{fmtPKR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-lg font-black mb-2.5">
                <span>Total</span><span className="text-orange">{fmtPKR(total)}</span>
              </div>
              <button
                onClick={() => setStep('review')}
                disabled={!cart.length}
                className="w-full py-3 rounded-xl font-black text-sm text-white bg-orange hover:bg-orangedark disabled:bg-gray-300 transition-all shadow-md"
              >
                Review Order →
              </button>
            </div>
          </div>

          {/* RIGHT SIDE — categories + menu grid */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex overflow-x-auto hide-scrollbar bg-white border-b-2 border-gray-100 flex-shrink-0">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`flex flex-col items-center px-5 py-3.5 border-b-[4px] gap-1 flex-shrink-0 whitespace-nowrap text-xs font-bold transition-all ${
                    activeCat === c.id ? 'border-orange text-orange bg-orange-50' : 'border-transparent text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-2xl">{c.icon}</span>
                  {c.name}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', alignContent: 'start' }}>
              {visibleMenu.map((item) => (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`bg-white rounded-2xl p-4 cursor-pointer border-2 shadow-sm hover:shadow-lg active:scale-[.96] transition-all text-center relative select-none ${
                    justAdded === item.id ? 'border-greenok bg-green-50' : 'border-transparent hover:border-orange'
                  }`}
                >
                  <div className="text-4xl mb-2 leading-none">{item.icon}</div>
                  <div className="text-sm font-bold leading-tight">{item.name}</div>
                  {item.description && <div className="text-[10px] text-gray-400 mt-0.5">{item.description}</div>}
                  <div className="text-base font-black text-orange mt-2">{fmtPKR(item.price)}</div>
                  <div className="absolute bottom-2.5 right-2.5 w-8 h-8 bg-orange text-white rounded-full font-black text-lg flex items-center justify-center pointer-events-none shadow-md">
                    {justAdded === item.id ? '✓' : '+'}
                  </div>
                </div>
              ))}
              {!visibleMenu.length && (
                <div className="col-span-full text-center text-gray-400 py-10">Is category mein items nahi hain</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────── STEP 3: REVIEW & PAY ───────────────── */}
      {step === 'review' && (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-[560px] mx-auto">
            <button onClick={() => setStep('menu')} className="text-xs font-bold text-gray-500 mb-3">
              ← Back to Menu
            </button>

            <div className="bg-white rounded-2xl p-4 border-2 border-gray-100 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{ORDER_TYPES.find((t) => t.id === orderType)?.icon}</span>
                <span className="font-black text-maroon">{ORDER_TYPES.find((t) => t.id === orderType)?.label}</span>
              </div>
              {(orderType === 'delivery' || orderType === 'foodpanda') && deliveryAddress && (
                <p className="text-xs text-gray-500 mt-1">📍 {deliveryAddress}</p>
              )}
            </div>

            {/* CART ITEMS */}
            <div className="bg-white rounded-2xl p-4 border-2 border-gray-100 mb-4">
              <h3 className="text-sm font-extrabold mb-3">🛒 Your Order</h3>
              {cart.map((x) => (
                <div key={x.menu_item_id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2.5 mb-2 border border-gray-100">
                  <span className="text-xl flex-shrink-0">{x.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate">{x.name}</div>
                    {x.description && <div className="text-[10px] text-gray-400 truncate">{x.description}</div>}
                    <div className="text-[11px] text-orange font-bold mt-0.5">{fmtPKR(x.price)}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => changeQty(x.menu_item_id, -1)}
                      className="w-7 h-7 rounded-full bg-orange-100 text-orange font-black flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="text-sm font-black min-w-[20px] text-center">{x.qty}</span>
                    <button
                      onClick={() => changeQty(x.menu_item_id, 1)}
                      className="w-7 h-7 rounded-full bg-orange text-white font-black flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
              {!cart.length && <p className="text-center text-gray-400 text-sm py-4">Cart khali hai</p>}
            </div>

            {/* SPECIAL INSTRUCTIONS */}
            <div className="bg-white rounded-2xl p-4 border-2 border-gray-100 mb-4">
              <label className="text-[11px] font-black text-gray-500 uppercase">📝 Special Instructions</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Less spicy, no onions, extra sauce…"
                rows={2}
                className="w-full mt-1 text-sm border-2 border-gray-100 rounded-lg px-3 py-2 resize-none outline-none focus:border-orange"
              />
            </div>

            {/* CUSTOMER */}
            <div className={`bg-white rounded-2xl p-4 border-2 mb-4 ${(orderType === 'delivery' || orderType === 'foodpanda') && !customer ? 'border-red-300' : 'border-gray-100'}`}>
              <div className="text-[11px] font-black text-orange uppercase tracking-wide mb-2">
                👤 Customer {(orderType === 'delivery' || orderType === 'foodpanda') ? <span className="text-red-500">(required)</span> : <span className="text-gray-400 normal-case font-semibold">(optional)</span>}
              </div>
              {customer ? (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-2 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gold text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                    {customer.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-extrabold truncate">{customer.name}</div>
                    <div className="text-[11px] text-gray-500">{customer.phone}</div>
                  </div>
                  <button onClick={clearCustomer} className="text-gray-300 hover:text-red-500 text-lg">✕</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={custQuery}
                    onChange={(e) => setCustQuery(e.target.value)}
                    placeholder="Search name or phone…"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-orange"
                  />
                  {custResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border-2 border-orange border-t-0 rounded-b-lg max-h-[200px] overflow-y-auto z-50 shadow-lg">
                      {custResults.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => selectCustomer(c)}
                          className="flex items-center gap-2.5 p-2.5 cursor-pointer border-b border-gray-100 last:border-0 hover:bg-orange-50"
                        >
                          <div className="w-8 h-8 rounded-full bg-gold text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                            {c.name[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-bold truncate">{c.name}</div>
                            <div className="text-[11px] text-gray-500">{c.phone}</div>
                          </div>
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full flex-shrink-0 ${tierClass[tierOf(c.total_orders)]}`}>
                            {tierLabel[tierOf(c.total_orders)]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {custQuery.trim() && custResults.length === 0 && (
                    <div className="bg-orange-50 border border-dashed border-orange-300 rounded-lg p-2 mt-1.5 text-center">
                      <p className="text-xs text-amber-800 mb-1">Koi customer nahi mila</p>
                      <button
                        onClick={() => setShowAddCust(true)}
                        className="px-3 py-1 bg-orange text-white rounded-md text-xs font-bold"
                      >
                        + Add New Customer
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PAYMENT */}
            <div className="bg-white rounded-2xl p-4 border-2 border-gray-100 mb-4">
              <label className="text-[11px] font-black text-gray-500 uppercase mb-2 block">💳 Payment Method</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'cash', icon: '💵', label: 'Cash' },
                  { id: 'jazzcash', icon: '📱', label: 'JazzCash' },
                  { id: 'easypaisa', icon: '📲', label: 'EasyPaisa' },
                  { id: 'card', icon: '💳', label: 'Card' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPaymentMethod(p.id)}
                    className={`py-2.5 rounded-lg border-2 text-center transition-all ${
                      paymentMethod === p.id ? 'border-orange bg-orange-50' : 'border-gray-100 hover:border-orange-200'
                    }`}
                  >
                    <div className="text-lg">{p.icon}</div>
                    <div className="text-[10px] font-bold mt-0.5">{p.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* TOTAL + PLACE ORDER (sticky) */}
            <div className="bg-white rounded-2xl p-4 border-2 border-gray-100 sticky bottom-0">
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Subtotal</span><span>{fmtPKR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-2xl font-black mb-3">
                <span>Total</span><span className="text-orange">{fmtPKR(total)}</span>
              </div>
              <button
                onClick={placeOrder}
                disabled={!cart.length || placing || ((orderType === 'delivery' || orderType === 'foodpanda') && !customer)}
                className="w-full py-4 rounded-2xl font-black text-base text-white bg-orange hover:bg-orangedark disabled:bg-gray-300 transition-all shadow-md"
              >
                {placing
                  ? 'Placing…'
                  : (orderType === 'delivery' || orderType === 'foodpanda') && !customer
                  ? '⚠️ Customer number zaroori hai'
                  : `✅ Place Order · ${fmtPKR(total)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddCust && (
        <AddCustomerModal
          initialPhone={custQuery}
          onClose={() => setShowAddCust(false)}
          onSaved={(c) => {
            setShowAddCust(false);
            selectCustomer(c);
          }}
        />
      )}

      {completedOrder && (
        <SlipModal
          order={completedOrder.order}
          items={completedOrder.items}
          customer={completedOrder.customer}
          onClose={() => setCompletedOrder(null)}
        />
      )}
    </div>
  );
}
