import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Flame,
  Zap,
  CheckCircle2,
  Clock,
  TrendingUp,
  Award,
  BookOpen,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { AnalyticsData } from '../types/index.js';

export const ProgressAnalyticsView: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useNotification();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics()
      .then(setData)
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading analytics and mastery data...</div>;
  }

  if (!data) return null;

  const { overview, weeklyActivity, weakTopics, strongTopics, badges } = data;
  const studyHours = (overview.studyTimeMinutes / 60).toFixed(1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t.nav.progress}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Track your study velocity, topic competencies, and exam readiness over time.
        </p>
      </div>

      {/* Gamification Level & Streak Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black shadow-inner">
            Lvl {overview.level}
          </div>
          <div>
            <div className="text-xs font-semibold text-blue-100 uppercase tracking-wider">
              Scholar Progression
            </div>
            <div className="text-xl sm:text-2xl font-black">
              {overview.xp} Total Experience Points (XP)
            </div>
            <div className="text-xs text-blue-100/80 mt-0.5">
              {(overview.level * 200) - overview.xp} XP until Level {overview.level + 1}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/15">
          <Flame className="w-8 h-8 text-amber-300 fill-amber-300 animate-pulse" />
          <div>
            <div className="text-2xl font-black">{overview.currentStreak} Days</div>
            <div className="text-xs font-medium text-blue-100">Consecutive Study Streak</div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">{t.dashboard.studyTime}</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {studyHours} <span className="text-xs font-semibold text-slate-400">hours</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">{t.dashboard.quizAccuracy}</div>
          <div className="text-2xl font-black text-emerald-500 mt-1">
            {overview.quizAccuracy}%
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Questions Practiced</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {overview.questionsAnswered}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Flashcards Mastered</div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {overview.flashcardCount}
          </div>
        </div>
      </div>

      {/* 2-Column: Weekly Activity Chart & Topic Competencies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity Bar Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Weekly Study Activity
            </h2>
            <span className="text-xs text-slate-400 font-semibold">Minutes per Day</span>
          </div>

          <div className="flex items-end justify-between gap-3 h-48 pt-6 px-2">
            {weeklyActivity.map((day, idx) => {
              const maxMinutes = 120;
              const heightPct = Math.min(100, Math.max(10, Math.round((day.minutes / maxMinutes) * 100)));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {day.minutes}m
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden h-32 flex items-end">
                    <div
                      className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-xl transition-all duration-500"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {day.dayName}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Topic Mastery Radar (Strong vs Weak) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            Topic Mastery & Exam Readiness
          </h2>

          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Challenging Topics (Needs Review)
            </div>
            {weakTopics.map((w, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{w.topic}</span>
                  <span className="font-bold text-rose-500">{w.scorePercent}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full"
                    style={{ width: `${w.scorePercent}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-3">
              Strong Topics (Mastered)
            </div>
            {strongTopics.map((s, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{s.topic}</span>
                  <span className="font-bold text-emerald-500">{s.scorePercent}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${s.scorePercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Achievement Badges Showcase */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          Academic Achievement Badges
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {badges.map((b, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 transition-all ${
                b.isUnlocked
                  ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/80 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800 opacity-40'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  b.isUnlocked
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                }`}
              >
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">{b.title}</div>
                <div className="text-[11px] text-slate-400 leading-snug mt-0.5">{b.description}</div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                {b.isUnlocked ? 'Unlocked ✨' : 'Locked'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
