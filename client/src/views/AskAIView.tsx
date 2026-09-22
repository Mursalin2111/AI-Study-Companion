import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Send,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  BookOpen,
  MessageSquare,
  Plus,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { Subject, Material } from '../types/index.js';

export const AskAIView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSubjectId = searchParams.get('subjectId');
  const initialMaterialId = searchParams.get('materialId');

  const { t, language } = useLanguage();
  const { showToast } = useNotification();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || '');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(initialMaterialId || '');

  // Conversations
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Chat messages
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; sources?: any[] }>>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getSubjects().then((res) => setSubjects(res.subjects || []));
    api.getMaterials().then((res) => setMaterials(res.materials || []));
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const res = await api.getConversations();
      setConversations(res.conversations || []);
    } catch (err) {
      console.warn(err);
    }
  };

  const loadConversationMessages = async (convId: string) => {
    try {
      setActiveConversationId(convId);
      const res = await api.getConversationMessages(convId);
      const formatted = (res.messages || []).map((m: any) => ({
        role: m.role,
        content: m.content,
        sources: m.sources_json ? JSON.parse(m.sources_json) : [],
      }));
      setMessages(formatted);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSendMessage = async (queryText?: string, quickAction?: string) => {
    const text = queryText || input;
    if (!text.trim() || isStreaming) return;

    const userMessage = { role: 'user' as const, content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    try {
      const token = localStorage.getItem('study_companion_token');
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question: text,
          subjectId: selectedSubjectId || undefined,
          materialId: selectedMaterialId || undefined,
          conversationId: activeConversationId || undefined,
          language,
          quickAction,
          stream: true,
        }),
      });

      if (!response.ok) throw new Error('AI request failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let sources: any[] = [];

      setMessages((prev) => [...prev, { role: 'assistant', content: '', sources: [] }]);

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'sources') {
                sources = data.sources || [];
              } else if (data.type === 'chunk') {
                assistantText += data.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  updated[lastIdx] = {
                    role: 'assistant',
                    content: assistantText,
                    sources,
                  };
                  return updated;
                });
              } else if (data.type === 'done') {
                if (data.conversationId) {
                  setActiveConversationId(data.conversationId);
                  loadConversations();
                }
                if (data.suggestedQuestions) {
                  setSuggestedQuestions(data.suggestedQuestions);
                }
              }
            } catch {
              // ignore partial lines
            }
          }
        }
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setSuggestedQuestions([]);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(convId);
      if (activeConversationId === convId) {
        handleNewChat();
      }
      loadConversations();
      showToast('Conversation cleared', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    showToast(t.askAi.copied, 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8.5rem)] min-h-[600px]">
      {/* Conversations Sidebar (Desktop / Tablet) */}
      <div className="hidden lg:flex flex-col w-72 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3 shrink-0">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New AI Conversation</span>
        </button>

        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 pt-2">
          Recent Discussions
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {conversations.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No previous chats.</div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => loadConversationMessages(c.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  activeConversationId === c.id
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{c.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(e, c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Scope Selector Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-850/40">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">Scope:</span>

            {/* Subject Selector */}
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedMaterialId('');
              }}
              className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none"
            >
              <option value="">{t.askAi.allDocuments}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Material Selector if Subject chosen */}
            {selectedSubjectId && (
              <select
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none max-w-[200px] truncate"
              >
                <option value="">All Subject Materials</option>
                {materials
                  .filter((m) => m.subject_id === selectedSubjectId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
              </select>
            )}
          </div>

          <button
            onClick={handleNewChat}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.askAi.clearChat}</span>
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto bg-white dark:bg-slate-900">
          <button
            onClick={() => handleSendMessage('Explain this in the simplest possible terms.', 'explain_simply')}
            className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:border-blue-400 border border-transparent whitespace-nowrap transition-colors"
          >
            💡 Explain Simply
          </button>
          <button
            onClick={() => handleSendMessage('সহজ বাংলায় এই বিষয়টি ব্যাখ্যা করুন।', 'explain_in_bangla')}
            className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:border-blue-400 border border-transparent whitespace-nowrap transition-colors"
          >
            🇧🇩 বাংলায় বুঝিয়ে দিন
          </button>
          <button
            onClick={() => handleSendMessage('Give an academic exam example with solution steps.', 'give_example')}
            className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:border-blue-400 border border-transparent whitespace-nowrap transition-colors"
          >
            🔍 Give an Example
          </button>
          <button
            onClick={() => handleSendMessage('What are potential exam questions from this content?', 'exam_questions')}
            className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:border-blue-400 border border-transparent whitespace-nowrap transition-colors"
          >
            🎯 Exam Questions
          </button>
          <button
            onClick={() => handleSendMessage('Explain step-by-step with numbered logic.', 'step_by_step')}
            className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:border-blue-400 border border-transparent whitespace-nowrap transition-colors"
          >
            🔢 Step-by-Step
          </button>
        </div>

        {/* Messages Log */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
                {t.askAi.title}
              </h3>
              <p className="text-xs max-w-md leading-relaxed">
                Ask any question about your course materials. Every answer is grounded directly in your uploaded notes with page numbers and citations.
              </p>
            </div>
          )}

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700'
                }`}
              >
                <div className="whitespace-pre-line">{m.content}</div>

                {/* Grounded Citations */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-blue-500" />
                      {t.askAi.sources}:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {m.sources.map((s, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium"
                        >
                          📄 {s.materialTitle} • Page {s.pageNumber} ({s.similarity}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              {m.role === 'assistant' && m.content && (
                <div className="flex items-center gap-2 mt-1 px-1">
                  <button
                    onClick={() => handleCopy(m.content, idx)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}

          {isStreaming && (
            <div className="flex items-center gap-2 text-xs text-blue-500 animate-pulse font-medium">
              <Sparkles className="w-4 h-4" />
              <span>Analyzing materials and streaming response...</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Suggested Prompts */}
        {suggestedQuestions.length > 0 && !isStreaming && (
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto bg-slate-50/50 dark:bg-slate-850/40">
            <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">
              Suggested:
            </span>
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(q)}
                className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 whitespace-nowrap transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.askAi.placeholder}
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="p-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 shrink-0 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
