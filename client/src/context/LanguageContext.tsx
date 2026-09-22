import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '../i18n/translations.js';
import { useAuth } from './AuthContext.js';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: typeof translations['en'];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateProfile } = useAuth();
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('study_companion_lang') as Language) || 'en';
  });

  // Sync with user preferred language from profile
  useEffect(() => {
    if (user?.profile?.preferred_language) {
      setLanguageState(user.profile.preferred_language);
      localStorage.setItem('study_companion_lang', user.profile.preferred_language);
    }
  }, [user?.profile?.preferred_language]);

  const setLanguage = (lang: Language) => {
    localStorage.setItem('study_companion_lang', lang);
    setLanguageState(lang);
    if (user && user.profile.preferred_language !== lang) {
      updateProfile({ preferredLanguage: lang }).catch(console.warn);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'bn' : 'en');
  };

  const t = translations[language] || translations['en'];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      <div className={language === 'bn' ? 'bangla-text' : ''}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
