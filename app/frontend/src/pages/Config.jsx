import React, { useState, useEffect } from 'react';
import {
  Settings, Save, CheckCircle2, XCircle, AlertCircle,
  Zap, Code2, Sliders, Eye, EyeOff,
  Folder, Key, Database, Globe, Copy, RotateCcw, Bot, Coffee,
  Bell, Clock, BookOpen, HelpCircle, ChevronDown, ChevronRight, Search, FileText,
  Layers, Plus, Trash2, GitBranch

} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { TOP_10_TIMEZONES } from '../lib/constants';
import { getNormalizedPairings } from '../lib/projectUtils';


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

function TestButton({ platform, payload, authToken, isStaticMode, isDemoMode }) {
  const [state, setState] = useState('idle');
  const [result, setResult] = useState(null);

  const run = async () => {
    if (isDemoMode) {
      setState('ok');
      if (platform === 'ai') {
        setResult({ success: true, provider: payload?.provider || 'openai', model: payload?.model || 'gpt-4.1-nano', usage: { inputTokens: 4, outputTokens: 2 } });
      } else if (platform === 'ntfy') {
        setResult({ success: true, message: `Test ntfy notification sent to topic '${payload?.topic || 'demo_topic'}'` });
      } else if (platform === 'git') {
        setResult({ success: true, message: `Successfully connected to Git remote repository and verified branch '${payload?.branch || 'main'}' (demo mode)` });
      } else {
        setResult({ success: true, appCount: 3, apps: [{ name: 'Demo App One', bundleId: 'com.demo.one' }, { name: 'Demo App Two', bundleId: 'com.demo.two' }] });
      }
      return;
    }
    setState('loading');
    setResult(null);
    try {
      const options = { method: 'POST' };
      if (payload) {
        options.body = JSON.stringify(payload);
        options.headers = { 'Content-Type': 'application/json' };
      }
      const endpoint = platform === 'ntfy' ? '/api/notifications/test' : `/api/test/${platform}`;
      const res = await apiFetch(endpoint, options, authToken, isStaticMode);
      const data = await res.json();
      setState(data.success ? 'ok' : 'err');
      setResult(data);
    } catch (err) {
      setState('err');
      setResult({ error: err.message });
    }
  };

  const label = platform === 'apple'
    ? 'App Store Connect'
    : platform === 'google'
      ? 'Google Play'
      : platform === 'ntfy'
        ? 'ntfy Notification'
        : platform === 'git'
          ? 'Git Remote Repository'
          : `AI Provider (${payload?.provider || 'active'})`;

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
              {platform === 'ai' ? (
                <div>
                  <div className="font-bold text-emerald-400">✓ Connected to {result.provider} ({result.model})</div>
                  {result.usage && (
                    <div className="text-white/50 text-[10px] mt-0.5">Tokens used: {result.usage.inputTokens || 0} in / {result.usage.outputTokens || 0} out</div>
                  )}
                </div>
              ) : platform === 'ntfy' ? (
                <div>
                  <div className="font-bold text-emerald-400">✓ Push notification sent</div>
                  <div className="text-white/50 text-[10px] mt-0.5">{result.message || `Notification sent to topic '${payload?.topic || 'configured topic'}'`}</div>
                </div>
              ) : (
                <>
                  <div className="font-bold text-emerald-400">✓ Connected — {result.appCount} app{result.appCount !== 1 ? 's' : ''} found</div>
                  {result.apps?.map((a, i) => (
                    <div key={i} className="text-white/50 text-[10px]">• {a.name || a.bundleId || a.packageName}</div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div>
              <div className="font-bold text-rose-400">✗ {platform === 'ntfy' ? 'Notification failed' : 'Connection failed'}</div>
              <div className="text-white/50 mt-1 break-all">{result.error || result.reason}</div>
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

const CONFIG_DOCS_GROUPS = [
  {
    id: 'general',
    title: 'General & GCP Identification',
    subtitle: 'Basic account and project labeling',
    icon: Settings,
    items: [
      {
        name: 'name',
        platform: 'Both',
        required: true,
        summary: 'Display label for this project configuration.',
        description: 'Friendly name displayed in header dropdowns and dashboards when switching between multi-account configurations.',
        example: '"Production App Portfolio"'
      },
      {
        name: 'projectID',
        platform: 'Google',
        required: true,
        summary: 'Google Cloud Platform (GCP) Project ID.',
        description: 'The GCP project ID string associated with your Google Cloud Storage bucket where Play Console exports daily CSV reports.',
        example: '"my-gcp-project-1234"',
        location: 'GCP Console → Top header Project Selector'
      }
    ]
  },
  {
    id: 'google',
    title: 'Google Play Console',
    subtitle: 'Cloud Storage reports URI and service account JSON key',
    icon: Database,
    items: [
      {
        name: 'bucketName',
        platform: 'Google',
        required: true,
        summary: 'GCS Report bucket ID from Google Play Console.',
        description: 'The Cloud Storage bucket name string where Google automatically uploads financial and install report CSVs.',
        example: '"pubsite_prod_12345678901234567890"',
        location: 'Play Console → Download reports → Statistics → Copy Cloud Storage URI (substring right after gs://)'
      },
      {
        name: 'keyFilePath',
        platform: 'Google',
        required: true,
        summary: 'Path to GCP Service Account JSON key file.',
        description: 'Relative filepath from config.json (or config/ directory) to the GCP service account JSON key file with Storage Object Viewer permissions.',
        example: '"keys/service_account.json"'
      },
      {
        name: 'PlaystoreConsoleUrl',
        platform: 'Google',
        required: false,
        summary: 'Developer Play Console homepage URL.',
        description: 'Base URL for your developer account to enable direct deep-linking to apps in Play Console from the dashboard UI.',
        example: '"https://play.google.com/console/u/0/developers/1234567890"'
      }
    ]
  },
  {
    id: 'apple',
    title: 'Apple App Store Connect',
    subtitle: 'App Store Connect API credentials and .p8 key',
    icon: Key,
    items: [
      {
        name: 'appleIssuerId',
        platform: 'Apple',
        required: true,
        summary: 'App Store Connect API Issuer ID (UUID).',
        description: 'Organization UUID string identifying your App Store Connect account for API authentication JWT signing.',
        example: '"9b28a110-xxxx-xxxx-xxxx-xxxxxxxxxxxx"',
        location: 'App Store Connect → Users and Access → Integrations (Keys) → Issuer ID at top'
      },
      {
        name: 'appleKeyId',
        platform: 'Apple',
        required: true,
        summary: '10-character App Store Connect Key ID.',
        description: '10-character key identifier string paired with your .p8 private key file.',
        example: '"23L9X2Z6ZC"',
        location: 'App Store Connect → Users and Access → Integrations (Keys) → Key ID'
      },
      {
        name: 'appleVendorId',
        platform: 'Apple',
        required: false,
        summary: '8-digit Apple Vendor Number.',
        description: 'Your 8-digit App Store vendor ID for downloading financial report archives.',
        example: '"84070432"',
        location: 'App Store Connect → Payments and Financial Reports → Vendor Number at top-left'
      },
      {
        name: 'keyFilePath_apple',
        platform: 'Apple',
        required: true,
        summary: 'Path to .p8 Private Key File.',
        description: 'Relative path to your AuthKey_XXXXXXXX.p8 key file inside data/config/ directory.',
        example: '"keys/AuthKey_23L9X2Z6ZC.p8"'
      }
    ]
  },
  {
    id: 'notifications',
    title: 'Push Notifications & Auto-Refresh',
    subtitle: 'ntfy.sh push alerts and background stats ingestion schedule',
    icon: Bell,
    items: [
      {
        name: 'ntfyTopic',
        platform: 'Notifications',
        required: false,
        summary: 'ntfy.sh topic name string for mobile/desktop push alerts.',
        description: 'Unique secret topic string subscribed to on ntfy.sh (iOS, Android, Browser). Leave empty ("") to disable push notifications entirely.',
        example: '"my_secret_apprankly_alerts"'
      },
      {
        name: 'refreshIntervalHours',
        platform: 'Scheduler',
        required: false,
        default: '1',
        summary: 'Auto-sync frequency in hours.',
        description: 'Background poll frequency in hours to check App Store Connect API & GCS bucket for newly released daily CSV reports.',
        example: '1 (check every hour)'
      },
      {
        name: 'statsCheckRangeDays',
        platform: 'Scheduler',
        required: false,
        default: '30',
        summary: 'Lookback window in days for data ingestion checks.',
        description: 'Number of past days to inspect for missing daily data entries during background check runs.',
        example: '30'
      },
      {
        name: 'activeStartHour',
        platform: 'Scheduler',
        required: false,
        default: '9',
        summary: 'Scheduler active window start hour (0-23).',
        description: 'Local hour (0 to 23) when background checks and push notification alerts begin active operation.',
        example: '9 (9:00 AM)'
      },
      {
        name: 'activeEndHour',
        platform: 'Scheduler',
        required: false,
        default: '20',
        summary: 'Scheduler active window end hour (0-23).',
        description: 'Local hour (0 to 23) when background checks and push notification alerts stop.',
        example: '20 (8:00 PM)'
      },
      {
        name: 'timezone',
        platform: 'Scheduler',
        required: false,
        default: 'Server local time',
        summary: 'Target IANA Timezone for active window evaluation.',
        description: 'Optional IANA timezone string (e.g. America/New_York, UTC, Europe/London, Asia/Tokyo) used to calculate active start and end hours. Choose from the top 10 global timezones dropdown or enter a custom timezone. Defaults to server system time if empty.',
        example: '"America/New_York"'
      }

    ]
  },
  {
    id: 'ai',
    title: 'AI & ASO Service Configuration',
    subtitle: 'OpenAI, Anthropic Claude, and Google Gemini models & keys',
    icon: Bot,
    items: [
      {
        name: 'ai.defaultProvider',
        platform: 'AI / ASO',
        required: false,
        default: 'openai',
        summary: 'Active default AI provider for ASO keywords & listing optimizations.',
        description: 'Choice of active provider engine: "openai", "anthropic", or "gemini".',
        example: '"openai"'
      },
      {
        name: 'ai.providers.[provider].apiKey',
        platform: 'AI / ASO',
        required: false,
        summary: 'Secret API key for the selected AI provider.',
        description: 'API key for OpenAI (sk-...), Anthropic (sk-ant-...), or Google Gemini (AIzaSy...).',
        example: '"sk-proj-xxxxxxxxxxxxxxxxxxxx"'
      },
      {
        name: 'ai.providers.[provider].model',
        platform: 'AI / ASO',
        required: false,
        summary: 'Model ID string for text generations.',
        description: 'Selected LLM model version (e.g. gpt-4.1-nano, claude-3-5-sonnet-20241022, gemini-3.6-flash).',
        example: '"gpt-4.1-nano"'
      }
    ]
  },
  {
    id: 'filtering',
    title: 'Filtering & Custom Metadata',
    subtitle: 'Ignored app packages and custom app console metadata',
    icon: Globe,
    items: [
      {
        name: 'ignoredPackages',
        platform: 'Both',
        required: false,
        summary: 'Array of package names or bundle IDs to exclude.',
        description: 'App package IDs or bundle IDs that will be ignored and excluded from all dashboard metrics and notification summaries.',
        example: '["com.example.internaltest", "com.example.deprecated"]'
      },
      {
        name: 'combinedApps',
        platform: 'Both',
        required: false,
        summary: 'Combines stats for multi-platform apps (Android package + iOS bundle ID).',
        description: 'Array of custom app pairings allowing Android and iOS packages to be merged into a single multi-platform app view. Supports array format [{ name, android, ios }], dictionary format, or tuple format ["android_pkg", "ios_bundle"]. Also supports aliases: crossPlatformApps, pairedApps, appPairings, pairs.',
        example: '[\n  {\n    "name": "CardTrack",\n    "android": "io.github.zmsp.cardtrack",\n    "ios": "io.github.zmsp.cardtrack.ios"\n  }\n]'
      },
      {
        name: 'appMetadata.[packageId].consoleAppId',
        platform: 'Google',
        required: false,
        summary: 'Internal Play Console app identifier.',
        description: 'Google Play Console numeric app ID for direct deep-linking from app detail cards to Play Console dashboards.',
        example: '"4973829104829183921"',
        location: 'Play Console → Select app → URL string after /app/'
      }
    ]
  },
  {
    id: 'env',
    title: 'Environment Variables (System / Docker)',
    subtitle: 'Server environment overrides',
    icon: FileText,
    items: [
      {
        name: 'PORT',
        platform: 'Server',
        required: false,
        default: '3000',
        summary: 'Web server HTTP listening port.',
        description: 'Port number on which the Node.js backend server listens.',
        example: '3000'
      },
      {
        name: 'JWT_SECRET',
        platform: 'Security',
        required: false,
        summary: 'Secret key for signing admin JWT session tokens.',
        description: 'Custom secret string for encrypting user session tokens.',
        example: '"my_super_secret_jwt_key_123"'
      },
      {
        name: 'CONFIG_PATH',
        platform: 'Server',
        required: false,
        default: '/app/data/config/config.json',
        summary: 'Override path to global config.json file.',
        description: 'Custom path if config.json is mounted outside default directories.',
        example: '"/custom/path/config.json"'
      },
      {
        name: 'NTFY_TOPIC',
        platform: 'Notifications',
        required: false,
        summary: 'Fallback ntfy topic environment variable.',
        description: 'Used if ntfyTopic is omitted from config.json file.',
        example: '"my_fallback_topic"'
      },
      {
        name: 'GIT_NOTES_ENABLED',
        platform: 'Git Notes',
        required: false,
        default: 'false',
        summary: 'Enable auto-commit & push to Git for per-app Markdown notes.',
        description: 'When set to true, every note save or deletion is committed and pushed to your configured Git repository.',
        example: '"true"'
      },
      {
        name: 'GIT_NOTES_BRANCH',
        platform: 'Git Notes',
        required: false,
        default: 'main',
        summary: 'Target Git branch for committing notes.',
        description: 'Branch name to push notes to.',
        example: '"main"'
      },
      {
        name: 'GIT_REMOTE_URL',
        platform: 'Git Notes',
        required: false,
        summary: 'Remote Git repository URL for notes.',
        description: 'HTTPS URL of target Git repository (e.g. GitHub/GitLab).',
        example: '"https://github.com/username/app-notes.git"'
      },
      {
        name: 'GIT_USERNAME',
        platform: 'Git Notes',
        required: false,
        summary: 'Git authentication username.',
        description: 'Username or account email for HTTPS Git authentication.',
        example: '"myusername"'
      },
      {
        name: 'GIT_PASSWORD',
        platform: 'Git Notes',
        required: false,
        summary: 'Git authentication password or Personal Access Token (PAT).',
        description: 'Personal access token with repo write scope for pushing commits.',
        example: '"ghp_xxxxxxxxxxxxxxxxxxxx"'
      }
    ]
  }
];


function ExpandableVarItem({ item, search = '' }) {
  const [expanded, setExpanded] = useState(false);

  const matchesSearch = search && (
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.summary.toLowerCase().includes(search.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(search.toLowerCase())) ||
    (item.platform && item.platform.toLowerCase().includes(search.toLowerCase()))
  );

  const isOpen = expanded || Boolean(search && matchesSearch);

  return (
    <div className={clsx(
      "px-5 py-3.5 transition-colors border-b border-white/5 last:border-0",
      isOpen ? "bg-white/5" : "hover:bg-white/3"
    )}>
      <div
        className="flex items-start justify-between cursor-pointer group"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="space-y-1.5 pr-4 flex-1">
          <div className="flex items-center space-x-2 flex-wrap gap-1.5">
            <code className="text-xs font-bold text-accent-blue font-mono bg-accent-blue/10 px-2 py-0.5 rounded-md border border-accent-blue/20">
              {item.name}
            </code>
            {item.required ? (
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">
                Required
              </span>
            ) : (
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40">
                Optional
              </span>
            )}
            {item.platform && (
              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                {item.platform}
              </span>
            )}
            {item.default && (
              <span className="text-[9px] font-mono text-white/40">
                default: <code className="text-white/70">{item.default}</code>
              </span>
            )}
          </div>
          <p className="text-xs text-white/80 font-medium">{item.summary}</p>
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(e => !e); }}
          className="text-white/30 group-hover:text-white/70 p-1 flex-shrink-0 mt-0.5 transition-colors"
        >
          {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-3 text-xs text-white/60 space-y-2 pl-3.5 border-l-2 border-accent-blue/50 pt-1 pb-1 font-sans">
          {item.description && <p className="leading-relaxed">{item.description}</p>}
          {item.example && (
            <div className="flex items-center space-x-2 text-[11px] pt-1">
              <span className="text-white/40 font-bold uppercase tracking-wider text-[9px] flex-shrink-0">Example:</span>
              <code className="font-mono bg-black/40 px-2 py-0.5 rounded text-emerald-300 border border-white/10 break-all">{item.example}</code>
            </div>
          )}
          {item.location && (
            <div className="flex items-start space-x-2 text-[11px] text-white/50 pt-0.5">
              <span className="font-bold uppercase tracking-wider text-[9px] text-white/30 flex-shrink-0">Where to find:</span>
              <span>{item.location}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExpandableDocGroup({ group, search = '', defaultOpen = false }) {
  const matchingItems = group.items.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.platform && item.platform.toLowerCase().includes(q))
    );
  });

  const [open, setOpen] = useState(defaultOpen || Boolean(search));

  useEffect(() => {
    if (search) setOpen(true);
  }, [search]);

  if (search && matchingItems.length === 0) return null;

  const Icon = group.icon;

  return (
    <div className="border border-white/10 rounded-2xl bg-white/5 overflow-hidden transition-all shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
            <Icon size={16} className="text-accent-blue" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white flex items-center space-x-2">
              <span>{group.title}</span>
            </h4>
            {group.subtitle && <p className="text-[11px] text-white/40 mt-0.5">{group.subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 font-mono">
            {matchingItems.length} field{matchingItems.length !== 1 ? 's' : ''}
          </span>
          {open ? <ChevronDown size={16} className="text-white/40" /> : <ChevronRight size={16} className="text-white/40" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-white/10 bg-black/20">
          {matchingItems.map((item, idx) => (
            <ExpandableVarItem key={idx} item={item} search={search} />
          ))}
        </div>
      )}
    </div>
  );
}

function ConfigDocsSection() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-4">
      <div className="glass-card p-6 space-y-4">
        <SectionHeader
          icon={BookOpen}
          title="Configuration Variables & Documentation Reference"
          subtitle="Interactive reference for all config.json fields, credentials, and system environment variables"
        />

        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search configuration variables (e.g. ntfyTopic, issuer, GCP, bucketName)..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:border-accent-blue transition-colors text-white"
          />
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {CONFIG_DOCS_GROUPS.map((group) => (
          <ExpandableDocGroup key={group.id} group={group} search={search} defaultOpen={false} />
        ))}
      </div>
    </div>
  );
}

export default function Config({ authToken, isStaticMode, isDemoMode, fetchAiStatus }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [saveMsg, setSaveMsg] = useState('');
  const [activeTab, setActiveTab] = useState('form');
  const [showInlineDocs, setShowInlineDocs] = useState(false);
  const [config, setConfig] = useState(null);
  const [initialConfigJson, setInitialConfigJson] = useState('');
  const [rawJson, setRawJson] = useState('');
  const [configPath, setConfigPath] = useState('');
  const [aiUsage, setAiUsage] = useState(null);
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [isCustomTz, setIsCustomTz] = useState(false);


  useEffect(() => {
    if (!authToken) return;
    fetch('/api/aso/ai/usage', {
      headers: { Authorization: `Bearer ${authToken}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setAiUsage(data))
      .catch(() => {});

    apiFetch('/api/notifications/status', {}, authToken, isStaticMode)
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setSchedulerStatus(data))
      .catch(() => {});
  }, [authToken, isStaticMode]);

  const currentJson = JSON.stringify(config, null, 2);
  const isDirty = initialConfigJson && currentJson !== initialConfigJson;

  // Unsaved changes browser navigation confirmation
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved configuration changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const confirmTabSwitch = (newTab) => {
    if (isDirty && activeTab === 'form' && newTab === 'test') {
      const confirmLeave = window.confirm('You have unsaved configuration changes. Switching to Test Connections will use the saved config. Please save your changes first or click OK to proceed anyway.');
      if (!confirmLeave) return;
    }
    setActiveTab(newTab);
  };

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
          ntfyTopic: '',
          refreshIntervalHours: 1,
          statsCheckRangeDays: 30,
          activeStartHour: 9,
          activeEndHour: 20,
          timezone: '',
          ignoredPackages: ['com.example.ignored'],
          appMetadata: {},
          ai: {
            defaultProvider: 'openai',
            providers: {
              openai: { apiKey: '', model: 'gpt-5-nano' },
              anthropic: { apiKey: '', model: 'claude-haiku-4-5-20251001' },
              gemini: { apiKey: '', model: 'gemini-2.5-flash-lite' }
            }
          }
        }];
        setConfig(demo);
        const str = JSON.stringify(demo, null, 2);
        setRawJson(str);
        setInitialConfigJson(str);
        setConfigPath('/data/config/config.json (demo mode)');
        setLoading(false);
        return;
      }
      try {
        const res = await apiFetch('/api/config', {}, authToken, isStaticMode);
        if (res.ok) {
          const data = await res.json();
          setConfig(data.config);
          const str = JSON.stringify(data.config, null, 2);
          setRawJson(str);
          setInitialConfigJson(str);
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

  const entry = (Array.isArray(config) ? config[0] : config) || {};

  const updateEntry = (key, value) => {
    if (!config || (Array.isArray(config) && config.length === 0)) {
      const newConfig = [{ [key]: value }];
      setConfig(newConfig);
      setRawJson(JSON.stringify(newConfig, null, 2));
      return;
    }
    const updated = Array.isArray(config)
      ? config.map((c, i) => i === 0 ? { ...c, [key]: value } : c)
      : { ...config, [key]: value };
    setConfig(updated);
    setRawJson(JSON.stringify(updated, null, 2));
  };

  const handleRawChange = (val) => {
    setRawJson(val);
    try { const parsed = JSON.parse(val); setConfig(parsed); } catch (_) { }
  };

  const handleSave = async () => {
    if (isDemoMode) {
      setSaveStatus('ok');
      setSaveMsg('Config changes noted (demo mode — not persisted to disk)');
      setInitialConfigJson(currentJson);
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
        setInitialConfigJson(currentJson);
        if (fetchAiStatus) fetchAiStatus();
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
    if (isDirty) {
      const confirmDiscard = window.confirm('You have unsaved changes. Are you sure you want to reload from disk and discard your changes?');
      if (!confirmDiscard) return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/config', {}, authToken, isStaticMode);
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        const str = JSON.stringify(data.config, null, 2);
        setRawJson(str);
        setInitialConfigJson(str);
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
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold">Configuration</h2>
            {isDirty && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400">
                Unsaved Changes
              </span>
            )}
          </div>
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
            className={clsx(
              "flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all text-white shadow-lg",
              isDirty
                ? "bg-accent-blue hover:bg-accent-blue/80 shadow-accent-blue/30 ring-2 ring-accent-blue/50 animate-pulse"
                : "bg-white/10 hover:bg-white/15 border border-white/10"
            )}
          >
            {saving ? <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" /> : <Save size={13} />}
            <span>{saving ? 'Saving…' : isDirty ? 'Save Config *' : 'Save Config'}</span>
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
          { id: 'test', label: 'Test Connections', icon: Zap },
          { id: 'docs', label: 'Variable Docs', icon: BookOpen }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => confirmTabSwitch(id)}
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
          {/* Expandable Variable Docs Helper Banner */}
          <div className="border border-white/10 rounded-2xl bg-white/5 p-4 space-y-3">
            <button
              onClick={() => setShowInlineDocs(s => !s)}
              className="w-full flex items-center justify-between text-xs font-bold text-white/70 hover:text-white transition-colors"
            >
              <div className="flex items-center space-x-2">
                <HelpCircle size={15} className="text-accent-blue" />
                <span>Configuration Fields & Variable Help Guide</span>
              </div>
              <div className="flex items-center space-x-1 text-white/40 text-[11px]">
                <span>{showInlineDocs ? 'Hide Quick Docs' : 'Expand Docs & Help'}</span>
                {showInlineDocs ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            </button>
            {showInlineDocs && (
              <div className="pt-2 border-t border-white/5 space-y-3">
                <p className="text-xs text-white/60">
                  Expand any field below to view descriptions, example values, and where to retrieve required credentials.
                </p>
                {CONFIG_DOCS_GROUPS.map((group) => (
                  <ExpandableDocGroup key={group.id} group={group} defaultOpen={false} />
                ))}
              </div>
            )}
          </div>
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
            <SectionHeader icon={Database} title="Google Play Console" subtitle="Cloud Storage bucket & service account">
              <TestButton platform="google" authToken={authToken} isStaticMode={isStaticMode} isDemoMode={isDemoMode} />
            </SectionHeader>
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
            <SectionHeader icon={Key} title="Apple App Store Connect" subtitle="App Store Connect API credentials">
              <TestButton platform="apple" authToken={authToken} isStaticMode={isStaticMode} isDemoMode={isDemoMode} />
            </SectionHeader>
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

          {/* Push Notifications & Auto-Refresh Section */}
          <div className="glass-card p-6 space-y-5">
            <SectionHeader
              icon={Bell}
              title="Push Notifications & Auto-Refresh"
              subtitle="Configure ntfy.sh push alerts and background stats ingestion schedule"
            >
              <TestButton
                platform="ntfy"
                payload={{ topic: entry.ntfyTopic }}
                authToken={authToken}
                isStaticMode={isStaticMode}
                isDemoMode={isDemoMode}
              />
            </SectionHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="ntfy.sh Topic Name (ntfyTopic)"
                hint="Topic string for push notifications (e.g. my_secret_topic). Leave empty to turn alerts OFF."
              >
                <Input
                  value={entry.ntfyTopic}
                  onChange={v => updateEntry('ntfyTopic', v)}
                  placeholder="e.g. my_apprankly_alerts"
                />
              </Field>

              <Field
                label="Refresh Interval (Hours)"
                hint="Frequency in hours to poll store servers for new stats (default: 1 hour)"
              >
                <select
                  value={entry.refreshIntervalHours !== undefined ? entry.refreshIntervalHours : 1}
                  onChange={e => updateEntry('refreshIntervalHours', Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-blue transition-colors text-white"
                >
                  <option value={1} className="bg-slate-900 text-white">Every 1 Hour (Default)</option>
                  <option value={2} className="bg-slate-900 text-white">Every 2 Hours</option>
                  <option value={3} className="bg-slate-900 text-white">Every 3 Hours</option>
                  <option value={6} className="bg-slate-900 text-white">Every 6 Hours</option>
                  <option value={12} className="bg-slate-900 text-white">Every 12 Hours</option>
                  <option value={24} className="bg-slate-900 text-white">Every 24 Hours</option>
                </select>
              </Field>

              <Field
                label="Lookback Range (Days)"
                hint="Number of days to inspect for missing/updated daily reports (default: 30 days)"
              >
                <Input
                  type="number"
                  value={entry.statsCheckRangeDays !== undefined ? entry.statsCheckRangeDays : 30}
                  onChange={v => updateEntry('statsCheckRangeDays', v === '' ? '' : Number(v))}
                  placeholder="30"
                />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="Active Start Hour"
                  hint="0-23 (e.g. 9 = 9 AM)"
                >
                  <Input
                    type="number"
                    value={entry.activeStartHour !== undefined ? entry.activeStartHour : 9}
                    onChange={v => updateEntry('activeStartHour', v === '' ? '' : Number(v))}
                    placeholder="9"
                  />
                </Field>
                <Field
                  label="Active End Hour"
                  hint="0-23 (e.g. 20 = 8 PM)"
                >
                  <Input
                    type="number"
                    value={entry.activeEndHour !== undefined ? entry.activeEndHour : 20}
                    onChange={v => updateEntry('activeEndHour', v === '' ? '' : Number(v))}
                    placeholder="20"
                  />
                </Field>
              </div>

              <Field
                label="Scheduler Timezone"
                hint="Select from top 10 global timezones or enter a custom IANA timezone for active hours evaluation"
              >
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1">
                      <select
                        value={
                          entry.timezone === '' || entry.timezone === undefined || entry.timezone === null
                            ? ''
                            : isCustomTz
                              ? '__custom__'
                              : TOP_10_TIMEZONES.some(tz => tz.value === entry.timezone) ||
                                entry.timezone === Intl.DateTimeFormat().resolvedOptions().timeZone
                                ? entry.timezone
                                : '__custom__'
                        }
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '__custom__') {
                            setIsCustomTz(true);
                          } else {
                            setIsCustomTz(false);
                            updateEntry('timezone', val);
                          }
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-blue transition-colors text-white"
                      >
                        <option value="" className="bg-slate-900 text-white">
                          Default (Server Timezone: {schedulerStatus?.config?.serverTimezone || 'System local'})
                        </option>
                        <optgroup label="Top 10 Timezones" className="bg-slate-900 text-accent-blue font-bold">
                          {TOP_10_TIMEZONES.map(tz => (
                            <option key={tz.value} value={tz.value} className="bg-slate-900 text-white font-sans">
                              {tz.label}
                            </option>
                          ))}
                        </optgroup>
                        {!TOP_10_TIMEZONES.some(tz => tz.value === Intl.DateTimeFormat().resolvedOptions().timeZone) && (
                          <option value={Intl.DateTimeFormat().resolvedOptions().timeZone} className="bg-slate-900 text-emerald-300">
                            Browser Timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                          </option>
                        )}
                        {entry.timezone &&
                         entry.timezone !== '' &&
                         !TOP_10_TIMEZONES.some(tz => tz.value === entry.timezone) &&
                         entry.timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone && (
                          <option value={entry.timezone} className="bg-slate-900 text-amber-300">
                            Custom: {entry.timezone}
                          </option>
                        )}
                        <option value="__custom__" className="bg-slate-900 text-white/70 italic">
                          ✍️ Enter Other Custom Timezone...
                        </option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => { setIsCustomTz(false); updateEntry('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone); }}
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white/70 hover:text-white transition-colors"
                        title="Set to your browser's current timezone"
                      >
                        Browser ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsCustomTz(false); updateEntry('timezone', 'UTC'); }}
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white/70 hover:text-white transition-colors"
                      >
                        UTC
                      </button>
                    </div>
                  </div>

                  {(isCustomTz || (entry.timezone && !TOP_10_TIMEZONES.some(tz => tz.value === entry.timezone) && entry.timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone && entry.timezone !== '')) && (
                    <div className="pt-1">
                      <Input
                        type="text"
                        value={entry.timezone || ''}
                        onChange={v => updateEntry('timezone', v)}
                        placeholder="Enter IANA timezone string (e.g. Asia/Kolkata, America/Sao_Paulo)"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-white/40 px-1 pt-0.5">
                    <span>Active Timezone: <span className="text-emerald-400 font-semibold">{entry.timezone || schedulerStatus?.config?.serverTimezone || 'Server System Local'}</span></span>
                    <span>Your Browser: <span className="text-white/70 font-semibold">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span></span>
                  </div>
                </div>
              </Field>

            </div>

            <div className="p-3.5 bg-white/3 rounded-xl border border-white/5 text-[11px] text-white/50 space-y-1">
              <div className="font-bold text-white/70 flex items-center space-x-1.5">
                <Clock size={13} className="text-accent-blue" />
                <span>Background Scheduler Summary</span>
              </div>
              <p>
                Auto-refresh polls store APIs every <span className="text-white/80 font-semibold">{entry.refreshIntervalHours || 1}h</span> between <span className="text-white/80 font-semibold">{entry.activeStartHour !== undefined ? entry.activeStartHour : 9}:00</span> and <span className="text-white/80 font-semibold">{entry.activeEndHour !== undefined ? entry.activeEndHour : 20}:00</span> <span className="text-white/60">({entry.timezone ? `Timezone: ${entry.timezone}` : `Server Timezone: ${schedulerStatus?.config?.serverTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone}`})</span>, checking the past <span className="text-white/80 font-semibold">{entry.statsCheckRangeDays || 30} days</span>.
              </p>
              <p className="pt-0.5">
                {entry.ntfyTopic && entry.ntfyTopic.trim() ? (
                  <span className="text-emerald-400 font-semibold">✓ Push alerts ACTIVE via ntfy.sh topic "{entry.ntfyTopic.trim()}"</span>
                ) : (
                  <span className="text-amber-400/80">⚠️ Push alerts OFF (ntfyTopic is empty). Set a topic to receive mobile/desktop notifications when stats refresh.</span>
                )}
              </p>
            </div>
          </div>

          {/* Git Repository & Notes Auto-Sync Section */}
          <div className="glass-card p-6 space-y-5">
            <SectionHeader
              icon={GitBranch}
              title="Git Repository & Notes Auto-Sync"
              subtitle="Automatically commit and push per-app Markdown notes to a remote Git repository"
            >
              <TestButton
                platform="git"
                payload={{
                  remoteUrl: entry.gitNotes?.remoteUrl,
                  branch: entry.gitNotes?.branch,
                  username: entry.gitNotes?.username,
                  password: entry.gitNotes?.password
                }}
                authToken={authToken}
                isStaticMode={isStaticMode}
                isDemoMode={isDemoMode}
              />
            </SectionHeader>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 bg-white/5 border border-white/10 p-3.5 rounded-xl">
                <input
                  type="checkbox"
                  id="git-notes-enabled"
                  checked={Boolean(entry.gitNotes?.enabled)}
                  onChange={e => {
                    const currentGit = entry.gitNotes || {};
                    updateEntry('gitNotes', { ...currentGit, enabled: e.target.checked });
                  }}
                  className="w-4 h-4 rounded border-slate-700 text-accent-blue focus:ring-0 accent-accent-blue cursor-pointer"
                />
                <label htmlFor="git-notes-enabled" className="text-xs font-bold text-white cursor-pointer select-none">
                  Enable Automatic Git Commit & Push for Notes
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Git Remote Repository URL"
                  hint="HTTPS URL of remote Git repository (e.g. https://github.com/user/app-notes.git)"
                >
                  <Input
                    value={entry.gitNotes?.remoteUrl || ''}
                    onChange={v => {
                      const currentGit = entry.gitNotes || {};
                      updateEntry('gitNotes', { ...currentGit, remoteUrl: v });
                    }}
                    placeholder="https://github.com/username/app-notes.git"
                  />
                </Field>

                <Field
                  label="Git Branch"
                  hint="Target branch to commit and push notes (default: main)"
                >
                  <Input
                    value={entry.gitNotes?.branch || 'main'}
                    onChange={v => {
                      const currentGit = entry.gitNotes || {};
                      updateEntry('gitNotes', { ...currentGit, branch: v });
                    }}
                    placeholder="main"
                  />
                </Field>

                <Field
                  label="Git Username"
                  hint="Username or email for HTTPS Git authentication"
                >
                  <Input
                    value={entry.gitNotes?.username || ''}
                    onChange={v => {
                      const currentGit = entry.gitNotes || {};
                      updateEntry('gitNotes', { ...currentGit, username: v });
                    }}
                    placeholder="e.g. my-github-username"
                  />
                </Field>

                <Field
                  label="Git Password / Access Token"
                  hint="Personal Access Token (PAT) with repository write permissions"
                >
                  <Input
                    secret
                    value={entry.gitNotes?.password || ''}
                    onChange={v => {
                      const currentGit = entry.gitNotes || {};
                      updateEntry('gitNotes', { ...currentGit, password: v });
                    }}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 space-y-5">

            <SectionHeader icon={Bot} title="AI & ASO Configuration" subtitle="Configure AI models (OpenAI, Anthropic Claude, Google Gemini) for automated ASO analysis">
              <TestButton
                platform="ai"
                payload={{
                  provider: entry.ai?.defaultProvider || 'openai',
                  model: entry.ai?.providers?.[entry.ai?.defaultProvider || 'openai']?.model,
                  apiKey: entry.ai?.providers?.[entry.ai?.defaultProvider || 'openai']?.apiKey
                }}
                authToken={authToken}
                isStaticMode={isStaticMode}
                isDemoMode={isDemoMode}
              />
            </SectionHeader>

            <div className="max-w-xs">
              <Field label="Default Active Provider" hint="Provider to use for AI generations">
                <select
                  value={entry.ai?.defaultProvider || 'openai'}
                  onChange={e => {
                    const currentAi = entry.ai || {};
                    updateEntry('ai', { ...currentAi, defaultProvider: e.target.value });
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-blue transition-colors text-white"
                >
                  <option value="openai" className="bg-slate-900 text-white">OpenAI (ChatGPT)</option>
                  <option value="anthropic" className="bg-slate-900 text-white">Anthropic (Claude)</option>
                  <option value="gemini" className="bg-slate-900 text-white">Google Gemini</option>
                </select>
              </Field>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-white/50">Provider API Credentials & Models</div>

              {/* OpenAI Block */}
              <div className="p-4 rounded-xl bg-white/3 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-accent-blue flex items-center space-x-2">
                    <span>OpenAI</span>
                  </div>
                  <TestButton
                    platform="ai"
                    payload={{
                      provider: 'openai',
                      model: entry.ai?.providers?.openai?.model || 'gpt-4.1-nano',
                      apiKey: entry.ai?.providers?.openai?.apiKey
                    }}
                    authToken={authToken}
                    isStaticMode={isStaticMode}
                    isDemoMode={isDemoMode}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="OpenAI Model" hint="Select or enter model ID">
                    <select
                      value={entry.ai?.providers?.openai?.model || 'gpt-5-nano'}
                      onChange={e => {
                        const currentAi = entry.ai || {};
                        const providers = currentAi.providers || {};
                        const openai = providers.openai || {};
                        updateEntry('ai', {
                          ...currentAi,
                          providers: { ...providers, openai: { ...openai, model: e.target.value } }
                        });
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-blue transition-colors text-white"
                    >
                      <option value="gpt-5-nano" className="bg-slate-900 text-white">gpt-5-nano (Lightweight)</option>
                      <option value="gpt-4o-mini" className="bg-slate-900 text-white">gpt-4o-mini</option>
                      <option value="gpt-4o" className="bg-slate-900 text-white">gpt-4o (Flagship Multimodal)</option>
                      <option value="o3-mini" className="bg-slate-900 text-white">o3-mini (Reasoning)</option>
                    </select>
                  </Field>
                  <Field label="OpenAI API Key" hint="Secret key (sk-...)">
                    <Input
                      secret
                      value={entry.ai?.providers?.openai?.apiKey || ''}
                      onChange={v => {
                        const currentAi = entry.ai || {};
                        const providers = currentAi.providers || {};
                        const openai = providers.openai || {};
                        updateEntry('ai', {
                          ...currentAi,
                          providers: { ...providers, openai: { ...openai, apiKey: v } }
                        });
                      }}
                      placeholder="sk-..."
                    />
                  </Field>
                </div>
              </div>

              {/* Anthropic Claude Block */}
              <div className="p-4 rounded-xl bg-white/3 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-amber-400 flex items-center space-x-2">
                    <span>Anthropic (Claude)</span>
                  </div>
                  <TestButton
                    platform="ai"
                    payload={{
                      provider: 'anthropic',
                      model: entry.ai?.providers?.anthropic?.model || 'claude-3-5-sonnet-20241022',
                      apiKey: entry.ai?.providers?.anthropic?.apiKey
                    }}
                    authToken={authToken}
                    isStaticMode={isStaticMode}
                    isDemoMode={isDemoMode}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Claude Model" hint="Select model ID">
                    <select
                      value={entry.ai?.providers?.anthropic?.model || 'claude-haiku-4-5-20251001'}
                      onChange={e => {
                        const currentAi = entry.ai || {};
                        const providers = currentAi.providers || {};
                        const anthropic = providers.anthropic || {};
                        updateEntry('ai', {
                          ...currentAi,
                          providers: { ...providers, anthropic: { ...anthropic, model: e.target.value } }
                        });
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-blue transition-colors text-white"
                    >
                      <option value="claude-haiku-4-5-20251001" className="bg-slate-900 text-white">claude-haiku-4.5 (Fast)</option>
                      <option value="claude-3-5-haiku-latest" className="bg-slate-900 text-white">claude-3-5-haiku-latest</option>
                      <option value="claude-3-5-sonnet-latest" className="bg-slate-900 text-white">claude-3-5-sonnet-latest (Recommended)</option>
                      <option value="claude-3-opus-20240229" className="bg-slate-900 text-white">claude-3-opus-20240229 (Complex Reasoning)</option>
                    </select>
                  </Field>
                  <Field label="Anthropic API Key" hint="Secret key (sk-ant-...)">
                    <Input
                      secret
                      value={entry.ai?.providers?.anthropic?.apiKey || ''}
                      onChange={v => {
                        const currentAi = entry.ai || {};
                        const providers = currentAi.providers || {};
                        const anthropic = providers.anthropic || {};
                        updateEntry('ai', {
                          ...currentAi,
                          providers: { ...providers, anthropic: { ...anthropic, apiKey: v } }
                        });
                      }}
                      placeholder="sk-ant-..."
                    />
                  </Field>
                </div>
              </div>

              {/* Google Gemini Block */}
              <div className="p-4 rounded-xl bg-white/3 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-emerald-400 flex items-center space-x-2">
                    <span>Google Gemini</span>
                  </div>
                  <TestButton
                    platform="ai"
                    payload={{
                      provider: 'gemini',
                      model: entry.ai?.providers?.gemini?.model || 'gemini-2.5-pro',
                      apiKey: entry.ai?.providers?.gemini?.apiKey
                    }}
                    authToken={authToken}
                    isStaticMode={isStaticMode}
                    isDemoMode={isDemoMode}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Gemini Model" hint="Select model ID">
                    <select
                      value={entry.ai?.providers?.gemini?.model || 'gemini-2.5-flash-lite'}
                      onChange={e => {
                        const currentAi = entry.ai || {};
                        const providers = currentAi.providers || {};
                        const gemini = providers.gemini || {};
                        updateEntry('ai', {
                          ...currentAi,
                          providers: { ...providers, gemini: { ...gemini, model: e.target.value } }
                        });
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-blue transition-colors text-white"
                    >
                      <option value="gemini-2.5-flash-lite" className="bg-slate-900 text-white">gemini-2.5-flash-lite (Recommended / Balanced)</option>
                      <option value="gemini-1.5-flash" className="bg-slate-900 text-white">gemini-1.5-flash</option>
                      <option value="gemini-2.0-flash-exp" className="bg-slate-900 text-white">gemini-2.0-flash-exp</option>
                      <option value="gemini-1.5-pro" className="bg-slate-900 text-white">gemini-1.5-pro (Complex Reasoning)</option>
                    </select>
                  </Field>
                  <Field label="Gemini API Key" hint="API key from Google AI Studio">
                    <Input
                      secret
                      value={entry.ai?.providers?.gemini?.apiKey || ''}
                      onChange={v => {
                        const currentAi = entry.ai || {};
                        const providers = currentAi.providers || {};
                        const gemini = providers.gemini || {};
                        updateEntry('ai', {
                          ...currentAi,
                          providers: { ...providers, gemini: { ...gemini, apiKey: v } }
                        });
                      }}
                      placeholder="AIzaSy..."
                    />
                  </Field>
                </div>
              </div>

            </div>
          </div>

          {/* Combined Multi-Platform Apps Section */}
          <div className="glass-card p-6 space-y-4">
            <SectionHeader
              icon={Layers}
              title="Combined Multi-Platform Apps (combinedApps)"
              subtitle="Combine Android & iOS packages into unified multi-platform app entries"
            >
              <button
                type="button"
                onClick={() => {
                  const currentPairs = getNormalizedPairings(entry);
                  const newPair = { name: '', android: '', ios: '' };
                  const updated = [...currentPairs.map(p => ({ name: p.name, android: p.android || p.googlePackageName, ios: p.ios || p.appleBundleId })), newPair];
                  updateEntry('combinedApps', updated);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-accent-blue/10 hover:bg-accent-blue/20 border border-accent-blue/30 text-accent-blue rounded-xl text-xs font-bold transition-all"
              >
                <Plus size={14} />
                <span>Add Combined App</span>
              </button>
            </SectionHeader>

            <p className="text-xs text-white/60">
              AppRankly automatically pairs store apps with identical or similar titles. Use <code className="text-emerald-400 font-mono">combinedApps</code> below to set explicit pairings or custom display names for cross-platform apps.
            </p>

            {(() => {
              const currentPairs = getNormalizedPairings(entry);
              if (currentPairs.length === 0) {
                return (
                  <div className="p-4 rounded-xl bg-white/3 border border-white/5 text-center text-xs text-white/40 italic">
                    No custom app pairings configured yet. Automated title matching is active. Click "Add Combined App" to create explicit pairings.
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {currentPairs.map((pair, index) => (
                    <div key={index} className="p-4 rounded-xl bg-white/3 border border-white/10 space-y-3 relative group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-bold text-white/80">
                          <Layers size={14} className="text-accent-blue" />
                          <span>App Pair #{index + 1}: {pair.name || 'Unnamed Pair'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = currentPairs
                              .filter((_, i) => i !== index)
                              .map(p => ({ name: p.name, android: p.android || p.googlePackageName, ios: p.ios || p.appleBundleId }));
                            updateEntry('combinedApps', updated);
                          }}
                          className="text-white/30 hover:text-rose-400 p-1 rounded-lg hover:bg-white/5 transition-colors"
                          title="Remove pairing"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Field label="App Display Name">
                          <Input
                            value={pair.name}
                            onChange={v => {
                              const updated = currentPairs.map((p, i) =>
                                i === index
                                  ? { name: v, android: p.android || p.googlePackageName, ios: p.ios || p.appleBundleId }
                                  : { name: p.name, android: p.android || p.googlePackageName, ios: p.ios || p.appleBundleId }
                              );
                              updateEntry('combinedApps', updated);
                            }}
                            placeholder="e.g. CardTrack"
                          />
                        </Field>

                        <Field label="Android Package ID (google)" hint="e.g. io.github.zmsp.cardtrack">
                          <Input
                            value={pair.android || pair.googlePackageName || ''}
                            onChange={v => {
                              const updated = currentPairs.map((p, i) =>
                                i === index
                                  ? { name: p.name, android: v, ios: p.ios || p.appleBundleId }
                                  : { name: p.name, android: p.android || p.googlePackageName, ios: p.ios || p.appleBundleId }
                              );
                              updateEntry('combinedApps', updated);
                            }}
                            placeholder="com.example.app"
                          />
                        </Field>

                        <Field label="iOS Bundle ID (apple)" hint="e.g. io.github.zmsp.cardtrack.ios">
                          <Input
                            value={pair.ios || pair.appleBundleId || ''}
                            onChange={v => {
                              const updated = currentPairs.map((p, i) =>
                                i === index
                                  ? { name: p.name, android: p.android || p.googlePackageName, ios: v }
                                  : { name: p.name, android: p.android || p.googlePackageName, ios: p.ios || p.appleBundleId }
                              );
                              updateEntry('combinedApps', updated);
                            }}
                            placeholder="com.example.app.ios"
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
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
            <SectionHeader icon={Bot} title="AI & ASO Service" subtitle="Sends a 1-token lightweight request to verify AI API key and model connectivity" />
            <div className="grid grid-cols-2 gap-3 mb-5">
              <InfoRow label="Active Provider" value={entry?.ai?.defaultProvider || 'openai'} />
              <InfoRow label="Selected Model" value={entry?.ai?.providers?.[entry?.ai?.defaultProvider || 'openai']?.model || 'default'} mono />
              <InfoRow label="API Key Set" value={entry?.ai?.providers?.[entry?.ai?.defaultProvider || 'openai']?.apiKey ? 'Yes (configured)' : 'No (missing key)'} />
            </div>
            <TestButton
              platform="ai"
              payload={{
                provider: entry?.ai?.defaultProvider || 'openai',
                model: entry?.ai?.providers?.[entry?.ai?.defaultProvider || 'openai']?.model
              }}
              authToken={authToken}
              isStaticMode={isStaticMode}
              isDemoMode={isDemoMode}
            />

            {/* AI Usage Meter Card */}
            {aiUsage && (
              <div className="mt-4 p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2 text-slate-300">
                  <Bot size={15} className="text-accent-blue" />
                  <span>AI Usage: <strong className="text-white">{aiUsage.runs} runs</strong> ({Math.round((aiUsage.totalInputTokens + aiUsage.totalOutputTokens) / 1000)}k tokens processed)</span>
                </div>
                <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  ~${aiUsage.totalCostUsd.toFixed(3)} total est
                </span>
              </div>
            )}
          </div>

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

          <div className="glass-card p-6">
            <SectionHeader icon={Bell} title="Push Notifications (ntfy.sh)" subtitle="Sends a test push alert to your configured ntfy topic" />
            <div className="grid grid-cols-2 gap-3 mb-5">
              <InfoRow label="ntfy Topic" value={entry?.ntfyTopic ? entry.ntfyTopic : '— (Disabled / Empty)'} mono />
              <InfoRow label="Notification Status" value={entry?.ntfyTopic ? 'Enabled' : 'Disabled (No Topic)'} />
              <InfoRow label="Check Interval" value={entry?.refreshIntervalHours ? `${entry.refreshIntervalHours} hours` : '1 hour'} />
              <InfoRow label="Active Window" value={`${entry?.activeStartHour !== undefined ? entry.activeStartHour : 9}:00 - ${entry?.activeEndHour !== undefined ? entry.activeEndHour : 20}:00`} />
              <InfoRow label="Timezone" value={entry?.timezone ? entry.timezone : `Server Default (${schedulerStatus?.config?.serverTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone})`} />
            </div>
            <TestButton
              platform="ntfy"
              payload={{ topic: entry?.ntfyTopic }}
              authToken={authToken}
              isStaticMode={isStaticMode}
              isDemoMode={isDemoMode}
            />
          </div>

          <div className="glass-card p-6">
            <SectionHeader icon={GitBranch} title="Git Remote Repository" subtitle="Tests connection, remote URL, branch refs, and HTTP credentials via git ls-remote / fetch" />
            <div className="grid grid-cols-2 gap-3 mb-5">
              <InfoRow label="Remote Repository URL" value={entry?.gitNotes?.remoteUrl ? entry.gitNotes.remoteUrl : '— (Not set)'} mono />
              <InfoRow label="Git Branch" value={entry?.gitNotes?.branch ? entry.gitNotes.branch : 'main'} />
              <InfoRow label="Git Username" value={entry?.gitNotes?.username ? entry.gitNotes.username : '— (Not set)'} />
              <InfoRow label="Git Authentication" value={entry?.gitNotes?.password ? 'Personal Access Token set' : 'None / Public'} />
              <InfoRow label="Auto-Commit & Push" value={entry?.gitNotes?.enabled ? 'Enabled' : 'Disabled (Local commits only)'} />
            </div>
            <TestButton
              platform="git"
              payload={{
                remoteUrl: entry?.gitNotes?.remoteUrl,
                branch: entry?.gitNotes?.branch,
                username: entry?.gitNotes?.username,
                password: entry?.gitNotes?.password
              }}
              authToken={authToken}
              isStaticMode={isStaticMode}
              isDemoMode={isDemoMode}
            />
          </div>

          <div className="glass-card p-6 border-amber-500/20 bg-amber-500/5">
            <SectionHeader icon={Coffee} title="Support AppRankly & More Apps" subtitle="Enjoying AppRankly? Check out my other apps or consider buying the developer a coffee!" />
            <p className="text-xs text-white/60 mb-4">
              AppRankly is free and open-source. Your support helps maintain the project and add new features.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="https://apps.shahadat.us/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 font-semibold text-xs transition-colors"
              >
                <img src="https://apps.shahadat.us/images/zprime-logo.png" alt="My Apps" className="w-4 h-4 object-contain" />
                <span>My Apps</span>
              </a>
              <a
                href="https://buymeacoffee.com/zprimecreates"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
              >
                <Coffee size={16} />
                <span>Buy Me a Coffee</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Variable Docs ── */}
      {activeTab === 'docs' && (
        <ConfigDocsSection />
      )}
    </div>
  );
}
