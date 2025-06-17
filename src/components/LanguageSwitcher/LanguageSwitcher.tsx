import type React from 'react';
import { useTranslation } from 'react-i18next';
import { IconLanguage } from '@tabler/icons-react';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLanguage = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLanguage);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="fixed top-10 right-4 z-50 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 shadow-md transition-colors duration-200 flex items-center space-x-2 cursor-pointer"
      title={t('language.switchLanguage')}
    >
      <IconLanguage className="h-4 w-4 text-gray-600" />
      <span className="text-sm font-medium text-gray-700">
        {i18n.language === 'zh' ? t('language.english') : t('language.chinese')}
      </span>
    </button>
  );
};

export default LanguageSwitcher;
