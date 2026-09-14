import React, { useState, useEffect, useCallback } from 'react';
import { TripState, Traveler, ActiveTab } from './types';
import { INITIAL_TRIP_STATE } from './defaultData';
import { 
  fetchTripState, getLocalSessionUser, setLocalSessionUser, 
  getLocalAdminSession, setLocalAdminSession 
} from './api';

import { WelcomeScreen } from './components/WelcomeScreen';
import { Navbar } from './components/Navbar';
import { NavigationTabs } from './components/NavigationTabs';
import { ItineraryView } from './components/ItineraryView';
import { FullTripMapView } from './components/FullTripMapView';
import { SuggestionsView } from './components/SuggestionsView';
import { PollsView } from './components/PollsView';
import { LoansView } from './components/LoansView';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';

export default function App() {
  const [tripState, setTripState] = useState<TripState>(INITIAL_TRIP_STATE);
  const [currentUser, setCurrentUser] = useState<Traveler | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('itinerario');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  // Load session from storage on mount
  useEffect(() => {
    const savedUser = getLocalSessionUser();
    const savedAdmin = getLocalAdminSession();
    if (savedUser) setCurrentUser(savedUser);
    if (savedAdmin) setIsAdmin(true);

    // Initial fetch of trip state
    loadState(true);
  }, []);

  const loadState = useCallback(async (isFirst = false) => {
    setIsSyncing(true);
    const state = await fetchTripState();
    setTripState(state);
    setIsSyncing(false);
    if (isFirst) setIsInitialLoading(false);
  }, []);

  // Live polling every 5 seconds for real-time collaboration
  useEffect(() => {
    const interval = setInterval(() => {
      loadState();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadState]);

  const handleGroupAuthenticated = (traveler: Traveler) => {
    setCurrentUser(traveler);
    loadState();
  };

  const handleAdminAuthenticated = () => {
    setIsAdmin(true);
    setLocalAdminSession(true);
    // If no group user session yet, assign an admin profile
    if (!currentUser) {
      const adminTraveler: Traveler = {
        id: 'admin-usr',
        name: 'Administrador (Sabana)',
        avatar: '👑',
        joinedAt: new Date().toISOString(),
      };
      setCurrentUser(adminTraveler);
      setLocalSessionUser(adminTraveler);
    }
    loadState();
  };

  const handleExitAdmin = () => {
    setIsAdmin(false);
    setLocalAdminSession(false);
    if (activeTab === 'admin') {
      setActiveTab('itinerario');
    }
  };

  const handleChangeUser = () => {
    if (window.confirm('¿Deseas salir o cambiar de nombre en este viaje?')) {
      setCurrentUser(null);
      setLocalSessionUser(null);
      setIsAdmin(false);
      setLocalAdminSession(false);
    }
  };

  const handleToggleAutoApprove = async (val: boolean) => {
    try {
      await fetch('/api/trip/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoApprovePolls: val }),
      });
      loadState();
    } catch {}
  };

  // If user is not logged into group nor admin, show welcome screen
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center mx-auto animate-bounce shadow-md">
            🌴
          </div>
          <p className="text-sm font-extrabold text-slate-800">Cargando Centro de Mando...</p>
          <p className="text-xs text-slate-500">Medellín - Caribe 2026</p>
        </div>
      </div>
    );
  }

  if (!currentUser && !isAdmin) {
    return (
      <WelcomeScreen
        onGroupAuthenticated={handleGroupAuthenticated}
        onAdminAuthenticated={handleAdminAuthenticated}
      />
    );
  }

  const pendingSuggestionsCount = tripState.suggestions.filter((s) => s.status === 'pendiente').length;
  const activePollsCount = tripState.polls.filter((p) => p.status === 'activa').length;
  const totalLoansCount = tripState.loans.filter((l) => !l.settled).length;

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col pb-20 md:pb-12 text-slate-900 selection:bg-orange-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        isAdmin={isAdmin}
        onOpenAdminLogin={() => setIsAdminModalOpen(true)}
        onExitAdmin={handleExitAdmin}
        onChangeUser={handleChangeUser}
        onRefresh={() => loadState()}
        isSyncing={isSyncing}
      />

      {/* Navigation Tabs (Desktop strip + Mobile bottom bar) */}
      <NavigationTabs
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        isAdmin={isAdmin}
        pendingSuggestionsCount={pendingSuggestionsCount}
        activePollsCount={activePollsCount}
        totalLoansCount={totalLoansCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4">
        {activeTab === 'itinerario' && (
          <ItineraryView
            itinerary={tripState.itinerary}
            isAdmin={isAdmin}
            currentUser={currentUser}
            onItineraryUpdated={() => loadState()}
            onNavigateToSuggestions={(dayNumber) => {
              setActiveTab('sugerencias');
            }}
          />
        )}

        {activeTab === 'mapa' && (
          <FullTripMapView
            itinerary={tripState.itinerary}
            onSelectDay={(dayNumber) => {
              setActiveTab('itinerario');
            }}
            onNavigateToSuggestions={(dayNumber) => {
              setActiveTab('sugerencias');
            }}
          />
        )}

        {activeTab === 'sugerencias' && (
          <SuggestionsView
            suggestions={tripState.suggestions}
            itinerary={tripState.itinerary}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onRefresh={() => loadState()}
          />
        )}

        {activeTab === 'encuestas' && (
          <PollsView
            polls={tripState.polls}
            currentUser={currentUser}
            isAdmin={isAdmin}
            autoApprovePolls={tripState.config.autoApprovePolls}
            onRefresh={() => loadState()}
            onToggleAutoApprove={handleToggleAutoApprove}
          />
        )}

        {activeTab === 'prestamos' && (
          <LoansView
            loans={tripState.loans}
            travelers={tripState.travelers}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onRefresh={() => loadState()}
          />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminDashboard
            tripState={tripState}
            onRefresh={() => loadState()}
            onSelectTab={setActiveTab}
            onToggleAutoApprove={handleToggleAutoApprove}
          />
        )}
      </main>

      {/* Admin Login Modal (Triggerable from Navbar in Group View) */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={handleAdminAuthenticated}
      />
    </div>
  );
}
