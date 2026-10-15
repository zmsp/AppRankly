import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, Send, Sparkles, X, User, Loader2, Plus, Cpu, RotateCcw, Compass, HelpCircle, Database, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import pageContexts from '../data/pageContexts.json';
import MarkdownViewer from './MarkdownViewer';

const DEFAULT_MODEL_OPTIONS = [
  { id: 'gemini:gemini-3.8-flash', name: 'Google (Gemini 3.8 Flash - Latest)', provider: 'gemini', model: 'gemini-3.8-flash' },
  { id: 'gemini:gemini-3.8-flash-lite', name: 'Google (Gemini 3.8 Flash Lite - Latest Lite)', provider: 'gemini', model: 'gemini-3.8-flash-lite' },
  { id: 'gemini:gemini-2.5-flash-lite', name: 'Google (Gemini 2.5 Flash Lite)', provider: 'gemini', model: 'gemini-2.5-flash-lite' },
  { id: 'gemini:gemini-3.8-pro', name: 'Google (Gemini 3.8 Pro)', provider: 'gemini', model: 'gemini-3.8-pro' },
  { id: 'openai:gpt-5-nano', name: 'OpenAI (GPT-5 nano)', provider: 'openai', model: 'gpt-5-nano' },
  { id: 'openai:gpt-4o-mini', name: 'OpenAI (GPT-4o mini)', provider: 'openai', model: 'gpt-4o-mini' },
  { id: 'openai:gpt-4o', name: 'OpenAI (GPT-4o)', provider: 'openai', model: 'gpt-4o' },
  { id: 'anthropic:claude-3-7-sonnet-latest', name: 'Anthropic (Claude 3.7 Sonnet)', provider: 'anthropic', model: 'claude-3-7-sonnet-latest' },
  { id: 'anthropic:claude-haiku-4-5-20251001', name: 'Anthropic (Claude Haiku 4.5)', provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
  { id: 'anthropic:claude-3-5-sonnet-latest', name: 'Anthropic (Claude 3.5 Sonnet)', provider: 'anthropic', model: 'claude-3-5-sonnet-latest' }
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

export default function AskRankly({
  noteTitle = '',
  noteContent = '',
  onAppendContent,
  sendNoteAiChat,
  projects = [],
  stats = null,
  platform = 'all',
  selectedProjectIndex = 'all',
  dateRange = null,
  activeDimension = null,
  dimensionStats = null,
  aiStatus = null
}) {
  const location = useLocation();
  const currentPageContext = getPageContext(location.pathname);

  const [isOpen, setIsOpen] = useState(false);
  const [isSqlMode, setIsSqlMode] = useState(false);

  // Derive model options from aiStatus if available
  const [modelOptions, setModelOptions] = useState(DEFAULT_MODEL_OPTIONS);
  const [selectedModelId, setSelectedModelId] = useState('gemini:gemini-3.8-flash');

  useEffect(() => {
    if (aiStatus?.providers) {
      const options = [];
      const supportedMap = aiStatus.supportedModels || {};

      aiStatus.providers.forEach(p => {
        const displayName = p.id === 'openai' ? 'OpenAI' : p.id === 'anthropic' ? 'Anthropic' : 'Google';
        const providerModels = supportedMap[p.id] || p.models || [];

        // Primary/configured model first
        options.push({
          id: `${p.id}:${p.model}`,
          name: `${displayName} (${p.model} - Default)`,
          provider: p.id,
          model: p.model,
          available: p.available
        });

        // Other supported models
        providerModels.forEach(m => {
          if (m.id !== p.model) {
            options.push({
              id: `${p.id}:${m.id}`,
              name: `${displayName} (${m.name || m.id})`,
              provider: p.id,
              model: m.id,
              available: p.available
            });
          }
        });
      });

      if (options.length > 0) {
        setModelOptions(options);
        const defaultProvider = aiStatus.defaultProvider || 'gemini';
        setSelectedModelId(prev => {
          if (options.some(o => o.id === prev)) return prev;
          const match = options.find(o => o.provider === defaultProvider);
          return match ? match.id : options[0].id;
        });
      }
    }
  }, [aiStatus]);

  const [input, setInput] = useState('');
  
  const buildGreeting = (ctx) => `Hi! You are on **${ctx.title}** (${ctx.description}). Ask me anything or try one of the suggested prompts below.`;
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: buildGreeting(currentPageContext)
    }
  ]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const [showContext, setShowContext] = useState(false);

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

    if (dateRange?.startDate) {
      parts.push(`Period: ${dateRange.startDate} to ${dateRange.endDate}`);
    }

    if (stats) {
      parts.push(`KPIs: { Installs: ${stats.totalDailyUserInstalls || 0}, Active: ${stats.currentlyActiveDevices || 0}, Health: ${stats.appHealthScore || 0}/100 }`);
      if (stats.appHealthAlerts?.length > 0) parts.push(`Alerts: ${stats.appHealthAlerts.length}`);
    }

    if (activeDimension && dimensionStats?.length > 0) {
      const top3 = dimensionStats.slice(0, 3).map(d => `${d.label || d.key}(${d.totalInstalls || d.installs || 0})`).join(', ');
      parts.push(`Top ${activeDimension}: [${top3}]`);
    }

    return parts.join(' | ') || 'No live data';
  };

  const activeOption = modelOptions.find(m => m.id === selectedModelId) || modelOptions[0];
  const currentContextText = `[Page: ${currentPageContext.title}] [Live Data: ${buildDynamicPageData()}]${noteTitle ? ` [Active Note: ${noteTitle}]` : ''}`;

  // Auto-set context on route change ONLY when chat has no user messages (empty conversation state)
  useEffect(() => {
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
  }, [location.pathname, currentPageContext.title]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleResetContext = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Context reset to **${currentPageContext.title}** (${currentPageContext.description}).${noteTitle ? ` Active note: "${noteTitle}".` : ''} How can I help?`
      }
    ]);
    toast.success(`Context reset to ${currentPageContext.title}`);
  };

  const handleSetCurrentPageContext = () => {
    const newMsgs = [
      ...messages,
      {
        role: 'assistant',
        content: `[Context Synced] Now focusing on **${currentPageContext.title}**: ${currentPageContext.description}${noteTitle ? ` (Note: ${noteTitle})` : ''}`
      }
    ];
    setMessages(newMsgs);
    toast.success(`Synced page context: ${currentPageContext.title}`);
  };

  const formatRowsAsMarkdownTable = (columns, rows) => {
    if (!rows || rows.length === 0) return '_No records returned._';
    const header = '| ' + columns.join(' | ') + ' |';
    const divider = '| ' + columns.map(() => '---').join(' | ') + ' |';
    const body = rows.slice(0, 15).map(r => 
      '| ' + columns.map(c => String(r[c] !== null && r[c] !== undefined ? r[c] : '')).join(' | ') + ' |'
    ).join('\n');
    return `${header}\n${divider}\n${body}${rows.length > 15 ? `\n\n_Showing first 15 of ${rows.length} records_` : ''}`;
  };

  const handleExecutiveBrief = async () => {
    setIsSending(true);
    try {
      const res = await fetch('/api/ai/executive-brief');
      if (res.ok) {
        const data = await res.json();
        const briefContent = `### 📊 Portfolio Executive Digest (${new Date(data.timestamp).toLocaleDateString()})\n\n` +
          data.summaryBullets.map(b => `- ${b}`).join('\n');
        setMessages(prev => [...prev, { role: 'assistant', content: briefContent }]);
        toast.success('Generated Executive Digest');
      } else {
        toast.error('Failed to generate executive brief');
      }
    } catch (err) {
      toast.error('Brief error: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const executeChatRequest = async (userMessages) => {
    setIsSending(true);

    if (isSqlMode) {
      try {
        const lastMsg = userMessages[userMessages.length - 1].content;
        const res = await fetch('/api/ai/ask-sql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: lastMsg,
            provider: activeOption.provider,
            model: activeOption.model
          })
        });
        const data = await res.json();
        if (data.success) {
          const tableMd = formatRowsAsMarkdownTable(data.columns, data.rows);
          const reply = `**Generated Safe SQL:**\n\`\`\`sql\n${data.sql}\n\`\`\`\n\n**Database Results (${data.rowCount} records):**\n\n${tableMd}`;
          setMessages([...userMessages, { role: 'assistant', content: reply }]);
        } else {
          setMessages([...userMessages, { role: 'assistant', content: `⚠️ **SQL Error:** ${data.error || 'Failed to execute query against database.'}` }]);
        }
      } catch (err) {
        toast.error('SQL query execution failed');
      } finally {
        setIsSending(false);
      }
      return;
    }

    try {
      const res = await sendNoteAiChat(
        currentContextText,
        noteContent,
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

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isSending) return;

    const userMsg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    await executeChatRequest(newMessages);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center space-x-2 px-4 py-3 rounded-full bg-gradient-to-r from-accent-blue to-accent-purple text-white font-bold text-sm shadow-xl shadow-accent-blue/20 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
      >
        <Sparkles size={18} className="animate-pulse" />
        <span>Ask Rankly</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 glass-card rounded-2xl border border-white/20 shadow-2xl flex flex-col max-h-[560px] bg-slate-900/95 backdrop-blur-xl text-xs overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex flex-col gap-2 bg-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-accent-blue/20 text-accent-blue border border-accent-blue/30">
              <Bot size={16} />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs">Ask Rankly</h4>
              <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{noteTitle || 'Current Note'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsSqlMode(!isSqlMode)}
              title={isSqlMode ? "Switch to General Assistant" : "Switch to Direct SQL Database Analyst Mode"}
              className={`p-1.5 rounded-lg transition-all flex items-center space-x-1 ${isSqlMode ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'hover:bg-white/10 text-slate-400'}`}
            >
              <Database size={13} />
              <span className="text-[10px] hidden sm:inline font-bold">SQL Mode</span>
            </button>

            <button
              onClick={handleExecutiveBrief}
              title="Generate quick Portfolio Executive Brief"
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-amber-300 transition-all flex items-center space-x-1"
            >
              <FileText size={13} />
              <span className="text-[10px] hidden sm:inline font-medium">Brief</span>
            </button>

            <button
              onClick={() => setShowContext(!showContext)}
              title="Toggle injected context inspector"
              className={`p-1.5 rounded-lg transition-all flex items-center space-x-1 ${showContext ? 'bg-accent-blue/20 text-accent-blue' : 'hover:bg-white/10 text-slate-400'}`}
            >
              <HelpCircle size={14} />
              <span className="text-[10px] hidden sm:inline font-medium">Context</span>
            </button>

            <button
              onClick={handleSetCurrentPageContext}
              title={`Sync context to current page (${currentPageContext.title})`}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-accent-blue transition-all flex items-center space-x-1"
            >
              <Compass size={14} />
              <span className="text-[10px] hidden sm:inline font-medium">Sync</span>
            </button>

            <button
              onClick={handleResetContext}
              title="Reset conversation context"
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-all flex items-center space-x-1"
            >
              <RotateCcw size={14} />
              <span className="text-[10px] hidden sm:inline font-medium">Reset</span>
            </button>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Collapsible Context Inspector Pill */}
        {showContext && (
          <div className="bg-slate-950/80 p-2 rounded-xl border border-white/10 text-[10px] text-slate-300 font-mono leading-relaxed space-y-1 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-slate-400 font-sans border-b border-white/10 pb-1 mb-1">
              <span className="font-semibold text-accent-blue text-[10px]">Injected Context Payload</span>
              <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-slate-400">{currentContextText.length}/400 chars</span>
            </div>
            <p className="break-words select-all text-slate-300">
              {currentContextText}
            </p>
          </div>
        )}

        {/* Model Selection Dropdown */}
        <div className="flex items-center space-x-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
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

        {/* Static Page Suggested Prompts */}
        {currentPageContext.suggestedPrompts?.length > 0 && messages.length <= 2 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {currentPageContext.suggestedPrompts.map((promptText, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInput('');
                  const newMsgs = [...messages, { role: 'user', content: promptText }];
                  setMessages(newMsgs);
                  executeChatRequest(newMsgs, false);
                }}
                disabled={isSending}
                className="text-[10px] bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue border border-accent-blue/30 px-2 py-0.5 rounded-full text-left truncate max-w-full transition-all"
              >
                💡 {promptText}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar min-h-[200px] max-h-[320px]">
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          return (
            <div key={i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center space-x-1 mb-1 text-[10px] text-slate-400">
                {isUser ? <User size={10} /> : <Bot size={10} />}
                <span>{isUser ? 'You' : 'AI'}</span>
              </div>
              <div
                className={`p-2.5 rounded-xl max-w-[90%] leading-relaxed ${
                  isUser
                    ? 'bg-accent-blue text-white rounded-tr-none whitespace-pre-wrap'
                    : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none'
                }`}
              >
                {isUser ? (
                  msg.content
                ) : (
                  <MarkdownViewer content={msg.content} className="text-xs" />
                )}
              </div>
              {!isUser && i > 0 && onAppendContent && (
                <button
                  onClick={() => {
                    onAppendContent(msg.content);
                    toast.success('Appended response to note');
                  }}
                  className="mt-1 flex items-center space-x-1 text-[10px] text-accent-blue hover:underline font-semibold"
                >
                  <Plus size={10} />
                  <span>Insert into Note</span>
                </button>
              )}
            </div>
          );
        })}
        {isSending && (
          <div className="flex items-center space-x-2 text-slate-400 text-[11px] p-2">
            <Loader2 size={14} className="animate-spin text-accent-blue" />
            <span>AI is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-slate-900/90 flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Rankly to brainstorm, edit, or analyze..."
          disabled={isSending}
          className="flex-1 h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-blue placeholder-slate-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className="h-9 w-9 rounded-xl bg-accent-blue text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-blue/80 transition-all shrink-0"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
