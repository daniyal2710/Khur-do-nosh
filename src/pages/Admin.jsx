import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/ToastContext';
import { fmtPKR } from '../lib/format';
import CategoryModal from '../components/CategoryModal';
import MenuItemModal from '../components/MenuItemModal';
import AreaModal from '../components/AreaModal';

export default function Admin() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [areas, setAreas] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [loading, setLoading] = useState(true);

  const [catModal, setCatModal] = useState(null); // {} = new, {category} = edit, null = closed
  const [itemModal, setItemModal] = useState(null);
  const [showAreaModal, setShowAreaModal] = useState(false);

  async function loadAll() {
    const [{ data: cats }, { data: mi }, { data: ar }] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('menu_items').select('*').order('sort_order'),
      supabase.from('areas').select('*').order('name'),
    ]);
    setCategories(cats || []);
    setItems(mi || []);
    setAreas(ar || []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  function itemCount(catId) {
    return items.filter((i) => i.category_id === catId).length;
  }

  async function toggleCategoryActive(cat) {
    const { error } = await supabase.from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id);
    if (error) showToast(error.message, 'error');
    else { showToast(cat.is_active ? 'Category hide ho gayi' : 'Category active ho gayi'); loadAll(); }
  }

  async function deleteCategory(cat) {
    const count = itemCount(cat.id);
    const msg = count
      ? `"${cat.name}" mein ${count} menu items hain. Category delete karne se woh bhi delete ho jayenge. Confirm karein?`
      : `"${cat.name}" ko delete karna chahte hain?`;
    if (!window.confirm(msg)) return;
    const { error } = await supabase.from('categories').delete().eq('id', cat.id);
    if (error) showToast(error.message, 'error');
    else {
      showToast('Category delete ho gayi');
      if (activeCat === cat.id) setActiveCat(null);
      loadAll();
    }
  }

  async function toggleItemActive(item) {
    const { error } = await supabase.from('menu_items').update({ is_active: !item.is_active }).eq('id', item.id);
    if (error) showToast(error.message, 'error');
    else { showToast(item.is_active ? 'Item hide ho gaya' : 'Item active ho gaya'); loadAll(); }
  }

  async function deleteItem(item) {
    if (!window.confirm(`"${item.name}" ko delete karna chahte hain?`)) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', item.id);
    if (error) showToast(error.message, 'error');
    else { showToast('Item delete ho gaya'); loadAll(); }
  }

  async function deleteArea(area) {
    if (!window.confirm(`"${area.name}" area delete karna chahte hain?`)) return;
    const { error } = await supabase.from('areas').delete().eq('id', area.id);
    if (error) showToast(error.message.includes('foreign key') ? 'Ye area kisi order se linked hai, delete nahi ho sakta' : error.message, 'error');
    else { showToast('Area delete ho gaya'); loadAll(); }
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading…</div>;

  const catItems = activeCat ? items.filter((i) => i.category_id === activeCat) : [];
  const activeCategoryObj = categories.find((c) => c.id === activeCat);

  return (
    <div className="max-w-[1200px] mx-auto p-5">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[22px] font-black text-maroon flex items-center gap-2">⚙️ Administration</h2>
        <button
          onClick={() => setItemModal({})}
          className="ml-auto px-4 py-2 bg-orange text-white rounded-lg text-[13px] font-bold"
        >
          + New Menu Item
        </button>
        <button
          onClick={() => setCatModal({})}
          className="px-4 py-2 bg-maroon text-white rounded-lg text-[13px] font-bold"
        >
          + New Category
        </button>
      </div>

      {/* CATEGORIES GRID */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))' }}>
        {categories.map((c) => (
          <div
            key={c.id}
            onClick={() => setActiveCat(c.id)}
            className={`bg-white rounded-[13px] p-3.5 border-2 cursor-pointer text-center relative transition-all ${
              activeCat === c.id ? 'border-orange shadow-md' : 'border-gray-100 hover:border-orange-200'
            } ${!c.is_active ? 'opacity-50' : ''}`}
          >
            <div className="text-3xl mb-1">{c.icon}</div>
            <div className="text-[13px] font-extrabold">{c.name}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{itemCount(c.id)} items</div>
            <div className="flex justify-center gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setCatModal({ category: c })}
                className="text-[11px] px-2 py-1 bg-gray-100 rounded-md font-bold"
                title="Edit"
              >
                ✏️
              </button>
              <button
                onClick={() => toggleCategoryActive(c)}
                className="text-[11px] px-2 py-1 bg-gray-100 rounded-md font-bold"
                title={c.is_active ? 'Hide' : 'Activate'}
              >
                {c.is_active ? '👁️' : '🚫'}
              </button>
              <button
                onClick={() => deleteCategory(c)}
                className="text-[11px] px-2 py-1 bg-red-50 text-red-600 rounded-md font-bold"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
        {!categories.length && (
          <div className="col-span-full text-center text-gray-400 py-8">Abhi koi category nahi hai — "+ New Category" se banayein</div>
        )}
      </div>

      {/* DELIVERY AREAS */}
      <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-extrabold flex items-center gap-1.5">📍 Delivery Areas</h3>
          <button
            onClick={() => setShowAreaModal(true)}
            className="ml-auto px-3.5 py-1.5 bg-orange text-white rounded-lg text-[12px] font-bold"
          >
            + New Area
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {areas.map((a) => (
            <div key={a.id} className="flex items-center gap-2 bg-gray-50 border-2 border-gray-100 rounded-full pl-3 pr-1.5 py-1.5">
              <span className="text-sm font-bold">{a.icon} {a.name}</span>
              <button
                onClick={() => deleteArea(a)}
                className="w-6 h-6 flex items-center justify-center bg-red-50 text-red-600 rounded-full text-xs font-bold"
                title="Delete area"
              >
                ✕
              </button>
            </div>
          ))}
          {!areas.length && <p className="text-gray-400 text-sm py-2">Abhi koi area nahi hai — "+ New Area" se banayein</p>}
        </div>
      </div>

      {/* ITEMS FOR SELECTED CATEGORY */}
      {activeCat ? (
        <div className="bg-white rounded-[13px] p-4 border-2 border-gray-100">
          <div className="flex items-center gap-2 mb-3.5">
            <h3 className="text-base font-black flex items-center gap-1.5">
              {activeCategoryObj?.icon} {activeCategoryObj?.name} — Menu Items
            </h3>
            <button
              onClick={() => setItemModal({ defaultCategoryId: activeCat })}
              className="ml-auto px-3.5 py-1.5 bg-orange text-white rounded-lg text-[12px] font-bold"
            >
              + New Item
            </button>
          </div>

          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))' }}>
            {catItems.map((item) => (
              <div key={item.id} className={`border-2 border-gray-100 rounded-[11px] p-3 ${!item.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-2">
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-extrabold truncate">{item.name}</div>
                    {item.description && <div className="text-[11px] text-gray-400 truncate">{item.description}</div>}
                    <div className="text-[13px] font-black text-orange mt-1">{fmtPKR(item.price)}</div>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-2.5">
                  <button
                    onClick={() => setItemModal({ item })}
                    className="flex-1 text-[11px] py-1.5 bg-gray-100 rounded-md font-bold"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => toggleItemActive(item)}
                    className="flex-1 text-[11px] py-1.5 bg-gray-100 rounded-md font-bold"
                  >
                    {item.is_active ? '👁️ Hide' : '🚫 Show'}
                  </button>
                  <button
                    onClick={() => deleteItem(item)}
                    className="flex-1 text-[11px] py-1.5 bg-red-50 text-red-600 rounded-md font-bold"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
            {!catItems.length && (
              <div className="col-span-full text-center text-gray-400 py-6">
                Is category mein abhi koi item nahi — "+ New Item" se add karein
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-400 py-10">👆 Kisi category pe click karein uske menu items dekhne ke liye</div>
      )}

      {showAreaModal && (
        <AreaModal
          onClose={() => setShowAreaModal(false)}
          onSaved={() => { setShowAreaModal(false); loadAll(); }}
        />
      )}

      {catModal && (
        <CategoryModal
          category={catModal.category}
          onClose={() => setCatModal(null)}
          onSaved={() => { setCatModal(null); loadAll(); }}
        />
      )}

      {itemModal && (
        <MenuItemModal
          item={itemModal.item}
          categories={categories}
          defaultCategoryId={itemModal.defaultCategoryId}
          onClose={() => setItemModal(null)}
          onSaved={() => { setItemModal(null); loadAll(); }}
        />
      )}
    </div>
  );
}
