import React, { useState, useEffect } from 'react';
import { Share2, CheckCircle2, XCircle, AlertCircle, ExternalLink, Zap, Rocket, Plus } from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function Integrations({ authToken, isStaticMode, isDemoMode, releases, fetchReleases }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      if (isDemoMode) {
        setStatus({
          google: { connected: true, bucketName: 'demo-bucket' },
          apple: { connected: false }
        });
        setLoading(false);
        return;
      }

      try {
        const res = await apiFetch('/api/integrations/status', {}, authToken, isStaticMode);
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (err) {
        console.error('Failed to fetch integrations status', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, [authToken, isStaticMode, isDemoMode]);

  if (loading) return <div className="p-8 text-center text-white/40">Loading connection status...</div>;

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-bold">Integrations & Releases</h2>
        <p className="text-white/40">Manage your data sources and app release events</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ConnectionCard
          platform="Google Play Console"
          status={status?.google?.connected ? 'connected' : 'disconnected'}
          details={status?.google?.bucketName ? `Bucket: ${status.google.bucketName}` : 'No bucket configured'}
          icon="https://www.gstatic.com/images/branding/product/1x/play_console_512dp.png"
        />
        <ConnectionCard
          platform="Apple App Store Connect"
          status={status?.apple?.connected ? 'connected' : 'partial'}
          details={status?.apple?.issuerId ? `Issuer ID: ${status.apple.issuerId.substring(0, 8)}...` : 'Credentials missing'}
          icon="https://upload.wikimedia.org/wikipedia/commons/6/67/App_Store_Smart_Icon.png"
        />
      </div>

      <ReleaseManager
        authToken={authToken}
        releases={releases || []}
        fetchReleases={fetchReleases}
        isStaticMode={isStaticMode}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ConnectionCard
          platform="Slack Webhook"
          status="coming-soon"
          details="Get daily summaries and alerts in your Slack channels."
          icon="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg"
        />

        <ConnectionCard
          platform="Custom Webhook"
          status="coming-soon"
          details="Push statistics to your own backend or data warehouse."
          icon={<Share2 className="text-white/40" />}
        />
      </div>
    </div>
  );
}

function ReleaseManager({ authToken, releases, fetchReleases, isStaticMode }) {
  const [version, setVersion] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [platform, setPlatform] = useState('google');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/api/releases', {
        method: 'POST',
        body: JSON.stringify({ version, platform, date, notes })
      }, authToken, isStaticMode);
      if (res.ok) {
        setVersion('');
        setNotes('');
        fetchReleases();
      }
    } catch (err) {
      console.error('Failed to add release', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Rocket className="text-accent-blue" size={20} />
        <h3 className="text-lg font-bold">Release Events Tracker</h3>
      </div>

      <form onSubmit={handleAdd} className="space-y-4 mb-8 bg-white/5 p-4 rounded-2xl border border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Version</label>
            <input
              type="text"
              placeholder="e.g. 2.4.0"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent-blue"
              value={version}
              onChange={e => setVersion(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Date</label>
            <input
              type="date"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent-blue"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Platform</label>
            <select
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent-blue appearance-none"
              value={platform}
              onChange={e => setPlatform(e.target.value)}
            >
              <option value="google">Google Play</option>
              <option value="apple">App Store</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-accent-blue hover:bg-accent-blue/80 disabled:opacity-50 text-white font-bold rounded-xl px-4 py-2 text-sm transition-all flex items-center justify-center space-x-2"
            >
              <Plus size={16} />
              <span>Log Release</span>
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Description / Notes</label>
          <input
            type="text"
            placeholder="What changed? (e.g. New onboarding flow, Crash fixes)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent-blue"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      </form>

      <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
        {releases.map((release, idx) => (
          <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
            <div className="flex items-center space-x-6">
              <div className="flex flex-col">
                <span className="font-bold text-lg">v{release.version}</span>
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{release.date}</span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                  release.platform === 'google' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                  release.platform === 'apple' ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/20' :
                  'bg-white/10 text-white border-white/20'
                }`}>
                  {release.platform.toUpperCase()}
                </span>
                <p className="text-xs text-white/60 mt-1">{release.notes || 'No notes provided.'}</p>
              </div>
            </div>
          </div>
        ))}
        {releases.length === 0 && (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
            <Rocket className="mx-auto text-white/10 mb-2" size={32} />
            <p className="text-white/20 italic text-sm">No releases logged yet. Track your version history to see impact on metrics.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectionCard({ platform, status, details, icon }) {
  return (
    <div className="glass-card p-6 flex flex-col justify-between">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden p-2">
            {typeof icon === 'string' ? <img src={icon} alt={platform} className="w-full h-full object-contain" /> : icon}
          </div>
          <div>
            <h3 className="font-bold">{platform}</h3>
            <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">{details}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="flex items-center space-x-2 mt-4">
        <button className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2">
          <span>Configure</span>
          <ExternalLink size={12} />
        </button>
        {status === 'connected' && (
           <button className="px-4 py-2 bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue rounded-xl text-xs font-bold transition-all flex items-center space-x-2">
            <Zap size={12} />
            <span>Test</span>
           </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'connected') return (
    <div className="flex items-center space-x-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold">
      <CheckCircle2 size={12} />
      <span>CONNECTED</span>
    </div>
  );
  if (status === 'partial') return (
    <div className="flex items-center space-x-1.5 px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold">
      <AlertCircle size={12} />
      <span>PARTIAL</span>
    </div>
  );
  if (status === 'coming-soon') return (
    <div className="flex items-center space-x-1.5 px-2 py-1 rounded-full bg-white/5 text-white/40 border border-white/10 text-[10px] font-bold">
      <span>COMING SOON</span>
    </div>
  );
  return (
    <div className="flex items-center space-x-1.5 px-2 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-bold">
      <XCircle size={12} />
      <span>DISCONNECTED</span>
    </div>
  );
}
