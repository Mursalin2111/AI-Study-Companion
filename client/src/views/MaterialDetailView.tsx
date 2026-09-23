import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  FileText,
  Sparkles,
  ArrowLeft,
  BookOpen,
  HelpCircle,
  GraduationCap,
  Layers,
  Send,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
  Download,
  Printer,
  Image as ImageIcon,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { Material, Summary, Question } from '../types/index.js';
import { MarkdownRenderer } from '../components/MarkdownRenderer.js';
import { exportToMarkdown, printFormattedDocument, printMockExamPaper } from '../utils/exportUtils.js';
import { speakText, stopSpeaking } from '../utils/speechUtils.js';

export const MaterialDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') as any;

  const { t, language: appLang } = useLanguage();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState<'summary' | 'askAi' | 'questions' | 'quiz' | 'flashcards'>(
    initialTab || 'summary'
  );

  const [material, setMaterial] = useState<Material | null>(null);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Summary tab state
  const [summaryType, setSummaryType] = useState<'short' | 'medium' | 'detailed' | 'exam'>('exam');
  const [summaryLang, setSummaryLang] = useState<'en' | 'bn'>(appLang);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isSpeakingSummary, setIsSpeakingSummary] = useState(false);

  // Important Questions tab state
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // Ask AI Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; sources?: any[] }>>([]);
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    stopSpeaking();
    setIsSpeakingSummary(false);
  }, [summaryType, summaryLang, activeTab]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.getMaterial(id),
      api.getMaterialSummaries(id),
      api.getMaterialQuestions(id),
    ])
      .then(([matRes, sumRes, qRes]) => {
        setMaterial(matRes.material);
        setSummaries(sumRes.summaries || []);
        setQuestions(qRes.questions || []);
      })
      .catch((err: any) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatStreaming]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading study material...</div>;
  }

  if (!material) {
    return (
      <div className="p-8 text-center text-slate-400">
        Material not found.{' '}
        <Link to="/materials" className="text-blue-500 underline">
          Back to materials
        </Link>
      </div>
    );
  }

  // Find active summary matching selected type and language
  const currentSummary = summaries.find(
    (s) => s.type === summaryType && s.language === summaryLang
  );

  const handleToggleSummarySpeech = (content: string) => {
    if (isSpeakingSummary) {
      stopSpeaking();
      setIsSpeakingSummary(false);
    } else {
      setIsSpeakingSummary(true);
      speakText(content, {
        language: summaryLang,
        onStart: () => setIsSpeakingSummary(true),
        onEnd: () => setIsSpeakingSummary(false),
        onError: () => setIsSpeakingSummary(false),
      });
    }
  };

  const handleGenerateSummary = async () => {
    if (!id) return;
    stopSpeaking();
    setIsSpeakingSummary(false);
    setIsGeneratingSummary(true);
    try {
      const res = await api.summarizeMaterial({
        materialId: id,
        type: summaryType,
        language: summaryLang,
      });
      if (res.summary) {
        setSummaries((prev) => [res.summary, ...prev.filter((s) => s.id !== res.summary.id)]);
        showToast('Summary generated successfully!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate summary', 'error');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!id) return;
    setIsGeneratingQuestions(true);
    try {
      const res = await api.generateQuestions({
        materialId: id,
        language: summaryLang,
      });
      if (res.questions) {
        setQuestions(res.questions);
        showToast('Important exam questions generated!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate questions', 'error');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleSendMessage = async (queryText?: string, quickAction?: string) => {
    const text = queryText || chatInput;
    if (!text.trim() || isChatStreaming) return;

    const userMessage = { role: 'user' as const, content: text };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsChatStreaming(true);

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
          materialId: id,
          conversationId,
          language: summaryLang,
          quickAction,
          stream: true,
        }),
      });

      if (!response.ok) throw new Error('AI request failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let sources: any[] = [];

      // Temporary placeholder message
      setChatMessages((prev) => [...prev, { role: 'assistant', content: '', sources: [] }]);

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
                setChatMessages((prev) => {
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
                if (data.conversationId) setConversationId(data.conversationId);
                if (data.suggestedQuestions) setSuggestedQuestions(data.suggestedQuestions);
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
      setIsChatStreaming(false);
    }
  };

  const handleCopyAnswer = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    showToast(t.askAi.copied, 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/materials')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Study Materials</span>
      </button>

      {/* Material Header Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              {material.file_type}
            </span>
            <span className="text-xs text-slate-400">
              {(material.file_size / 1024).toFixed(0)} KB • {material.chunk_count} RAG chunks indexed
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {material.title}
          </h1>
          <div className="text-xs text-slate-400 truncate">{material.filename}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('askAi')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ask AI About This Document</span>
          </button>
        </div>
      </div>

      {/* Multimodal Image Preview */}
      {['PNG', 'JPG', 'JPEG', 'WEBP'].includes(material.file_type?.toUpperCase() || '') && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <ImageIcon className="w-4 h-4 text-blue-500" />
              <span>Captured Note Photo / Blackboard Image</span>
            </div>
            {material.file_url && (
              <a
                href={material.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                View Full Resolution ↗
              </a>
            )}
          </div>
          {material.file_url && (
            <div className="max-h-96 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-2">
              <img
                src={material.file_url}
                alt={material.title}
                className="max-h-80 w-auto object-contain rounded-xl shadow-xs"
              />
            </div>
          )}
        </div>
      )}

      {/* Feature Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'summary'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>AI Summary</span>
        </button>

        <button
          onClick={() => setActiveTab('askAi')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'askAi'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Ask AI Chat</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'questions'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Important Questions ({questions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'quiz'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Generate Quiz</span>
        </button>

        <button
          onClick={() => setActiveTab('flashcards')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'flashcards'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Flashcards</span>
        </button>
      </div>

      {/* Tab 1: AI Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Controls Bar: Type & Language */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {/* Level selector */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              {(['exam', 'short', 'medium', 'detailed'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSummaryType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    summaryType === type
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {type === 'exam' ? '⭐ Exam Focus' : type}
                </button>
              ))}
            </div>

            {/* Language toggle + Generate button */}
            <div className="flex items-center gap-3">
              <select
                value={summaryLang}
                onChange={(e) => setSummaryLang(e.target.value as any)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="en">English Summary</option>
                <option value="bn">বাংলা সামারি (Bangla)</option>
              </select>

              <button
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isGeneratingSummary ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Summary</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Summary Display Box */}
          {currentSummary ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
              {/* Summary Action Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  {summaryType} Summary ({summaryLang === 'bn' ? 'বাংলা' : 'English'})
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleSummarySpeech(currentSummary.content)}
                    type="button"
                    title={isSpeakingSummary ? 'Stop Audio' : 'Listen to Summary'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                      isSpeakingSummary
                        ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 animate-pulse'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    {isSpeakingSummary ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Listen</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      exportToMarkdown(
                        `${material?.title || 'Material'}_${summaryType}_summary`,
                        currentSummary.content
                      );
                      showToast('Downloaded Summary as Markdown!', 'success');
                    }}
                    type="button"
                    title="Download Markdown"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-500" />
                    <span>.md</span>
                  </button>
                  <button
                    onClick={() => {
                      printFormattedDocument({
                        title: `${material?.title || 'Course Material'} - ${summaryType.toUpperCase()} Summary`,
                        subtitle: `Language: ${summaryLang === 'bn' ? 'Bangla (বাংলা)' : 'English'}`,
                        content: currentSummary.content,
                      });
                    }}
                    type="button"
                    title="Print or Save as PDF"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-500" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>

              {/* Core Concepts Badges */}
              {currentSummary.key_concepts_json && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Key Concepts & Formulae
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {JSON.parse(currentSummary.key_concepts_json || '[]').map((c: string, i: number) => (
                      <span
                        key={i}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Markdown Content */}
              <div className="max-w-none text-slate-800 dark:text-slate-200">
                <MarkdownRenderer content={currentSummary.content} />
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                No {summaryType} summary generated yet for this language.
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click &quot;Generate Summary&quot; above to synthesize the document using AI.
              </p>
              <button
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 shadow-sm"
              >
                Generate {summaryType.toUpperCase()} Summary
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Ask AI Chat (Grounded RAG) */}
      {activeTab === 'askAi' && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col h-[650px] overflow-hidden">
          {/* Quick Action Prompts Bar */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => handleSendMessage('Explain this in the simplest possible way.', 'explain_simply')}
              className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-blue-400 whitespace-nowrap transition-colors"
            >
              💡 Explain Simply
            </button>
            <button
              onClick={() => handleSendMessage('সহজ বাংলায় এই বিষয়টি ব্যাখ্যা করুন।', 'explain_in_bangla')}
              className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-blue-400 whitespace-nowrap transition-colors"
            >
              🇧🇩 বাংলায় ব্যাখ্যা করুন
            </button>
            <button
              onClick={() => handleSendMessage('Give a clear real-world academic example of this concept.', 'give_example')}
              className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-blue-400 whitespace-nowrap transition-colors"
            >
              🔍 Give an Example
            </button>
            <button
              onClick={() => handleSendMessage('What are potential exam questions from this document?', 'exam_questions')}
              className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-blue-400 whitespace-nowrap transition-colors"
            >
              🎯 Potential Exam Questions
            </button>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {chatMessages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                <Sparkles className="w-8 h-8 text-blue-500 mb-1" />
                <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                  Grounded AI Document Assistant
                </div>
                <p className="text-xs max-w-sm">
                  Ask any question from &quot;{material.title}&quot;. Answers prioritize your uploaded material and cite exact pages and sections.
                </p>
              </div>
            )}

            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-line">{msg.content}</div>
                  ) : (
                    <MarkdownRenderer content={msg.content} />
                  )}

                  {/* Grounded Source Citations */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-blue-500" />
                        {t.askAi.sources}:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((s, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            📄 Page {s.pageNumber} • {s.sectionHeading || 'Section'} ({s.similarity}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Assistant Answer Utility Actions (Copy) */}
                {msg.role === 'assistant' && msg.content && (
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <button
                      onClick={() => handleCopyAnswer(msg.content, idx)}
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

            {isChatStreaming && (
              <div className="flex items-center gap-2 text-xs text-blue-500 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Reading notes and answering...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Suggested Follow-ups */}
          {suggestedQuestions.length > 0 && !isChatStreaming && (
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
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

          {/* Chat Input Field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask anything about this document..."
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isChatStreaming}
              className="p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 shrink-0 shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Important Questions */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Exam Preparation Questions
              </h3>
              <p className="text-xs text-slate-400">
                {t.questions.disclaimer}
              </p>
            </div>

            <button
              onClick={handleGenerateQuestions}
              disabled={isGeneratingQuestions}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isGeneratingQuestions ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Questions</span>
                </>
              )}
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <HelpCircle className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                No questions generated yet.
              </div>
              <button
                onClick={handleGenerateQuestions}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700"
              >
                Generate Important Questions
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q) => {
                const isExpanded = expandedQuestionId === q.id;
                const categoryLabel =
                  q.category === 'very_important'
                    ? t.questions.veryImportant
                    : q.category === 'important'
                    ? t.questions.important
                    : t.questions.practice;

                return (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            q.category === 'very_important'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              : q.category === 'important'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {categoryLabel}
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-slate-400">
                          {q.type} • {q.difficulty}
                        </span>
                      </div>

                      <button
                        onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <span>{isExpanded ? t.questions.hideAnswer : t.questions.revealAnswer}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {q.question}
                    </h4>

                    {isExpanded && (
                      <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 animate-in fade-in">
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60">
                          <span className="font-bold text-blue-600 dark:text-blue-400">Answer: </span>
                          {q.answer}
                        </div>
                        {q.explanation && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                            💡 {q.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Practice Quiz Generator */}
      {activeTab === 'quiz' && (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-lg mx-auto">
          <GraduationCap className="w-12 h-12 text-blue-600 mx-auto" />
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">
            Generate Quiz from {material.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            AI will analyze the key formulas, definitions, and algorithms from this file to generate a timed MCQ practice test.
          </p>
          <button
            onClick={() => navigate(`/quizzes?materialId=${material.id}&action=create`)}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-colors"
          >
            Configure & Start Quiz
          </button>
        </div>
      )}

      {/* Tab 5: Flashcards */}
      {activeTab === 'flashcards' && (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-lg mx-auto">
          <Layers className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">
            Flashcards for {material.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Generate spaced-repetition flashcards to memorize core theorems and concepts using the SM-2 learning algorithm.
          </p>
          <button
            onClick={() => navigate(`/flashcards?materialId=${material.id}&action=generate`)}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-md transition-colors"
          >
            Create Flashcards Deck
          </button>
        </div>
      )}
    </div>
  );
};
