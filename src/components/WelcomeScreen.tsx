import React, { useState } from 'react';
import { PartyPopper, UserCheck } from 'lucide-react';
import { Traveler } from '../types';
import { authenticateGroup, authenticateAdmin } from '../api';
import { CITY_ORDER, CITY_STYLE } from '../lib/cityTheme';

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

  const [secretWord, setSecretWord] = useState('');
  const [travelerName, setTravelerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [groupError, setGroupError] = useState('');
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);
  const [welcomeResult, setWelcomeResult] = useState<{ name: string; isNew: boolean } | null>(null);

  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  const fieldCls =
    'w-full border-[1.5px] border-line bg-surface rounded-[11px] px-3 py-2.5 text-ink placeholder:text-ink2/60';
  const labelCls = 'text-sm font-semibold text-ink';

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
      const traveler = result.traveler;
      // Mensaje distinto si el nombre ya existía (lo reconocemos y seguimos
      // con ese perfil) o si es la primera vez que alguien lo usa.
      setWelcomeResult({ name: traveler.name, isNew: result.isNewTraveler !== false });
      setTimeout(() => onGroupAuthenticated(traveler), 1400);
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
    <div
      className="min-h-screen grid place-items-center px-[18px] py-6 bg-bg"
      style={{
        backgroundImage:
          'radial-gradient(900px 500px at 85% -10%, color-mix(in srgb, var(--color-pal) 26%, transparent), transparent 70%), radial-gradient(700px 500px at -10% 110%, color-mix(in srgb, var(--color-ctg) 22%, transparent), transparent 70%)',
      }}
    >
      <div className="w-[min(480px,100%)]">
        {welcomeResult ? (
          <div className="text-center grid gap-3 py-10">
            <div
              className={`w-14 h-14 rounded-2xl grid place-items-center mx-auto text-bg ${
                welcomeResult.isNew ? 'bg-ctg' : 'bg-med'
              }`}
            >
              {welcomeResult.isNew ? (
                <PartyPopper className="w-7 h-7" />
              ) : (
                <UserCheck className="w-7 h-7" />
              )}
            </div>
            {welcomeResult.isNew ? (
              <>
                <h1 className="text-[28px] font-bold tracking-[-0.03em] text-ink">
                  ¡Bienvenido a la aventura, {welcomeResult.name}!
                </h1>
                <p className="text-ink2">
                  Ya puedes sugerir lugares, votar los planes y llevar las cuentas con todos.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-[28px] font-bold tracking-[-0.03em] text-ink">
                  ¡Ya te conocemos, {welcomeResult.name}!
                </h1>
                <p className="text-ink2">
                  Ese nombre ya estaba registrado — continuamos con tu perfil y tu historial tal
                  como lo dejaste.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <h1 className="text-[clamp(42px,12vw,72px)] font-bold leading-[0.95] tracking-[-0.05em] text-ink mb-2">
              {mode === 'group' ? 'Bienvenido a la aventura' : 'Panel del organizador'}
            </h1>
            <p className="text-ink2">
              {mode === 'group'
                ? 'Colombia · del 9 al 18 de octubre de 2026'
                : 'Control del itinerario, las ideas del grupo y las encuestas.'}
            </p>

            {/* Una franja por ciudad, en el orden real de la ruta */}
            <div className="flex gap-1.5 my-6" aria-hidden="true">
              {CITY_ORDER.map((c) => (
                <i key={c} className={`flex-1 h-2 rounded ${CITY_STYLE[c].dot}`} />
              ))}
            </div>

            {mode === 'group' ? (
              <form onSubmit={handleGroupSubmit} className="grid gap-3.5">
                <label className="grid gap-1.5">
                  <span className={labelCls}>¿Cómo te quieres llamar en esta aventura?</span>
                  <input
                    id="group-name-input"
                    value={travelerName}
                    onChange={(e) => setTravelerName(e.target.value)}
                    maxLength={24}
                    autoComplete="nickname"
                    placeholder="Tu nombre o apodo"
                    className={fieldCls}
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className={labelCls}>
                    ¿Cuál es la palabra secreta para ser parte de esta aventura?
                  </span>
                  <input
                    id="group-secret-input"
                    type="password"
                    value={secretWord}
                    onChange={(e) => setSecretWord(e.target.value)}
                    autoComplete="off"
                    placeholder="Pídesela al organizador"
                    className={fieldCls}
                  />
                </label>

                <div className="grid gap-1.5">
                  <span className={labelCls}>Elige tu insignia</span>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATAR_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedAvatar(emoji)}
                        aria-pressed={selectedAvatar === emoji}
                        className={`h-11 text-xl grid place-items-center rounded-xl border-[1.5px] transition-all cursor-pointer ${
                          selectedAvatar === emoji
                            ? 'bg-soft border-ink'
                            : 'bg-surface border-line hover:border-ink2'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {groupError && (
                  <p className="text-bad text-sm font-medium" role="alert">
                    {groupError}
                  </p>
                )}

                <div className="flex items-center gap-4 flex-wrap mt-1">
                  <button
                    id="btn-join-adventure"
                    type="submit"
                    disabled={isSubmittingGroup}
                    className="inline-flex items-center justify-center gap-2 bg-ink text-bg border-[1.5px] border-ink font-semibold px-[18px] py-2.5 rounded-xl min-h-[44px] hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingGroup ? 'Entrando...' : 'Entrar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('admin')}
                    className="text-ink2 underline text-sm py-1.5 cursor-pointer hover:text-ink"
                  >
                    Soy el administrador
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAdminSubmit} className="grid gap-3.5">
                <label className="grid gap-1.5">
                  <span className={labelCls}>Contraseña de administrador</span>
                  <input
                    id="admin-password-input"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    autoComplete="off"
                    className={fieldCls}
                  />
                </label>

                {adminError && (
                  <p className="text-bad text-sm font-medium" role="alert">
                    {adminError}
                  </p>
                )}

                <div className="flex items-center gap-4 flex-wrap mt-1">
                  <button
                    id="btn-login-admin"
                    type="submit"
                    disabled={isSubmittingAdmin}
                    className="inline-flex items-center justify-center gap-2 bg-ink text-bg border-[1.5px] border-ink font-semibold px-[18px] py-2.5 rounded-xl min-h-[44px] hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingAdmin ? 'Verificando...' : 'Entrar como admin'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('group')}
                    className="text-ink2 underline text-sm py-1.5 cursor-pointer hover:text-ink"
                  >
                    Volver al acceso del grupo
                  </button>
                </div>
              </form>
            )}

            <p className="text-[13px] text-ink2 mt-8">
              Sin registro ni correos. Tu nombre se recuerda en este navegador.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
