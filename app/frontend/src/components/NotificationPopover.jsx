import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, BellRing, Trash2, X, CheckCheck, TrendingUp, AlertTriangle, Info, Sparkles, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/api';

const MOCK_NOTIFICATIONS = [
  {
    id: 'demo-1',
    title: 'App Health & Stats (2 Apps)',
    message: '[Apple]\n* AppRankly iOS\n  - Installs: +142\n  - Health Score: 94/100\n\n[Android]\n* AppRankly Play\n  - Installs: +289\n  - Uninstalls: -14\n  - Health Score: 88/100\n\nCombined Total: +431 installs, -14 uninstalls',
    priority: 'high',
    tags: 'chart_with_upwards_trend,package',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    read: false,
    source: 'ntfy'
  },
  {
    id: 'demo-2',
    title: '⚠️ Churn Anomaly Detected',
    message: 'High uninstall spike detected on 2026-08-09 for AppRankly Play: 45 uninstalls (z=2.8).',
    priority: 'urgent',
    tags: 'warning,alert',
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    read: false,
    source: 'ntfy'
  },
  {
    id: 'demo-3',
    title: '🚀 Auto-Detected Store Release v2.4.0',
    message: 'New version v2.4.0 detected on Apple App Store for AppRankly iOS.',
    priority: 'normal',
    tags: 'rocket',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    read: true,
    source: 'system'
  }
];

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function renderMessagePreview(msg) {
  if (!msg) return null;
  const lines = msg.split('\n');
  return (
    <div className="space-y-1 text-xs text-slate-300 leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;
        
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          return (
            <div key={idx} className="font-bold text-accent-blue text-[11px] uppercase tracking-wider mt-1.5 first:mt-0">
              {trimmed}
            </div>
          );
        }
        
        if (trimmed.startsWith('*')) {
          return (
            <div key={idx} className="font-semibold text-white flex items-center space-x-1 mt-1">
              <span className="text-accent-blue">•</span>
              <span>{trimmed.substring(1).trim()}</span>
            </div>
          );
        }

        if (trimmed.startsWith('-')) {
          const parts = trimmed.substring(1).trim();
          const isPositive = parts.includes('+');
          const isNegative = parts.includes('-');
          return (
            <div key={idx} className="pl-3.5 text-slate-300 flex items-center space-x-1 text-[11px]">
              <span>-</span>
              <span className={clsx(isPositive && "text-accent-emerald font-semibold", isNegative && "text-rose-400 font-semibold")}>
                {parts}
              </span>
            </div>
          );
        }

        return <div key={idx} className="text-slate-300">{line}</div>;
      })}
    </div>
  );
}

