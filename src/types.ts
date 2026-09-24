export interface Traveler {
  id: string;
  name: string;
  avatar: string;
  joinedAt: string;
}

export type CityCode = 'bog' | 'med' | 'ctg' | 'baq' | 'pal' | 'smr';
export type CityName = 'Bogotá' | 'Medellín' | 'Cartagena' | 'Barranquilla' | 'Palomino' | 'Santa Marta';

export type ActivityCategory = 'visita' | 'comida' | 'transporte' | 'playa' | 'hospedaje' | 'rumba' | 'naturaleza';

export interface ActivityItem {
  id: string;
  time: string;
  title: string;
  description: string;
  category: ActivityCategory;
  costEstimateCOP?: number;
  location?: string;
}

export interface ItineraryDay {
  dayNumber: number; // 1 to 10
  date: string; // e.g. "Viernes 9 de Octubre"
  isoDate: string; // "2026-10-09"
  city: CityName;
  title: string;
  tagline: string;
  lodging: string;
  lodgingNotes?: string;
  transport: string;
  estimatedBudgetCOP: number;
  activities: ActivityItem[];
}

export type PlaceCategory = 'imperdible' | 'comida' | 'rumba' | 'naturaleza' | 'cultura' | 'evento';

export interface Place {
  id: string;
  city: CityName;
  name: string;
  category: PlaceCategory;
  description: string;
  lat?: number;
  lng?: number;
}

export interface Announcement {
  id: string;
  text: string;
  createdAt: string;
}

export interface Lodging {
  id: string;
  city: CityName;
  name: string;
  fromDate: string; // ISO date
  toDate: string; // ISO date
  pricePerNightCOP: number;
  isEstimated: boolean;
  notes: string;
}

export type TransportMode = 'bus' | 'vuelo' | 'otro';

export interface TransportLeg {
  id: string;
  fromCity: string;
  toCity: string;
  date: string; // ISO date
  time: string; // free text, e.g. "Mediodía"
  mode: TransportMode;
  priceCOP: number;
  isEstimated: boolean;
  colorCity: CityCode;
  notes: string;
}

export type SuggestionCategory = 'restaurante' | 'actividad' | 'hospedaje' | 'transporte alterno' | 'rumba/noche' | 'otro';
export type SuggestionStatus = 'pendiente' | 'aprobada' | 'descartada';

export interface Suggestion {
  id: string;
  dayNumber?: number;
  city?: string;
  proposerId: string;
  proposerName: string;
  title: string;
  category: SuggestionCategory;
  description: string;
  estimatedCostCOP?: number;
  status: SuggestionStatus;
  createdAt: string;
  adminNote?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // traveler names
}

export interface Poll {
  id: string;
  question: string;
  description?: string;
  options: PollOption[];
  createdBy: string;
  creatorRole: 'admin' | 'traveler';
  status: 'activa' | 'cerrada' | 'pendiente';
  createdAt: string;
}

export interface Loan {
  id: string;
  lender: string; // Quién prestó
  borrower: string; // A quién
  amount: number; // Monto en COP
  concept: string; // Concepto libre ej. "taxi", "cena"
  createdAt: string; // ISO string auto-generada
  settled?: boolean;
}

export interface Settlement {
  from: string; // Deudor
  to: string; // Acreedor
  amount: number; // Monto neto
}

export interface TripState {
  itinerary: ItineraryDay[];
  travelers: Traveler[];
  suggestions: Suggestion[];
  polls: Poll[];
  loans: Loan[];
  places: Place[];
  lodging: Lodging[];
  transportLegs: TransportLeg[];
  announcements: Announcement[];
  config: {
    autoApprovePolls: boolean;
    tripName: string;
    dates: string;
    cities: string[];
  };
}

export type ActiveTab =
  | 'inicio'
  | 'itinerario'
  | 'lugares'
  | 'hospedaje'
  | 'transporte'
  | 'sugerencias'
  | 'encuestas'
  | 'prestamos'
  | 'admin';
