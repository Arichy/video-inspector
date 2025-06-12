import type React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLanguage = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLanguage);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="fixed top-4 right-4 z-50 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 shadow-md transition-colors duration-200 flex items-center space-x-2 cursor-pointer"
      title={t('language.switchLanguage')}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 text-gray-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
      <span className="text-sm font-medium text-gray-700">
        {i18n.language === 'zh' ? t('language.english') : t('language.chinese')}
      </span>
    </button>
  );
};

export default LanguageSwitcher;
