import React, { useState } from 'react';
import { PartyPopper, UserCheck } from 'lucide-react';
import { Traveler } from '../types';
import { authenticateGroup, authenticateAdmin } from '../api';
import { CITY_ORDER, CITY_STYLE } from '../lib/cityTheme';
import { useLang } from '../lib/i18n';

interface WelcomeScreenProps {
  onGroupAuthenticated: (traveler: Traveler) => void;
  onAdminAuthenticated: () => void;
}

const AVATAR_OPTIONS = ['🌴', '🌺', '☕', '🌊', '🧗', '🦜', '🏖️', '🎒', '🕶️', '🛶', '🌞', '🍉'];

// Esta pantalla usa su propia foto de fondo (no cambia con el tema
// claro/oscuro de la app), así que el texto usa colores fijos en vez de
// los tokens --color-ink/--color-ink2, que sí invierten en modo oscuro y
// se volverían casi invisibles sobre una foto clara.
const TEXT_DARK = 'text-slate-900';
const TEXT_MUTED = 'text-slate-700';

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onGroupAuthenticated,
  onAdminAuthenticated,
}) => {
  const { lang, setLang, t } = useLang();
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
    'w-full rounded-full border border-white/50 bg-white/35 backdrop-blur-md px-5 py-3 text-slate-900 placeholder:text-slate-600/70 shadow-[0_4px_20px_rgba(0,0,0,0.06)] focus:outline-none focus:ring-2 focus:ring-white/70';
  const labelCls = `text-sm font-semibold ${TEXT_DARK}`;

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupError('');

    if (!secretWord.trim()) {
      setGroupError(t('welcome_secret_label'));
      return;
    }
    if (!travelerName.trim()) {
      setGroupError(t('welcome_name_label'));
      return;
    }

    setIsSubmittingGroup(true);
    const result = await authenticateGroup(secretWord, travelerName, selectedAvatar);
    setIsSubmittingGroup(false);

    if (result.success && result.traveler) {
      const traveler = result.traveler;
      setWelcomeResult({ name: traveler.name, isNew: result.isNewTraveler !== false });
      setTimeout(() => onGroupAuthenticated(traveler), 1400);
    } else {
      setGroupError(result.error || 'Palabra secreta inválida.');
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    if (!adminPassword.trim()) {
      setAdminError(t('welcome_admin_password_label'));
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
    <div className="min-h-screen grid place-items-center px-[18px] py-6 relative overflow-hidden">
      <img
        src="/welcome-bg.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-white/10" />

      {/* Selector de idioma, siempre visible en esta pantalla */}
      <div
        className="absolute top-4 right-4 z-10 inline-flex rounded-full border border-white/50 bg-white/35 backdrop-blur-md overflow-hidden text-sm font-semibold"
        role="group"
        aria-label="Idioma / Language"
      >
        <button
          onClick={() => setLang('es')}
          aria-pressed={lang === 'es'}
          className={`px-3 py-1.5 cursor-pointer ${lang === 'es' ? 'bg-slate-900 text-white' : TEXT_DARK}`}
        >
          ES
        </button>
        <button
          onClick={() => setLang('en')}
          aria-pressed={lang === 'en'}
          className={`px-3 py-1.5 cursor-pointer ${lang === 'en' ? 'bg-slate-900 text-white' : TEXT_DARK}`}
        >
          EN
        </button>
      </div>

      <div className="w-[min(480px,100%)] relative z-[1]">
        {welcomeResult ? (
          <div className="text-center grid gap-3 py-10 rounded-3xl bg-white/35 backdrop-blur-md border border-white/50 px-6 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
            <div
              className={`w-14 h-14 rounded-2xl grid place-items-center mx-auto text-white ${
                welcomeResult.isNew ? 'bg-ctg' : 'bg-med'
              }`}
            >
              {welcomeResult.isNew ? (
                <PartyPopper className="w-7 h-7" />
              ) : (
                <UserCheck className="w-7 h-7" />
              )}
            </div>
            <h1 className={`text-[28px] font-bold tracking-[-0.03em] ${TEXT_DARK}`}>
              {t(welcomeResult.isNew ? 'welcome_new_title' : 'welcome_back_title', { name: welcomeResult.name })}
            </h1>
            <p className={TEXT_MUTED}>
              {t(welcomeResult.isNew ? 'welcome_new_sub' : 'welcome_back_sub')}
            </p>
          </div>
        ) : (
          <>
            <h1 className={`text-[clamp(42px,12vw,72px)] font-bold leading-[0.95] tracking-[-0.05em] ${TEXT_DARK} mb-2`}>
              {mode === 'group' ? t('welcome_title_group') : t('welcome_title_admin')}
            </h1>
            <p className={TEXT_MUTED}>{mode === 'group' ? t('welcome_sub_group') : t('welcome_sub_admin')}</p>

            <div className="flex gap-1.5 my-6" aria-hidden="true">
              {CITY_ORDER.map((c) => (
                <i key={c} className={`flex-1 h-2 rounded ${CITY_STYLE[c].dot}`} />
              ))}
            </div>

            {mode === 'group' ? (
              <form onSubmit={handleGroupSubmit} className="grid gap-3.5">
                <label className="grid gap-1.5">
                  <span className={labelCls}>{t('welcome_name_label')}</span>
                  <input
                    id="group-name-input"
                    value={travelerName}
                    onChange={(e) => setTravelerName(e.target.value)}
                    maxLength={24}
                    autoComplete="nickname"
                    placeholder={t('welcome_name_placeholder')}
                    className={fieldCls}
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className={labelCls}>{t('welcome_secret_label')}</span>
                  <input
                    id="group-secret-input"
                    type="password"
                    value={secretWord}
                    onChange={(e) => setSecretWord(e.target.value)}
                    autoComplete="off"
                    placeholder={t('welcome_secret_placeholder')}
                    className={fieldCls}
                  />
                </label>

                <div className="grid gap-1.5">
                  <span className={labelCls}>{t('welcome_avatar_label')}</span>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATAR_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedAvatar(emoji)}
                        aria-pressed={selectedAvatar === emoji}
                        className={`h-11 text-xl grid place-items-center rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                          selectedAvatar === emoji
                            ? 'bg-white/70 border-white/80 scale-105'
                            : 'bg-white/25 border-white/40 hover:bg-white/40'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {groupError && (
                  <p className="text-bad text-sm font-medium bg-white/50 backdrop-blur-md rounded-lg px-3 py-2" role="alert">
                    {groupError}
                  </p>
                )}

                <div className="flex items-center gap-4 flex-wrap mt-1">
                  <button
                    id="btn-join-adventure"
                    type="submit"
                    disabled={isSubmittingGroup}
                    className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white border border-slate-900 font-semibold px-[18px] py-2.5 rounded-full min-h-[44px] hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.15)]"
                  >
                    {isSubmittingGroup ? t('welcome_entering') : t('welcome_enter')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('admin')}
                    className={`${TEXT_DARK} underline text-sm py-1.5 cursor-pointer hover:opacity-70`}
                  >
                    {t('welcome_be_admin')}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAdminSubmit} className="grid gap-3.5">
                <label className="grid gap-1.5">
                  <span className={labelCls}>{t('welcome_admin_password_label')}</span>
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
                  <p className="text-bad text-sm font-medium bg-white/50 backdrop-blur-md rounded-lg px-3 py-2" role="alert">
                    {adminError}
                  </p>
                )}

                <div className="flex items-center gap-4 flex-wrap mt-1">
                  <button
                    id="btn-login-admin"
                    type="submit"
                    disabled={isSubmittingAdmin}
                    className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white border border-slate-900 font-semibold px-[18px] py-2.5 rounded-full min-h-[44px] hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.15)]"
                  >
                    {isSubmittingAdmin ? t('welcome_admin_entering') : t('welcome_admin_enter')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('group')}
                    className={`${TEXT_DARK} underline text-sm py-1.5 cursor-pointer hover:opacity-70`}
                  >
                    {t('welcome_back_to_group')}
                  </button>
                </div>
              </form>
            )}

            <p className={`text-[13px] ${TEXT_MUTED} mt-8`}>{t('welcome_footer')}</p>
          </>
        )}
      </div>
    </div>
  );
};
