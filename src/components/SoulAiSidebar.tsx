import React, { useState } from 'react';
import { Sparkles, Send, X, ShieldAlert, FileText, Code2, HelpCircle } from 'lucide-react';
import type { BrowserTab } from '../browser/types';

interface AiMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text: string;
}

interface SoulAiSidebarProps {
  activeTab: BrowserTab;
  isPrivate: boolean;
  initialPrompt?: string;
  onClose: () => void;
}

export const SoulAiSidebar: React.FC<SoulAiSidebarProps> = ({
  activeTab,
  isPrivate,
  initialPrompt = '',
  onClose,
}) => {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState(initialPrompt);
  const [sendPageContext, setSendPageContext] = useState(false);
  const [loading, setLoading] = useState(false);

  const isExternalPage = !activeTab.url.startsWith('soul://');
  const canAttachPage = !isPrivate && isExternalPage && sendPageContext;

  const sendMessage = async (promptText: string, mode: 'chat' | 'summarize' | 'explain' | 'code' = 'chat') => {
    const clean = promptText.trim();
    if (!clean || loading) return;

    const userMsg: AiMessage = { id: `u_${Date.now()}`, role: 'user', text: clean };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const pageContext = canAttachPage
        ? {
            url: activeTab.url,
            title: activeTab.title,
            excerpt: activeTab.pageData?.reader?.paragraphs.join('\n\n') || activeTab.pageData?.description || '',
          }
        : null;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: clean,
          mode,
          pageContext,
          isPrivate,
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { id: `e_${Date.now()}`, role: 'error', text: data.error || 'AI request failed.' },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: `a_${Date.now()}`, role: 'assistant', text: data.reply || '' },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e_${Date.now()}`,
          role: 'error',
          text: 'Could not reach the SOUL AI backend service.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside
      aria-label="SOUL AI assistant sidebar"
      className="w-80 shrink-0 border-l border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D111E] flex flex-col text-xs"
    >
      <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#885DFF]" />
          <span className="font-display font-semibold text-sm text-slate-900 dark:text-white">
            SOUL AI
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
          aria-label="Close SOUL AI sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Explicit Privacy & Consent Notice */}
      <div className="p-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#101525] space-y-2">
        {isPrivate ? (
          <div className="flex items-start gap-2 text-[#C084FC]">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Private Browsing active: SOUL AI will never automatically read or transmit page content from private tabs.
            </p>
          </div>
        ) : (
          <>
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="text-slate-700 dark:text-[#D5DCF0] font-medium">
                Include current page content
              </span>
              <input
                type="checkbox"
                checked={sendPageContext}
                disabled={!isExternalPage}
                onChange={(e) => setSendPageContext(e.target.checked)}
                className="accent-[#885DFF]"
              />
            </label>
            <p className="text-[11px] text-slate-500 dark:text-[#9AA3B5] leading-relaxed">
              {canAttachPage
                ? `When you submit a message, text from "${activeTab.title}" is sent to the configured AI service.`
                : 'Off by default. Page content is only sent when you enable this option and submit a prompt.'}
            </p>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-2.5 flex flex-wrap gap-1.5 border-b border-slate-200 dark:border-white/10">
        <button
          type="button"
          onClick={() =>
            sendMessage(
              canAttachPage
                ? `Summarize the page "${activeTab.title}".`
                : 'How can you help summarize web pages safely?',
              'summarize'
            )
          }
          className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-1 text-slate-700 dark:text-[#D5DCF0]"
        >
          <FileText className="w-3 h-3" />
          <span>Summarize</span>
        </button>
        <button
          type="button"
          onClick={() => sendMessage('Explain the core concepts on this topic simply.', 'explain')}
          className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-1 text-slate-700 dark:text-[#D5DCF0]"
        >
          <HelpCircle className="w-3 h-3" />
          <span>Explain</span>
        </button>
        <button
          type="button"
          onClick={() => sendMessage('Explain any programming patterns or architecture mentioned here.', 'code')}
          className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-1 text-slate-700 dark:text-[#D5DCF0]"
        >
          <Code2 className="w-3 h-3" />
          <span>Explain Code</span>
        </button>
      </div>

      {/* Conversation History */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {messages.length === 0 ? (
          <div className="text-slate-500 dark:text-[#9AA3B5] leading-relaxed space-y-2">
            <p className="font-medium text-slate-700 dark:text-[#D5DCF0]">Optional Reading & Code Assistant</p>
            <p>
              Ask questions about web content, programming concepts, or enable page context above to summarize an open article.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`p-2.5 rounded-lg leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-[#4A8DFF]/15 text-slate-900 dark:text-white ml-4'
                  : m.role === 'error'
                  ? 'bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-300'
                  : 'bg-slate-100 dark:bg-[#101525] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-[#F5F7FF]'
              }`}
            >
              {m.text}
            </div>
          ))
        )}
        {loading && (
          <div className="text-slate-500 dark:text-[#9AA3B5]">Generating response...</div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="p-3 border-t border-slate-200 dark:border-white/10 flex gap-1.5"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask SOUL AI..."
          aria-label="Prompt for SOUL AI"
          className="flex-1 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#08090D] text-slate-900 dark:text-white outline-none focus:border-[#885DFF]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-3 py-2 rounded-lg bg-[#885DFF] text-white disabled:opacity-40 inline-flex items-center justify-center"
          aria-label="Send message to SOUL AI"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </aside>
  );
};
