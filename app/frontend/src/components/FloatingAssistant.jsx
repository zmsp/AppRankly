import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bot, Send, Sparkles, X, User, Loader2, Plus, Cpu, RotateCcw, Compass,
  Notebook, Maximize2, Save, Trash2, Pin, Check, MessageSquare, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import pageContexts from '../data/pageContexts.json';
import MarkdownViewer from './MarkdownViewer';
import { findProject, getProjectUrlSegment } from '../lib/projectUtils';

const DEFAULT_MODEL_OPTIONS = [
  { id: 'openai', name: 'OpenAI (GPT-5 nano)', provider: 'openai', model: 'gpt-5-nano' },
  { id: 'anthropic', name: 'Anthropic (Claude Haiku 4.5)', provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
  { id: 'gemini', name: 'Google (Gemini 2.5 Flash Lite)', provider: 'gemini', model: 'gemini-2.5-flash-lite' }
];

function getPageContext(pathname) {
  let matchedKey = '/';
  if (pathname.startsWith('/retention')) matchedKey = '/retention';
  else if (pathname.startsWith('/store')) matchedKey = '/store';
  else if (pathname.startsWith('/details')) matchedKey = '/details';
  else if (pathname.startsWith('/releases')) matchedKey = '/releases';
  else if (pathname.startsWith('/notes')) matchedKey = '/notes';
  else if (pathname.startsWith('/reports')) matchedKey = '/reports';
  else if (pathname.startsWith('/config')) matchedKey = '/config';
  else if (pathname.startsWith('/glossary')) matchedKey = '/glossary';

  return pageContexts[matchedKey] || {
    title: 'App Statistics Viewer',
    description: 'Analytics, ASO, and App Performance Viewer.',
    suggestedPrompts: []
  };
}

export default function FloatingAssistant({
  projects = [],
  selectedProjectIndex = 'all',
  platform = 'all',
  stats = null,
  dateRange = null,
  activeDimension = null,
  dimensionStats = null,
  aiStatus = null,
  sendNoteAiChat,
  notes = [],
  addNote,
  updateNote,
  deleteNote,
  onOpenQuickNotes
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPageContext = getPageContext(location.pathname);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'notes'
  const [showSettings, setShowSettings] = useState(false);

  // --- AI Chat Logic ---
  const [modelOptions, setModelOptions] = useState(DEFAULT_MODEL_OPTIONS);
  const [selectedModelId, setSelectedModelId] = useState('openai');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (aiStatus?.providers) {
      const updated = aiStatus.providers.map(p => {
        const displayName = p.id === 'openai' ? 'OpenAI' : p.id === 'anthropic' ? 'Anthropic' : 'Google';
        return {
          id: p.id,
          name: `${displayName} (${p.model})`,
          provider: p.id,
          model: p.model,
          available: p.available
        };
      });
      setModelOptions(updated);
      if (aiStatus.defaultProvider) {
        setSelectedModelId(aiStatus.defaultProvider);
      }
    }
  }, [aiStatus]);

  useEffect(() => {
    const buildGreeting = (ctx) => `Hi! You are on **${ctx.title}** (${ctx.description}). Ask me anything or try one of the suggested prompts below.`;
    setMessages(prev => {
      const hasUserMessages = prev.some(m => m.role === 'user');
      if (!hasUserMessages) {
        return [{
          role: 'assistant',
          content: buildGreeting(currentPageContext)
        }];
      }
      return prev;
    });
  }, [location.pathname, currentPageContext.title, currentPageContext.description]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, isOpen, activeTab]);

  // --- Notes Logic ---
  const activeProject = findProject(projects, selectedProjectIndex, platform);
  const pkgName = activeProject ? activeProject.packageName : 'all';
  const appPlatform = activeProject ? activeProject.platform : (platform || 'all');
  const appName = activeProject ? activeProject.name : 'All Apps';

  // Specific format: "{platform} {packageName} notes"
  const quickNoteTitle = `${appPlatform} ${pkgName} notes`;
  const quickNoteId = `quick_note_${appPlatform}_${pkgName.replace(/\./g, '_')}`;

  const [noteTitle, setNoteTitle] = useState(quickNoteTitle);
  const [noteContent, setNoteContent] = useState('');
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState('');

  // Load or Find the specific note when project changes
  useEffect(() => {
    const existing = notes.find(n => n.id === quickNoteId || n.title === quickNoteTitle);
    if (existing) {
      setActiveNoteId(existing.id);
      setNoteTitle(existing.title);
      setNoteContent(existing.content || '');
      setLastSavedContent(existing.content || '');
    } else {
      setActiveNoteId(null);
      setNoteTitle(quickNoteTitle);
      const defaultContent = `# Notes for ${appName}\n\nJot down ideas here...`;
      setNoteContent(defaultContent);
      setLastSavedContent(defaultContent);
    }
  }, [pkgName, appPlatform, notes]);

  // Debounced Auto-save Logic
  useEffect(() => {
    if (noteContent === lastSavedContent) return;

    const timer = setTimeout(() => {
      handleSaveNote(true); // silent save
    }, 3000); // 3 seconds debounce

    return () => clearTimeout(timer);
  }, [noteContent]);

  const handleSaveNote = async (silent = false) => {
    if (noteContent === lastSavedContent && activeNoteId) return;

    if (!silent) setIsSaving(true);
    try {
      const noteData = {
        id: quickNoteId,
        title: quickNoteTitle,
        content: noteContent,
        packageName: pkgName,
        platform: appPlatform,
        tags: ['quick-note'],
        pinned: true
      };

      if (activeNoteId) {
        await updateNote(activeNoteId, noteData);
      } else {
        const res = await addNote(noteData);
        if (res?.note?.id) setActiveNoteId(res.note.id);
      }
      setLastSavedContent(noteContent);
      if (!silent) toast.success('Note saved');
    } catch (err) {
      if (!silent) toast.error('Failed to save note');
    } finally {
      if (!silent) setIsSaving(false);
    }
  };

  const handleGoToFullEditor = () => {
    setIsOpen(false);
    const platSeg = appPlatform === 'google' ? 'android' : appPlatform === 'apple' ? 'apple' : 'all';
    const projSeg = activeProject ? getProjectUrlSegment(activeProject) : 'all';
    if (activeNoteId) {
      navigate(`/notes/id/${activeNoteId}`);
    } else {
      navigate(`/notes/${platSeg}/${projSeg}`);
    }
  };

  // --- Shared AI Helpers ---
  const buildDynamicPageData = () => {
    const parts = [];
    const isAppSelected = selectedProjectIndex && selectedProjectIndex !== 'all';
    if (isAppSelected) {
      const proj = projects.find(p => p.index === selectedProjectIndex || p.packageName === selectedProjectIndex);
      if (proj) {
        parts.push(`App: ${proj.name} (${proj.platform === 'apple' ? 'iOS' : 'Android'})`);
        parts.push(`Pkg: ${proj.packageName || proj.bundleId}`);
      }
    } else {
      parts.push(`Scope: ${platform === 'all' ? 'Cross-Platform' : platform === 'google' ? 'Android' : 'iOS'}`);
    }
    if (dateRange?.startDate) parts.push(`Period: ${dateRange.startDate} to ${dateRange.endDate}`);
    if (stats) parts.push(`KPIs: { Installs: ${stats.totalDailyUserInstalls || 0}, Active: ${stats.currentlyActiveDevices || 0}, Health: ${stats.appHealthScore || 0}/100 }`);
    return parts.join(' | ') || 'No live data';
  };

  const activeOption = modelOptions.find(m => m.id === selectedModelId) || modelOptions[0];
  const currentContextText = `[Page: ${currentPageContext.title}] [Live Data: ${buildDynamicPageData()}]${activeTab === 'notes' ? ` [Active Note: ${noteTitle}]` : ''}`;

  const executeChatRequest = async (userMessages) => {
    setIsSending(true);
    try {
      const res = await sendNoteAiChat(
        currentContextText,
        activeTab === 'notes' ? noteContent : '',
        userMessages,
        activeOption.provider,
        activeOption.model
      );
      if (res?.reply) {
        setMessages([...userMessages, { role: 'assistant', content: res.reply }]);
      } else {
        toast.error('No reply received');
      }
    } catch (err) {
      toast.error('Failed to send AI chat prompt');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendChat = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || isSending) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    await executeChatRequest(newMessages);
  };

  const toggleOpen = (tab) => {
    if (isOpen && activeTab === tab) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      setActiveTab(tab);
    }
  };

  // --- Render Helpers ---
  const renderHeader = () => (
    <div className="p-3 border-b border-white/10 flex flex-col gap-2 bg-slate-800/80">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`p-1.5 rounded-lg border ${activeTab === 'chat' ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/30' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'}`}>
            {activeTab === 'chat' ? <Bot size={16} /> : <Notebook size={16} />}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-white text-xs">{activeTab === 'chat' ? 'Ask Rankly' : 'Quick Notes'}</h4>
            <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
              {activeTab === 'chat' ? currentPageContext.title : (noteTitle || 'Untitled')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {activeTab === 'notes' && (
            <button
              onClick={handleGoToFullEditor}
              title="Open full editor"
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              <Maximize2 size={14} />
            </button>
          )}

          {activeTab === 'chat' && (
            <>
              <button
                onClick={() => setMessages([{ role: 'assistant', content: `Context reset to **${currentPageContext.title}**. How can I help?` }])}
                title="Reset conversation"
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-all"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                title="Chat Settings"
                className={`p-1.5 rounded-lg transition-all ${showSettings ? 'bg-accent-blue/20 text-accent-blue' : 'hover:bg-white/10 text-slate-400'}`}
              >
                <Settings size={14} />
              </button>
            </>
          )}

          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center p-1 bg-white/5 rounded-xl border border-white/10">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'chat' ? 'bg-accent-blue text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Sparkles size={12} />
          <span>Ask Rankly</span>
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'notes' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Notebook size={12} />
          <span>Quick Notes</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Integrated Floating Buttons (Square Block Style) */}
      <div className="fixed bottom-6 right-6 z-40 flex items-stretch bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-1.5 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={() => toggleOpen('notes')}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-xl transition-all ${activeTab === 'notes' && isOpen ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          title="Quick Notes"
        >
          <Notebook size={22} className={activeTab === 'notes' && isOpen ? 'scale-110' : ''} />
          <span className="text-[10px] font-bold">Notes</span>
        </button>

        <div className="w-[1px] self-center h-10 bg-white/10 mx-1.5" />

        <button
          onClick={() => toggleOpen('chat')}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-xl transition-all ${activeTab === 'chat' && isOpen ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          title="Ask Rankly AI"
        >
          <Sparkles size={22} className={activeTab === 'chat' && isOpen ? 'animate-pulse scale-110' : ''} />
          <span className="text-[10px] font-bold leading-tight text-center px-1">Ask Rankly</span>
        </button>
      </div>

      {/* Floating Interface Window */}
      {isOpen && (
        <div className="fixed bottom-28 right-6 z-50 w-80 sm:w-96 glass-card rounded-2xl border border-white/20 shadow-2xl flex flex-col max-h-[580px] bg-slate-900/95 backdrop-blur-xl text-xs overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {renderHeader()}

          {activeTab === 'chat' ? (
            <>
              {/* Chat Settings Panel */}
              {showSettings && (
                <div className="px-3 py-3 border-b border-white/10 bg-slate-900/50 space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">AI Model Provider</label>
                    <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-xl border border-white/10">
                      <Cpu size={13} className="text-accent-blue shrink-0 ml-1" />
                      <select
                        value={selectedModelId}
                        onChange={(e) => setSelectedModelId(e.target.value)}
                        className="w-full bg-transparent text-white text-[11px] font-semibold focus:outline-none cursor-pointer"
                      >
                        {modelOptions.map(opt => (
                          <option key={opt.id} value={opt.id} className="bg-slate-900 text-white">
                            {opt.name} {!opt.available && '(No Key)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Context Payload</label>
                      <button
                        onClick={() => setShowContext(!showContext)}
                        className={`text-[9px] px-1.5 py-0.5 rounded transition-all ${showContext ? 'bg-accent-blue/20 text-accent-blue' : 'bg-white/5 text-slate-400'}`}
                      >
                        {showContext ? 'Hide Details' : 'Show Details'}
                      </button>
                    </div>
                    {showContext && (
                      <div className="bg-slate-950/80 p-2 rounded-xl border border-white/10 text-[10px] text-slate-300 font-mono leading-relaxed break-words select-all animate-in fade-in duration-150 max-h-24 overflow-y-auto custom-scrollbar">
                        {currentContextText}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Chat Content */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar min-h-[300px] max-h-[420px]">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center space-x-1 mb-1 text-[10px] text-slate-400">
                      {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                      <span>{msg.role === 'user' ? 'You' : 'AI'}</span>
                    </div>
                    <div className={`p-2.5 rounded-xl max-w-[90%] leading-relaxed ${msg.role === 'user' ? 'bg-accent-blue text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none'}`}>
                      <MarkdownViewer content={msg.content} className="text-xs" />
                    </div>
                    {msg.role === 'assistant' && i > 0 && (
                      <button
                        onClick={() => {
                          setNoteContent(prev => prev + '\n\n' + msg.content);
                          setActiveTab('notes');
                          toast.success('Appended to notes');
                        }}
                        className="mt-1 flex items-center space-x-1 text-[10px] text-accent-blue hover:underline font-semibold"
                      >
                        <Plus size={10} />
                        <span>Append to Note</span>
                      </button>
                    )}
                  </div>
                ))}
                {isSending && (
                  <div className="flex items-center space-x-2 text-slate-400 text-[11px] p-2">
                    <Loader2 size={14} className="animate-spin text-accent-blue" />
                    <span>AI is thinking...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 bg-slate-900/90 flex items-center space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Rankly to brainstorm, edit, or analyze..."
                  className="flex-1 h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-blue transition-all"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isSending}
                  className="h-10 w-10 rounded-xl bg-accent-blue text-white flex items-center justify-center disabled:opacity-40 hover:bg-accent-blue/80 transition-all shadow-lg shadow-accent-blue/20"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Notes Content */}
              <div className="flex-1 flex flex-col p-4 space-y-4 min-h-[380px]">
                <div className="space-y-1">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">App Notebook</label>
                    {noteContent !== lastSavedContent && (
                      <span className="text-[9px] text-accent-blue font-bold animate-pulse">Auto-saving...</span>
                    )}
                  </div>
                  <div className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-bold text-xs flex items-center justify-between">
                    <span className="truncate">{noteTitle}</span>
                    <Pin size={12} className="text-amber-400 fill-amber-400 shrink-0" />
                  </div>
                </div>

                <div className="flex-1 flex flex-col space-y-1">
                   <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">Strategy & Tasks</label>
                   <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Start writing strategy, ideas, or checklists..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none custom-scrollbar font-mono text-xs leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="text-[9px] text-slate-500 font-medium">
                    Changes save automatically
                  </div>
                  <button
                    onClick={() => handleSaveNote(false)}
                    disabled={isSaving || noteContent === lastSavedContent}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 transition-all text-xs font-bold shadow-lg shadow-indigo-500/20"
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Save Now</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
