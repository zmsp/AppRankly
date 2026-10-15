import React, { useState, useEffect } from 'react';
import { Link2, Plus, Copy, Check, Trash2, ExternalLink, Globe, Smartphone, MousePointer, Share2 } from 'lucide-react';
import clsx from 'clsx';

export default function CampaignLinksManager({ packageName }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // New Link Form
  const [form, setForm] = useState({
    name: '',
    channel: 'social',
    utmSource: 'twitter',
    utmMedium: 'social',
    utmCampaign: 'launch',
    appleAppId: '',
    appleProviderToken: '',
    customProductPageId: '',
    platform: 'all'
  });

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const url = packageName ? `/api/aso/campaign-links?packageName=${encodeURIComponent(packageName)}` : '/api/aso/campaign-links';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links || []);
      }
    } catch (err) {
      console.error('Failed to load campaign links:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [packageName]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.utmSource || !form.utmCampaign) return;

    try {
      const res = await fetch('/api/aso/campaign-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName: packageName || 'global',
          ...form
        })
      });
      if (res.ok) {
        setShowCreateModal(false);
        setForm({
          name: '',
          channel: 'social',
          utmSource: 'twitter',
          utmMedium: 'social',
          utmCampaign: 'launch',
          appleAppId: '',
          appleProviderToken: '',
          customProductPageId: '',
          platform: 'all'
        });
        fetchLinks();
      }
    } catch (err) {
      console.error('Failed to create campaign link:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign tracking link?')) return;
    try {
      const res = await fetch(`/api/aso/campaign-links/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLinks();
      }
    } catch (err) {
      console.error('Failed to delete campaign link:', err);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const origin = window.location.origin;

  return (
    <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
              <Link2 size={16} />
            </span>
            <h3 className="text-sm font-bold text-white">Zero-SDK Campaign Link Builder & Attribution Bridge</h3>
            <span className="px-2 py-0.5 text-[10px] bg-blue-500/20 text-blue-300 rounded-full font-medium">
              Apple pt/ct & Google Referrer
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Build lightweight, privacy-first store URLs with campaign tokens. Track Twitter, Reddit, YouTube, and newsletter clicks without installing heavy SDKs.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 self-start md:self-auto"
        >
          <Plus size={14} />
          <span>New Campaign Link</span>
        </button>
      </div>

      {/* Links List */}
      <div className="space-y-3">
        {links.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-white/5 space-y-2">
            <Share2 size={24} className="mx-auto text-slate-600" />
            <div className="text-xs text-slate-300 font-medium">No campaign tracking links created yet</div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Create a smart link for your next launch tweet, Reddit post, or influencer video to measure external conversion.
            </p>
          </div>
        ) : (
          links.map(link => {
            const universalFull = `${origin}${link.universal_url}`;
            return (
              <div
                key={link.id}
                className="p-4 bg-slate-950/70 border border-white/5 hover:border-white/10 rounded-xl space-y-3 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                      {link.channel}
                    </span>
                    <h4 className="text-xs font-bold text-white">{link.name}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      utm_campaign={link.utm_campaign}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                      <MousePointer size={12} className="text-emerald-400" />
                      <strong className="text-white font-bold">{link.clicks}</strong> clicks
                    </div>

                    <button
                      onClick={() => handleDelete(link.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete link"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* URL Targets */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                  {/* Universal Smart Redirect */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] font-semibold">
                      <span className="flex items-center gap-1 text-indigo-300">
                        <Globe size={11} /> Universal Smart Link (Auto-detects iOS/Android)
                      </span>
                      <button
                        onClick={() => copyToClipboard(universalFull, `uni-${link.id}`)}
                        className="text-slate-400 hover:text-white"
                      >
                        {copiedKey === `uni-${link.id}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    </div>
                    <div className="font-mono text-white truncate text-[10px] select-all">
                      {universalFull}
                    </div>
                  </div>

                  {/* Play Store URL */}
                  {link.play_url && (
                    <div className="p-2.5 bg-slate-900 rounded-lg border border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-slate-400 text-[10px] font-semibold">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Smartphone size={11} /> Direct Google Play (With Referrer)
                        </span>
                        <button
                          onClick={() => copyToClipboard(link.play_url, `play-${link.id}`)}
                          className="text-slate-400 hover:text-white"
                        >
                          {copiedKey === `play-${link.id}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        </button>
                      </div>
                      <div className="font-mono text-slate-300 truncate text-[10px] select-all">
                        {link.play_url}
                      </div>
                    </div>
                  )}

                  {/* Apple App Store URL */}
                  {link.apple_url && (
                    <div className="p-2.5 bg-slate-900 rounded-lg border border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-slate-400 text-[10px] font-semibold">
                        <span className="flex items-center gap-1 text-blue-300">
                          <Smartphone size={11} /> Direct Apple Store (pt & ct tokens)
                        </span>
                        <button
                          onClick={() => copyToClipboard(link.apple_url, `apple-${link.id}`)}
                          className="text-slate-400 hover:text-white"
                        >
                          {copiedKey === `apple-${link.id}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        </button>
                      </div>
                      <div className="font-mono text-slate-300 truncate text-[10px] select-all">
                        {link.apple_url}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Link2 size={16} className="text-indigo-400" />
                Create Campaign Attribution Link
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Campaign Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Twitter Launch Thread, Reddit r/Android, Newsletter #12"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Marketing Channel</label>
                  <select
                    value={form.channel}
                    onChange={(e) => setForm({ ...form, channel: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="social">Social Media (Twitter/Reddit/TikTok)</option>
                    <option value="newsletter">Email / Newsletter</option>
                    <option value="influencer">Influencer / Creator</option>
                    <option value="ad">Paid Ad Campaign</option>
                    <option value="community">Community / Discord</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Target Store</label>
                  <select
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="all">Cross-Platform (Universal Smart Redirect)</option>
                    <option value="play">Google Play Only</option>
                    <option value="apple">Apple App Store Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">UTM Source</label>
                  <input
                    type="text"
                    required
                    placeholder="twitter, reddit, substack"
                    value={form.utmSource}
                    onChange={(e) => setForm({ ...form, utmSource: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">UTM Medium</label>
                  <input
                    type="text"
                    placeholder="social, cpc, email"
                    value={form.utmMedium}
                    onChange={(e) => setForm({ ...form, utmMedium: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">UTM Campaign</label>
                  <input
                    type="text"
                    required
                    placeholder="launch_promo"
                    value={form.utmCampaign}
                    onChange={(e) => setForm({ ...form, utmCampaign: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/5">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Apple App ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1234567890"
                    value={form.appleAppId}
                    onChange={(e) => setForm({ ...form, appleAppId: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Apple Provider Token (pt)</label>
                  <input
                    type="text"
                    placeholder="Found in ASC Campaign Links"
                    value={form.appleProviderToken}
                    onChange={(e) => setForm({ ...form, appleProviderToken: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow"
                >
                  Generate Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
