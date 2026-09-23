import React, { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, Sun, Moon, X } from 'lucide-react';
import { Traveler } from '../types';

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
    <header className="sticky top-0 z-40 bg-bg border-b border-line">
      <div className="max-w-[1040px] mx-auto px-[18px] flex items-center justify-between gap-2.5 py-3">
        {/* Marca */}
        <div className="flex items-baseline gap-2.5 flex-wrap min-w-0">
          <span className="font-bold text-[19px] tracking-[-0.02em] text-ink">Ruta Caribe</span>
          <span className="hidden sm:inline text-[13px] font-medium text-ink2">
            9–18 oct 2026 · Bogotá y el Caribe
          </span>
        </div>

        {/* Herramientas */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="p-2 text-ink2 hover:text-ink rounded-lg transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            id="btn-sync-state"
            onClick={onRefresh}
            title="Sincronizar cambios en vivo"
            aria-label="Sincronizar cambios en vivo"
            className="p-2 text-ink2 hover:text-ink rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-pal' : ''}`} />
          </button>

          {isAdmin ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-ink border border-line bg-surface px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-med" />
              admin
              <button
                id="btn-exit-admin"
                onClick={onExitAdmin}
                title="Volver a vista de viajero"
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
              <span className="hidden sm:inline">Soy</span> admin
            </button>
          )}

          {currentUser && (
            <button
              id="btn-change-user"
              onClick={onChangeUser}
              title="Cambiar de apodo o salir"
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
