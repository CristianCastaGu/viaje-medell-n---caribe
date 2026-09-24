import React, { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, Sun, Moon, X } from 'lucide-react';
import { Traveler } from '../types';
import { useLang } from '../lib/i18n';

interface NavbarProps {
  currentUser: Traveler | null;
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
  onExitAdmin: () => void;
  onChangeUser: () => void;
  onRefresh: () => void;
  isSyncing: boolean;
}

// El tema vive en el atributo data-theme del <html> y en localStorage; el
// index.html lo aplica antes del primer paint para que no haya parpadeo.
function readTheme(): 'light' | 'dark' {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  isAdmin,
  onOpenAdminLogin,
  onExitAdmin,
  onChangeUser,
  onRefresh,
  isSyncing,
}) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { lang, setLang, t } = useLang();

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('rc_theme', next);
    } catch {
      /* modo incógnito o storage bloqueado: el tema dura solo esta sesión */
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-bg/70 backdrop-blur-md border-b border-line/50">
      <div className="max-w-[1040px] mx-auto px-[18px] flex items-center justify-between gap-2.5 py-3">
        {/* Marca */}
        <div className="flex items-baseline gap-2.5 flex-wrap min-w-0">
          <span className="font-bold text-[19px] tracking-[-0.02em] text-ink">Ruta Caribe</span>
          <span className="hidden sm:inline text-[13px] font-medium text-ink2">
            {t('nav_subtitle')}
          </span>
        </div>

        {/* Herramientas */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex border border-line rounded-full overflow-hidden text-[13px] font-semibold" role="group" aria-label="Idioma / Language">
            <button
              onClick={() => setLang('es')}
              aria-pressed={lang === 'es'}
              className={`px-2.5 py-1.5 cursor-pointer ${lang === 'es' ? 'bg-ink text-bg' : 'text-ink2 hover:text-ink'}`}
            >
              ES
            </button>
            <button
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              className={`px-2.5 py-1.5 cursor-pointer ${lang === 'en' ? 'bg-ink text-bg' : 'text-ink2 hover:text-ink'}`}
            >
              EN
            </button>
          </div>

          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? t('nav_theme_dark') : t('nav_theme_light')}
            aria-label={theme === 'dark' ? t('nav_theme_dark') : t('nav_theme_light')}
            className="p-2 text-ink2 hover:text-ink rounded-lg transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            id="btn-sync-state"
            onClick={onRefresh}
            title={t('nav_sync')}
            aria-label={t('nav_sync')}
            className="p-2 text-ink2 hover:text-ink rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-pal' : ''}`} />
          </button>

          {isAdmin ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-ink border border-line bg-surface px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-med" />
              {t('nav_admin_badge')}
              <button
                id="btn-exit-admin"
                onClick={onExitAdmin}
                title={t('nav_admin_exit')}
                className="text-ink2 hover:text-ink cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ) : (
            <button
              id="btn-trigger-admin-login"
              onClick={onOpenAdminLogin}
              className="inline-flex items-center gap-1.5 text-[13px] text-ink2 hover:text-ink border border-line bg-surface px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('nav_admin_enter_prefix')}</span> {t('nav_admin_enter')}
            </button>
          )}

          {currentUser && (
            <button
              id="btn-change-user"
              onClick={onChangeUser}
              title={t('nav_change_user')}
              className="inline-flex items-center gap-1.5 text-[13px] text-ink border border-line bg-surface px-3 py-1.5 rounded-full max-w-[44vw] sm:max-w-none cursor-pointer hover:border-ink transition-colors"
            >
              <span role="img" aria-label="avatar">
                {currentUser.avatar}
              </span>
              <span className="truncate font-medium">{currentUser.name}</span>
              <X className="w-3.5 h-3.5 text-ink2 shrink-0" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
