import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileEdit,
  Sparkles,
  Plus,
  Trash2,
  Save,
  BookOpen,
  Layers,
  GraduationCap,
  X,
  Eye,
  Edit3,
  Download,
  Printer,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { Note, Subject } from '../types/index.js';
import { MarkdownRenderer } from '../components/MarkdownRenderer.js';
import { exportToMarkdown, printFormattedDocument } from '../utils/exportUtils.js';

export const NotesView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subjectIdParam = searchParams.get('subjectId');
  const noteIdParam = searchParams.get('noteId');

  const { t } = useLanguage();
  const { showToast } = useNotification();

  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor form state
  const [title, setTitle] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [subjectId, setSubjectId] = useState(subjectIdParam || '');
  const [tagsInput, setTagsInput] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await api.getNotes(subjectIdParam || undefined);
      setNotes(res.notes || []);
      if (res.notes && res.notes.length > 0) {
        const target = noteIdParam
          ? res.notes.find((n: any) => n.id === noteIdParam) || res.notes[0]
          : res.notes[0];
        selectNote(target);
      } else {
        handleNewNote();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
    api.getSubjects().then((res) => setSubjects(res.subjects || []));
  }, []);

  const selectNote = (note: Note) => {
    setActiveNote(note);
    setTitle(note.title);
    setContentMarkdown(note.content_markdown);
    setSubjectId(note.subject_id || '');
    setTagsInput(note.tags?.join(', ') || '');
    setIsPreview(false);
  };

  const handleNewNote = () => {
    setActiveNote(null);
    setTitle('Untitled Study Note');
    setContentMarkdown('# Key Lecture Takeaways\n\n- Concept 1:\n- Concept 2:\n\n$$\\text{Formula: } E = mc^2$$');
    setSubjectId(subjects[0]?.id || '');
    setTagsInput('Lecture, Core');
    setIsPreview(false);
  };

  const handleSaveNote = async () => {
    if (!title.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (activeNote) {
        const res = await api.updateNote(activeNote.id, {
          title,
          contentMarkdown,
          subjectId: subjectId || null,
          tags,
        });
        showToast('Note saved!', 'success');
        setNotes((prev) => prev.map((n) => (n.id === activeNote.id ? res.note : n)));
        setActiveNote(res.note);
      } else {
        const res = await api.createNote({
          title,
          contentMarkdown,
          subjectId: subjectId || null,
          tags,
        });
        showToast('Note created!', 'success');
        setNotes((prev) => [res.note, ...prev]);
        setActiveNote(res.note);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await api.deleteNote(id);
      showToast('Note deleted', 'success');
      const filtered = notes.filter((n) => n.id !== id);
      setNotes(filtered);
      if (filtered.length > 0) {
        selectNote(filtered[0]);
      } else {
        handleNewNote();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAiAction = async (action: 'summarize' | 'improve' | 'convert_flashcards' | 'convert_quiz') => {
    if (!activeNote) return;
    setIsAiProcessing(true);

    try {
      const res = await api.runNoteAiAction(activeNote.id, { action });
      if (action === 'summarize') {
        setContentMarkdown((prev) => `${prev}\n\n### 💡 AI Summary:\n${res.result}`);
        showToast('AI summary appended to note!', 'success');
      } else if (action === 'improve') {
        setContentMarkdown(res.result);
        showToast('Note refined and formatted with AI!', 'success');
      } else if (action === 'convert_flashcards') {
        showToast(`Generated ${res.count} flashcards! Opening deck...`, 'success');
        navigate(`/flashcards?deckId=${res.deckId}`);
      } else if (action === 'convert_quiz') {
        showToast(`Generated practice quiz with ${res.count} questions!`, 'success');
        navigate(`/quizzes/${res.quizId}`);
      }
    } catch (err: any) {
      showToast(err.message || 'AI action failed', 'error');
    } finally {
      setIsAiProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8.5rem)] min-h-[600px]">
      {/* Notes Sidebar List */}
      <div className="hidden lg:flex flex-col w-72 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3 shrink-0">
        <button
          onClick={handleNewNote}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{t.notes.createNote}</span>
        </button>

        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 pt-2">
          Your Notes ({notes.length})
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {notes.map((n) => (
            <div
              key={n.id}
              onClick={() => selectNote(n)}
              className={`p-3 rounded-2xl cursor-pointer transition-all flex flex-col justify-between ${
                activeNote?.id === n.id
                  ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
              }`}
            >
              <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                {n.title}
              </div>
              <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                {n.content_markdown}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Note Editor Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Editor Controls Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-850/40">
          <div className="flex flex-wrap items-center gap-2 flex-1 max-w-lg">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note Title..."
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none flex-1"
            />

            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none max-w-[160px] truncate"
            >
              <option value="">No Subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPreview(!isPreview)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
            >
              {isPreview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isPreview ? 'Edit' : 'Preview'}</span>
            </button>

            <button
              onClick={() => {
                if (!contentMarkdown) {
                  showToast('Note is empty', 'error');
                  return;
                }
                exportToMarkdown(title || 'Study_Note', contentMarkdown);
                showToast('Downloaded Markdown file!', 'success');
              }}
              type="button"
              title="Download Markdown (.md)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">.md</span>
            </button>

            <button
              onClick={() => {
                if (!contentMarkdown) {
                  showToast('Note is empty', 'error');
                  return;
                }
                const subject = subjects.find((s) => s.id === subjectId);
                printFormattedDocument({
                  title: title || 'Study Note',
                  subtitle: subject?.name,
                  content: contentMarkdown,
                });
              }}
              type="button"
              title="Print or Save as PDF"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            <button
              onClick={handleSaveNote}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t.common.save}</span>
            </button>

            {activeNote && (
              <button
                onClick={() => handleDeleteNote(activeNote.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                title="Delete note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* AI Actions Row */}
        {activeNote && (
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto bg-white dark:bg-slate-900 text-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              AI Tools:
            </span>
            <button
              onClick={() => handleAiAction('summarize')}
              disabled={isAiProcessing}
              className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-100 whitespace-nowrap transition-colors disabled:opacity-50"
            >
              📝 Summarize Note
            </button>
            <button
              onClick={() => handleAiAction('improve')}
              disabled={isAiProcessing}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-100 whitespace-nowrap transition-colors disabled:opacity-50"
            >
              ✨ Improve Explanation
            </button>
            <button
              onClick={() => handleAiAction('convert_flashcards')}
              disabled={isAiProcessing}
              className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-100 whitespace-nowrap transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <Layers className="w-3 h-3" />
              <span>Convert to Flashcards</span>
            </button>
            <button
              onClick={() => handleAiAction('convert_quiz')}
              disabled={isAiProcessing}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-100 whitespace-nowrap transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <GraduationCap className="w-3 h-3" />
              <span>Convert to Practice Quiz</span>
            </button>
          </div>
        )}

        {/* Editor or Preview Pane */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isPreview ? (
            <div className="max-w-none text-slate-800 dark:text-slate-200">
              <MarkdownRenderer content={contentMarkdown || '*No content yet.*'} />
            </div>
          ) : (
            <textarea
              value={contentMarkdown}
              onChange={(e) => setContentMarkdown(e.target.value)}
              placeholder="Write your study notes using Markdown and LaTeX equations..."
              className="w-full h-full bg-transparent border-none outline-none resize-none font-mono text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-relaxed placeholder-slate-400"
            />
          )}
        </div>
      </div>
    </div>
  );
};
