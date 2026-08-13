import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  History,
  Trash2,
  Sparkles,
  Pin,
  Check,
  Save,
  Tag,
  Folder,
  ChevronRight,
  AppWindow,
  Layout,
  Maximize2,
  Calendar,
  MoreHorizontal,
  Clock,
  Zap,
  ChevronDown,
  Bold,
  Italic,
  List,
  Link2,
  Code,
  Eye,
  Columns,
  Type,
  CheckSquare,
  ArrowLeft,
  X,
  Quote,
  Copy,
  Download,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import MarkdownViewer from '../components/MarkdownViewer';
import NoteHistoryModal from '../components/NoteHistoryModal';
import { findProject } from '../lib/projectUtils';

const TEMPLATES = {
  release: {
    label: '🚀 Release Changelog',
    content: `# 🚀 Release Notes & Changelog (vX.Y.Z)

## 📱 App Store & Play Store Release Copy
What's New in this Version:
- ✨ Major feature: [Describe key new feature]
- ⚡ Performance optimizations and faster load times
- 🐛 Resolved minor UI layout and text clipping bugs

## 📋 Pre-Submission QA Checklist
- [ ] Unit tests & static analysis pass cleanly
- [ ] App build compiled for production release
- [ ] Localized store screenshots & previews updated
- [ ] Verified in-app review prompts and deep links
`
  },
  telemetry: {
    label: '📊 Telemetry & Performance',
    content: `# 📊 Performance & Telemetry Brief

## 📱 App Overview & Release Info
- **Target App**: [App Name]
- **Target Platform**: iOS / Android
- **App Version**: [Target Version]

## 📈 Summarized Telemetry Metrics
- **Total Installs**: [Installs]
- **Total Uninstalls**: [Uninstalls]
- **Net Growth**: [Net Growth]
- **Active Devices**: [Active Devices]

## 🔬 Key Telemetry Observations & Action Items
- [ ] Monitor post-update uninstall ratio vs previous version
- [ ] Evaluate acquisition channels for high-converting keywords
- [ ] Track D1/D7 user retention cohorts
`
  },
  aso: {
    label: '🎯 ASO Experiment',
    content: `# 🎯 ASO Experiment Hypothesis

## 🔬 Hypothesis Statement
Changing the primary title and screenshot slide 1 headline to focus on "Privacy & Speed" will increase Store Listing Conversion Rate (CVR) by +8%.

## 📊 Baseline & Target Metrics
- **Current Baseline CVR**: 14.2%
- **Target Experiment CVR**: 16.5%
- **Traffic Split**: 50/50 Control vs Variant

## 🧪 Variants to Test
- [ ] **Control**: Original screenshots with dark theme
- [ ] **Variant A**: High-contrast blue gradient with 3-word bold headlines
- [ ] **Variant B**: Feature callouts with star rating social proof
`
  },
  bug: {
    label: '🐛 Bug & Crash Triage',
    content: `# 🐛 Bug & Crash Triage Report

## 🚨 Issue Overview
- **Impact**: High / Moderate / Low
- **Affected OS & Devices**: iOS 17.5+ / Android 14
- **App Version**: v2.3.1

## 🔄 Steps to Reproduce
1. Launch app on target device
2. Tap on settings menu
3. Select date range filter -> observe crash or blank screen

## 🛠️ Fix & Verification Notes
- [ ] Reproduce issue in local environment
- [ ] Apply fix in pull request
- [ ] Verify fix with regression test suite
`
  },
  feature: {
    label: '💡 Feature Pitch',
    content: `# 💡 Feature Pitch & User Feedback

## 🎯 Target Problem
Users struggle to track retention cohorts over custom date ranges.

## 🚀 Proposed Solution
Add custom date range selector with preset shortcuts (7d, 14d, 30d, 90d).

## 📊 Success Metrics
- **Activation Rate**: +12% increase in weekly active users
- **User Engagement**: +5% higher daily session duration
`
  }
};

