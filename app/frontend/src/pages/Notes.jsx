import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Notebook,
  Plus,
  Search,
  Pin,
  Trash2,
  Save,
  Sparkles,
  Tag,
  Check,
  FileText,
  Filter,
  Smartphone,
  BookOpen,
  ArrowRight,
  GitCommit,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal
} from 'lucide-react';
import toast from 'react-hot-toast';
import MarkdownEditor from '../components/MarkdownEditor';
import NoteHistoryModal from '../components/NoteHistoryModal';
import NoteAiChat from '../components/NoteAiChat';
import AppIcon from '../components/AppIcon';
import { findProject, getProjectUrlSegment } from '../lib/projectUtils';

export default function Notes({
  projects = [],
  platform,
  setPlatformAndProject,
  selectedProjectIndex,
  notes = [],
  stats,
  addNote,
  updateNote,
  deleteNote,
  generateAsoNote,
  fetchNoteHistory,
  restoreNoteVersion,
  sendNoteAiChat
}) {
  const { platform: urlPlat, projectIndex: urlProj, noteId: urlNoteId } = useParams();
  const navigate = useNavigate();

  // Active App resolution
  const targetPlat = urlPlat ? (urlPlat === 'android' ? 'google' : urlPlat === 'apple' ? 'apple' : 'all') : platform;
  const targetProjSeg = urlProj || selectedProjectIndex;

  const activeProject = findProject(projects, targetProjSeg, targetPlat);
  const pkgName = activeProject ? activeProject.packageName : (targetProjSeg === 'all' || !targetProjSeg ? 'all' : targetProjSeg);
  const appPlatform = activeProject ? activeProject.platform : (targetPlat || 'all');
  const appName = activeProject ? activeProject.name : 'All Apps';

  // Filters & Search
  const [selectedAppFilter, setSelectedAppFilter] = useState(pkgName);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('all');

  // Selected note state
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
  const [mobileHeaderExpanded, setMobileHeaderExpanded] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState('editor'); // 'list' | 'editor'

  // Collect all unique tags
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || []))).filter(Boolean);

  // Filter notes list
  const filteredNotes = notes.filter(n => {
    const matchesApp = selectedAppFilter === 'all' || n.packageName === selectedAppFilter || n.packageName === 'all';
    const matchesTag = selectedTagFilter === 'all' || (n.tags || []).includes(selectedTagFilter);
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (n.title && n.title.toLowerCase().includes(q)) ||
      (n.content && n.content.toLowerCase().includes(q)) ||
      (n.packageName && n.packageName.toLowerCase().includes(q)) ||
      (n.tags || []).some(t => t.toLowerCase().includes(q))
    );
    return matchesApp && matchesTag && matchesSearch;
  });

  // Sync selected note when URL or notes list changes
  useEffect(() => {
    if (urlNoteId) {
      const match = notes.find(n => n.id === urlNoteId);
      if (match) {
        setActiveNoteId(match.id);
        setTitle(match.title || '');
        setContent(match.content || '');
        setTags(match.tags || []);
        setPinned(Boolean(match.pinned));
        setNoteAppPkg(match.packageName || 'all');
        setNoteAppPlat(match.platform || 'all');
        return;
      }
    }

    if (activeNoteId === null) {
      // User is composing a new note — do not overwrite
      return;
    }

    if (filteredNotes.length > 0) {
      const currentExists = filteredNotes.find(n => n.id === activeNoteId);
      if (currentExists) return; // Keep current selection and user edits intact

      const selected = filteredNotes[0];
      setActiveNoteId(selected.id);
      setTitle(selected.title || '');
      setContent(selected.content || '');
      setTags(selected.tags || []);
      setPinned(Boolean(selected.pinned));
      setNoteAppPkg(selected.packageName || 'all');
      setNoteAppPlat(selected.platform || 'all');
    } else if (notes.length === 0) {
      setActiveNoteId(null);
      setTitle(`Notes & Strategy: ${appName}`);
      setContent(`# Notes for ${appName}\n\nStart brainstorming ASO keywords, app features, or release plans...\n`);
      setTags(['brainstorm']);
      setPinned(false);
      setNoteAppPkg(pkgName);
      setNoteAppPlat(appPlatform);
    }
  }, [urlNoteId, selectedAppFilter, selectedTagFilter, notes.length]);

  const handleSelectNote = (n) => {
    setActiveNoteId(n.id);
    setTitle(n.title || '');
    setContent(n.content || '');
    setTags(n.tags || []);
    setPinned(Boolean(n.pinned));
    setNoteAppPkg(n.packageName || 'all');
    setNoteAppPlat(n.platform || 'all');

    const platSeg = (n.platform === 'google' || n.platform === 'android') ? 'android' : (n.platform === 'apple' || n.platform === 'ios') ? 'apple' : 'all';
    navigate(`/notes/id/${n.id}`, { replace: true });
  };

  const handleCreateNewNote = () => {
    setActiveNoteId(null);
    setTitle(`New Brainstorm Note`);
    setContent(`# Brainstorming & Ideas\n\n- [ ] Action item 1\n- [ ] Action item 2\n`);
    setTags(['idea']);
    setPinned(false);
    setNoteAppPkg(selectedAppFilter === 'all' ? (projects[0]?.packageName || 'all') : selectedAppFilter);
    setNoteAppPlat(appPlatform);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeNoteId) {
        await updateNote(activeNoteId, {
          title: title || 'Untitled Note',
          content,
          packageName: noteAppPkg,
          platform: noteAppPlat,
          tags,
          pinned
        });
        toast.success('Note updated');
      } else {
        const res = await addNote({
          title: title || 'Untitled Note',
          content,
          packageName: noteAppPkg,
          platform: noteAppPlat,
          tags,
          pinned
        });
        if (res?.note?.id) {
          setActiveNoteId(res.note.id);
          navigate(`/notes/id/${res.note.id}`, { replace: true });
        }
        toast.success('Note created');
      }
    } catch (err) {
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeNoteId) return;
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNote(activeNoteId);
        toast.success('Note deleted');
        setActiveNoteId(null);
        navigate('/notes', { replace: true });
      } catch (err) {
        toast.error('Failed to delete note');
      }
    }
  };

  const handlePullAso = async () => {
    setIsGeneratingAso(true);
    try {
      const proj = projects.find(p => p.packageName === noteAppPkg);
      const inst = stats?.totalDailyUserInstalls || stats?.totalInstallCountByUser || 0;
      const uninst = stats?.totalDailyUserUninstalls || stats?.totalUninstallCountByUser || 0;
      const summarizedData = {
        installs: inst,
        uninstalls: uninst,
        netGrowth: inst - uninst,
        activeDevices: stats?.currentlyActiveDevices || 0,
        version: proj?.version || 'v2.4.0'
      };
      const res = await generateAsoNote(noteAppPkg, noteAppPlat, proj ? proj.name : appName, summarizedData);
      if (res?.note?.id) {
        setActiveNoteId(res.note.id);
        setTitle(res.note.title);
        setContent(res.note.content);
        setTags(res.note.tags || []);
        navigate(`/notes/id/${res.note.id}`, { replace: true });
      }
      toast.success('Generated ASO recommendations template!');
    } catch (e) {
      toast.error('Failed to generate ASO recommendations');
    } finally {
      setIsGeneratingAso(false);
    }
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

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Top Header — Compact & Collapsible on Mobile */}
      <div className="glass-card p-3.5 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 md:space-x-4 min-w-0">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <BookOpen size={20} className="md:w-6 md:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h1 className="text-base md:text-2xl font-black tracking-tight text-white truncate">App Notes</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-bold bg-accent-blue/20 text-accent-blue border border-accent-blue/30 shrink-0">
                  {notes.length}
                </span>
              </div>
              <p className="hidden md:block text-xs text-slate-400 mt-1">
                Store persistent per-app Markdown notes, ASO checklists, release changelogs, and brainstorming documents.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
            {/* AI Sparkle Button with Brand Purple Gradient */}
            <button
              onClick={handlePullAso}
              disabled={isGeneratingAso}
              className="flex items-center space-x-1.5 md:space-x-2 px-3 md:px-4 py-2 md:py-2.5 min-h-[44px] min-w-[44px] rounded-xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 text-purple-200 hover:from-purple-600/40 hover:to-indigo-600/40 border border-purple-500/40 transition-all text-xs font-bold shadow-md shadow-purple-500/10 active:scale-95 shrink-0 justify-center"
              title="Pull Store Metadata & AI Ideas"
            >
              <Sparkles size={16} className={isGeneratingAso ? "animate-spin text-amber-300 flex-shrink-0" : "text-amber-300 flex-shrink-0"} />
              <span className="hidden sm:inline whitespace-nowrap">{isGeneratingAso ? "Pulling..." : "Pull ASO Ideas"}</span>
            </button>

            <button
              onClick={() => {
                handleCreateNewNote();
                setMobileActiveTab('editor');
              }}
              className="flex items-center space-x-1.5 md:space-x-2 px-3.5 md:px-4 py-2 md:py-2.5 min-h-[44px] rounded-xl bg-accent-blue text-white hover:bg-accent-blue/90 transition-all text-xs font-bold shadow-lg shadow-accent-blue/20 shrink-0 justify-center whitespace-nowrap"
            >
              <Plus size={16} className="flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">New Note</span>
            </button>

            {/* Mobile Filter Dropdown Toggle */}
            <button
              onClick={() => setMobileHeaderExpanded(!mobileHeaderExpanded)}
              className="md:hidden p-2.5 min-h-[44px] min-w-[44px] rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all text-xs flex items-center justify-center space-x-1 shrink-0"
              title="Toggle Search & Filters"
            >
              <SlidersHorizontal size={16} />
              {mobileHeaderExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Search & Filters — Collapsible on Mobile */}
        <div className={`${mobileHeaderExpanded ? 'block' : 'hidden md:block'} pt-2 border-t border-white/5 space-y-3`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            {/* Search Input */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, tags, or content..."
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-accent-blue/60 transition-all"
              />
            </div>

            {/* App Filter Selector */}
            <div className="flex items-center space-x-2">
              <Smartphone size={15} className="text-slate-400 flex-shrink-0" />
              <select
                value={selectedAppFilter}
                onChange={(e) => setSelectedAppFilter(e.target.value)}
                className="w-full h-10 bg-slate-900 border border-white/10 rounded-xl px-3 text-xs text-slate-200 font-semibold focus:outline-none focus:border-accent-blue/60"
              >
                <option value="all">All Apps ({notes.length})</option>
                {projects.map(p => {
                  const appNoteCount = notes.filter(n => n.packageName === p.packageName).length;
                  return (
                    <option key={`${p.platform}_${p.packageName}`} value={p.packageName}>
                      {p.name} ({appNoteCount})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Tag Pills */}
          {allTags.length > 0 && (
            <div className="flex items-center flex-wrap gap-1.5 pt-1">
              <button
                onClick={() => setSelectedTagFilter('all')}
                className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                  selectedTagFilter === 'all' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                All Tags
              </button>
              {allTags.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTagFilter(t)}
                  className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                    selectedTagFilter === t ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Workspace Mode Switcher (List vs Editor) */}
      <div className="flex md:hidden items-center p-1 bg-white/5 rounded-xl border border-white/10">
        <button
          onClick={() => setMobileActiveTab('list')}
          className={`flex-1 min-h-[44px] rounded-lg text-xs font-bold text-center transition-all flex items-center justify-center ${
            mobileActiveTab === 'list' ? 'bg-accent-blue text-white shadow' : 'text-slate-400'
          }`}
        >
          Notes List ({filteredNotes.length})
        </button>
        <button
          onClick={() => setMobileActiveTab('editor')}
          className={`flex-1 min-h-[44px] rounded-lg text-xs font-bold text-center transition-all flex items-center justify-center ${
            mobileActiveTab === 'editor' ? 'bg-accent-blue text-white shadow' : 'text-slate-400'
          }`}
        >
          Note Editor
        </button>
      </div>

      {/* Main Grid: Left Notes List & Right Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-6">
        {/* Left Column: Notes Navigation */}
        <div className={`lg:col-span-4 space-y-3 ${mobileActiveTab === 'list' ? 'block' : 'hidden md:block'}`}>
          {/* Notes List */}
          <div className="space-y-2 max-h-[500px] md:max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
            {filteredNotes.length === 0 ? (
              <div className="glass-card p-6 text-center rounded-3xl border border-white/10 text-slate-400 text-xs">
                No notes found. Click "New Note" to create one.
              </div>
            ) : (
              filteredNotes.map(n => {
                const isSelected = activeNoteId === n.id;
                const matchedProj = projects.find(p => p.packageName === n.packageName);
                const displayAppName = matchedProj ? matchedProj.name : n.packageName;

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      handleSelectNote(n);
                      setMobileActiveTab('editor');
                    }}
                    className={`p-3.5 md:p-4 rounded-2xl md:rounded-3xl border transition-all cursor-pointer space-y-2.5 ${
                      isSelected
                        ? 'border-l-4 border-l-accent-blue border-t border-r border-b border-accent-blue/40 bg-accent-blue/20 shadow-lg shadow-accent-blue/10'
                        : 'border-l-4 border-l-transparent border-t border-r border-b border-white/10 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        {n.pinned && <Pin size={14} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                        <h4 className="font-bold text-xs md:text-sm text-white truncate">{n.title || 'Untitled Note'}</h4>
                      </div>
                      <span className="text-[10px] text-slate-500 flex-shrink-0 font-mono">
                        {n.updatedAt ? new Date(n.updatedAt).toLocaleDateString() : ''}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-sans">
                      {n.content ? n.content.replace(/^#+\s+/gm, '').replace(/[\*\_]/g, '') : 'Empty note...'}
                    </p>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 text-slate-400 text-[10px] font-semibold truncate">
                        {displayAppName}
                      </span>
                      {n.tags && n.tags.length > 0 && (
                        <div className="flex items-center space-x-1">
                          {n.tags.slice(0, 2).map(t => (
                            <span key={t} className="text-[10px] text-indigo-300 font-mono">#{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Note Workspace & Editor */}
        <div className={`lg:col-span-8 space-y-3 ${mobileActiveTab === 'editor' ? 'block' : 'hidden md:block'}`}>
          <div className="glass-card p-3.5 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 space-y-4">
            {/* Note Metadata & Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note Title..."
                className="flex-1 h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-black text-base md:text-lg focus:outline-none focus:border-accent-blue/60 transition-all placeholder-slate-500"
              />

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPinned(!pinned)}
                  className={`min-w-[44px] min-h-[44px] p-2.5 rounded-xl border transition-all text-xs font-semibold flex items-center justify-center space-x-1 shrink-0 ${
                    pinned ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                  }`}
                  title={pinned ? 'Unpin Note' : 'Pin Note'}
                >
                  <Pin size={16} className={pinned ? 'fill-amber-300' : ''} />
                </button>

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="min-h-[44px] flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all text-xs font-bold shadow-lg shadow-emerald-500/10 shrink-0 justify-center"
                >
                  {isSaving ? <Check size={16} className="animate-bounce" /> : <Save size={16} />}
                  <span className="whitespace-nowrap">Save Note</span>
                </button>

                {activeNoteId && (
                  <>
                    <button
                      onClick={() => setIsHistoryOpen(true)}
                      className="min-h-[44px] min-w-[44px] flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 transition-all text-xs font-semibold shrink-0 justify-center"
                      title="View Git Commit History & Rollback Revisions"
                    >
                      <GitCommit size={16} />
                      <span className="hidden sm:inline whitespace-nowrap">History</span>
                    </button>

                    <button
                      onClick={handleDelete}
                      className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all text-xs flex items-center justify-center shrink-0"
                      title="Delete Note"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* App Assignment & Tags Grid Line Alignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs items-center">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-semibold flex-shrink-0 whitespace-nowrap">Assign to App:</span>
                <select
                  value={noteAppPkg}
                  onChange={(e) => {
                    setNoteAppPkg(e.target.value);
                    const matched = projects.find(p => p.packageName === e.target.value);
                    if (matched) setNoteAppPlat(matched.platform);
                  }}
                  className="w-full h-10 bg-slate-900 border border-white/10 rounded-xl px-3 text-xs text-white font-semibold focus:outline-none focus:border-accent-blue/60"
                >
                  <option value="all">All Apps (Portfolio Global Note)</option>
                  {projects.map(p => (
                    <option key={`${p.platform}_${p.packageName}`} value={p.packageName}>
                      {p.name} ({p.platform})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags Input */}
              <div className="flex items-center flex-wrap gap-1.5 min-h-[40px]">
                <Tag size={14} className="text-slate-400 flex-shrink-0" />
                {tags.map(t => (
                  <span key={t} className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1 font-mono text-[11px] min-h-[32px]">
                    <span>#{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center hover:text-rose-400 -mr-2 text-sm"
                      title="Remove tag"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="+ Add tag..."
                  className="h-10 bg-transparent text-slate-300 text-xs focus:outline-none placeholder-slate-500 min-w-[100px]"
                />
              </div>
            </div>

            {/* Full Markdown Editor Component */}
            <MarkdownEditor
              value={content}
              onChange={setContent}
              onGenerateAso={handlePullAso}
              isGeneratingAso={isGeneratingAso}
              placeholder="Type your notes, strategy documents, release logs, or ASO checklists here using Markdown formatting..."
              minHeight="450px"
            />
          </div>
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

      <NoteAiChat
        noteTitle={title}
        noteContent={content}
        sendNoteAiChat={sendNoteAiChat}
        onAppendContent={(insertedText) => {
          setContent(prev => (prev ? `${prev}\n\n${insertedText}` : insertedText));
        }}
      />
    </div>
  );
}
