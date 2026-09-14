import React from 'react';
import { CalendarDays, Map, Lightbulb, Vote, Coins, ShieldCheck } from 'lucide-react';
import { ActiveTab } from '../types';

interface NavigationTabsProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  isAdmin: boolean;
  pendingSuggestionsCount: number;
  activePollsCount: number;
  totalLoansCount: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onChangeTab,
  isAdmin,
  pendingSuggestionsCount,
  activePollsCount,
  totalLoansCount,
}) => {
  const tabs = [
    {
      id: 'itinerario' as ActiveTab,
      label: 'Itinerario',
      sublabel: '9 - 18 Oct',
      icon: CalendarDays,
      color: 'text-amber-600',
    },
    {
      id: 'mapa' as ActiveTab,
      label: 'Mapa',
      icon: Map,
      color: 'text-cyan-600',
    },
    {
      id: 'sugerencias' as ActiveTab,
      label: 'Sugerencias',
      badge: pendingSuggestionsCount > 0 ? pendingSuggestionsCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
      icon: Lightbulb,
      color: 'text-orange-500',
    },
    {
      id: 'encuestas' as ActiveTab,
      label: 'Encuestas',
      badge: activePollsCount > 0 ? activePollsCount : undefined,
      badgeColor: 'bg-teal-500 text-white',
      icon: Vote,
      color: 'text-teal-600',
    },
    {
      id: 'prestamos' as ActiveTab,
      label: 'Préstamos',
      badge: totalLoansCount > 0 ? totalLoansCount : undefined,
      badgeColor: 'bg-emerald-600 text-white',
      icon: Coins,
      color: 'text-emerald-600',
    },
  ];

  if (isAdmin) {
    tabs.push({
      id: 'admin' as ActiveTab,
      label: 'Panel Admin',
      badge: pendingSuggestionsCount > 0 ? pendingSuggestionsCount : undefined,
      badgeColor: 'bg-red-500 text-white',
      icon: ShieldCheck,
      color: 'text-indigo-600',
    });
  }

  return (
    <>
      {/* Desktop / Tablet Navigation Bar */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-2">
        <div className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2 p-1.5 bg-white/80 backdrop-blur-md rounded-2xl border border-amber-100 shadow-xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => onChangeTab(tab.id)}
                className={`relative flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer flex-1 sm:flex-initial ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white text-orange-600' : tab.badgeColor
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Fixed Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1.5 flex justify-around items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`mobile-tab-${tab.id}`}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                isActive ? 'text-orange-600 font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 px-1 rounded-full text-[9px] font-extrabold bg-orange-600 text-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
