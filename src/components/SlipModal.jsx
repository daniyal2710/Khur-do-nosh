import { useEffect } from 'react';
import { fmtPKR } from '../lib/format';
import { useShopSettings } from '../lib/ShopSettingsContext';

const TYPE_BADGE = {
  'dine-in': { cls: 'bg-yellow-100 text-yellow-800', lb: 'Dine-in' },
  takeaway: { cls: 'bg-green-100 text-green-800', lb: 'Takeaway' },
  delivery: { cls: 'bg-red-100 text-red-800', lb: 'Delivery' },
  foodpanda: { cls: 'bg-pink-100 text-pink-700', lb: 'Food Panda' },
};

export default function SlipModal({ order, items, customer, onClose }) {
  const { settings } = useShopSettings();
  const shopName = settings?.shop_name || 'Khurd o Nosh';
  const tagline = settings?.tagline || 'Khao, Piyo, Khush Raho';
  const footer = settings?.receipt_footer || 'Thank You! ❤️
  Thank you for choosing Khurd o Nosh
  Every order means the world to us. We hope you enjoy every bite, and we look forward to serving you again.';
  const badge = TYPE_BADGE[order.order_type] || TYPE_BADGE['dine-in'];
  const dateStr = new Date(order.created_at || Date.now()).toLocaleString('en-PK');

  // Clean up the print-target body class after the print dialog closes/cancels
  useEffect(() => {
    function cleanup() {
      document.body.classList.remove('print-kitchen', 'print-customer');
    }
    window.addEventListener('afterprint', cleanup);
    return () => window.removeEventListener('afterprint', cleanup);
  }, []);

  function printKitchen() {
    document.body.classList.add('print-kitchen');
    document.body.classList.remove('print-customer');
    window.print();
  }

  function printCustomer() {
    document.body.classList.add('print-customer');
    document.body.classList.remove('print-kitchen');
    window.print();
  }

  function sendWhatsappBill() {
    if (!customer?.phone) return;
    const phone = customer.phone.replace(/[^0-9]/g, '').replace(/^0/, '92');
    const lines = items.map((it) => `${it.quantity}x ${it.item_name}`).join('\n');
    const msg = `${shopName} 🍕\nOrder ${order.order_number}\n${lines}\n\nTotal: ${fmtPKR(order.total)}\nShukriya!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function sendWhatsappThankYou() {
    if (!customer?.phone) return;
    const phone = customer.phone.replace(/[^0-9]/g, '').replace(/^0/, '92');
    const name = customer.name ? customer.name.split(' ')[0] : '';
    const msg = `Shukriya ${name}! 🙏\nAapka order ${order.order_number} ${shopName} se successfully mil gaya hoga.\nHumein ummeed hai aapko pasand aaya hoga — dobara visit ka intezar rahega! 🍽️`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-[380px] w-full shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* ─────────── ON-SCREEN PREVIEW (not printed) ─────────── */}
        <div className="bg-maroon p-4 rounded-t-2xl text-center">
          <h2 className="text-white text-xl font-black tracking-wide">{order.order_number}</h2>
          <p className="text-yellow-300 text-xs font-bold mt-1">{shopName}</p>
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
              <div className="font-bold text-sm flex-1">
                {it.item_name}
                {it.description && <div className="text-[11px] font-normal text-gray-400">{it.description}</div>}
              </div>
              <div className="text-sm font-bold text-gray-500">{fmtPKR(it.subtotal)}</div>
            </div>
          ))}
          {order.notes && (
            <div className="bg-orange-50 rounded-lg p-2.5 mt-3 text-sm font-bold text-amber-800 text-center border-2 border-dashed border-yellow-300">
              📝 {order.notes}
            </div>
          )}
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
          {order.delivery_address && (
            <div className="bg-gray-50 rounded-lg p-2.5 mt-3 text-xs text-gray-600 border-2 border-gray-100">
              🛵 <span className="font-bold">Deliver to:</span> {order.delivery_address}
            </div>
          )}
          {customer && (
            <div className="text-xs text-gray-400 mt-2 text-center">{customer.name} · {customer.phone}</div>
          )}
        </div>

        <div className="p-4 pt-0 space-y-2">
          {customer?.phone && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={sendWhatsappBill} className="py-2.5 bg-[#25D366] text-white rounded-lg font-bold text-sm">
                📄 Send Bill
              </button>
              <button onClick={sendWhatsappThankYou} className="py-2.5 bg-[#128C7E] text-white rounded-lg font-bold text-sm">
                🙏 Thank You
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={printKitchen} className="py-2.5 bg-orange-100 text-orange-800 rounded-lg font-bold text-sm">
              🖨️ Kitchen Slip
            </button>
            <button onClick={printCustomer} className="py-2.5 bg-yellow-100 text-yellow-800 rounded-lg font-bold text-sm">
              🖨️ Customer Slip
            </button>
          </div>
          <button onClick={onClose} className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm">
            ✕ Close
          </button>
        </div>
      </div>

      {/* ─────────── HIDDEN 80mm THERMAL TEMPLATES (print-only) ─────────── */}
      <div id="kitchen-print" className="hidden">
        <div style={{ padding: '3mm', fontFamily: "'Courier New', Courier, monospace", fontSize: '12px', color: '#000' }}>
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>{shopName.toUpperCase()}</div>
          <div style={{ textAlign: 'center', fontSize: '11px' }}>KITCHEN COPY</div>
          <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px' }}>
            <span>{order.order_number}</span>
            <span>{TYPE_BADGE[order.order_type]?.lb.toUpperCase()}</span>
          </div>
          <div style={{ fontSize: '10px' }}>{dateStr}</div>
          <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
          {items.map((it) => (
            <div key={it.id || it.menu_item_id} style={{ margin: '1.5mm 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
                <span>{it.quantity}x {it.item_name}</span>
              </div>
              {it.description && (
                <div style={{ fontSize: '10px', paddingLeft: '3mm' }}>↳ {it.description}</div>
              )}
            </div>
          ))}
          {order.delivery_address && (
            <>
              <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>DELIVER TO:</div>
              <div style={{ fontSize: '11px' }}>{order.delivery_address}</div>
            </>
          )}
          {order.notes && (
            <>
              <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>NOTE: {order.notes}</div>
            </>
          )}
          <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
          <div style={{ textAlign: 'center', fontSize: '10px' }}>— cut here —</div>
        </div>
      </div>

      <div id="customer-print" className="hidden">
        <div style={{ padding: '3mm', fontFamily: "'Courier New', Courier, monospace", fontSize: '12px', color: '#000' }}>
          {settings?.logo_url && (
            <img
              src={settings.logo_url}
              alt="Logo"
              style={{ display: 'block', margin: '0 auto 2mm', maxWidth: '30mm', maxHeight: '20mm', objectFit: 'contain' }}
            />
          )}
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>{shopName.toUpperCase()}</div>
          <div style={{ textAlign: 'center', fontSize: '10px' }}>{tagline}</div>
          <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
          <div>{order.order_number} — {dateStr}</div>
          <div>{TYPE_BADGE[order.order_type]?.lb}</div>
          {customer && <div>{customer.name} · {customer.phone}</div>}
          {order.delivery_address && (
            <div style={{ fontSize: '11px', marginTop: '1mm' }}>🛵 {order.delivery_address}</div>
          )}
          <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
          {items.map((it) => (
            <div key={it.id || it.menu_item_id} style={{ margin: '1mm 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>{it.quantity}x {it.item_name}</span>
                <span>{fmtPKR(it.subtotal)}</span>
              </div>
              {it.description && (
                <div style={{ fontSize: '10px', paddingLeft: '3mm', color: '#333' }}>↳ {it.description}</div>
              )}
            </div>
          ))}
          {order.notes && (
            <>
              <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
              <div style={{ fontSize: '11px', fontWeight: 'bold' }}>NOTE: {order.notes}</div>
            </>
          )}
          <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal</span><span>{fmtPKR(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Discount</span><span>-{fmtPKR(order.discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px', margin: '1mm 0' }}>
            <span>TOTAL</span><span>{fmtPKR(order.total)}</span>
          </div>
          <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
          <div style={{ textAlign: 'center', fontSize: '10px' }}>{footer}</div>
        </div>
      </div>
    </div>
  );
}
