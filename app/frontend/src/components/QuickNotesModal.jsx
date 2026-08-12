import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Notebook,
  Maximize2,
  Save,
  Trash2,
  Pin,
  Sparkles,
  Check,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import MarkdownEditor from './MarkdownEditor';
import AppIcon from './AppIcon';
import { findProject, getProjectUrlSegment } from '../lib/projectUtils';

export default function QuickNotesModal({
  isOpen,
  onClose,
  projects = [],
  selectedProjectIndex,
  platform,
  notes = [],
  addNote,
  updateNote,
  deleteNote,
  generateAsoNote
}) {
  const navigate = useNavigate();

  const activeProject = findProject(projects, selectedProjectIndex, platform);
  const pkgName = activeProject ? activeProject.packageName : 'all';
  const appPlatform = activeProject ? activeProject.platform : (platform || 'all');
  const appName = activeProject ? activeProject.name : 'All Apps';

  // Find existing notes for active app
  const appNotes = notes.filter(n => (pkgName === 'all' ? true : n.packageName === pkgName));
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [pinned, setPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAso, setIsGeneratingAso] = useState(false);

  // Sync state when modal opens or active app package changes
  useEffect(() => {
    if (!isOpen) return;

    if (appNotes.length > 0) {
      const selected = appNotes[0];
      setActiveNoteId(selected.id);
      setTitle(selected.title || '');
      setContent(selected.content || '');
      setTags(selected.tags || []);
      setPinned(Boolean(selected.pinned));
    } else {
      setActiveNoteId(null);
      setTitle(`Notes: ${appName}`);
      setContent(`# Notes for ${appName}\n\nJot down brainstorming ideas, ASO strategies, release notes, or TODO items here...\n`);
      setTags(['brainstorm']);
      setPinned(false);
    }
  }, [isOpen, pkgName]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeNoteId) {
        await updateNote(activeNoteId, {
          title: title || 'Untitled Note',
          content,
          packageName: pkgName,
          platform: appPlatform,
          tags,
          pinned
        });
        toast.success('Note updated');
      } else {
        const res = await addNote({
          title: title || `Notes: ${appName}`,
          content,
          packageName: pkgName,
          platform: appPlatform,
          tags,
          pinned
        });
        if (res?.note?.id) {
          setActiveNoteId(res.note.id);
        }
        toast.success('Note saved');
      }
    } catch (err) {
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeNoteId) return;
    if (window.confirm('Delete this note?')) {
      try {
        await deleteNote(activeNoteId);
        toast.success('Note deleted');
        setActiveNoteId(null);
      } catch (err) {
        toast.error('Failed to delete note');
      }
    }
  };

  const handlePullAso = async () => {
    setIsGeneratingAso(true);
    try {
      const res = await generateAsoNote(pkgName, appPlatform, appName);
      if (res?.note?.id) {
        setActiveNoteId(res.note.id);
        setTitle(res.note.title);
        setContent(res.note.content);
        setTags(res.note.tags || []);
      }
      toast.success('Generated ASO recommendations note!');
    } catch (e) {
      toast.error('Failed to pull ASO recommendations');
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

  const handleGoToFullEditor = () => {
    onClose();
    const platSeg = appPlatform === 'google' ? 'android' : appPlatform === 'apple' ? 'apple' : 'all';
    const projSeg = activeProject ? getProjectUrlSegment(activeProject) : 'all';
    if (activeNoteId) {
      navigate(`/notes/id/${activeNoteId}`);
    } else {
      navigate(`/notes/${platSeg}/${projSeg}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between gap-4 bg-slate-900/90">
          <div className="flex items-center space-x-3 min-w-0">
            {activeProject ? (
              <AppIcon iconUrl={activeProject.iconUrl} appName={appName} size="w-10 h-10" />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Notebook size={22} />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base md:text-lg text-white truncate">{appName} Notebook</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-slate-300">
                  {appPlatform}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">{pkgName}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Go to Full Editor Button */}
            <button
              onClick={handleGoToFullEditor}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-accent-blue/20 text-white hover:bg-accent-blue/30 border border-accent-blue/30 transition-all font-semibold text-xs"
              title="Open full page notebook editor"
            >
              <Maximize2 size={14} />
              <span className="hidden sm:inline">Open Full Editor</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Note Switcher Tabs */}
        {appNotes.length > 0 && (
          <div className="px-4 py-2 bg-slate-950/60 border-b border-white/5 flex items-center space-x-2 overflow-x-auto custom-scrollbar">
            {appNotes.map(n => (
              <button
                key={n.id}
                onClick={() => {
                  setActiveNoteId(n.id);
                  setTitle(n.title);
                  setContent(n.content);
                  setTags(n.tags || []);
                  setPinned(Boolean(n.pinned));
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 border ${
                  activeNoteId === n.id
                    ? 'bg-accent-blue/20 text-white border-accent-blue/40 shadow-sm'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10'
                }`}
              >
                {n.pinned && <Pin size={12} className="text-amber-400 fill-amber-400" />}
                <span className="max-w-[120px] truncate">{n.title || 'Untitled'}</span>
              </button>
            ))}

            <button
              onClick={() => {
                setActiveNoteId(null);
                setTitle(`New Note for ${appName}`);
                setContent('# Brainstorming\n\n- ');
                setTags(['idea']);
                setPinned(false);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-all flex items-center space-x-1 border border-white/10"
            >
              <Plus size={14} />
              <span>New</span>
            </button>
          </div>
        )}

        {/* Modal Body: Controls & Markdown Editor */}
        <div className="p-4 md:p-6 flex-1 overflow-y-auto custom-scrollbar space-y-4">
          {/* Note Title & Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note Title..."
              className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm md:text-base focus:outline-none focus:border-accent-blue/60 transition-all placeholder-slate-500"
            />

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setPinned(!pinned)}
                className={`p-2 rounded-xl border transition-all text-xs font-semibold flex items-center space-x-1 ${
                  pinned ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
                title={pinned ? 'Unpin Note' : 'Pin Note'}
              >
                <Pin size={16} className={pinned ? 'fill-amber-300' : ''} />
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all text-xs font-semibold shadow-lg shadow-emerald-500/10"
              >
                {isSaving ? <Check size={16} className="animate-bounce" /> : <Save size={16} />}
                <span>Save</span>
              </button>

              {activeNoteId && (
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all text-xs"
                  title="Delete Note"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Tags:</span>
            {tags.map(t => (
              <span key={t} className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1 font-mono text-[11px]">
                <span>#{t}</span>
                <button onClick={() => handleRemoveTag(t)} className="hover:text-rose-400 ml-1">×</button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="+ Add tag (Press Enter)..."
              className="bg-transparent text-slate-300 text-xs focus:outline-none placeholder-slate-500 min-w-[140px]"
            />
          </div>

          {/* Markdown Editor */}
          <MarkdownEditor
            value={content}
            onChange={setContent}
            onGenerateAso={handlePullAso}
            isGeneratingAso={isGeneratingAso}
            placeholder="Type notes, strategy, ASO checklists, or code snippets here..."
            minHeight="320px"
          />
        </div>
      </div>
    </div>
  );
}
