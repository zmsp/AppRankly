import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Eye,
  Tag,
  FileText,
  Settings,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Coffee
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/all/all' },
  { id: 'retention', label: 'Retention', icon: Users, path: '/retention' },
  { id: 'store', label: 'Store (ASO)', icon: Eye, path: '/store' },
  { id: 'releases', label: 'Releases', icon: Tag, path: '/releases' },
  { id: 'reports', label: 'Reports', icon: FileText, path: '/reports' },
  { id: 'config', label: 'Config', icon: Settings, path: '/config' },
  { id: 'glossary', label: 'Glossary', icon: BookOpen, path: '/glossary' },
];

export default function Sidebar({
  collapsed,
  setCollapsed,
  platform,
  setPlatform,
  setRawPlatform,
  projects = [],
  selectedProjectIndex,
  setSelectedProjectIndex
}) {
  return (
    <aside className={clsx(
      "glass-card transition-all duration-300 z-40 shadow-2xl flex flex-col",
      collapsed
        ? "w-0 md:w-20 -ml-20 md:ml-4 overflow-hidden hidden md:flex"
        : "w-72 fixed left-0 top-0 bottom-0 z-50 rounded-none md:rounded-3xl md:m-4 md:mr-0 md:relative md:h-auto h-full"
    )}>
      {/* Brand */}
      <div className="p-6 flex items-center space-x-3">
        <img src="/logo.png" alt="AppRankly" className="w-10 h-10 rounded-xl shadow-lg shadow-accent-blue/20 flex-shrink-0" />
        {!collapsed && (
          <span className="font-extrabold text-xl tracking-tight text-white">AppRankly</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/'}
              onClick={() => {
                if (window.innerWidth < 768) setCollapsed(true);
                if (item.id === 'overview') {
                  if (setSelectedProjectIndex) setSelectedProjectIndex('all');
                } else if (platform === 'all') {
                  if (setRawPlatform) setRawPlatform('google');
                }
              }}
              className={({ isActive }) => {
                const currentPath = window.location.pathname;
                let isReallyActive = isActive;
                if (item.id === 'overview') {
                  isReallyActive = currentPath === '/' || currentPath.startsWith('/all') || currentPath.startsWith('/android') || currentPath.startsWith('/apple') || currentPath.startsWith('/google');
                }
                return clsx(
                  "nav-link flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all cursor-pointer text-xs font-semibold",
                  isReallyActive ? "bg-white/10 text-white shadow-lg border border-white/10" : "text-slate-400 hover:text-white hover:bg-white/5",
                  collapsed && "justify-center px-0"
                );
              }}
              title={collapsed ? item.label : ""}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Support / Buy Me a Coffee */}
      <div className="p-3 border-t border-white/5 mt-auto">
        <a
          href="https://buymeacoffee.com/zprimecreates"
          target="_blank"
          rel="noopener noreferrer"
          className={clsx(
            "flex items-center space-x-3 px-3 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 border border-amber-500/20 transition-all font-semibold text-xs",
            collapsed && "justify-center px-0"
          )}
          title={collapsed ? "Buy Me a Coffee" : ""}
        >
          <Coffee size={18} className="flex-shrink-0 text-amber-400" />
          {!collapsed && <span>Buy Me a Coffee</span>}
        </a>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-800 border border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