/**
 * ASO Intelligence Notes Redesign - Full Functional Version
 * Optimized for mobile, editable tagging, and template dropdown functionality as popups.
 */
export default function Notes({
  projects = [],
  platform,
  notes = [],
  stats,
  addNote,
  updateNote,
  deleteNote,
  generateAsoNote,
  fetchNoteHistory,
  restoreNoteVersion,
  selectedProjectIndex
}) {
  const { noteId: urlNoteId } = useParams();
  const navigate = useNavigate();
  const textareaRef = useRef(null);

  // UI state
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'editor'
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  // Active App resolution
  const activeProject = findProject(projects, selectedProjectIndex, platform);
  const pkgName = activeProject ? activeProject.packageName : (selectedProjectIndex === 'all' || !selectedProjectIndex ? 'all' : selectedProjectIndex);
  const appPlatform = activeProject ? activeProject.platform : (platform || 'all');
  const appName = activeProject ? activeProject.name : 'All Apps';

  const [selectedTagFilter, setSelectedTagFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [pinned, setPinned] = useState(false);
  const [noteAppPkg, setNoteAppPkg] = useState(pkgName);
  const [noteAppPlat, setNoteAppPlat] = useState(appPlatform);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAso, setIsGeneratingAso] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [viewMode, setViewMode] = useState('write');

  // Track initial state to detect changes
  const [savedState, setSavedState] = useState({ title: '', content: '', tags: [], pinned: false });

  // Deriving "dirty" state
  const hasChanges =
    title !== savedState.title ||
    content !== savedState.content ||
    JSON.stringify(tags) !== JSON.stringify(savedState.tags) ||
    pinned !== savedState.pinned;

  // Sync state with selected note
  useEffect(() => {
    if (!Array.isArray(notes)) return;

    if (urlNoteId) {
      const match = notes.find(n => n && n.id === urlNoteId);
      if (match) {
        const newState = {
          title: match.title || '',
          content: match.content || '',
          tags: match.tags || [],
          pinned: Boolean(match.pinned)
        };
        setActiveNoteId(match.id);
        setTitle(newState.title);
        setContent(newState.content);
        setTags(newState.tags);
        setPinned(newState.pinned);
        setSavedState(newState);
        setNoteAppPkg(match.packageName || 'all');
        setNoteAppPlat(match.platform || 'all');
        setMobileView('editor');
        return;
      }
    }
    if (window.innerWidth >= 768 && activeNoteId === null && notes.length > 0) {
      handleSelectNote(notes[0]);
    }
  }, [urlNoteId, notes?.length]);

  // Navigation blocker
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const confirmDiscard = () => {
    if (hasChanges) {
      return window.confirm("You have unsaved changes. Discard them?");
    }
    return true;
  };

  const handleSelectNote = (n) => {
    if (n.id === activeNoteId) return;
    if (!confirmDiscard()) return;

    setActiveNoteId(n.id);
    const newState = {
      title: n.title || '',
      content: n.content || '',
      tags: n.tags || [],
      pinned: Boolean(n.pinned)
    };
    setTitle(newState.title);
    setContent(newState.content);
    setTags(newState.tags);
    setPinned(newState.pinned);
    setSavedState(newState);
    setNoteAppPkg(n.packageName || 'all');
    setNoteAppPlat(n.platform || 'all');
    setMobileView('editor');
    navigate(`/notes/id/${n.id}`, { replace: true });
  };

  const handleCreateNewNote = () => {
    if (!confirmDiscard()) return;

    setActiveNoteId(null);
    const newState = {
      title: `ASO Recommendations & Audit:`,
      content: `# ASO Audit & Strategy: New Record\n\n> Generated on: ${new Date().toLocaleDateString()}\n> App Package: \`${pkgName}\` | Platform: \`${appPlatform.toUpperCase()}\` \n\n---\n\n## 🎯 1. Title & Subtitle Keywords Optimization\n\n- [ ] **Title Keyword Placement**\n- [ ] **Subtitle / Short Description**\n`,
      tags: ['aso', 'audit'],
      pinned: false
    };
    setTitle(newState.title);
    setContent(newState.content);
    setTags(newState.tags);
    setPinned(newState.pinned);
    setSavedState(newState);
    setNoteAppPkg(pkgName === 'all' ? (projects[0]?.packageName || 'all') : pkgName);
    setNoteAppPlat(appPlatform);
    setMobileView('editor');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeNoteId) {
        await updateNote(activeNoteId, {
          title, content, packageName: noteAppPkg, platform: noteAppPlat, tags, pinned
        });
        setSavedState({ title, content, tags, pinned });
        toast.success('Record synchronized');
      } else {
        const res = await addNote({
          title, content, packageName: noteAppPkg, platform: noteAppPlat, tags, pinned
        });
        if (res?.note?.id) {
          setActiveNoteId(res.note.id);
          setSavedState({ title, content, tags, pinned });
          navigate(`/notes/id/${res.note.id}`, { replace: true });
        }
        toast.success('Record created');
      }
    } catch (err) {
      toast.error('Sync failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeNoteId) return;
    if (window.confirm('Confirm permanent deletion?')) {
      try {
        await deleteNote(activeNoteId);
        toast.success('Record purged');
        setSavedState({ title: '', content: '', tags: [], pinned: false });
        setActiveNoteId(null);
        setMobileView('list');
        navigate('/notes', { replace: true });
      } catch (err) {
        toast.error('Purge failed');
      }
    }
  };

  const handlePullAso = async () => {
    setIsGeneratingAso(true);
    try {
      const proj = projects.find(p => p.packageName === noteAppPkg);
      const res = await generateAsoNote(noteAppPkg, noteAppPlat, proj ? proj.name : appName, {});
      if (res?.note?.id) {
        setActiveNoteId(res.note.id);
        const newState = {
          title: res.note.title,
          content: res.note.content,
          tags: res.note.tags || [],
          pinned: false
        };
        setTitle(newState.title);
        setContent(newState.content);
        setTags(newState.tags);
        setSavedState(newState);
        setMobileView('editor');
        navigate(`/notes/id/${res.note.id}`, { replace: true });
      }
      toast.success('Insights Generated');
    } catch (e) {
      toast.error('Generation Failed');
    } finally {
      setIsGeneratingAso(false);
    }
  };

  const handleApplyTemplate = (tmplKey) => {
    if (!tmplKey || !TEMPLATES[tmplKey]) return;
    if (content.trim() && !window.confirm('Replace current content with template?')) return;
    setContent(TEMPLATES[tmplKey].content);
    toast.success('Template applied');
    setShowTemplateMenu(false);
  };

  const insertLinePrefix = (prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    const newContent = content.substring(0, lineStart) + prefix + content.substring(lineStart);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const insertSnippet = (before, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = content.substring(start, end);
    const replacement = before + (selection || 'text') + after;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selection || 'text').length);
    }, 0);
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const cleaned = tagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (cleaned && !tags.includes(cleaned)) {
        setTags([...tags, cleaned]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleCopyMarkdown = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const handleDownloadFile = () => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aso_note_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded .md file');
  };

  const notesArray = Array.isArray(notes) ? notes : [];
  const allTags = Array.from(new Set(notesArray.flatMap(n => Array.isArray(n?.tags) ? n.tags : []))).filter(Boolean);

  const filteredNotes = notesArray.filter(n => {
    if (!n) return false;
    const matchesTag = selectedTagFilter === 'all' || (n.tags || []).includes(selectedTagFilter);
    const q = searchQuery.toLowerCase().trim();
    return matchesTag && (!q || (
      (n.title?.toLowerCase().includes(q)) ||
      (n.content?.toLowerCase().includes(q)) ||
      (n.tags?.some(t => t.toLowerCase().includes(q)))
    ));
  });

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-[#0d1117] text-slate-300 font-sans border-t border-slate-800 relative overflow-hidden">

      {/* Sidebar - Note Stream */}
      <div className={`
        ${mobileView === 'list' ? 'flex' : 'hidden md:flex'}
        w-full md:w-[340px] flex flex-col border-r border-slate-800 shrink-0 bg-[#0d1117] z-20
      `}>
        <div className="px-6 py-6 border-b border-slate-800/50">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              App Notes
              <span className="text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded text-[11px] font-bold">{notesArray.length}</span>
            </h3>
            <button
              onClick={handleCreateNewNote}
              className="p-1.5 bg-[#161b22] border border-slate-700 text-slate-300 rounded hover:bg-slate-800 transition-all"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="relative mb-5 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#00d2ff]" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full bg-[#0d1117] border border-slate-700 rounded-md pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-[#00d2ff]/40 text-white placeholder:text-slate-600"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            <button
              onClick={() => setSelectedTagFilter('all')}
              className={`text-[10px] px-3 py-1 rounded font-bold whitespace-nowrap transition-all uppercase tracking-wider ${selectedTagFilter === 'all' ? 'bg-[#00d2ff] text-[#0d1117]' : 'bg-[#161b22] text-slate-400 border border-slate-800 hover:text-white'}`}
            >
              All Tags
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTagFilter(tag)}
                className={`text-[10px] px-3 py-1 rounded font-bold whitespace-nowrap transition-all uppercase tracking-wider ${selectedTagFilter === tag ? 'bg-[#00d2ff] text-[#0d1117]' : 'bg-[#161b22] text-slate-400 border border-slate-800 hover:text-white'}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-800/40">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-600 gap-2 opacity-50 italic">
               No records found
            </div>
          ) : (
            filteredNotes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                active={activeNoteId === note.id}
                onClick={() => handleSelectNote(note)}
                projects={projects}
              />
            ))
          )}
        </div>
      </div>

      {/* Main Workspace - Editor */}
      <div className={`
        ${mobileView === 'editor' ? 'flex' : 'hidden md:flex'}
        flex-1 flex flex-col overflow-visible bg-[#0d1117] z-10
      `}>

        {/* Editor Header */}
        <div className="px-4 md:px-10 py-6 md:py-8 border-b border-slate-800/60 bg-[#0d1117]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => { if (confirmDiscard()) setMobileView('list'); }} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white"><ArrowLeft size={20} /></button>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent text-xl md:text-[32px] font-bold text-white outline-none placeholder:text-slate-800 tracking-tight"
                  placeholder="ASO Recommendations & Audit:"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
              <button
                onClick={() => setPinned(!pinned)}
                className={`p-2 rounded border border-slate-700/50 shrink-0 transition-all ${pinned ? 'text-[#ffd393] bg-[#ffd393]/10 border-[#ffd393]/30' : 'text-slate-500 hover:text-white'}`}
              >
                <Pin size={18} className={pinned ? 'fill-[#ffd393]' : ''} />
              </button>
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-2 bg-[#161b22] text-slate-300 text-[11px] font-bold px-4 py-2 rounded border border-slate-700/50 hover:bg-slate-800 transition-all shrink-0"
              >
                <History size={16} /> <span className="hidden sm:inline">History</span>
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-[#00d2ff] text-[#0d1117] text-[11px] font-bold px-5 py-2 rounded shadow-[0_0_20px_rgba(0,210,255,0.2)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shrink-0"
              >
                {isSaving ? <Check size={16} className="animate-pulse" /> : <Save size={16} />} Save {hasChanges && <span className="text-[10px] bg-black/20 px-1 rounded ml-1 animate-pulse font-black text-amber-400 opacity-80">!</span>}
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-slate-500 hover:text-rose-500 transition-all shrink-0"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:gap-5">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest shrink-0">Assign to App:</span>
                <div className="flex flex-1 items-center gap-2 bg-[#161b22] border border-slate-700/50 rounded px-3 py-1.5 cursor-pointer hover:border-[#00d2ff]/30 transition-all min-w-[200px] md:min-w-[280px]">
                  <AppWindow size={14} className="text-slate-500" />
                  <select
                    value={noteAppPkg}
                    onChange={(e) => {
                      setNoteAppPkg(e.target.value);
                      const matched = projects.find(p => p.packageName === e.target.value);
                      if (matched) setNoteAppPlat(matched.platform);
                    }}
                    className="bg-transparent text-xs text-slate-200 outline-none flex-1 appearance-none cursor-pointer font-medium"
                  >
                    <option value="all">Global Portfolio</option>
                    {projects.map(p => (
                      <option key={`${p.platform}_${p.packageName}`} value={p.packageName}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="text-slate-500" />
                </div>
              </div>

              <div className="hidden md:block h-4 w-[1px] bg-slate-800" />

              <div className="flex items-center gap-3">
                <Tag size={16} className="text-slate-500 shrink-0" />
                <div className="flex flex-wrap gap-2 items-center min-h-[32px]">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1.5 bg-[#00d2ff]/10 text-[#00d2ff] px-2.5 py-1 rounded border border-[#00d2ff]/20 text-[10px] font-bold uppercase tracking-wider shrink-0 group">
                      #{tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-white opacity-60 group-hover:opacity-100 transition-opacity">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      className="bg-[#161b22] border border-slate-800 rounded px-2 py-1 text-[10px] w-20 outline-none focus:border-[#00d2ff]/50 transition-all placeholder:text-slate-700 font-bold uppercase"
                      placeholder="+ tag..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar - OVERFLOW VISIBLE ON PANE FOR POPUPS */}
        <div className="px-4 md:px-10 py-2 border-b border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#0d1117] gap-4 select-none relative z-50 overflow-visible">
          <div className="flex items-center gap-2 md:gap-5 w-full sm:w-auto pb-1 sm:pb-0 overflow-visible">
            {/* Formatter Buttons - Localized Scrolling */}
            <div className="flex items-center gap-1 md:gap-2 overflow-x-auto no-scrollbar flex-1 sm:flex-none">
              <div className="flex items-center gap-1 md:gap-2 shrink-0">
                <button onClick={() => insertLinePrefix('# ')} className="p-1.5 text-slate-400 hover:text-white transition-all font-bold text-xs">H1</button>
                <button onClick={() => insertLinePrefix('## ')} className="p-1.5 text-slate-400 hover:text-white transition-all font-bold text-xs">H2</button>
              </div>
              <div className="h-4 w-[1px] bg-slate-800 shrink-0" />
              <div className="flex items-center gap-1 md:gap-2 shrink-0">
                <button onClick={() => insertSnippet('**', '**')} className="p-1.5 text-slate-400 hover:text-white transition-all"><Bold size={16} /></button>
                <button onClick={() => insertSnippet('*', '*')} className="p-1.5 text-slate-400 hover:text-white transition-all italic"><Italic size={16} /></button>
              </div>
              <div className="h-4 w-[1px] bg-slate-800 shrink-0" />
              <div className="flex items-center gap-1 md:gap-2 shrink-0">
                <button onClick={() => insertLinePrefix('- ')} className="p-1.5 text-slate-400 hover:text-white transition-all"><List size={16} /></button>
                <button onClick={() => insertLinePrefix('- [ ] ')} className="p-1.5 text-slate-400 hover:text-white transition-all"><CheckSquare size={16} /></button>
                <button onClick={() => insertSnippet('```\n', '\n```')} className="p-1.5 text-slate-400 hover:text-white transition-all"><Code size={16} /></button>
                <button onClick={() => insertSnippet('[', '](url)')} className="p-1.5 text-slate-400 hover:text-white transition-all"><Link2 size={16} /></button>
              </div>
            </div>

            <div className="h-4 w-[1px] bg-slate-800 shrink-0 hidden sm:block" />

            <button
              onClick={handlePullAso}
              disabled={isGeneratingAso}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 text-[#adc6ff] text-[10px] font-bold px-3 py-1.5 rounded-full border border-purple-500/20 hover:brightness-110 transition-all shrink-0"
            >
              <Sparkles size={14} className={isGeneratingAso ? 'animate-spin' : ''} />
              <span>{isGeneratingAso ? 'PULLING...' : 'Pull ASO Ideas'}</span>
            </button>

            {/* Template Selector Popup */}
            <div className="relative shrink-0 overflow-visible">
              <button
                onClick={() => { setShowTemplateMenu(!showTemplateMenu); setShowMoreMenu(false); }}
                className="flex items-center gap-2 text-slate-400 text-xs px-3 py-1.5 rounded-lg border border-slate-800 hover:text-white hover:border-slate-700 transition-all font-medium whitespace-nowrap bg-[#161b22]"
              >
                <FileText size={14} className="text-slate-500" />
                <span>Template...</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${showTemplateMenu ? 'rotate-180' : ''}`} />
              </button>
              {showTemplateMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTemplateMenu(false)} />
                  <div className="absolute top-full left-0 mt-2 w-64 bg-[#161b22] border border-slate-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl ring-1 ring-white/5">
                    <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 mb-1">ASO_STRATEGY_TEMPLATES</div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      {Object.keys(TEMPLATES).map(key => (
                        <button
                          key={key}
                          onClick={() => handleApplyTemplate(key)}
                          className="w-full text-left px-4 py-3 text-[13px] text-slate-200 hover:bg-[#30363d] hover:text-[#00d2ff] capitalize flex items-center gap-3 transition-colors border-l-2 border-transparent hover:border-[#00d2ff]"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center shrink-0">
                             <Layout size={16} className="text-slate-400" />
                          </div>
                          {TEMPLATES[key].label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* More Menu */}
            <div className="relative shrink-0 overflow-visible">
              <button
                onClick={() => { setShowMoreMenu(!showMoreMenu); setShowTemplateMenu(false); }}
                className="p-1.5 text-slate-400 hover:text-white transition-all bg-[#161b22] rounded border border-slate-800"
              >
                <MoreHorizontal size={18} />
              </button>
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute top-full right-0 mt-2 w-56 bg-[#161b22] border border-slate-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl ring-1 ring-white/5">
                    <button onClick={() => { insertLinePrefix('> '); setShowMoreMenu(false); }} className="w-full text-left px-4 py-3 text-xs text-slate-200 hover:bg-[#30363d] flex items-center gap-3"><Quote size={16} className="text-slate-500" /> Blockquote</button>
                    <button onClick={() => { insertSnippet('| H1 | H2 |\n|---|---|\n| C1 | C2 |'); setShowMoreMenu(false); }} className="w-full text-left px-4 py-3 text-xs text-slate-200 hover:bg-[#30363d] flex items-center gap-3"><Layout size={16} className="text-slate-500" /> Insert Table</button>
                    <div className="h-px bg-slate-800 my-1 mx-2" />
                    <button onClick={() => { handleCopyMarkdown(); setShowMoreMenu(false); }} className="w-full text-left px-4 py-3 text-xs text-slate-200 hover:bg-[#30363d] flex items-center gap-3"><Copy size={16} className="text-slate-500" /> Copy Markdown</button>
                    <button onClick={() => { handleDownloadFile(); setShowMoreMenu(false); }} className="w-full text-left px-4 py-3 text-xs text-slate-200 hover:bg-[#30363d] flex items-center gap-3"><Download size={16} className="text-slate-500" /> Download .md</button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 bg-[#161b22]/50 p-1 rounded-lg border border-slate-800 w-full sm:w-auto justify-between shrink-0 overflow-visible">
            <button
              onClick={() => setViewMode('write')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-[10px] md:text-[11px] font-bold px-3 py-1.5 rounded transition-all ${viewMode === 'write' ? 'bg-[#30363d] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Type size={14} /> Write
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`hidden sm:flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded transition-all ${viewMode === 'split' ? 'bg-[#30363d] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Columns size={14} /> Split
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-[10px] md:text-[11px] font-bold px-3 py-1.5 rounded transition-all ${viewMode === 'preview' ? 'bg-[#30363d] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Eye size={14} /> Preview
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row bg-[#0d1117] z-10">
          {(viewMode === 'write' || viewMode === 'split') && (
            <div className="flex-1 overflow-hidden p-6 md:p-10 bg-[#0d1117]">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start typing..."
                className="w-full h-full bg-transparent text-slate-200 placeholder-slate-800 font-mono text-sm md:text-base outline-none resize-none leading-relaxed custom-scrollbar"
              />
            </div>
          )}

          {viewMode === 'split' && <div className="hidden md:block w-[1px] bg-slate-800 shrink-0" />}

          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className={`flex-1 overflow-y-auto p-6 md:p-12 bg-[#0d1117] custom-scrollbar ${viewMode === 'split' ? 'hidden md:block' : 'block'}`}>
              <MarkdownViewer content={content} />
            </div>
          )}
        </div>
      </div>

      <NoteHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        noteId={activeNoteId}
        noteTitle={title}
        fetchNoteHistory={fetchNoteHistory}
        restoreNoteVersion={restoreNoteVersion}
        onRestored={(restoredContent, restoredTitle) => {
          if (restoredContent) setContent(restoredContent);
          if (restoredTitle) setTitle(restoredTitle);
        }}
      />
    </div>
  );
}

/**
 * NoteCard Component
 */
function NoteCard({ note, active = false, onClick, projects }) {
  const projectsArray = Array.isArray(projects) ? projects : [];
  const matchedProj = projectsArray.find(p => p && p.packageName === note?.packageName);
  const displayAppName = matchedProj ? matchedProj.name : (note?.packageName === 'all' ? 'PORTFOLIO' : (note?.packageName || 'Unknown'));

  const stripMarkdown = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/[#*`>|]/g, '').replace(/\[\s\]/g, '').trim();
  };

  return (
    <div
      onClick={onClick}
      className={`
        px-7 py-6 cursor-pointer transition-all relative border-b border-slate-800/40
        ${active ? 'bg-[#161b22]' : 'hover:bg-[#161b22]/40'}
      `}
    >
      {active && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#00d2ff]" />}

      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {note.pinned && <Pin size={12} className="text-[#ffd393] fill-[#ffd393] shrink-0" />}
            <h4 className={`text-[13px] font-bold truncate tracking-tight ${active ? 'text-[#00d2ff]' : 'text-slate-100'}`}>
              {note.title || 'UNTITLED_RECORD'}
            </h4>
          </div>
          <p className={`text-[11px] line-clamp-2 leading-[1.6] font-medium ${active ? 'text-slate-300' : 'text-slate-500'}`}>
            {stripMarkdown(note.content) || 'Record contents empty...'}
          </p>
        </div>
        <div className="text-[10px] text-slate-500 font-mono whitespace-nowrap pt-1 font-bold">
          {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' }) : '8/12/2026'}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2 text-[10px] text-[#00d2ff] font-bold truncate max-w-[170px] uppercase tracking-wide">
          <AppWindow size={10} />
          {displayAppName}
        </div>
        <div className="flex gap-1.5">
          {note.tags?.slice(0, 1).map(tag => (
            <span key={tag} className="text-[9px] font-bold bg-[#0d1117] text-[#00d2ff]/80 px-2 py-0.5 rounded border border-[#00d2ff]/20 uppercase tracking-tighter">
              {tag}
            </span>
          ))}
          {note.tags?.length > 1 && (
            <span className="text-[9px] font-bold bg-[#161b22] text-slate-500 px-1.5 py-0.5 rounded border border-slate-800">+{note.tags.length - 1}</span>
          )}
        </div>
      </div>
    </div>
  );
}