export default function NotificationPopover({ authToken, isDemoMode, isStaticMode = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef(null);

  const fetchNotifications = async (quiet = false) => {
    if (isDemoMode) {
      const storedDemo = localStorage.getItem('apprankly_demo_notifications');
      let items = MOCK_NOTIFICATIONS;
      if (storedDemo) {
        try { items = JSON.parse(storedDemo); } catch (e) {}
      }
      setNotifications(items);
      setUnreadCount(items.filter(i => !i.read).length);
      return;
    }

    if (!quiet) setLoading(true);
    try {
      const res = await apiFetch('/api/notifications', {}, authToken, isStaticMode);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(true), 30000);
    return () => clearInterval(interval);
  }, [authToken, isDemoMode, isStaticMode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleOpenPopover = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      handleMarkAllRead();
    }
  };

  const handleMarkAllRead = async () => {
    if (isDemoMode) {
      const updated = notifications.map(n => ({ ...n, read: true }));
      setNotifications(updated);
      setUnreadCount(0);
      localStorage.setItem('apprankly_demo_notifications', JSON.stringify(updated));
      return;
    }
    try {
      await apiFetch('/api/notifications/mark-read', { method: 'POST' }, authToken, isStaticMode);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    if (isDemoMode) {
      setNotifications([]);
      setUnreadCount(0);
      localStorage.setItem('apprankly_demo_notifications', JSON.stringify([]));
      toast.success('Cleared all notifications');
      return;
    }
    try {
      await apiFetch('/api/notifications/clear', { method: 'POST' }, authToken, isStaticMode);
      setNotifications([]);
      setUnreadCount(0);
      toast.success('Cleared all notifications');
    } catch (err) {
      console.error('Failed to clear notifications:', err);
      toast.error('Failed to clear notifications');
    }
  };

  const handleClearSingle = async (id, e) => {
    e.stopPropagation();
    if (isDemoMode) {
      const updated = notifications.filter(n => n.id !== id);
      setNotifications(updated);
      setUnreadCount(updated.filter(i => !i.read).length);
      localStorage.setItem('apprankly_demo_notifications', JSON.stringify(updated));
      return;
    }
    try {
      await apiFetch('/api/notifications/clear', {
        method: 'POST',
        body: JSON.stringify({ id })
      }, authToken, isStaticMode);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to clear notification:', err);
    }
  };

  const handleSendTestAlert = async () => {
    const toastId = toast.loading('Sending test notification...');
    if (isDemoMode) {
      const newTest = {
        id: `demo-${Date.now()}`,
        title: '🧪 Test Notification',
        message: 'This is a test notification payload sent via AppRankly alert system.',
        priority: 'high',
        tags: 'chart_with_upwards_trend',
        timestamp: new Date().toISOString(),
        read: false,
        source: 'ntfy'
      };
      const updated = [newTest, ...notifications];
      setNotifications(updated);
      setUnreadCount(prev => prev + 1);
      localStorage.setItem('apprankly_demo_notifications', JSON.stringify(updated));
      toast.success('Test notification added', { id: toastId });
      return;
    }
    try {
      const res = await apiFetch('/api/notifications/test', {
        method: 'POST',
        body: JSON.stringify({
          title: '🧪 Test Notification',
          message: 'Hi from App Store & Play Store Stats Dashboard! ntfy setup working.',
          priority: 'high',
          tags: 'chart_with_upwards_trend,package'
        })
      }, authToken, isStaticMode);
      if (res.ok) {
        toast.success('Test notification sent & added to list', { id: toastId });
        fetchNotifications(true);
      } else {
        toast.error('Failed to send test notification', { id: toastId });
      }
    } catch (err) {
      console.error('Failed to send test alert:', err);
      toast.error('Failed to send test notification', { id: toastId });
    }
  };

  return (
    <div className="relative shrink-0" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        id="notification-bell-btn"
        onClick={handleOpenPopover}
        className={clsx(
          "relative p-2 rounded-xl transition-all border shrink-0 active:scale-95",
          isOpen
            ? "bg-accent-blue/20 border-accent-blue/40 text-accent-blue shadow-md"
            : "bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white"
        )}
        title="Notifications & Ntfy Alerts"
        aria-label="Toggle notifications menu"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white shadow-md ring-2 ring-background animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Card */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          style={{ maxHeight: 'calc(100vh - 80px)' }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded-lg bg-accent-blue/10 text-accent-blue">
                <Bell size={15} />
              </div>
              <span className="text-sm font-bold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-accent-blue/20 border border-accent-blue/30 text-[10px] font-extrabold text-accent-blue">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={handleSendTestAlert}
                className="p-1.5 rounded-lg text-slate-400 hover:text-accent-blue hover:bg-white/5 transition-colors"
                title="Send test notification"
              >
                <BellRing size={14} />
              </button>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                  title="Clear all notifications"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Controls / Info Subbar */}
          <div className="px-4 py-1.5 bg-slate-950/60 border-b border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Ntfy & App Health Updates</span>
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-rose-400 hover:underline font-medium text-[11px]"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Notification List Container */}
          <div className="overflow-y-auto max-h-[380px] divide-y divide-white/5 custom-scrollbar">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center space-y-2">
                <RefreshCw size={20} className="animate-spin text-accent-blue" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                  <BellOff size={22} />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">No notifications</div>
                  <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                    App health updates, churn alerts, and ntfy notifications will appear here.
                  </p>
                </div>
                <button
                  onClick={handleSendTestAlert}
                  className="mt-2 inline-flex items-center space-x-1.5 bg-accent-blue/10 hover:bg-accent-blue/20 border border-accent-blue/30 text-accent-blue px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                >
                  <Sparkles size={13} />
                  <span>Send Test Alert</span>
                </button>
              </div>
            ) : (
              notifications.map((item) => {
                const isUrgent = item.priority === 'urgent' || item.priority === 'high' && item.tags?.includes('warning');
                return (
                  <div
                    key={item.id}
                    className={clsx(
                      "p-3.5 transition-colors relative group flex items-start space-x-3",
                      item.read ? "bg-transparent hover:bg-white/[0.02]" : "bg-accent-blue/[0.04] hover:bg-accent-blue/[0.08]"
                    )}
                  >
                    {/* Icon Column */}
                    <div className="shrink-0 mt-0.5">
                      {isUrgent ? (
                        <div className="w-7 h-7 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                          <AlertTriangle size={14} />
                        </div>
                      ) : item.priority === 'high' ? (
                        <div className="w-7 h-7 rounded-xl bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center text-accent-blue">
                          <TrendingUp size={14} />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                          <Info size={14} />
                        </div>
                      )}
                    </div>

                    {/* Content Column */}
                    <div className="flex-1 min-w-0 pr-6 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate">{item.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {formatTimeAgo(item.timestamp)}
                        </span>
                      </div>

                      {/* Message Preview */}
                      {renderMessagePreview(item.message)}
                    </div>

                    {/* Individual Clear Action */}
                    <button
                      onClick={(e) => handleClearSingle(item.id, e)}
                      className="absolute top-3 right-3 p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
                      title="Clear this notification"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
