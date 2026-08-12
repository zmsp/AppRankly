import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, X, User, Loader2, Plus, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NoteAiChat({
  noteTitle = '',
  noteContent = '',
  onAppendContent,
  sendNoteAiChat
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! Ask me anything about this note, or ask me to draft ideas, extract checklist items, or summarize it.'
    }
  ]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isSending) return;

    const userMsg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsSending(true);

    try {
      const res = await sendNoteAiChat(noteTitle, noteContent, newMessages);
      if (res?.reply) {
        setMessages([...newMessages, { role: 'assistant', content: res.reply }]);
      } else {
        toast.error('No reply received');
      }
    } catch (err) {
      toast.error('Failed to send AI chat prompt');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center space-x-2 px-4 py-3 rounded-full bg-gradient-to-r from-accent-blue to-accent-purple text-white font-bold text-sm shadow-xl shadow-accent-blue/20 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
      >
        <Sparkles size={18} className="animate-pulse" />
        <span>AI Assistant</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 glass-card rounded-2xl border border-white/20 shadow-2xl flex flex-col max-h-[520px] bg-slate-900/95 backdrop-blur-xl text-xs overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-slate-800/80">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-accent-blue/20 text-accent-blue border border-accent-blue/30">
            <Bot size={16} />
          </div>
          <div>
            <h4 className="font-bold text-white text-xs">Note AI Chat</h4>
            <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{noteTitle || 'Current Note'}</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar min-h-[220px] max-h-[340px]">
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          return (
            <div key={i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center space-x-1 mb-1 text-[10px] text-slate-400">
                {isUser ? <User size={10} /> : <Bot size={10} />}
                <span>{isUser ? 'You' : 'AI'}</span>
              </div>
              <div
                className={`p-2.5 rounded-xl max-w-[90%] whitespace-pre-wrap leading-relaxed ${
                  isUser
                    ? 'bg-accent-blue text-white rounded-tr-none'
                    : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none'
                }`}
              >
                {msg.content}
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
          placeholder="Ask AI to brainstorm, edit, or check note..."
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
