import React, { useState, useEffect } from 'react';
import {
  Settings, Save, CheckCircle2, XCircle, AlertCircle,
  Zap, Code2, Sliders, Eye, EyeOff,
  Folder, Key, Database, Globe, Copy, RotateCcw
} from 'lucide-react';
import { apiFetch } from '../lib/api';

function clsx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function SectionHeader({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Icon size={17} className="text-accent-blue" />
        </div>
        <div>
          <h3 className="font-bold text-sm">{title}</h3>
          {subtitle && <p className="text-[11px] text-white/40 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider ml-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-white/30 ml-1">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', secret = false, disabled = false }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={secret && !show ? 'password' : type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-blue transition-colors disabled:opacity-40 pr-10"
      />
      {secret && (
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}
    </div>
  );
}

function TestButton({ platform, authToken, isStaticMode, isDemoMode }) {
  const [state, setState] = useState('idle');
  const [result, setResult] = useState(null);

  const run = async () => {
    if (isDemoMode) {
      setState('ok');
      setResult({ success: true, appCount: 3, apps: [{ name: 'Demo App One', bundleId: 'com.demo.one' }, { name: 'Demo App Two', bundleId: 'com.demo.two' }] });
      return;
    }
    setState('loading');
    setResult(null);
    try {
      const res = await apiFetch(`/api/test/${platform}`, { method: 'POST' }, authToken, isStaticMode);
      const data = await res.json();
      setState(data.success ? 'ok' : 'err');
      setResult(data);
    } catch (err) {
      setState('err');
      setResult({ error: err.message });
    }
  };

  const label = platform === 'apple' ? 'App Store Connect' : 'Google Play';

  return (
    <div className="space-y-3">
      <button
        onClick={run}
        disabled={state === 'loading'}
        className={clsx(
          "flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all border",
          state === 'idle' && "bg-white/5 border-white/10 hover:bg-white/10 text-white/70",
          state === 'loading' && "bg-white/5 border-white/10 text-white/40 cursor-wait",
          state === 'ok' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
          state === 'err' && "bg-rose-500/10 border-rose-500/20 text-rose-400"
        )}
      >
        {state === 'loading' ? (
          <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
        ) : state === 'ok' ? (
          <CheckCircle2 size={14} />
        ) : state === 'err' ? (
          <XCircle size={14} />
        ) : (
          <Zap size={14} />
        )}
        <span>Test {label}</span>
      </button>

      {result && (
        <div className={clsx(
          "text-[11px] rounded-xl p-3 border font-mono",
          result.success
            ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-300"
            : "bg-rose-500/5 border-rose-500/15 text-rose-300"
        )}>
          {result.success ? (
            <div className="space-y-1">
              <div className="font-bold text-emerald-400">✓ Connected — {result.appCount} app{result.appCount !== 1 ? 's' : ''} found</div>
              {result.apps?.map((a, i) => (
                <div key={i} className="text-white/50 text-[10px]">• {a.name || a.bundleId || a.packageName}</div>
              ))}
            </div>
          ) : (
            <div>
              <div className="font-bold text-rose-400">✗ Connection failed</div>
              <div className="text-white/50 mt-1 break-all">{result.error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function JsonEditor({ raw, onChange }) {
  const [error, setError] = useState(null);
  const handleChange = (val) => {
    onChange(val);
    try { JSON.parse(val); setError(null); } catch (e) { setError(e.message); }
  };
  return (
    <div className="space-y-2">
      <textarea
        className={clsx(
          "w-full h-96 bg-black/30 border rounded-2xl p-4 text-xs font-mono text-white/80 focus:outline-none transition-colors resize-none custom-scrollbar",
          error ? "border-rose-500/40 focus:border-rose-500" : "border-white/10 focus:border-accent-blue"
        )}
        value={raw}
        onChange={e => handleChange(e.target.value)}
        spellCheck={false}
      />
      {error && (
        <div className="flex items-center space-x-2 text-rose-400 text-[11px] ml-1">
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="bg-white/3 rounded-xl px-3 py-2 border border-white/5">
      <div className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={clsx("text-xs text-white/70 truncate", mono && "font-mono")}>{value}</div>
    </div>
  );
}

export default function Config({ authToken, isStaticMode, isDemoMode }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [saveMsg, setSaveMsg] = useState('');
  const [activeTab, setActiveTab] = useState('form');
  const [config, setConfig] = useState(null);
  const [rawJson, setRawJson] = useState('');
  const [configPath, setConfigPath] = useState('');

  useEffect(() => {
    async function load() {
      if (isDemoMode) {
        const demo = [{
          name: 'Demo Project',
          projectID: 'demo-project',
          bucketName: 'pubsite__rev_demo',
          keyFilePath_apple: 'keys/AuthKey_DEMO.p8',
          appleKeyId: 'DEMO123456',
          appleIssuerId: '00000000-0000-0000-0000-000000000000',
          appleVendorId: '12345678',
          keyFilePath: 'keys/service_account.json',
          PlaystoreConsoleUrl: 'https://play.google.com/console/u/0/developers/0000000000000000000',
          ignoredPackages: ['com.example.ignored'],
          appMetadata: {}
        }];
        setConfig(demo);
        setRawJson(JSON.stringify(demo, null, 2));
        setConfigPath('/data/config/config.json (demo mode)');
        setLoading(false);
        return;
      }
      try {
        const res = await apiFetch('/api/config', {}, authToken, isStaticMode);
        if (res.ok) {
          const data = await res.json();
          setConfig(data.config);
          setRawJson(JSON.stringify(data.config, null, 2));
          setConfigPath(data.path || '');
        }
      } catch (err) {
        console.error('Failed to load config', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authToken, isStaticMode, isDemoMode]);

  const entry = Array.isArray(config) ? config[0] : config;

  const updateEntry = (key, value) => {
    const updated = Array.isArray(config)
      ? config.map((c, i) => i === 0 ? { ...c, [key]: value } : c)
      : { ...config, [key]: value };
    setConfig(updated);
    setRawJson(JSON.stringify(updated, null, 2));
  };

  const handleRawChange = (val) => {
    setRawJson(val);
    try { const parsed = JSON.parse(val); setConfig(parsed); } catch (_) {}
  };

  const handleSave = async () => {
    if (isDemoMode) {
      setSaveStatus('ok');
      setSaveMsg('Config changes noted (demo mode — not persisted to disk)');
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await apiFetch('/api/config', {
        method: 'PUT',
        body: JSON.stringify({ config })
      }, authToken, isStaticMode);
      if (res.ok) {
        const data = await res.json();
        setSaveStatus('ok');
        setSaveMsg('Config saved successfully' + (data.path ? ` → ${data.path}` : ''));
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveStatus('err');
        setSaveMsg(data.error || 'Failed to save config');
      }
    } catch (err) {
      setSaveStatus('err');
      setSaveMsg(err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const handleReload = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/config', {}, authToken, isStaticMode);
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setRawJson(JSON.stringify(data.config, null, 2));
        setConfigPath(data.path || '');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Configuration</h2>
          <p className="text-white/40 text-sm mt-1">Manage API credentials, data sources, and connection settings</p>
          {configPath && (
            <div className="flex items-center space-x-1.5 mt-2">
              <Folder size={11} className="text-white/20" />
              <span className="text-[10px] text-white/20 font-mono break-all">{configPath}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReload}
            className="flex items-center space-x-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all text-white/60"
          >
            <RotateCcw size={13} />
            <span>Reload</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 disabled:opacity-50 rounded-xl text-xs font-bold transition-all text-white shadow-lg shadow-accent-blue/20"
          >
            {saving ? <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" /> : <Save size={13} />}
            <span>{saving ? 'Saving…' : 'Save Config'}</span>
          </button>
        </div>
      </div>

      {/* Save status */}
      {saveStatus && (
        <div className={clsx(
          "flex items-center space-x-2 px-4 py-3 rounded-xl border text-sm font-medium",
          saveStatus === 'ok'
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        )}>
          {saveStatus === 'ok' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span>{saveMsg}</span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center space-x-1 p-1 bg-white/5 rounded-2xl border border-white/5 w-fit">
        {[
          { id: 'form', label: 'Form Editor', icon: Sliders },
          { id: 'json', label: 'Raw JSON', icon: Code2 },
          { id: 'test', label: 'Test Connections', icon: Zap }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={clsx(
              "flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              activeTab === id
                ? "bg-white/10 text-white shadow border border-white/10"
                : "text-white/40 hover:text-white/70"
            )}
          >
            <Icon size={13} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Form Editor ── */}
      {activeTab === 'form' && entry && (
        <div className="space-y-4">
          <div className="glass-card p-6 space-y-4">
            <SectionHeader icon={Settings} title="General" subtitle="Project identification" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Project Name">
                <Input value={entry.name} onChange={v => updateEntry('name', v)} placeholder="e.g. Production Project" />
              </Field>
              <Field label="GCP Project ID" hint="Used for Google Cloud Storage access">
                <Input value={entry.projectID} onChange={v => updateEntry('projectID', v)} placeholder="e.g. my-gcp-project" />
              </Field>
            </div>
          </div>

          <div className="glass-card p-6 space-y-4">
            <SectionHeader icon={Database} title="Google Play Console" subtitle="Cloud Storage bucket & service account" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="GCS Bucket Name" hint="Reports bucket name from Play Console">
                <Input value={entry.bucketName} onChange={v => updateEntry('bucketName', v)} placeholder="pubsite__rev_09780..." />
              </Field>
              <Field label="Service Account Key Path" hint="Relative to config directory">
                <Input value={entry.keyFilePath} onChange={v => updateEntry('keyFilePath', v)} placeholder="keys/service_account.json" />
              </Field>
              <Field label="Play Console URL" hint="Developer console base URL">
                <Input value={entry.PlaystoreConsoleUrl} onChange={v => updateEntry('PlaystoreConsoleUrl', v)} placeholder="https://play.google.com/console/..." />
              </Field>
            </div>
          </div>

          <div className="glass-card p-6 space-y-4">
            <SectionHeader icon={Key} title="Apple App Store Connect" subtitle="App Store Connect API credentials" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Key ID" hint="10-character key identifier">
                <Input value={entry.appleKeyId} onChange={v => updateEntry('appleKeyId', v)} placeholder="e.g. 23L9X2Z6ZC" />
              </Field>
              <Field label="Issuer ID" hint="UUID from App Store Connect → Keys">
                <Input value={entry.appleIssuerId} onChange={v => updateEntry('appleIssuerId', v)} secret placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              </Field>
              <Field label="Vendor ID" hint="Your App Store vendor number">
                <Input value={entry.appleVendorId} onChange={v => updateEntry('appleVendorId', v)} placeholder="e.g. 94070432" />
              </Field>
              <Field label=".p8 Private Key Path" hint="Relative to config directory">
                <Input value={entry.keyFilePath_apple} onChange={v => updateEntry('keyFilePath_apple', v)} placeholder="keys/AuthKey_XXXXXXXX.p8" />
              </Field>
            </div>
          </div>

          <div className="glass-card p-6 space-y-4">
            <SectionHeader icon={Globe} title="Ignored Packages" subtitle="Package IDs to exclude from all statistics" />
            <Field label="Ignored Package Names" hint="One package ID per line">
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-blue transition-colors resize-none custom-scrollbar h-24 font-mono"
                value={(entry.ignoredPackages || []).join('\n')}
                onChange={e => updateEntry('ignoredPackages', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
                placeholder={"com.example.app\nio.another.package"}
              />
            </Field>
          </div>
        </div>
      )}

      {/* ── Raw JSON ── */}
      {activeTab === 'json' && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-start justify-between">
            <SectionHeader icon={Code2} title="Raw JSON Editor" subtitle="Edit config.json directly — syncs with Form Editor" />
            <button
              onClick={() => navigator.clipboard.writeText(rawJson)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[11px] font-bold text-white/50 hover:text-white/80 transition-all border border-white/5 ml-4 flex-shrink-0"
            >
              <Copy size={12} />
              <span>Copy</span>
            </button>
          </div>
          <JsonEditor raw={rawJson} onChange={handleRawChange} />
          <div className="flex items-center space-x-2 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
            <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
            <p className="text-[11px] text-amber-300/70">
              A <code className="font-mono bg-white/5 px-1 rounded">.bak</code> backup is automatically created before each save.
              Edits here sync with the Form Editor.
            </p>
          </div>
        </div>
      )}

      {/* ── Test Connections ── */}
      {activeTab === 'test' && (
        <div className="space-y-4">
          <div className="glass-card p-6">
            <SectionHeader icon={Key} title="Apple App Store Connect" subtitle="Authenticates with the API and lists your registered apps" />
            <div className="grid grid-cols-2 gap-3 mb-5">
              <InfoRow label="Key ID" value={entry?.appleKeyId || '—'} />
              <InfoRow label="Issuer ID" value={entry?.appleIssuerId ? entry.appleIssuerId.substring(0, 14) + '…' : '—'} />
              <InfoRow label="Vendor ID" value={entry?.appleVendorId || '—'} />
              <InfoRow label="Key File" value={entry?.keyFilePath_apple || '—'} mono />
            </div>
            <TestButton platform="apple" authToken={authToken} isStaticMode={isStaticMode} isDemoMode={isDemoMode} />
          </div>

          <div className="glass-card p-6">
            <SectionHeader icon={Database} title="Google Play Console" subtitle="Lists packages from your GCS reports bucket" />
            <div className="grid grid-cols-2 gap-3 mb-5">
              <InfoRow label="Project ID" value={entry?.projectID || '—'} />
              <InfoRow label="Bucket" value={entry?.bucketName || '—'} mono />
              <InfoRow label="Key File" value={entry?.keyFilePath || '—'} mono />
            </div>
            <TestButton platform="google" authToken={authToken} isStaticMode={isStaticMode} isDemoMode={isDemoMode} />
          </div>
        </div>
      )}
    </div>
  );
}
