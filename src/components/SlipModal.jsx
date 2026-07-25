import { fmtPKR } from '../lib/format';

const TYPE_BADGE = {
  'dine-in': { cls: 'bg-yellow-100 text-yellow-800', lb: 'Dine-in' },
  takeaway: { cls: 'bg-green-100 text-green-800', lb: 'Takeaway' },
  delivery: { cls: 'bg-red-100 text-red-800', lb: 'Delivery' },
};

export default function SlipModal({ order, items, customer, onClose }) {
  const badge = TYPE_BADGE[order.order_type] || TYPE_BADGE['dine-in'];

  function printSlip() {
    window.print();
  }

  function sendWhatsapp() {
    if (!customer?.phone) return;
    const phone = customer.phone.replace(/[^0-9]/g, '').replace(/^0/, '92');
    const lines = items.map((it) => `${it.quantity}x ${it.item_name}`).join('\n');
    const msg = `Khurd o Nosh 🍕\nOrder ${order.order_number}\n${lines}\n\nTotal: ${fmtPKR(order.total)}\nShukriya!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-[380px] w-full shadow-2xl max-h-[92vh] overflow-y-auto">
        <div id="print-area">
          {/* Kitchen slip */}
          <div className="bg-maroon p-4 rounded-t-2xl text-center">
            <span className="inline-block bg-yellow-300 text-maroon text-[11px] font-black px-3 py-0.5 rounded-full mb-2 tracking-wide">
              KITCHEN COPY
            </span>
            <h2 className="text-white text-xl font-black tracking-wide">{order.order_number}</h2>
            <p className="text-yellow-300 text-xs font-bold mt-1">Khurd o Nosh</p>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-black mt-2 ${badge.cls}`}>
              {badge.lb}
            </span>
          </div>
          <div className="p-4">
            {items.map((it) => (
              <div key={it.id || it.menu_item_id} className="flex items-center gap-3 py-2.5 border-b-2 border-dashed border-gray-100 last:border-0">
                <span className="text-2xl flex-shrink-0">{it.icon}</span>
                <div className="w-8 h-8 bg-orange text-white rounded-lg font-black flex items-center justify-center flex-shrink-0">
                  {it.quantity}
                </div>
                <div className="font-bold text-sm flex-1">{it.item_name}</div>
              </div>
            ))}
            {order.notes && (
              <div className="bg-orange-50 rounded-lg p-2.5 mt-3 text-sm font-bold text-amber-800 text-center border-2 border-dashed border-yellow-300">
                📝 {order.notes}
              </div>
            )}
          </div>

          {/* Customer slip */}
          <div className="bg-gradient-to-br from-maroon to-maroon2 p-5 text-center">
            <div className="w-12 h-12 bg-gold rounded-xl text-white text-xl font-black flex items-center justify-center mx-auto mb-2">
              KN
            </div>
            <h2 className="text-white text-lg font-black tracking-wide">Khurd o Nosh</h2>
            <p className="text-yellow-300 text-[11px] italic mt-0.5">Khao, Piyo, Khush Raho</p>
            <p className="text-white/80 text-[11px] mt-2 leading-relaxed">
              {order.order_number} · {new Date(order.created_at || Date.now()).toLocaleString('en-PK')}
              {customer ? <><br />{customer.name} · {customer.phone}</> : null}
            </p>
          </div>
          <div className="p-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3 border-2 border-gray-100">
              {items.map((it) => (
                <div key={it.id || it.menu_item_id} className="flex justify-between mb-1.5 last:mb-0">
                  <span>{it.quantity}× {it.item_name}</span>
                  <span className="font-bold">{fmtPKR(it.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-3">
              <span>Subtotal</span><span>{fmtPKR(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Discount</span><span>-{fmtPKR(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black mt-1">
              <span>Total</span><span className="text-orange">{fmtPKR(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="p-4 pt-0 space-y-2">
          {customer?.phone && (
            <button onClick={sendWhatsapp} className="w-full py-2.5 bg-[#25D366] text-white rounded-lg font-bold text-sm">
              📲 Send on WhatsApp
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={printSlip} className="py-2.5 bg-yellow-100 text-yellow-800 rounded-lg font-bold text-sm">
              🖨️ Print Slips
            </button>
            <button onClick={onClose} className="py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm">
              ✕ Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
