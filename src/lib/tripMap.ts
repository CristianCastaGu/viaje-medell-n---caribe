import { CityCode } from '../types';

// Coordenadas reales (aproximadas a nivel de ciudad/hito, suficientes para
// un mapa de ruta general — no para navegación turno a turno) de las 6
// ciudades de la ruta, en el orden real del viaje.
export const CITY_COORDS: Record<CityCode, [number, number]> = {
  bog: [4.711, -74.0721],
  med: [6.2088, -75.5678],
  ctg: [10.4236, -75.5518],
  baq: [10.993, -74.781],
  pal: [11.2478, -73.5654],
  smr: [11.2404, -74.211],
};

export interface TripLandmark {
  city: CityCode;
  name: string;
  lat: number;
  lng: number;
}

// Un puñado de hitos reales y bien conocidos de la ruta (no todos los
// "places" del itinerario tienen coordenadas verificadas, así que solo se
// listan los que sí — mejor pocos puntos precisos que muchos inventados).
export const TRIP_LANDMARKS: TripLandmark[] = [
  { city: 'med', name: 'Comuna 13', lat: 6.2557, lng: -75.59 },
  { city: 'med', name: 'Guatapé', lat: 6.2322, lng: -75.159 },
  { city: 'ctg', name: 'Castillo San Felipe de Barajas', lat: 10.4227, lng: -75.5389 },
  { city: 'ctg', name: 'Getsemaní', lat: 10.4231, lng: -75.5495 },
  { city: 'baq', name: 'Gran Malecón del Río', lat: 10.9878, lng: -74.7847 },
  { city: 'pal', name: 'Parque Tayrona (El Zaino)', lat: 11.3187, lng: -73.907 },
  { city: 'pal', name: 'Playa de Palomino', lat: 11.2554, lng: -73.5586 },
  { city: 'smr', name: 'Centro histórico y bahía', lat: 11.2404, lng: -74.211 },
];

// Orden real de la ruta (incluye el regreso a Bogotá para cerrar el circuito).
export const ROUTE_ORDER: CityCode[] = ['bog', 'med', 'ctg', 'baq', 'pal', 'smr'];
