import { TripState, Suggestion, Poll, Loan, ItineraryDay, Traveler } from './types';
import { INITIAL_TRIP_STATE } from './defaultData';

const LOCAL_STORAGE_KEY = 'medellin_caribe_trip_state_v1';
const SESSION_USER_KEY = 'medellin_caribe_user_session';
const ADMIN_SESSION_KEY = 'medellin_caribe_admin_session';

export function getLocalSessionUser(): Traveler | null {
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setLocalSessionUser(user: Traveler | null) {
  if (!user) {
    localStorage.removeItem(SESSION_USER_KEY);
  } else {
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  }
}

export function getLocalAdminSession(): boolean {
  return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
}

export function setLocalAdminSession(isAdmin: boolean) {
  if (isAdmin) {
    localStorage.setItem(ADMIN_SESSION_KEY, 'true');
  } else {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  }
}

// Fetch current state from server with local backup fallback
export async function fetchTripState(): Promise<TripState> {
  try {
    const res = await fetch('/api/trip/state');
    if (res.ok) {
      const data: TripState = await res.json();
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Backend unavailable, using cached/initial state:', err);
  }

  // Fallback to localStorage or INITIAL_TRIP_STATE
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {}

  return INITIAL_TRIP_STATE;
}

// Group Login / Join
export async function authenticateGroup(secretWord: string, name: string, avatar?: string): Promise<{ success: boolean; traveler?: Traveler; error?: string }> {
  try {
    const res = await fetch('/api/trip/auth-group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretWord, name, avatar }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Error al autenticar' };
    }
    setLocalSessionUser(data.traveler);
    return { success: true, traveler: data.traveler };
  } catch {
    // Client-side fallback if server offline
    if (secretWord.trim().toLowerCase() === 'desapareceresopcional'.toLowerCase()) {
      const traveler: Traveler = {
        id: 'usr-' + Date.now().toString(36),
        name: name.trim(),
        avatar: avatar || '🌴',
        joinedAt: new Date().toISOString(),
      };
      setLocalSessionUser(traveler);
      return { success: true, traveler };
    }
    return { success: false, error: 'Palabra secreta incorrecta (Recuerda: Desapareceresopcional).' };
  }
}

// Admin Login
export async function authenticateAdmin(password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/trip/auth-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setLocalAdminSession(true);
      return { success: true };
    }
    return { success: false, error: data.error || 'Contraseña incorrecta' };
  } catch {
    if (password === 'adminSabana') {
      setLocalAdminSession(true);
      return { success: true };
    }
    return { success: false, error: 'Contraseña de administrador incorrecta.' };
  }
}

// Save Itinerary Day
export async function updateItineraryDay(day: ItineraryDay): Promise<boolean> {
  try {
    const res = await fetch('/api/trip/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(day),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Create Suggestion
export async function createSuggestion(payload: Partial<Suggestion>): Promise<boolean> {
  try {
    const res = await fetch('/api/trip/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Update Suggestion (Approve / Discard)
export async function updateSuggestionStatus(
  id: string,
  status: 'aprobada' | 'descartada',
  adminNote?: string,
  addToItinerary?: boolean,
  targetDayNumber?: number
): Promise<boolean> {
  try {
    const res = await fetch(`/api/trip/suggestions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNote, addToItinerary, targetDayNumber }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Create Poll
export async function createPoll(payload: {
  question: string;
  description?: string;
  options: string[];
  createdBy: string;
  creatorRole: 'admin' | 'traveler';
}): Promise<boolean> {
  try {
    const res = await fetch('/api/trip/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Vote on Poll
export async function voteOnPoll(pollId: string, optionId: string, travelerName: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/trip/polls/${pollId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId, travelerName }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Update Poll Status (Admin)
export async function updatePollStatus(pollId: string, status: 'activa' | 'cerrada' | 'descartada'): Promise<boolean> {
  try {
    const res = await fetch(`/api/trip/polls/${pollId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Create Loan
export async function createLoan(payload: {
  lender: string;
  borrower: string;
  amount: number;
  concept: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/trip/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Delete Loan
export async function deleteLoan(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/trip/loans/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Settle Loan
export async function toggleSettleLoan(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/trip/loans/${id}/settle`, {
      method: 'PATCH',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Reset trip data (Admin)
export async function resetTripData(password: string): Promise<boolean> {
  try {
    const res = await fetch('/api/trip/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
