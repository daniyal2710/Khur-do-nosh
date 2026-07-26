import { useState } from 'react';
import { supabase } from '../lib/supabase';
import loginBg from '../assets/login-bg.png';

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
    <div
      className="min-h-screen w-full flex items-center justify-center md:justify-end p-4 md:pr-16"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-2xl w-full max-w-[380px] p-7">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gold rounded-2xl text-white text-xl font-black flex items-center justify-center mx-auto mb-3">
            KN
          </div>
          <h1 className="text-xl font-black text-maroon">Khurd o Nosh</h1>
          <p className="text-gray-400 text-xs mt-1">Return POS</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Email</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange text-sm">✉️</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border-2 border-orange-200 rounded-lg outline-none focus:border-orange text-sm"
                placeholder="staff@khurdonosh.pk"
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Password</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange text-sm">🔒</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none focus:border-orange text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs font-bold text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-orange to-orangedark hover:opacity-90 text-white rounded-lg font-black text-sm disabled:opacity-50 transition-all shadow-md"
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </div>
      </form>
    </div>
  );
}
