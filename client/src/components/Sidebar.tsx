import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Sparkles,
  Layers,
  GraduationCap,
  CalendarCheck,
  FileEdit,
  BarChart3,
  ShieldCheck,
  Settings,
  LogOut,
  Flame,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  const xp = user.profile?.xp || 100;
  const level = Math.floor(xp / 200) + 1;
  const xpCurrentLevel = xp % 200;
  const xpProgressPercent = Math.min(100, Math.round((xpCurrentLevel / 200) * 100));

  const navItems = [
    { to: '/', label: t.nav.dashboard, icon: LayoutDashboard },
    { to: '/subjects', label: t.nav.subjects, icon: BookOpen },
    { to: '/materials', label: t.nav.materials, icon: FileText },
    { to: '/ask-ai', label: t.nav.askAi, icon: Sparkles, badge: 'RAG' },
    { to: '/flashcards', label: t.nav.flashcards, icon: Layers },
    { to: '/quizzes', label: t.nav.quizzes, icon: GraduationCap },
    { to: '/study-plan', label: t.nav.studyPlan, icon: CalendarCheck },
    { to: '/notes', label: t.nav.notes, icon: FileEdit },
    { to: '/progress', label: t.nav.progress, icon: BarChart3 },
    ...(user.role === 'admin' ? [{ to: '/admin', label: t.nav.admin, icon: ShieldCheck, adminBadge: true }] : []),
    { to: '/settings', label: t.nav.settings, icon: Settings },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-300 z-30 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-200 dark:border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="font-bold text-slate-900 dark:text-white tracking-tight truncate text-base leading-tight">
              {t.appName}
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              {t.appTagline}
            </span>
          </div>
        )}
      </div>

      {/* Student Profile & Gamification Snapshot */}
      {!collapsed && (
        <div className="p-4 mx-3 my-3 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50/50 dark:from-slate-800/80 dark:to-slate-800/40 border border-indigo-100 dark:border-slate-700/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                {user.profile?.streak_count || 1} {t.dashboard.streak}
              </span>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
              <Zap className="w-3 h-3 fill-indigo-500 text-indigo-500" />
              Lvl {level}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
            <span>{t.dashboard.xpEarned}</span>
            <span>{xp} XP</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${xpProgressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="truncate flex-1">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {item.badge}
                </span>
              )}
              {!collapsed && (item as any).adminBadge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  Admin
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          title={collapsed ? t.nav.logout : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{t.nav.logout}</span>}
        </button>
      </div>
    </aside>
  );
};
