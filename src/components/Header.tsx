import { useTranslation } from 'react-i18next';

const Header = () => {
  const { t, i18n } = useTranslation();

  return (
    <header className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-2xl shadow-lg px-6 py-3 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight drop-shadow-md flex items-center gap-2">
          <span aria-hidden="true">🎨</span> {t('header.title')}
        </h1>
        <p className="mt-1 text-sm md:text-base font-medium opacity-90">
          {t('header.subtitle')}
        </p>
      </div>
      
      <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-xl backdrop-blur-sm">
        <label htmlFor="language-select" className="sr-only">{t('header.language')}</label>
        <span aria-hidden="true">🌍</span>
        <select
          id="language-select"
          className="bg-transparent text-white font-medium outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-white rounded"
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
        >
          <option value="tr" className="text-gray-900">Türkçe</option>
          <option value="en" className="text-gray-900">English</option>
          <option value="ar" className="text-gray-900">العربية (RTL)</option>
        </select>
      </div>
    </header>
  );
};

export default Header;