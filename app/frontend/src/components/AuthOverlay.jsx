import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2, Play } from 'lucide-react';

export default function AuthOverlay({ setupRequired, setAuthToken, fetchProjects, setIsDemoMode }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDemoMode = () => {
    setIsDemoMode(true);
    window.location.hash = '#/demo';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = setupRequired ? '/api/auth/setup' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      if (setupRequired) {
        // After setup, automatically log in
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const loginData = await loginRes.json();
        if (loginRes.ok) {
          localStorage.setItem('apprankly_token', loginData.token);
          setAuthToken(loginData.token);
          fetchProjects(loginData.token);
          window.location.reload(); // Refresh to clear setup state properly
        } else {
          window.location.reload();
        }
      } else {
        localStorage.setItem('apprankly_token', data.token);
        setAuthToken(data.token);
        fetchProjects(data.token);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl p-6">
      <div className="glass-card w-full max-w-md p-8 shadow-2xl border-white/20">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-accent-blue/10 rounded-2xl flex items-center justify-center text-accent-blue mb-6">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {setupRequired ? 'Set Admin Password' : 'Admin Login'}
          </h2>
          <p className="text-white/40 text-sm">
            {setupRequired
              ? 'First-time setup: Create a password to protect your dashboard.'
              : 'Enter your password to access live statistics.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 text-center font-medium">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase mb-2">
                {setupRequired ? 'Create Password' : 'Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-blue transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-4 flex items-center justify-center space-x-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <span>{setupRequired ? 'Set Password' : 'Login'}</span>}
            </button>
          </div>

          <div className="bg-white/5 p-6 rounded-2xl border border-white/5 text-center">
            <p className="text-[10px] text-white/30 uppercase font-bold mb-3 tracking-widest">Or fallback to preview</p>
            <button
              type="button"
              onClick={handleDemoMode}
              className="w-full py-4 flex items-center justify-center space-x-2 bg-accent-blue/5 hover:bg-accent-blue/10 border border-accent-blue/20 rounded-xl text-accent-blue font-bold transition-all"
            >
              <Play size={18} />
              <span>Enter Demo Mode</span>
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center space-x-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
          <ShieldCheck size={12} />
          <span>Encrypted Session Control</span>
        </div>
      </div>
    </div>
  );
}
