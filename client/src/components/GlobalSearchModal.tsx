import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  BookOpen,
  FileText,
  Layers,
  FileEdit,
  HelpCircle,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.js';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQueryText('');
      setResults(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (!queryText || queryText.trim().length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await api.search(queryText.trim());
        setResults(data);
      } catch (err) {
        console.warn(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [queryText]);

  if (!isOpen) return null;

  const handleSelect = (url: string) => {
    onClose();
    navigate(url);
  };

  const hasResults =
    results &&
    (results.subjects?.length > 0 ||
      results.materials?.length > 0 ||
      results.chunks?.length > 0 ||
      results.notes?.length > 0 ||
      results.flashcards?.length > 0 ||
      results.questions?.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder={t.common.search}
            className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400 text-base"
          />
          {queryText && (
            <button
              onClick={() => setQueryText('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-mono"
          >
            ESC
          </button>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isSearching && (
            <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-blue-500" />
              Searching across documents, notes, and questions...
            </div>
          )}

          {!isSearching && queryText.length >= 2 && !hasResults && (
            <div className="py-12 text-center text-sm text-slate-400">
              No results found for &quot;{queryText}&quot;. Try searching with another academic term.
            </div>
          )}

          {!isSearching && !results && (
            <div className="py-8 text-center text-xs text-slate-400">
              Type at least 2 characters to search across all your subjects, uploaded documents, notes, flashcards, and exam questions.
            </div>
          )}

          {/* Semantic Document Snippets */}
          {results?.chunks?.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                Document Snippets (RAG Matches)
              </div>
              <div className="space-y-1.5">
                {results.chunks.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(`/materials/${c.materialId}`)}
                    className="w-full text-left p-3 rounded-xl hover:bg-blue-50/50 dark:hover:bg-slate-800 border border-transparent hover:border-blue-200 dark:hover:border-slate-700 transition-all group"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white mb-1">
                      <span className="group-hover:text-blue-600 transition-colors">
                        {c.materialTitle} • Page {c.pageNumber} ({c.sectionHeading})
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                        {c.similarity}% match
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {c.snippet}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subjects */}
          {results?.subjects?.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                Subjects
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {results.subjects.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelect(`/subjects/${s.id}`)}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{s.name}</div>
                      <div className="text-[11px] text-slate-400">{s.code}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Flashcards */}
          {results?.flashcards?.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                Flashcards
              </div>
              <div className="space-y-1.5">
                {results.flashcards.map((f: any) => (
                  <button
                    key={f.id}
                    onClick={() => handleSelect('/flashcards')}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-amber-50/40 dark:hover:bg-slate-800 transition-all"
                  >
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{f.front}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{f.back}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Personal Notes */}
          {results?.notes?.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <FileEdit className="w-3.5 h-3.5 text-emerald-500" />
                Notes
              </div>
              <div className="space-y-1.5">
                {results.notes.map((n: any) => (
                  <button
                    key={n.id}
                    onClick={() => handleSelect('/notes')}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-emerald-50/40 dark:hover:bg-slate-800 transition-all"
                  >
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{n.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{n.snippet}...</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Exam Questions */}
          {results?.questions?.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
                Exam Questions
              </div>
              <div className="space-y-1.5">
                {results.questions.map((q: any) => (
                  <div
                    key={q.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <div className="font-semibold text-slate-900 dark:text-white">{q.question}</div>
                    <div className="text-slate-500 dark:text-slate-400 mt-1">{q.answer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
