import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  HardDrive,
  Cpu,
  FileText,
  AlertTriangle,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useNotification } from '../context/NotificationContext.js';

export const AdminView: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useNotification();

  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [ovRes, userRes] = await Promise.all([api.getAdminOverview(), api.getAdminUsers()]);
      setOverview(ovRes);
      setUsers(userRes.users || []);
    } catch (err: any) {
      showToast(err.message || 'Access denied or error fetching admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to delete user ${email}? This cannot be undone.`)) return;

    try {
      await api.deleteAdminUser(userId);
      showToast('User account deleted', 'success');
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading admin telemetry...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.nav.admin}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            System administration, AI provider telemetry, storage metrics, and user management.
          </p>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {overview?.metrics?.totalUsers || 0}
            </div>
            <div className="text-xs text-slate-400 font-medium">Total Registered Students</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {overview?.metrics?.totalMaterials || 0}
            </div>
            <div className="text-xs text-slate-400 font-medium">Uploaded Documents</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {overview?.aiUsage?.totalQueries || 0}
            </div>
            <div className="text-xs text-slate-400 font-medium">AI Queries Handled</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {overview?.metrics?.storageMb || 0} MB
            </div>
            <div className="text-xs text-slate-400 font-medium">Disk Storage Used</div>
          </div>
        </div>
      </div>

      {/* AI Telemetry Info Box */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-500" />
          Active AI Service Engine Telemetry
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <div className="text-slate-400 font-medium mb-1">Active AI Provider</div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {overview?.aiUsage?.activeAIProvider || 'Provider Not Loaded'}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <div className="text-slate-400 font-medium mb-1">Total Conversations</div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {overview?.aiUsage?.conversations || 0}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <div className="text-slate-400 font-medium mb-1">Avg Turns / Conversation</div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {overview?.aiUsage?.avgMessagesPerConv || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Users Management Table */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          Registered Users & Accounts ({users.length})
        </h2>

        <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">University & Dept</th>
                <th className="p-4">Streak & XP</th>
                <th className="p-4">Materials</th>
                <th className="p-4">Quizzes</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-4">
                    <div className="font-bold text-slate-900 dark:text-white">{u.name || 'Student'}</div>
                    <div className="text-[11px] text-slate-400">{u.email}</div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        u.role === 'admin'
                          ? 'bg-purple-100 dark:bg-purple-950 text-purple-600'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-600'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <div>{u.university || 'N/A'}</div>
                    <div className="text-[11px] text-slate-400">{u.department}</div>
                  </td>
                  <td className="p-4">
                    <span className="font-semibold">{u.streak_count || 1}d</span> • {u.xp || 100} XP
                  </td>
                  <td className="p-4">{u.material_count || 0}</td>
                  <td className="p-4">{u.quiz_count || 0}</td>
                  <td className="p-4">
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
