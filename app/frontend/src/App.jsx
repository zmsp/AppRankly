import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ContextBar from './components/ContextBar';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import StoreASO from './pages/StoreASO';
import Releases from './pages/Releases';
import Notes from './pages/Notes';
import Reports from './pages/Reports';
import Config from './pages/Config';
import Glossary from './pages/Glossary';
import AuthOverlay from './components/AuthOverlay';
import DemoPopup from './components/DemoPopup';
import QuickNotesModal from './components/QuickNotesModal';
import FloatingAssistant from './components/FloatingAssistant';
import CommandPaletteModal from './components/CommandPaletteModal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import { useAppState } from './hooks/useAppState';
import { findProject, getProjectUrlSegment } from './lib/projectUtils';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const navigate = useNavigate();
  const state = useAppState();

  const activeProject = findProject(state.projects, state.selectedProjectIndex, state.platform);
  const lastDataDate = state.stats?.lastDate || (state.stats?.dailyTrends?.length > 0 ? state.stats.dailyTrends[state.stats.dailyTrends.length - 1].date : null);
  
  const isWorking = state.loading || state.dimensionLoading;

  // Global hotkeys listener
  useEffect(() => {
    let lastKeyG = false;
    let timerG = null;

    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || document.activeElement?.isContentEditable;

      // Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      if (isInput) return;

      // ? for shortcuts cheat sheet
      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
        return;
      }

      // R for Refresh
      if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        state.refreshData?.();
        return;
      }

      // [ / ] for previous/next app
      if ((e.key === '[' || e.key === ']') && state.projects?.length > 0) {
        e.preventDefault();
        const currentIdx = state.projects.findIndex(p => p.packageName === activeProject?.packageName || p.index === activeProject?.index);
        let nextIdx = 0;
        if (e.key === ']') {
          nextIdx = currentIdx < state.projects.length - 1 ? currentIdx + 1 : 0;
        } else {
          nextIdx = currentIdx > 0 ? currentIdx - 1 : state.projects.length - 1;
        }
        const targetProj = state.projects[nextIdx];
        if (targetProj) {
          state.setPlatformAndProject?.(targetProj.platform, getProjectUrlSegment(targetProj));
        }
        return;
      }

      // G key chords (G then D/S/A/R/C)
      if (e.key.toLowerCase() === 'g' && !lastKeyG) {
        lastKeyG = true;
        clearTimeout(timerG);
        timerG = setTimeout(() => { lastKeyG = false; }, 1000);
        return;
      }

      if (lastKeyG) {
        lastKeyG = false;
        clearTimeout(timerG);
        const key = e.key.toLowerCase();
        if (key === 'd') navigate('/');
        else if (key === 's') navigate('/store');
        else if (key === 'a') navigate('/retention');
        else if (key === 'r') navigate('/releases');
        else if (key === 'n') navigate('/notes');
        else if (key === 'c') navigate('/config');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, activeProject, navigate]);

  return (
    <div className="flex min-h-screen bg-background text-white relative">
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        {...state}
      />

      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        {/* Top Loading Bar */}
        {isWorking && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 z-50 overflow-hidden">
            <div className="h-full w-full bg-accent-blue animate-indeterminate-bar" />
          </div>
        )}

        <TopBar
          onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          isSidebarOpen={!sidebarCollapsed}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
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
          stats={state.stats}
          notes={state.notes}
          onOpenQuickNotes={() => state.setQuickNotesOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <Routes>
            <Route path="/" element={<Dashboard {...state} viewMode="overview" />} />
            <Route path="/details" element={<Dashboard {...state} viewMode="details" />} />
            <Route path="/details/*" element={<Dashboard {...state} viewMode="details" />} />
            <Route path="/store/*" element={<StoreASO {...state} onSelectProject={state.setSelectedProjectIndex} />} />
            <Route path="/retention/*" element={<Analytics {...state} />} />
            <Route path="/releases/*" element={<Releases {...state} />} />
            <Route path="/notes" element={<Notes {...state} />} />
            <Route path="/notes/:platform/:projectIndex" element={<Notes {...state} />} />
            <Route path="/notes/id/:noteId" element={<Notes {...state} />} />
            <Route path="/reports/*" element={<Reports {...state} />} />
            <Route path="/config/*" element={<Config {...state} />} />
            <Route path="/glossary/*" element={<Glossary {...state} />} />
            
            {/* Direct deep-link support for overview dashboard */}
            <Route path="/:platform" element={<Dashboard {...state} viewMode="overview" />} />
            <Route path="/:platform/:projectIndex" element={<Dashboard {...state} />} />
          </Routes>
        </main>

        {!state.authToken && !state.isDemoMode && !state.noPass && (
          <AuthOverlay {...state} />
        )}

        <CommandPaletteModal
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          projects={state.projects}
          selectedProjectIndex={state.selectedProjectIndex}
          onSelectProject={state.setSelectedProjectIndex}
          setPlatform={state.setPlatform}
          setPlatformAndProject={state.setPlatformAndProject}
          platform={state.platform}
          starredApps={state.starredApps}
          toggleStarApp={state.toggleStarApp}
          dateRange={state.dateRange}
          setDateRange={state.setDateRange}
          refreshData={state.refreshData}
          switchToDemoMode={state.switchToDemoMode}
          openShortcutsHelp={() => setIsShortcutsOpen(true)}
        />

        <KeyboardShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />

        <QuickNotesModal
          isOpen={state.quickNotesOpen}
          onClose={() => state.setQuickNotesOpen(false)}
          {...state}
        />

        <FloatingAssistant
          sendNoteAiChat={state.sendNoteAiChat}
          projects={state.projects}
          stats={state.stats}
          platform={state.platform}
          selectedProjectIndex={state.selectedProjectIndex}
          dateRange={state.dateRange}
          activeDimension={state.activeDimension}
          dimensionStats={state.dimensionStats}
          aiStatus={state.aiStatus}
          notes={state.notes}
          addNote={state.addNote}
          updateNote={state.updateNote}
          deleteNote={state.deleteNote}
          onOpenQuickNotes={() => state.setQuickNotesOpen(true)}
        />

        <DemoPopup isDemoMode={state.isDemoMode} />

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
            },
          }}
        />

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

