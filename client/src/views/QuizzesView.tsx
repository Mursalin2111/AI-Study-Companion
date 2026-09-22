import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  GraduationCap,
  Sparkles,
  Plus,
  PlayCircle,
  Clock,
  CheckCircle2,
  Award,
  BookOpen,
  ArrowRight,
  X,
  History,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { Quiz, Subject, Material } from '../types/index.js';

export const QuizzesView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const materialIdParam = searchParams.get('materialId');
  const subjectIdParam = searchParams.get('subjectId');
  const actionParam = searchParams.get('action');

  const { t } = useLanguage();
  const { showToast } = useNotification();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate modal
  const [isModalOpen, setIsModalOpen] = useState(actionParam === 'create');
  const [isMockExam, setIsMockExam] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjectIdParam || '');
  const [selectedMaterialId, setSelectedMaterialId] = useState(materialIdParam || '');
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    Promise.all([api.getQuizzes(), api.getRecentAttempts(), api.getSubjects(), api.getMaterials()])
      .then(([quizRes, attemptRes, subRes, matRes]) => {
        setQuizzes(quizRes.quizzes || []);
        setRecentAttempts(attemptRes.attempts || []);
        setSubjects(subRes.subjects || []);
        setMaterials(matRes.materials || []);
      })
      .catch((err: any) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId && !selectedMaterialId) {
      showToast('Please select a subject or material', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await api.generateQuiz({
        subjectId: selectedSubjectId || undefined,
        materialId: selectedMaterialId || undefined,
        questionCount,
        difficulty,
        isMockExam,
      });

      showToast('Quiz generated successfully! Starting test...', 'success');
      setIsModalOpen(false);
      navigate(`/quizzes/${res.quiz.id}`);
    } catch (err: any) {
      showToast(err.message || 'Quiz generation failed', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.quiz.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Test your knowledge with AI-generated MCQs, timed mock exams, and instant performance analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setIsMockExam(false);
              setQuestionCount(10);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t.quiz.generateNew}</span>
          </button>

          <button
            onClick={() => {
              setIsMockExam(true);
              setQuestionCount(20);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.quiz.startMock}</span>
          </button>
        </div>
      </div>

      {/* Available Quizzes Grid */}
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          Available Quizzes & Exams ({quizzes.length})
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <GraduationCap className="w-12 h-12 text-blue-500 mx-auto" />
            <div className="font-bold text-slate-800 dark:text-slate-200 text-base">
              No quizzes created yet.
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Generate a practice quiz or mock exam from your course notes!
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700"
            >
              Generate Practice Quiz
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map((q) => (
              <div
                key={q.id}
                onClick={() => navigate(`/quizzes/${q.id}`)}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                          q.is_mock_exam
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {q.is_mock_exam ? 'Mock Exam' : 'Practice Quiz'}
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-slate-400">
                        {q.difficulty}
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {q.time_limit_mins} mins
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {q.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {q.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span>{q.total_questions} Questions</span>
                    {q.best_accuracy !== undefined && q.best_accuracy !== null && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        • Best: {Math.round(q.best_accuracy)}%
                      </span>
                    )}
                  </div>

                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <PlayCircle className="w-4 h-4" />
                    <span>Start Test</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Attempts History */}
      {recentAttempts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-blue-500" />
            Recent Exam Results
          </h2>

          <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <tr>
                  <th className="p-4">Quiz / Exam</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Score</th>
                  <th className="p-4">Accuracy</th>
                  <th className="p-4">Time Spent</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {recentAttempts.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {att.quiz_title}
                    </td>
                    <td className="p-4">{att.subject_name || 'General'}</td>
                    <td className="p-4 font-semibold">
                      {att.score} / {att.total_points}
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md ${
                          att.accuracy >= 80
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                            : att.accuracy >= 60
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-600'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                        }`}
                      >
                        {Math.round(att.accuracy)}%
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">
                      {Math.floor(att.time_spent_secs / 60)}m {att.time_spent_secs % 60}s
                    </td>
                    <td className="p-4 text-slate-400">
                      {new Date(att.completed_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generate Quiz Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                {isMockExam ? 'Create Timed Mock Exam' : 'Generate Practice Quiz'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateQuiz} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject *
                </label>
                <select
                  required
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setSelectedMaterialId('');
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">Select subject...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Specific Document (Optional)
                </label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">All materials in subject</option>
                  {materials
                    .filter((m) => !selectedSubjectId || m.subject_id === selectedSubjectId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Questions
                  </label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={20}>20 Questions</option>
                    <option value={30}>30 Questions (Exam)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isGenerating || !selectedSubjectId}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Start Test Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
