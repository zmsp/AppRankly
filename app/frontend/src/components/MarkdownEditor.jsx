import React, { useState, useRef, useEffect } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  CheckSquare,
  Code,
  Quote,
  Table,
  Link,
  Eye,
  Edit3,
  Columns,
  Sparkles,
  Copy,
  Download,
  FileCode2,
  Check,
  MoreHorizontal,
  FilePlus,
  FileText,
  FileStack,
  ChevronDown,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import MarkdownViewer from './MarkdownViewer';
import NOTE_TEMPLATES from '../data/note_templates.json';

export const TEMPLATES = NOTE_TEMPLATES;

export default function MarkdownEditor({
  value = '',
  onChange,
  onGenerateAso,
  isGeneratingAso = false,
  placeholder = 'Write notes in Markdown format...',
  minHeight = '300px'
}) {
  const [viewMode, setViewMode] = useState('edit'); // 'edit' | 'split' | 'preview'
  const [copied, setCopied] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const textareaRef = useRef(null);

  // --- Logic ---
  const handleTemplateAction = (action, templateKey) => {
    const template = TEMPLATES[templateKey];
    if (!template) return;

    if (action === 'replace') {
      if (value.trim() && !window.confirm('Replace current note content with template?')) return;
      onChange?.(template.content);
      toast.success(`Applied ${template.label || templateKey} template`);
    } else {
      insertSnippet(template.content, '');
      toast.success(`Inserted ${template.label || templateKey} snippet`);
    }
    setShowTemplateMenu(false);
  };

  // Enforce disable of 'split' mode on mobile viewports (<768px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && viewMode === 'split') {
        setViewMode('edit');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  const insertSnippet = (before, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange?.(value + before + after);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = value.substring(start, end);
    const replacement = before + (selection || 'text') + after;

    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange?.(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selection || 'text').length);
    }, 0);
  };

  const insertLinePrefix = (prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const newValue = value.substring(0, lineStart) + prefix + value.substring(lineStart);
    onChange?.(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleCopyMarkdown = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Copied Markdown to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    if (!value) return;
    const blob = new Blob([value], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app_note_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded .md file');
  };

  return (
    <div className="flex flex-col border border-white/10 rounded-2xl bg-slate-950/60 overflow-hidden shadow-xl relative">
      {/* Sticky Single-Row Horizontally Scrollable Toolbar */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-1.5 p-1.5 border-b border-white/10 bg-slate-900/95 backdrop-blur-md">
        <div className="flex items-center overflow-x-auto custom-scrollbar gap-1 py-0.5 flex-1 min-w-0 pr-1 select-none">
          {/* Main Headings */}
          <button
            type="button"
            onClick={() => insertLinePrefix('# ')}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center shrink-0"
            title="Heading 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix('## ')}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center shrink-0"
            title="Heading 2"
          >
            <Heading2 size={16} />
          </button>

          <div className="w-px h-5 bg-white/10 mx-0.5 shrink-0" />

          {/* Formatting */}
          <button
            type="button"
            onClick={() => insertSnippet('**', '**')}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center shrink-0"
            title="Bold (**text**)"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('*', '*')}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center shrink-0"
            title="Italic (*text*)"
          >
            <Italic size={16} />
          </button>

          <div className="w-px h-5 bg-white/10 mx-0.5 shrink-0" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => insertLinePrefix('- ')}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center shrink-0"
            title="Bullet List (- item)"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix('- [ ] ')}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center shrink-0"
            title="Task List (- [ ] task)"
          >
            <CheckSquare size={16} />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('```\n', '\n```')}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center shrink-0"
            title="Code Block (```)"
          >
            <Code size={16} />
          </button>
          <button
            type="button"
            onClick={() => insertSnippet('[', '](https://example.com)')}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center shrink-0"
            title="Insert Link [Text](url)"
          >
            <Link size={16} />
          </button>

          <div className="w-px h-5 bg-white/10 mx-0.5 shrink-0" />

          {/* AI Sparkle Button with Brand Purple Gradient */}
          {onGenerateAso && (
            <button
              type="button"
              onClick={onGenerateAso}
              disabled={isGeneratingAso}
              className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center space-x-1.5 px-3 py-1.5 sm:py-1 rounded-xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 text-purple-200 hover:from-purple-600/40 hover:to-indigo-600/40 border border-purple-500/40 transition-all text-xs font-bold shadow-md shadow-purple-500/10 shrink-0 justify-center"
              title="Pull Store Metadata & AI Ideas"
            >
              <Sparkles size={16} className={isGeneratingAso ? "animate-spin text-amber-300 flex-shrink-0" : "text-amber-300 flex-shrink-0"} />
              <span className="hidden sm:inline whitespace-nowrap">{isGeneratingAso ? "Pulling..." : "Pull ASO Ideas"}</span>
            </button>
          )}

          {/* Custom Template Dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className={`min-h-[44px] sm:min-h-0 flex items-center space-x-1.5 px-3 py-1.5 sm:py-1 rounded-xl border transition-all text-xs font-bold shrink-0 ${
                showTemplateMenu ? 'bg-white/10 border-accent-blue/50 text-white' : 'bg-slate-900 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <FileStack size={14} className="text-accent-blue" />
              <span className="hidden sm:inline">Templates</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${showTemplateMenu ? 'rotate-180' : ''}`} />
            </button>

            {showTemplateMenu && (
              <div className="absolute left-0 top-full mt-1.5 w-64 glass-card bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold px-2 py-1 mb-1">Select Template Action</div>
                <div className="space-y-1">
                  {Object.keys(TEMPLATES).filter(k => !k.startsWith('system_')).map((key) => (
                    <div key={key} className="flex items-center justify-between p-1.5 hover:bg-white/5 rounded-xl transition-colors group">
                      <span className="text-xs text-slate-300 font-medium capitalize pl-1">
                        {TEMPLATES[key].label || key}
                      </span>
                      <div className="flex items-center space-x-1 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTemplateAction('insert', key); }}
                          title="Insert at cursor"
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center space-x-1"
                        >
                          <FilePlus size={14} />
                          <span className="text-[10px] font-bold">Insert</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTemplateAction('replace', key); }}
                          title="Replace entire note"
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all flex items-center space-x-1"
                        >
                          <FileText size={14} />
                          <span className="text-[10px] font-bold">Replace</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* More Options (...) Button */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center shrink-0"
              title="More formatting options"
            >
              <MoreHorizontal size={18} />
            </button>

            {/* Low Frequency Actions Popover */}
            {showMoreMenu && (
              <div
                className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-48 glass-card bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl p-2 z-50 space-y-1"
                onClick={() => setShowMoreMenu(false)}
              >
                <button
                  type="button"
                  onClick={() => insertLinePrefix('### ')}
                  className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl flex items-center space-x-2.5 transition-colors"
                >
                  <Heading3 size={15} />
                  <span>Heading 3</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertLinePrefix('> ')}
                  className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl flex items-center space-x-2.5 transition-colors"
                >
                  <Quote size={15} />
                  <span>Blockquote</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n')}
                  className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl flex items-center space-x-2.5 transition-colors"
                >
                  <Table size={15} />
                  <span>Insert Table</span>
                </button>
                <div className="h-px bg-white/10 my-1" />
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl flex items-center space-x-2.5 transition-colors"
                >
                  {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                  <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadFile}
                  className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl flex items-center space-x-2.5 transition-colors"
                >
                  <Download size={15} />
                  <span>Download .md File</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* View Mode Toggle Segmented Control (Write vs Preview on Mobile; Write/Split/Preview on Desktop) */}
        <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('edit')}
            className={`min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center space-x-1 px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'edit' ? 'bg-accent-blue text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 size={13} />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`hidden md:flex items-center justify-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'split' ? 'bg-accent-blue text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns size={13} />
            <span>Split</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center space-x-1 px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'preview' ? 'bg-accent-blue text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye size={13} />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 min-h-[300px]">
        {/* Write Area */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`p-3 ${viewMode === 'edit' ? 'col-span-2' : 'col-span-1'}`}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              placeholder={placeholder}
              style={{ minHeight }}
              className="w-full h-full bg-transparent text-slate-100 placeholder-slate-500 font-mono text-xs md:text-sm focus:outline-none resize-y custom-scrollbar leading-relaxed"
            />
          </div>
        )}

        {/* Preview Area */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`p-4 overflow-y-auto custom-scrollbar bg-slate-900/40 ${viewMode === 'preview' ? 'col-span-2' : 'col-span-1'}`} style={{ minHeight }}>
            <MarkdownViewer content={value} />
          </div>
        )}
      </div>
    </div>
  );
}
