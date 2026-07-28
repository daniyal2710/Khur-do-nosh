import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/ToastContext';
import { fmtPKR, tierOf, tierLabel, tierClass } from '../lib/format';
import AddCustomerModal from '../components/AddCustomerModal';
import SlipModal from '../components/SlipModal';

export default function POS() {
  const { showToast } = useToast();

  const [categories, setCategories] = useState([]);
  const [menu, setMenu] = useState([]);
  const [areas, setAreas] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState([]); // {menu_item_id, name, icon, price, qty}
  const [orderType, setOrderType] = useState('dine-in');
  const [areaId, setAreaId] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const [custQuery, setCustQuery] = useState('');
  const [custResults, setCustResults] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [showAddCust, setShowAddCust] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null); // {order, items}

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

  function changeOrderType(t) {
    setOrderType(t);
    if (t === 'delivery' && customer?.address && !deliveryAddress) {
      setDeliveryAddress(customer.address);
    }
  }

  function selectCustomer(c) {
    setCustomer(c);
    setCustQuery('');
    setCustResults([]);
    if (orderType === 'delivery' && c.address) setDeliveryAddress(c.address);
  }

  function clearCustomer() {
    setCustomer(null);
  }

  async function placeOrder() {
    if (!cart.length) return;
    if (orderType === 'delivery' && !areaId) {
      showToast('Delivery ke liye area select karein', 'error');
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      showToast('Delivery address likhein', 'error');
      return;
    }
    setPlacing(true);
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_id: customer?.id || null,
        order_type: orderType,
        area_id: orderType === 'delivery' ? areaId : null,
        delivery_address: orderType === 'delivery' ? deliveryAddress.trim() : null,
        payment_method: paymentMethod,
        subtotal,
        total,
        status: 'queued',
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
    setCart([]);
    setCustomer(null);
    setOrderType('dine-in');
    setAreaId(null);
    setDeliveryAddress('');
  }

  if (loading) {
    return <div className="p-10 text-center text-gray-400">Loading menu…</div>;
  }

  return (
    <div className="flex h-[calc(100vh-62px)] overflow-hidden">
      {/* MENU SIDE */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f7f7f7] border-r-2 border-gray-200">
        <div className="flex overflow-x-auto hide-scrollbar bg-white border-b-2 border-gray-200 flex-shrink-0">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`flex flex-col items-center px-3.5 py-2.5 border-b-[3px] gap-0.5 flex-shrink-0 whitespace-nowrap text-[11px] font-bold transition-all ${
                activeCat === c.id
                  ? 'border-orange text-orange bg-orange-50'
                  : 'border-transparent text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="text-[22px]">{c.icon}</span>
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-3 grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(138px,1fr))', alignContent: 'start' }}>
          {visibleMenu.map((item) => (
            <div
              key={item.id}
              onClick={() => addToCart(item)}
              className="bg-white rounded-[13px] p-3 cursor-pointer border-2 border-transparent shadow-sm hover:border-orange hover:shadow-md hover:-translate-y-0.5 active:scale-[.97] transition-all text-center relative select-none"
            >
              <div className="text-3xl mb-1.5 leading-none">{item.icon}</div>
              <div className="text-xs font-bold leading-tight">{item.name}</div>
              {item.description && <div className="text-[10px] text-gray-400 mt-0.5">{item.description}</div>}
              <div className="text-sm font-black text-orange mt-1.5">{fmtPKR(item.price)}</div>
              <button className="absolute bottom-2 right-2 w-[26px] h-[26px] bg-orange text-white rounded-full font-black flex items-center justify-center pointer-events-none">
                +
              </button>
            </div>
          ))}
          {!visibleMenu.length && (
            <div className="col-span-full text-center text-gray-400 py-10">Is category mein items nahi hain</div>
          )}
        </div>
      </div>

      {/* CART SIDE */}
      <div className="w-[320px] flex-shrink-0 flex flex-col bg-white">
        <div className="bg-maroon p-3.5">
          <div className="text-yellow-300 text-[11px] font-bold">NEW ORDER</div>
          <div className="text-white text-base font-black mt-0.5">
            {cart.length ? `${cart.reduce((s, x) => s + x.qty, 0)} items` : 'Cart is empty'}
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {['dine-in', 'takeaway', 'delivery', 'foodpanda'].map((t) => (
              <button
                key={t}
                onClick={() => changeOrderType(t)}
                className={`py-1.5 px-1 border-2 rounded-lg text-[11px] font-bold text-center transition-all ${
                  orderType === t ? 'bg-white text-maroon border-white' : 'border-white/30 text-white hover:bg-white/20'
                }`}
              >
                <span className="block text-base mb-0.5">
                  {t === 'dine-in' ? '🍽️' : t === 'takeaway' ? '🥡' : t === 'delivery' ? '🛵' : '🐼'}
                </span>
                {t === 'dine-in' ? 'Dine-in' : t === 'takeaway' ? 'Takeaway' : t === 'delivery' ? 'Delivery' : 'Food Panda'}
              </button>
            ))}
          </div>
          {orderType === 'delivery' && (
            <>
              <select
                value={areaId || ''}
                onChange={(e) => setAreaId(Number(e.target.value))}
                className="w-full mt-2 text-xs rounded-lg px-2 py-1.5 text-gray-800"
              >
                <option value="">Select area…</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                ))}
              </select>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Guided address — house #, street, landmark…"
                rows={2}
                className="w-full mt-2 text-xs rounded-lg px-2 py-1.5 text-gray-800 resize-none"
              />
            </>
          )}
        </div>

        {/* CUSTOMER BAR */}
        <div className="bg-orange-50 border-b-2 border-orange-100 p-2.5 flex-shrink-0">
          <div className="text-[10px] font-black text-orange uppercase tracking-wide mb-1.5">👤 Customer</div>
          {customer ? (
            <div className="bg-white border-2 border-orange-200 rounded-lg p-2 flex items-center gap-2">
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
                className="w-full px-2.5 py-2 border-2 border-orange-200 rounded-lg text-[13px] outline-none focus:border-orange"
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
                <div className="bg-orange-100 border border-dashed border-orange-300 rounded-lg p-2 mt-1.5 text-center">
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

        {/* CART ITEMS */}
        <div className="flex-1 overflow-y-auto p-2.5">
          {!cart.length ? (
            <div className="text-center py-8 px-4 text-gray-300">
              <div className="text-5xl">🛒</div>
              <p className="text-[13px] mt-2 font-semibold text-gray-300">Menu se items add karein</p>
            </div>
          ) : (
            cart.map((x) => (
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
                    className="w-[26px] h-[26px] rounded-full bg-orange-100 text-orange font-black flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="text-sm font-black min-w-[20px] text-center">{x.qty}</span>
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

        {/* FOOTER */}
        <div className="p-3.5 border-t-2 border-gray-100 flex-shrink-0">
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full mb-2 text-xs border-2 border-gray-100 rounded-lg px-2 py-1.5"
          >
            <option value="cash">💵 Cash</option>
            <option value="jazzcash">📱 JazzCash</option>
            <option value="easypaisa">📲 EasyPaisa</option>
            <option value="card">💳 Card</option>
          </select>
          <div className="flex justify-between text-[13px] text-gray-500 mb-1">
            <span>Subtotal</span><span>{fmtPKR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-[19px] font-black mt-1">
            <span>Total</span><span className="text-orange">{fmtPKR(total)}</span>
          </div>
          <button
            onClick={placeOrder}
            disabled={!cart.length || placing}
            className="w-full mt-2.5 py-3.5 rounded-[11px] font-black text-[15px] text-white bg-orange hover:bg-orangedark disabled:bg-gray-300 transition-all"
          >
            {placing ? 'Placing…' : `Place Order · ${fmtPKR(total)}`}
          </button>
        </div>
      </div>

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
