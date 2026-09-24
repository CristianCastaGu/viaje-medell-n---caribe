import React from 'react';
import { ActiveTab } from '../types';
import { useLang } from '../lib/i18n';

interface NavigationTabsProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  isAdmin: boolean;
  pendingSuggestionsCount: number;
  activePollsCount: number;
  totalLoansCount: number;
}

// Una sola fila de pastillas con scroll horizontal, igual que el prototipo:
// escala bien a 9 secciones y se comporta igual en celular y computador,
// sin la barra inferior fija que obligaba a recortar nombres.
export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onChangeTab,
  isAdmin,
  pendingSuggestionsCount,
  activePollsCount,
  totalLoansCount,
}) => {
  const { t } = useLang();

  const tabs: { id: ActiveTab; label: string; badge?: number }[] = [
    { id: 'inicio', label: t('tab_inicio') },
    { id: 'itinerario', label: t('tab_ruta') },
    { id: 'lugares', label: t('tab_lugares') },
    { id: 'hospedaje', label: t('tab_hospedaje') },
    { id: 'transporte', label: t('tab_transporte') },
    { id: 'encuestas', label: t('tab_votar'), badge: activePollsCount || undefined },
    { id: 'sugerencias', label: t('tab_ideas'), badge: pendingSuggestionsCount || undefined },
    { id: 'prestamos', label: t('tab_cuentas'), badge: totalLoansCount || undefined },
  ];

  if (isAdmin) {
    tabs.push({ id: 'admin', label: t('tab_admin'), badge: pendingSuggestionsCount || undefined });
  }

  return (
    <nav
      aria-label="Secciones"
      className="sticky top-[57px] z-30 bg-bg/70 backdrop-blur-md border-b border-line/50"
    >
      <div className="max-w-[1040px] mx-auto px-[18px]">
        <div className="flex gap-1 overflow-x-auto py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => onChangeTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 rounded-full text-sm font-medium min-h-[44px] transition-colors cursor-pointer ${
                  isActive ? 'bg-ink text-bg' : 'text-ink2 hover:bg-soft'
                }`}
              >
                {tab.label}
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 rounded-full text-[11px] font-bold ${
                      isActive ? 'bg-bg/25 text-bg' : 'bg-soft text-ink'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
