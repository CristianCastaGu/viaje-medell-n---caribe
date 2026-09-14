import React from 'react';
import { Compass, ShieldCheck, LogOut, RefreshCw, Sparkles, UserCheck } from 'lucide-react';
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

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  isAdmin,
  onOpenAdminLogin,
  onExitAdmin,
  onChangeUser,
  onRefresh,
  isSyncing,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-amber-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-teal-500 flex items-center justify-center text-white shadow-sm shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                Medellín - Caribe
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-orange-100 text-orange-800 border border-orange-200">
                9-18 Oct
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block leading-none mt-0.5">
              Medellín • Cartagena • Barranquilla • Palomino • Santa Marta
            </p>
          </div>
        </div>

        {/* Right: User Status & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Real-time sync indicator */}
          <button
            id="btn-sync-state"
            onClick={onRefresh}
            title="Sincronizar cambios en vivo"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-orange-500' : ''}`} />
          </button>

          {/* Admin badge / trigger */}
          {isAdmin ? (
            <div className="flex items-center gap-1 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-xl text-teal-800 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">Modo</span> Admin
              <button
                id="btn-exit-admin"
                onClick={onExitAdmin}
                className="ml-1 text-teal-700 hover:text-teal-950 underline text-[11px]"
                title="Volver a vista de viajero"
              >
                (Salir)
              </button>
            </div>
          ) : (
            <button
              id="btn-trigger-admin-login"
              onClick={onOpenAdminLogin}
              className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 font-medium border border-slate-200/60 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Acceso</span> Admin
            </button>
          )}

          {/* Current Traveler Profile */}
          {currentUser && (
            <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-200/80 pl-2 pr-1.5 py-1 rounded-xl">
              <span className="text-base" role="img" aria-label="avatar">
                {currentUser.avatar}
              </span>
              <span className="text-xs font-bold text-slate-800 max-w-[90px] sm:max-w-[130px] truncate">
                {currentUser.name}
              </span>
              <button
                id="btn-change-user"
                onClick={onChangeUser}
                title="Cambiar de apodo o salir"
                className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors ml-0.5"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
