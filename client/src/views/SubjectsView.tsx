import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Calendar,
  User,
  FileText,
  GraduationCap,
  Layers,
  FileEdit,
  MoreVertical,
  Trash2,
  Archive,
  ArrowRight,
  X,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { Subject } from '../types/index.js';

export const SubjectsView: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showToast } = useNotification();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    instructor: '',
    color: '#3B82F6',
    examDate: '',
  });

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await api.getSubjects(showArchived);
      setSubjects(res.subjects || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [showArchived]);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      await api.createSubject(formData);
      showToast('Subject created successfully!', 'success');
      setIsModalOpen(false);
      setFormData({
        name: '',
        code: '',
        description: '',
        instructor: '',
        color: '#3B82F6',
        examDate: '',
      });
      fetchSubjects();
    } catch (err: any) {
      showToast(err.message || 'Failed to create subject', 'error');
    }
  };

  const handleDeleteSubject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm(t.subjects.deleteConfirm)) return;

    try {
      await api.deleteSubject(id);
      showToast('Subject deleted successfully', 'success');
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleArchiveSubject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await api.archiveSubject(id);
      showToast(res.isArchived ? 'Subject archived' : 'Subject restored', 'info');
      fetchSubjects();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#EC4899', '#F59E0B', '#6366F1', '#14B8A6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.subjects.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organize your university courses, lecture notes, quizzes, and revision schedules.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              showArchived
                ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {showArchived ? 'Showing Archived' : 'Show Archived'}
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t.subjects.createSubject}</span>
          </button>
        </div>
      </div>

      {/* Grid of Subjects */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="font-bold text-slate-800 dark:text-slate-200 text-base">
            {t.subjects.noSubjects}
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            {t.subjects.createSubject}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((sub) => (
            <div
              key={sub.id}
              onClick={() => navigate(`/subjects/${sub.id}`)}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Top color bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: sub.color || '#3B82F6' }}
              />

              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white shadow-xs"
                    style={{ backgroundColor: sub.color || '#3B82F6' }}
                  >
                    {sub.code || 'COURSE'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleArchiveSubject(e, sub.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      title="Archive subject"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteSubject(e, sub.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                      title="Delete subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h2 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                  {sub.name}
                </h2>

                {sub.instructor && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sub.instructor}</span>
                  </div>
                )}

                {sub.exam_date && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Exam: {new Date(sub.exam_date).toLocaleDateString()}</span>
                  </div>
                )}

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-3 leading-relaxed">
                  {sub.description || 'No description provided.'}
                </p>
              </div>

              {/* Resource Counts Footer */}
              <div className="pt-4 mt-5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-4 gap-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
                <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="font-bold text-slate-800 dark:text-slate-200">{sub.material_count || 0}</div>
                  <div className="text-[10px]">Files</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="font-bold text-slate-800 dark:text-slate-200">{sub.quiz_count || 0}</div>
                  <div className="text-[10px]">Quizzes</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="font-bold text-slate-800 dark:text-slate-200">{sub.deck_count || 0}</div>
                  <div className="text-[10px]">Decks</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="font-bold text-slate-800 dark:text-slate-200">{sub.note_count || 0}</div>
                  <div className="text-[10px]">Notes</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                {t.subjects.createSubject}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Compiler Design"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.subjects.code}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CSE-3101"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.subjects.instructor}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Aminul Islam"
                    value={formData.instructor}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.subjects.examDate}
                </label>
                <input
                  type="date"
                  value={formData.examDate}
                  onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Key topics, syllabus notes, or goals..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Color Theme
                </label>
                <div className="flex items-center gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c })}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        formData.color === c ? 'scale-110 ring-2 ring-offset-2 ring-blue-500' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                >
                  {t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
