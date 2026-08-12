import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import {
  LayoutDashboard,
  Smartphone,
  Users,
  Eye,
  Tag,
  FileText,
  Settings,
  BookOpen,
  Coffee,
  Edit3
} from 'lucide-react';
import { clsx } from 'clsx';
import { getProjectUrlSegment } from '../lib/projectUtils';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/all/all' },
  { id: 'details', label: 'App Details', icon: Smartphone, path: '/details' },
  { id: 'retention', label: 'Retention', icon: Users, path: '/retention' },
  { id: 'store', label: 'Store (ASO)', icon: Eye, path: '/store' },
  { id: 'releases', label: 'Releases', icon: Tag, path: '/releases' },
  { id: 'notes', label: 'Notes', icon: Edit3, path: '/notes' },
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
  const location = useLocation();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setCollapsed(true)}
          aria-hidden="true"
        />
      )}

      <aside className={clsx(
        "glass-card transition-all duration-300 z-50 md:z-30 shadow-2xl flex flex-col shrink-0 rounded-2xl md:rounded-3xl",
        "fixed inset-y-2 left-2 bottom-2 md:sticky md:top-4 md:inset-auto md:h-[calc(100vh-2rem)]",
        "my-0 md:my-4 ml-0 md:ml-1 mr-0 md:mr-0 overflow-hidden",
        collapsed
          ? "hidden md:flex md:w-20"
          : "flex w-64 md:w-72"
      )}>
        {/* Brand */}
        <div className={clsx(
          "p-3 md:p-5 flex items-center justify-between border-b border-white/5",
          collapsed && "md:justify-center md:px-0"
        )}>
          <div className="flex items-center space-x-3 min-w-0">
            <img src={logoImg} alt="AppRankly" className="w-8 h-8 md:w-9 md:h-9 rounded-xl shadow-lg shadow-accent-blue/20 flex-shrink-0" />
            {(!collapsed || window.innerWidth < 768) && (
              <span className="font-extrabold text-lg md:text-xl tracking-tight text-white whitespace-nowrap overflow-hidden text-ellipsis">AppRankly</span>
            )}
          </div>
          {/* Mobile Close Button */}
          <button
            onClick={() => setCollapsed(true)}
            className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 md:px-3 py-3 md:py-4 space-y-1 md:space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const platSegment = platform === 'google' ? 'android' : platform === 'apple' ? 'apple' : 'all';
            const projSegment = selectedProjectIndex || 'all';
            const searchStr = location.search;

            let targetPath = `/${platSegment}/all${searchStr}`;
            if (item.id !== 'overview') {
              const actualProj = (item.id === 'details' && (projSegment === 'all' || !projSegment) && projects.length > 0)
                ? getProjectUrlSegment(projects[0])
                : projSegment;
              targetPath = `/${item.id}/${platSegment}/${actualProj}${searchStr}`;
            }

            return (
              <NavLink
                key={item.id}
                to={targetPath}
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setCollapsed(true);
                  }
                  if (item.id === 'overview') {
                    if (setSelectedProjectIndex) setSelectedProjectIndex('all');
                  } else if (item.id === 'details') {
                    if ((selectedProjectIndex === 'all' || !selectedProjectIndex) && projects.length > 0) {
                      const firstSeg = getProjectUrlSegment(projects[0]);
                      if (setSelectedProjectIndex) setSelectedProjectIndex(firstSeg);
                    }
                  }
                }}
                className={({ isActive }) => {
                  const currentPath = location.pathname;
                  const firstSegment = currentPath.split('/')[1] || '';
                  const knownSubRoutes = ['details', 'store', 'retention', 'releases', 'notes', 'reports', 'config', 'glossary', 'demo'];

                  let isReallyActive = isActive;
                  if (item.id === 'overview') {
                    isReallyActive = !knownSubRoutes.includes(firstSegment);
                  } else {
                    isReallyActive = firstSegment === item.id;
                  }
                  return clsx(
                    "nav-link flex items-center space-x-3 px-3 py-3 md:py-2.5 rounded-xl transition-all cursor-pointer text-xs font-semibold whitespace-nowrap overflow-hidden min-h-[44px]",
                    isReallyActive ? "bg-accent-blue/20 text-white shadow-lg border border-accent-blue/30" : "text-slate-400 hover:text-white hover:bg-white/5",
                    collapsed && "md:justify-center md:px-0"
                  );
                }}
                title={collapsed ? item.label : ""}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {(!collapsed || window.innerWidth < 768) && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* My Apps & Support */}
        <div className="p-2 md:p-3 border-t border-white/5 mt-auto space-y-2">
          <a
            href="https://apps.shahadat.us/"
            target="_blank"
            rel="noopener noreferrer"
            className={clsx(
              "flex items-center space-x-2.5 px-3 py-2.5 rounded-xl bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200 border border-indigo-500/20 transition-all font-semibold text-xs whitespace-nowrap overflow-hidden min-h-[44px]",
              collapsed && "md:justify-center md:px-0"
            )}
            title={collapsed ? "My Apps" : ""}
          >
            <img src="https://apps.shahadat.us/images/zprime-logo.png" alt="My Apps" className="w-4 h-4 object-contain flex-shrink-0" />
            {(!collapsed || window.innerWidth < 768) && <span>My Apps</span>}
          </a>

          <a
            href="https://buymeacoffee.com/zprimecreates"
            target="_blank"
            rel="noopener noreferrer"
            className={clsx(
              "flex items-center space-x-3 px-3 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 border border-amber-500/20 transition-all font-semibold text-xs whitespace-nowrap overflow-hidden min-h-[44px]",
              collapsed && "md:justify-center md:px-0"
            )}
            title={collapsed ? "Buy Me a Coffee" : ""}
          >
            <Coffee size={18} className="flex-shrink-0 text-amber-400" />
            {(!collapsed || window.innerWidth < 768) && <span>Buy Me a Coffee</span>}
          </a>
        </div>
      </aside>
    </>
  );
}

