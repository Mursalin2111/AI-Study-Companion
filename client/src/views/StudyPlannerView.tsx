import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarCheck,
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  Calendar,
  Plus,
  Trash2,
  X,
  TrendingUp,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { StudyPlan, StudyTask, Subject } from '../types/index.js';

export const StudyPlannerView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const planIdParam = searchParams.get('planId');
  const subjectIdParam = searchParams.get('subjectId');

  const { t } = useLanguage();
  const { showToast } = useNotification();

  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    subjectId: subjectIdParam || '',
    examDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    dailyHours: 2,
    currentLevel: 'intermediate',
    targetGrade: 'A',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.getStudyPlans();
      setPlans(res.plans || []);
      if (res.plans && res.plans.length > 0) {
        const target = planIdParam ? res.plans.find((p: any) => p.id === planIdParam) || res.plans[0] : res.plans[0];
        loadPlan(target.id);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPlan = async (id: string) => {
    try {
      const res = await api.getStudyPlan(id);
      setActivePlan(res.plan);
      setTasks(res.tasks || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  useEffect(() => {
    fetchPlans();
    api.getSubjects().then((res) => {
      setSubjects(res.subjects || []);
      if (!formData.subjectId && res.subjects?.length > 0) {
        setFormData((prev) => ({ ...prev, subjectId: res.subjects[0].id }));
      }
    });
  }, []);

  const handleToggleTask = async (taskId: string) => {
    try {
      const res = await api.toggleStudyTask(taskId);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, is_completed: res.task.is_completed } : t))
      );
      if (res.task.is_completed) {
        showToast('Task completed! +15 XP earned ✨', 'success');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subjectId || !formData.examDate) return;

    setIsGenerating(true);
    try {
      const res = await api.generateStudyPlan(formData);
      showToast('AI Daily Study Plan created!', 'success');
      setIsModalOpen(false);
      fetchPlans();
      if (res.plan) loadPlan(res.plan.id);
    } catch (err: any) {
      showToast(err.message || 'Generation failed', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm('Delete this study plan?')) return;
    try {
      await api.deleteStudyPlan(planId);
      showToast('Plan deleted', 'success');
      fetchPlans();
      setActivePlan(null);
      setTasks([]);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const completedCount = tasks.filter((t) => t.is_completed === 1).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.studyPlan.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Personalized daily schedule tailored to your available hours, exam deadlines, and difficulty topics.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          <span>{t.studyPlan.createPlan}</span>
        </button>
      </div>

      {/* Plan Selector & Progress Dashboard */}
      {plans.length > 0 && activePlan && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Select Plan:</span>
              <select
                value={activePlan.id}
                onChange={(e) => loadPlan(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.subject_name} (Exam: {p.exam_date})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Pace: <span className="font-bold">{activePlan.daily_hours}h / day</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Target: <span className="font-bold text-blue-600">{activePlan.target_grade}</span>
              </span>
              <button
                onClick={() => handleDeletePlan(activePlan.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                title="Delete plan"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300">
                Preparation Progress ({completedCount} of {tasks.length} tasks completed)
              </span>
              <span className="text-blue-600 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          Daily Study Timeline
        </h2>

        {tasks.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <CalendarCheck className="w-12 h-12 text-blue-500 mx-auto" />
            <div className="font-bold text-slate-800 dark:text-slate-200 text-base">
              No study plans active.
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create a personalized daily study timeline for your upcoming semester exams.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700"
            >
              Generate Daily Study Plan
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isDone = task.is_completed === 1;
              return (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                    isDone
                      ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-75'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-blue-300 shadow-xs'
                  }`}
                >
                  <button className="mt-0.5 text-blue-600 shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 hover:text-blue-500" />
                    )}
                  </button>

                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          Day {task.day_number}
                        </span>
                        <span className="text-xs text-slate-400">{task.date_str}</span>
                        <span className="text-[10px] uppercase font-semibold text-slate-400">
                          • {task.topic}
                        </span>
                      </div>

                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {task.estimated_minutes} mins
                      </span>
                    </div>

                    <h3
                      className={`font-bold text-sm leading-snug ${
                        isDone
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {task.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {task.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Generate Study Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                {t.studyPlan.createPlan}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGeneratePlan} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Course / Subject *
                </label>
                <select
                  required
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
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
                  Final Exam Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.examDate}
                  onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Daily Hours
                  </label>
                  <select
                    value={formData.dailyHours}
                    onChange={(e) => setFormData({ ...formData, dailyHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value={1}>1 hour / day</option>
                    <option value={1.5}>1.5 hours / day</option>
                    <option value={2}>2 hours / day</option>
                    <option value={3}>3 hours / day</option>
                    <option value={4}>4 hours / day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current Level
                  </label>
                  <select
                    value={formData.currentLevel}
                    onChange={(e) => setFormData({ ...formData, currentLevel: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Grade
                </label>
                <select
                  value={formData.targetGrade}
                  onChange={(e) => setFormData({ ...formData, targetGrade: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="A+">A+ (GPA 4.00)</option>
                  <option value="A">A (GPA 3.75)</option>
                  <option value="A-">A- (GPA 3.50)</option>
                  <option value="B+">B+ (GPA 3.25)</option>
                </select>
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
                  disabled={isGenerating || !formData.subjectId}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isGenerating ? 'Structuring Plan...' : 'Generate Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
