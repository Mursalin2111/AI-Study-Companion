import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Sparkles,
  GraduationCap,
  Layers,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.js';

export const BottomNav: React.FC = () => {
  const { t } = useLanguage();

  const items = [
    { to: '/', label: t.nav.dashboard, icon: LayoutDashboard },
    { to: '/subjects', label: t.nav.subjects, icon: BookOpen },
    { to: '/materials', label: t.nav.materials, icon: FileText },
    { to: '/ask-ai', label: t.nav.askAi, icon: Sparkles, highlight: true },
    { to: '/quizzes', label: t.nav.quizzes, icon: GraduationCap },
    { to: '/flashcards', label: t.nav.flashcards, icon: Layers },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 z-40">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 w-14 py-1 rounded-xl transition-all ${
                item.highlight
                  ? isActive
                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-blue-500 font-medium'
                  : isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            {item.highlight ? (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 -mt-3">
                <Icon className="w-4 h-4" />
              </div>
            ) : (
              <Icon className="w-5 h-5" />
            )}
            <span className="text-[10px] truncate max-w-[50px]">{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
};
