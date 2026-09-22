import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  GraduationCap,
  Layers,
  FileEdit,
  CalendarCheck,
  Plus,
  ArrowLeft,
  Calendar,
  User,
  Sparkles,
  PlayCircle,
  Clock,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { Subject, Material, Quiz, FlashcardDeck, Note, StudyPlan } from '../types/index.js';

export const SubjectDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState<'materials' | 'quizzes' | 'flashcards' | 'notes' | 'studyPlan'>('materials');
  const [subject, setSubject] = useState<Subject | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [studyPlan, setStudyPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getSubject(id)
      .then((res) => {
        setSubject(res.subject);
        setMaterials(res.materials || []);
        setQuizzes(res.quizzes || []);
        setDecks(res.flashcardDecks || []);
        setNotes(res.notes || []);
        setStudyPlan(res.studyPlan);
      })
      .catch((err: any) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading subject details...</div>;
  }

  if (!subject) {
    return (
      <div className="p-8 text-center text-slate-400">
        Subject not found.{' '}
        <Link to="/subjects" className="text-blue-500 underline">
          Back to subjects
        </Link>
      </div>
    );
  }

  const daysToExam = subject.exam_date
    ? Math.ceil((new Date(subject.exam_date).getTime() - Date.now()) / (1000 * 3600 * 24))
    : null;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/subjects')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Subjects</span>
      </button>

      {/* Subject Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ backgroundColor: subject.color || '#3B82F6' }}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white shadow-xs"
                style={{ backgroundColor: subject.color || '#3B82F6' }}
              >
                {subject.code || 'COURSE'}
              </span>
              {daysToExam !== null && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  {daysToExam > 0 ? `Exam in ${daysToExam} days` : 'Exam Today / Passed'}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {subject.name}
            </h1>

            {subject.instructor && (
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400" />
                <span>Instructor: {subject.instructor}</span>
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
              {subject.description || 'No course syllabus description provided.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate(`/ask-ai?subjectId=${subject.id}`)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask AI About Subject</span>
            </button>
            <button
              onClick={() => navigate(`/materials?subjectId=${subject.id}`)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Notes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subject Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('materials')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'materials'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Materials ({materials.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('quizzes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'quizzes'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Quizzes ({quizzes.length})</span>
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
          <span>Flashcards ({decks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'notes'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileEdit className="w-4 h-4" />
          <span>Notes ({notes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('studyPlan')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'studyPlan'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Study Plan</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {/* 1. Materials Tab */}
        {activeTab === 'materials' && (
          <div>
            {materials.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  No materials uploaded for this subject yet.
                </div>
                <button
                  onClick={() => navigate(`/materials?subjectId=${subject.id}`)}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                >
                  Upload Lecture PDF / Notes
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {materials.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => navigate(`/materials/${m.id}`)}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 cursor-pointer transition-all flex items-start justify-between gap-4 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {m.file_type}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {(m.file_size / 1024).toFixed(0)} KB • {m.chunk_count} chunks
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 transition-colors">
                        {m.title}
                      </h3>
                      <div className="text-xs text-slate-400 truncate">{m.filename}</div>
                    </div>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                      Study &rarr;
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Quizzes Tab */}
        {activeTab === 'quizzes' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Practice Quizzes</h3>
              <button
                onClick={() => navigate(`/quizzes?subjectId=${subject.id}&action=create`)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Quiz</span>
              </button>
            </div>

            {quizzes.length === 0 ? (
              <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                No quizzes yet for this subject. Generate one from your materials!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizzes.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => navigate(`/quizzes/${q.id}`)}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 cursor-pointer transition-all flex items-center justify-between gap-4 group"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          {q.difficulty}
                        </span>
                        <span className="text-xs text-slate-400">{q.total_questions} Questions</span>
                        <span className="text-xs text-slate-400">• {q.time_limit_mins} mins</span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 transition-colors">
                        {q.title}
                      </h4>
                    </div>
                    <button className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      Start
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. Flashcards Tab */}
        {activeTab === 'flashcards' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Flashcard Decks</h3>
              <button
                onClick={() => navigate('/flashcards')}
                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Go to Flashcards</span>
              </button>
            </div>

            {decks.length === 0 ? (
              <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                No flashcards created yet for this subject.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {decks.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => navigate(`/flashcards?deckId=${d.id}`)}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-amber-400 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-amber-500 transition-colors">
                        {d.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">{d.description}</p>
                    </div>
                    <Layers className="w-5 h-5 text-amber-500 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Notes Tab */}
        {activeTab === 'notes' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Subject Notes</h3>
              <button
                onClick={() => navigate(`/notes?subjectId=${subject.id}`)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Note</span>
              </button>
            </div>

            {notes.length === 0 ? (
              <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                No notes written yet. Write down lecture takeaways and convert them to flashcards or quizzes with AI!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notes.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => navigate(`/notes?noteId=${n.id}`)}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-emerald-400 cursor-pointer transition-all group"
                  >
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-emerald-600 transition-colors">
                      {n.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {n.content_markdown}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. Study Plan Tab */}
        {activeTab === 'studyPlan' && (
          <div>
            {studyPlan ? (
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Target Exam: {new Date(studyPlan.exam_date).toLocaleDateString()}
                    </h3>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Pace: {studyPlan.daily_hours} hrs/day • Target Grade: {studyPlan.target_grade}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/study-plan?planId=${studyPlan.id}`)}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors"
                  >
                    Open Interactive Planner
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <CalendarCheck className="w-10 h-10 text-slate-400 mx-auto" />
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No active study plan for {subject.name}
                </div>
                <button
                  onClick={() => navigate(`/study-plan?subjectId=${subject.id}`)}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700"
                >
                  Generate AI Study Plan
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
