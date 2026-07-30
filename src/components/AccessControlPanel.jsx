import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/ToastContext';
import { useRoleAccess } from '../lib/RoleAccessContext';
import { CONFIGURABLE_ROLES, ROLE_LABELS, PAGES } from '../lib/roles';

export default function AccessControlPanel() {
  const { showToast } = useToast();
  const { access, refresh } = useRoleAccess();
  const [saving, setSaving] = useState(null); // `${role}:${pageId}` currently saving

  async function toggle(role, pageId) {
    const key = `${role}:${pageId}`;
    const currentlyAllowed = access?.[role]?.has(pageId) || false;
    setSaving(key);
    const { error } = await supabase
      .from('role_page_access')
      .upsert({ role, page_id: pageId, allowed: !currentlyAllowed });
    setSaving(null);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    refresh();
  }

  if (!access) return <div className="p-10 text-center text-gray-400">Loading…</div>;

  return (
    <div className="bg-white rounded-[13px] p-5 border-2 border-gray-100 max-w-[820px]">
      <h3 className="text-base font-black mb-1 flex items-center gap-1.5">🔐 Access Control</h3>
      <p className="text-xs text-gray-400 mb-4">
        Har role ke liye decide karein top bar mein kaunsa page dikhega. Super Admin hamesha sab kuch dekhta hai — ye yahan configure nahi hota.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-extrabold text-gray-400 uppercase border-b-2 border-gray-100">
              <th className="text-left py-2 pr-3">Page</th>
              {CONFIGURABLE_ROLES.map((r) => (
                <th key={r} className="text-center py-2 px-3">{ROLE_LABELS[r]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PAGES.map((page) => (
              <tr key={page.id} className="border-b border-gray-50 last:border-0">
                <td className="py-2.5 pr-3 font-extrabold whitespace-nowrap">{page.icon} {page.label}</td>
                {CONFIGURABLE_ROLES.map((r) => {
                  const allowed = access?.[r]?.has(page.id) || false;
                  const key = `${r}:${page.id}`;
                  return (
                    <td key={r} className="text-center py-2.5 px-3">
                      <button
                        onClick={() => toggle(r, page.id)}
                        disabled={saving === key}
                        className={`w-8 h-8 rounded-lg font-black text-sm transition-all ${
                          allowed ? 'bg-orange text-white' : 'bg-gray-100 text-gray-300'
                        } ${saving === key ? 'opacity-50' : ''}`}
                      >
                        {allowed ? '✓' : '✕'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
