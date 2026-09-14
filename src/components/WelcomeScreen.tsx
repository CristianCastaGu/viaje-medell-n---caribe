import React, { useState } from 'react';
import { Compass, KeyRound, User, Lock, Sparkles, MapPin, ArrowRight, ShieldCheck } from 'lucide-react';
import { Traveler } from '../types';
import { authenticateGroup, authenticateAdmin } from '../api';

interface WelcomeScreenProps {
  onGroupAuthenticated: (traveler: Traveler) => void;
  onAdminAuthenticated: () => void;
}

const AVATAR_OPTIONS = ['🌴', '🌺', '☕', '🌊', '🧗', '🦜', '🏖️', '🎒', '🕶️', '🛶', '🌞', '🍉'];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onGroupAuthenticated,
  onAdminAuthenticated,
}) => {
  const [mode, setMode] = useState<'group' | 'admin'>('group');
  
  // Group state
  const [secretWord, setSecretWord] = useState('');
  const [travelerName, setTravelerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [groupError, setGroupError] = useState('');
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

  // Admin state
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupError('');

    if (!secretWord.trim()) {
      setGroupError('Por favor ingresa la palabra secreta del viaje.');
      return;
    }
    if (!travelerName.trim()) {
      setGroupError('Por favor dinos cómo te quieres llamar en esta aventura.');
      return;
    }

    setIsSubmittingGroup(true);
    const result = await authenticateGroup(secretWord, travelerName, selectedAvatar);
    setIsSubmittingGroup(false);

    if (result.success && result.traveler) {
      onGroupAuthenticated(result.traveler);
    } else {
      setGroupError(result.error || 'Palabra secreta inválida. Pregúntale a los organizadores.');
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    if (!adminPassword.trim()) {
      setAdminError('Ingresa la contraseña de administrador.');
      return;
    }

    setIsSubmittingAdmin(true);
    const result = await authenticateAdmin(adminPassword);
    setIsSubmittingAdmin(false);

    if (result.success) {
      onAdminAuthenticated();
    } else {
      setAdminError(result.error || 'Contraseña de administrador incorrecta.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/50 to-teal-50/70 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-200/40 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-xl shadow-amber-950/5 border border-amber-100 p-6 sm:p-8 relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-teal-500 text-white shadow-lg shadow-orange-500/20 mb-3 transform hover:scale-105 transition-transform">
            <Compass className="w-8 h-8 animate-pulse" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-amber-100 text-amber-800 mb-2">
            9 al 18 de Octubre • Colombia
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Viaje Medellín - Caribe
          </h1>
          <p className="text-sm text-slate-600 mt-1 flex items-center justify-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-teal-600" />
            Medellín • Cartagena • B/quilla • Palomino • Sta Marta
          </p>
        </div>

        {/* Tab switch between Group and Admin */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-6 border border-slate-200/70 text-sm font-medium">
          <button
            id="tab-group-access"
            type="button"
            onClick={() => setMode('group')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'group'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-orange-500" />
            Acceso Grupo
          </button>
          <button
            id="tab-admin-access"
            type="button"
            onClick={() => setMode('admin')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'admin'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            Administrador
          </button>
        </div>

        {/* Mode: Group Session */}
        {mode === 'group' ? (
          <form onSubmit={handleGroupSubmit} className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-300/60 rounded-2xl p-4 text-center">
              <p className="text-base font-bold text-amber-950">
                "Bienvenido, ¿cómo te quieres llamar en esta aventura?"
              </p>
              <p className="text-xs text-amber-800/80 mt-1">
                Ingresa con la palabra secreta del grupo y elige tu apodo para votar, sugerir y cuadrar cuentas.
              </p>
            </div>

            {/* Step 1: Secret word */}
            <div>
              <label htmlFor="group-secret-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                1. Palabra secreta del viaje
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="group-secret-input"
                  type="password"
                  value={secretWord}
                  onChange={(e) => setSecretWord(e.target.value)}
                  placeholder="Palabra secreta (Desapareceresopcional)"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all placeholder:text-slate-400"
                  autoComplete="off"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Clave de acceso: <span className="font-mono text-slate-600">Desapareceresopcional</span>
              </p>
            </div>

            {/* Step 2: Traveler Name */}
            <div>
              <label htmlFor="group-name-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                2. Tu nombre o apodo en el viaje
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="group-name-input"
                  type="text"
                  value={travelerName}
                  onChange={(e) => setTravelerName(e.target.value)}
                  placeholder="Ej. Sofía, Carlos, Mateo, Pao..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            {/* Avatar Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Elige tu insignia de aventurero
              </label>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedAvatar(emoji)}
                    className={`h-10 text-xl flex items-center justify-center rounded-xl border transition-all ${
                      selectedAvatar === emoji
                        ? 'bg-amber-100 border-amber-500 scale-105 shadow-sm'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {groupError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
                {groupError}
              </div>
            )}

            <button
              id="btn-join-adventure"
              type="submit"
              disabled={isSubmittingGroup}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-teal-500 text-white font-bold text-sm shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmittingGroup ? (
                <span>Ingresando a la expedición...</span>
              ) : (
                <>
                  <span>¡Entrar al Centro de Mando!</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Mode: Admin Session */
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-center">
              <ShieldCheck className="w-7 h-7 text-teal-600 mx-auto mb-1" />
              <p className="text-sm font-bold text-teal-950">
                Panel de Administración Oficial
              </p>
              <p className="text-xs text-teal-800/80 mt-0.5">
                Control total de itinerario, aprobación de sugerencias y encuestas, y balances consolidados.
              </p>
            </div>

            <div>
              <label htmlFor="admin-password-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Contraseña de Administrador
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-password-input"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="adminSabana"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all placeholder:text-slate-400"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Contraseña definida: <span className="font-mono text-slate-600">adminSabana</span>
              </p>
            </div>

            {adminError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
                {adminError}
              </div>
            )}

            <button
              id="btn-login-admin"
              type="submit"
              disabled={isSubmittingAdmin}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md shadow-slate-900/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmittingAdmin ? (
                <span>Verificando credenciales...</span>
              ) : (
                <>
                  <span>Ingresar como Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer credentials reminder */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            Sin registro ni correos. Tu nombre se recordará en este navegador.
          </p>
        </div>
      </div>
    </div>
  );
};
