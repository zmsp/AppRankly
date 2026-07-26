import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ContextBar from './components/ContextBar';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import StoreASO from './pages/StoreASO';
import Releases from './pages/Releases';
import Reports from './pages/Reports';
import Config from './pages/Config';
import Glossary from './pages/Glossary';
import AuthOverlay from './components/AuthOverlay';
import DemoPopup from './components/DemoPopup';
import AppSwitcherModal from './components/AppSwitcherModal';
import { useAppState } from './hooks/useAppState';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const state = useAppState();

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeProject = state.projects?.find(p => p.index === state.selectedProjectIndex);
  const lastDataDate = state.stats?.lastDate || (state.stats?.dailyTrends?.length > 0 ? state.stats.dailyTrends[state.stats.dailyTrends.length - 1].date : null);
  
  const isWorking = state.loading || state.dimensionLoading;

  return (
    <div className="flex min-h-screen bg-background text-white overflow-hidden relative">
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        {...state}
      />

      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        {/* Mobile Sidebar Overlay Backdrop */}
        {!sidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        {/* Top Loading Bar */}
        {isWorking && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 z-50 overflow-hidden">
            <div className="h-full w-full bg-accent-blue animate-indeterminate-bar" />
          </div>
        )}

        <TopBar
          onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          {...state}
        />

        {/* Persistent Context Bar */}
        <ContextBar
          activeProject={activeProject}
          projects={state.projects}
          selectedProjectIndex={state.selectedProjectIndex}
          setSelectedProjectIndex={state.setSelectedProjectIndex}
          platform={state.platform}
          setPlatform={state.setPlatform}
          dateRange={state.dateRange}
          comparisonMode={state.comparisonMode}
          lastDataDate={lastDataDate}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <Routes>
            <Route path="/" element={<Dashboard {...state} />} />
            <Route path="/store/*" element={<StoreASO {...state} onSelectProject={state.setSelectedProjectIndex} />} />
            <Route path="/retention/*" element={<Analytics {...state} />} />
            <Route path="/releases/*" element={<Releases {...state} />} />
            <Route path="/reports/*" element={<Reports {...state} />} />
            <Route path="/config/*" element={<Config {...state} />} />
            <Route path="/glossary/*" element={<Glossary {...state} />} />
            
            {/* Direct deep-link support for main dashboard */}
            <Route path="/:platform" element={<Dashboard {...state} />} />
            <Route path="/:platform/:projectIndex" element={<Dashboard {...state} />} />
          </Routes>
        </main>

        {!state.authToken && !state.isDemoMode && !state.noPass && (
          <AuthOverlay {...state} />
        )}

        <AppSwitcherModal
          projects={state.projects}
          selectedProjectIndex={state.selectedProjectIndex}
          onSelectProject={state.setSelectedProjectIndex}
          setPlatform={state.setPlatform}
        />

        <DemoPopup isDemoMode={state.isDemoMode} />

        {/* Bottom Circular Loader */}
        {isWorking && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 glass-card px-4 py-2 flex items-center space-x-3 pointer-events-none">
            <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-white/80">Updating data...</span>
          </div>
        )}

        {/* Decorative Background Orbs */}
        <div className="glow-orb w-[500px] h-[500px] bg-accent-blue top-[-250px] right-[-100px] pointer-events-none" />
        <div className="glow-orb w-[400px] h-[400px] bg-accent-rose bottom-[-200px] left-[-100px] pointer-events-none" />
      </div>
    </div>
  );
}

export default App;
