import React, { useState, useEffect } from 'react';
import {
  X,
  GitCommit,
  Clock,
  RotateCcw,
  User,
  Check,
  FileText,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import MarkdownViewer from './MarkdownViewer';

export default function NoteHistoryModal({
  isOpen,
  onClose,
  noteId,
  noteTitle = 'Note',
  fetchNoteHistory,
  restoreNoteVersion,
  onRestored
}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommit, setSelectedCommit] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (!isOpen || !noteId) return;

    const loadHistory = async () => {
      setLoading(true);
      try {
        const res = await fetchNoteHistory(noteId);
        setHistory(res || []);
        if (res && res.length > 0) {
          setSelectedCommit(res[0]);
        }
      } catch (err) {
        console.error('Failed to load note git history:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [isOpen, noteId, fetchNoteHistory]);

  if (!isOpen) return null;

  const handleRestore = async () => {
    if (!selectedCommit) return;
    if (window.confirm(`Restore note to version ${selectedCommit.shortHash} ("${selectedCommit.message}")?`)) {
      setIsRestoring(true);
      try {
        await restoreNoteVersion(noteId, selectedCommit.hash, selectedCommit.content, selectedCommit.title);
        toast.success(`Restored to commit ${selectedCommit.shortHash}`);
        onRestored?.(selectedCommit.content, selectedCommit.title);
        onClose();
      } catch (err) {
        toast.error('Failed to restore version');
      } finally {
        setIsRestoring(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <GitCommit size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-base md:text-lg text-white truncate">Git Commit Version History</h3>
              <p className="text-xs text-slate-400 truncate">{noteTitle} (ID: {noteId})</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span>Reading Git revision log for note...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <GitCommit size={32} className="mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-300">No Git commit history recorded yet.</p>
            <p className="text-[11px] text-slate-500">Commits are automatically generated as you save edits to this note.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-white/10 flex-1 overflow-hidden min-h-[380px]">
            {/* Left: Commit List */}
            <div className="md:col-span-5 p-3 overflow-y-auto custom-scrollbar space-y-2 max-h-[500px]">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                {history.length} Git Commits
              </div>
              {history.map((c) => {
                const isSelected = selectedCommit?.hash === c.hash;
                return (
                  <div
                    key={c.hash}
                    onClick={() => setSelectedCommit(c)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-white shadow-md'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                        {c.shortHash}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {c.date ? new Date(c.date).toLocaleDateString() : ''}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-white line-clamp-1">{c.message}</p>

                    <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                      <User size={12} className="text-slate-500" />
                      <span className="truncate">{c.author || 'AppRankly Bot'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Commit Preview & Restore */}
            <div className="md:col-span-7 p-4 md:p-6 flex flex-col overflow-hidden max-h-[500px]">
              {selectedCommit ? (
                <div className="flex flex-col h-full space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-indigo-400">{selectedCommit.shortHash}</span>
                        <h4 className="font-bold text-sm text-white truncate">{selectedCommit.title || 'Revision'}</h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{selectedCommit.message}</p>
                    </div>

                    <button
                      onClick={handleRestore}
                      disabled={isRestoring}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-all font-semibold text-xs shrink-0"
                    >
                      <RotateCcw size={14} className={isRestoring ? 'animate-spin' : ''} />
                      <span>Restore Version</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 rounded-2xl bg-slate-950/80 border border-white/10">
                    <MarkdownViewer content={selectedCommit.content} />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-xs italic">
                  Select a commit on the left to preview version content.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
