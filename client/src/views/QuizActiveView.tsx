import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Flag,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Award,
  Printer,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { Quiz, QuizQuestion } from '../types/index.js';
import { printMockExamPaper } from '../utils/exportUtils.js';

export const QuizActiveView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showToast } = useNotification();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});

  // Timer
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);

  // Submission & Results
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getQuiz(id)
      .then((res) => {
        setQuiz(res.quiz);
        setQuestions(res.questions || []);
        if (res.quiz?.time_limit_mins) {
          setSecondsRemaining(res.quiz.time_limit_mins * 60);
        }
      })
      .catch((err: any) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (result || loading || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimeUp(true);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining, result, loading]);

  const handleSelectOption = (questionId: string, option: string) => {
    if (result) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleToggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleSubmit = async (auto = false) => {
    if (!id || isSubmitting || result) return;
    if (!auto && !window.confirm(t.quiz.submitConfirm)) return;

    setIsSubmitting(true);
    try {
      const timeSpent = (quiz?.time_limit_mins ? quiz.time_limit_mins * 60 : 900) - secondsRemaining;
      const res = await api.submitQuiz(id, {
        answers: selectedAnswers,
        timeSpentSecs: Math.max(10, timeSpent),
      });
      setResult(res);

      if (res.accuracy >= 75) {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      }
    } catch (err: any) {
      showToast(err.message || 'Submission failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading quiz environment...</div>;
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        Quiz not found or has no questions.{' '}
        <button onClick={() => navigate('/quizzes')} className="text-blue-500 underline">
          Return to quizzes
        </button>
      </div>
    );
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentIndex];
  const isTimeCritical = secondsRemaining < 180;

  // POST-SUBMISSION PERFORMANCE REPORT
  if (result) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
        {/* Score & Accuracy Header */}
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>Exam Completed Successfully</span>
          </div>

          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            {quiz.title}
          </h1>

          <div className="flex items-center justify-center gap-6 sm:gap-12 py-4">
            <div>
              <div className="text-4xl sm:text-5xl font-black text-blue-600 dark:text-blue-400">
                {result.score} / {result.totalPoints}
              </div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">
                Points Scored
              </div>
            </div>

            <div className="h-12 w-px bg-slate-200 dark:bg-slate-800" />

            <div>
              <div className="text-4xl sm:text-5xl font-black text-emerald-500">
                {result.accuracy}%
              </div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">
                Accuracy
              </div>
            </div>

            <div className="h-12 w-px bg-slate-200 dark:bg-slate-800" />

            <div>
              <div className="text-4xl sm:text-5xl font-black text-amber-500">
                +{result.xpGained}
              </div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">
                XP Earned
              </div>
            </div>
          </div>

          {/* AI Feedback */}
          {result.aiFeedback && (
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 font-medium max-w-xl mx-auto leading-relaxed">
              💡 {result.aiFeedback}
            </div>
          )}

          {/* Strong vs Weak Areas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-left pt-2">
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60">
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t.quiz.strongAreas}
              </div>
              {(result.strongTopics || []).length === 0 ? (
                <div className="text-xs text-slate-400">Keep practicing to build topic mastery!</div>
              ) : (
                <ul className="space-y-1">
                  {result.strongTopics.map((s: any, i: number) => (
                    <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex justify-between">
                      <span>• {s.topic}</span>
                      <span className="font-bold text-emerald-600">{s.scorePercent}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60">
              <div className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {t.quiz.weakAreas}
              </div>
              {(result.weakTopics || []).length === 0 ? (
                <div className="text-xs text-slate-400">No weak topics detected. Great mastery!</div>
              ) : (
                <ul className="space-y-1">
                  {result.weakTopics.map((w: any, i: number) => (
                    <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex justify-between">
                      <span>• {w.topic}</span>
                      <span className="font-bold text-rose-600">{w.scorePercent}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <button
              onClick={() => {
                const examQuestions = questions.map((q) => ({
                  question: q.question_text,
                  options: q.options || [],
                  correct_answer: q.correct_answer,
                  explanation: q.explanation || '',
                }));
                printMockExamPaper(
                  quiz?.title || 'Mock Examination',
                  quiz?.subject_name || 'Academic Course',
                  examQuestions
                );
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4 text-emerald-500" />
              <span>Print Exam Sheet & Solutions (PDF)</span>
            </button>

            <button
              onClick={() => navigate('/quizzes')}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-colors"
            >
              Back to Quizzes
            </button>
          </div>
        </div>

        {/* Detailed Question Review List */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {t.quiz.reviewAnswers}
          </h2>

          <div className="space-y-4">
            {(result.answers || []).map((ans: any, idx: number) => (
              <div
                key={idx}
                className={`p-6 rounded-3xl border transition-all ${
                  ans.isCorrect
                    ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-800/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-400">
                    Question {idx + 1} • {ans.topic}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                      ans.isCorrect
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {ans.isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {ans.isCorrect ? 'Correct (+1)' : 'Incorrect (0)'}
                  </span>
                </div>

                <div className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-4">
                  {ans.questionText}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-500">Your Answer: </span>
                    <span className={ans.isCorrect ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                      {ans.studentAnswer || '(Skipped)'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">Correct Answer: </span>
                    <span className="text-emerald-800 dark:text-emerald-200 font-bold">
                      {ans.correctAnswer}
                    </span>
                  </div>
                </div>

                {ans.explanation && (
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-blue-50/40 dark:bg-slate-800/40 p-3 rounded-xl">
                    <span className="font-bold text-blue-600 dark:text-blue-400">Explanation: </span>
                    {ans.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE EXAM ARENA
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Exam Header & Timer */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
            {quiz.is_mock_exam ? 'Mock Exam' : 'Practice Test'}
          </span>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
            {quiz.title}
          </h1>
        </div>

        {/* Live Timer Gauge */}
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-mono text-sm font-bold border transition-all ${
            isTimeCritical
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 text-rose-600 animate-pulse'
              : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{formatTime(secondsRemaining)}</span>
        </div>
      </div>

      {/* Main Question Arena + Palette Split */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Cols: Active Question */}
        <div className="lg:col-span-3 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-400">
                Question {currentIndex + 1} of {questions.length} • {currentQ?.topic}
              </span>
              <button
                onClick={() => handleToggleFlag(currentQ.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  flaggedQuestions[currentQ.id]
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{flaggedQuestions[currentQ.id] ? 'Flagged for Review' : 'Mark for Review'}</span>
              </button>
            </div>

            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              {currentQ.question_text}
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {currentQ.options.map((opt, oIdx) => {
                const isSelected = selectedAnswers[currentQ.id] === opt;
                const letter = String.fromCharCode(65 + oIdx);
                return (
                  <button
                    key={oIdx}
                    onClick={() => handleSelectOption(currentQ.id, opt)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3.5 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="text-xs sm:text-sm font-medium leading-relaxed">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 disabled:opacity-30"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
              >
                <span>{t.quiz.submitQuiz}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right 1 Col: Question Navigation Palette */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Questions Palette
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              {Object.keys(selectedAnswers).length} / {questions.length}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = selectedAnswers[q.id] !== undefined;
              const isFlagged = flaggedQuestions[q.id];
              const isCurrent = idx === currentIndex;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-9 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900'
                      : ''
                  } ${
                    isAnswered
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isFlagged
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span>Flagged for Review</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700" />
              <span>Unanswered</span>
            </div>
          </div>

          <button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-md mt-4"
          >
            {t.quiz.submitQuiz}
          </button>
        </div>
      </div>
    </div>
  );
};
