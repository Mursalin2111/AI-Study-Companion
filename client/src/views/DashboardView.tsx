import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  Clock,
  CheckCircle2,
  Flame,
  Zap,
  Calendar,
  Sparkles,
  ArrowRight,
  Plus,
  PlayCircle,
  Layers,
  Award,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { api } from '../services/api.js';
import { AnalyticsData, Subject } from '../types/index.js';

export const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([api.getAnalytics(), api.getSubjects()])
      .then(([analyticsRes, subjectsRes]) => {
        setAnalytics(analyticsRes);
        setSubjects(subjectsRes.subjects || []);
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const overview = analytics?.overview || {
    subjectCount: subjects.length,
    materialCount: 0,
    studyTimeMinutes: 120,
    questionsAnswered: 45,
    quizAccuracy: 82,
    currentStreak: user?.profile?.streak_count || 1,
    xp: user?.profile?.xp || 100,
    level: 1,
  };

  const studyHours = (overview.studyTimeMinutes / 60).toFixed(1);

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-blue-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{user?.profile?.university || 'University Student'}</span>
              <span>•</span>
              <span>{user?.profile?.department || 'Academic Prep'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t.dashboard.welcomeBack}, {user?.profile?.name?.split(' ')[0] || 'Scholar'}! 👋
            </h1>
            <p className="text-sm text-blue-100/90 max-w-xl leading-relaxed">
              {user?.profile?.study_goals ||
                'Upload your lecture slides or notes to get AI summaries, flashcards, and mock exams.'}
            </p>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/ask-ai')}
              className="px-4 py-2.5 rounded-2xl bg-white text-blue-600 font-bold text-xs hover:bg-blue-50 transition-all shadow-md flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Ask AI</span>
            </button>
            <button
              onClick={() => navigate('/materials')}
              className="px-4 py-2.5 rounded-2xl bg-white/20 backdrop-blur-md text-white font-semibold text-xs hover:bg-white/30 transition-all border border-white/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Notes</span>
            </button>
          </div>
        </div>

        {/* Decorative ambient circles */}
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-12 w-64 h-64 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none" />
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {overview.subjectCount}
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              {t.dashboard.totalSubjects}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {studyHours} <span className="text-xs font-semibold text-slate-400">{t.dashboard.hours}</span>
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              {t.dashboard.studyTime}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {overview.quizAccuracy}%
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              {t.dashboard.quizAccuracy}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 text-amber-500 fill-amber-500" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {overview.currentStreak}{' '}
              <span className="text-xs font-semibold text-slate-400">days</span>
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              {t.dashboard.streak}
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section: AI Recommendations & Continue Studying */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: AI Recommendations + Continue Studying */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Recommendations Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 border border-indigo-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t.dashboard.aiRecommendations}
              </h2>
            </div>

            <div className="space-y-3">
              {(analytics?.recommendations || []).map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs hover:border-indigo-300 dark:hover:border-slate-600 transition-all"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {rec.title}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {rec.description}
                    </div>
                  </div>
                  <Link
                    to={rec.actionUrl}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-colors shrink-0"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Continue Studying: Active Subjects */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.dashboard.continueStudying}
              </h2>
              <Link
                to="/subjects"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View all subjects <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subjects.slice(0, 4).map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => navigate(`/subjects/${sub.id}`)}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white shadow-xs"
                        style={{ backgroundColor: sub.color || '#3B82F6' }}
                      >
                        {sub.code || 'COURSE'}
                      </span>
                      {sub.exam_date && (
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(sub.exam_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {sub.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {sub.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{sub.material_count || 0} {t.subjects.materialsCount}</span>
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                      Study now <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Upcoming Exams + Weekly Activity Bar Chart + Badges */}
        <div className="space-y-6">
          {/* Upcoming Exams Countdown */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              {t.dashboard.upcomingExams}
            </h2>

            {(analytics?.upcomingExams?.length || 0) === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                {t.dashboard.noExams}
              </div>
            ) : (
              <div className="space-y-3">
                {analytics!.upcomingExams.map((ex) => {
                  const daysRemaining = Math.max(
                    0,
                    Math.ceil((new Date(ex.exam_date).getTime() - Date.now()) / (1000 * 3600 * 24))
                  );
                  return (
                    <div
                      key={ex.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{ex.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{ex.code}</div>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold text-xs">
                          {daysRemaining} days left
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Weekly Activity Bar Chart */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                7-Day Study Activity
              </h2>
              <span className="text-xs font-semibold text-slate-400">Minutes / Day</span>
            </div>

            <div className="flex items-end justify-between gap-2 h-36 pt-4 px-1">
              {(analytics?.weeklyActivity || []).map((day, idx) => {
                const maxMins = 90;
                const barHeightPct = Math.min(100, Math.max(12, Math.round((day.minutes / maxMins) * 100)));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {day.minutes}m
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden h-24 flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-lg transition-all duration-500"
                        style={{ height: `${barHeightPct}%` }}
                      />
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      {day.dayName}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievement Badges Showcase */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Badges & Milestones
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {(analytics?.badges || []).slice(0, 4).map((badge, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 transition-all ${
                    badge.isUnlocked
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-50'
                  }`}
                >
                  <Award
                    className={`w-5 h-5 shrink-0 ${
                      badge.isUnlocked ? 'text-amber-500' : 'text-slate-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {badge.title}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {badge.isUnlocked ? 'Unlocked ✨' : 'In Progress'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
