import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/ToastContext';
import { useStaff } from '../lib/StaffContext';
import { ROLE_LABELS } from '../lib/roles';

const ROLES = ['admin', 'manager', 'cashier', 'kitchen'];

export default function StaffPanel() {
  const { showToast } = useToast();
  const { profile: myProfile } = useStaff();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from('staff_profiles').select('*').order('created_at');
    setStaff(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateRole(person, role) {
    if (person.id === myProfile?.id && role !== 'admin') {
      if (!window.confirm('Aap apna khud ka admin access hata rahe hain — confirm karein?')) return;
    }
    const { error } = await supabase.from('staff_profiles').update({ role }).eq('id', person.id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(`${person.full_name || person.email} → ${ROLE_LABELS[role]}`);
    load();
  }

  async function toggleActive(person) {
    if (person.id === myProfile?.id && person.is_active) {
      if (!window.confirm('Aap khud ko deactivate kar rahe hain — turant logout ho jayenge. Confirm karein?')) return;
    }
    const { error } = await supabase.from('staff_profiles').update({ is_active: !person.is_active }).eq('id', person.id);
    if (error) { showToast(error.message, 'error'); return; }
    load();
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading…</div>;

  return (
    <div className="bg-white rounded-[13px] p-5 border-2 border-gray-100 max-w-[720px]">
      <h3 className="text-base font-black mb-1 flex items-center gap-1.5">👥 Staff & Roles</h3>
      <p className="text-xs text-gray-400 mb-4">
        Naye staff accounts Supabase Dashboard → Authentication → Users se banayein — wo yahan automatically aa jayenge (default role: Cashier). Role yahan se assign karein.
      </p>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-extrabold text-gray-400 uppercase border-b-2 border-gray-100">
            <th className="text-left py-2">Staff</th>
            <th className="text-left py-2">Role</th>
            <th className="text-left py-2">Status</th>
            <th className="text-left py-2"></th>
          </tr>
        </thead>
        <tbody>
          {staff.map((p) => (
            <tr key={p.id} className="border-b border-gray-50 last:border-0">
              <td className="py-2.5">
                <div className="font-extrabold">{p.full_name || p.email}</div>
                <div className="text-[11px] text-gray-400">{p.email}</div>
              </td>
              <td className="py-2.5">
                <select
                  value={p.role}
                  onChange={(e) => updateRole(p, e.target.value)}
                  className="text-xs font-bold border-2 border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </td>
              <td className="py-2.5">
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {p.is_active ? 'Active' : 'Deactivated'}
                </span>
              </td>
              <td className="py-2.5">
                <button
                  onClick={() => toggleActive(p)}
                  className="text-[11px] font-bold px-2.5 py-1 bg-gray-100 rounded-md"
                >
                  {p.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
          {!staff.length && (
            <tr><td colSpan={4} className="text-center text-gray-400 py-6">Koi staff account nahi mila</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
