import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError('Email ya password ghalat hai');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-maroon to-maroon2 p-4">
      <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-2xl w-full max-w-[360px] p-7">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gold rounded-2xl text-white text-xl font-black flex items-center justify-center mx-auto mb-3">
            KN
          </div>
          <h1 className="text-xl font-black text-maroon">Khurd o Nosh</h1>
          <p className="text-gray-400 text-xs mt-1">Staff Login</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 border-2 border-orange-200 rounded-lg outline-none focus:border-orange text-sm"
              placeholder="staff@khurdonosh.pk"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 border-2 border-orange-200 rounded-lg outline-none focus:border-orange text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-xs font-bold text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-orange hover:bg-orangedark text-white rounded-lg font-black text-sm disabled:bg-gray-300 transition-all"
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </div>
      </form>
    </div>
  );
}
