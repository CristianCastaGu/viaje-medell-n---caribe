import { CityCode } from '../types';

// Un color por ciudad, consistente en todo el sistema (calendario, boletos,
// franja de ruta, presupuesto). Los nombres de clase están escritos
// completos y literales a propósito: Tailwind v4 solo genera CSS para
// clases que puede ver como texto en el código fuente, así que construir
// "bg-" + code en tiempo de ejecución no funcionaría.
export const CITY_LABEL: Record<CityCode, string> = {
  bog: 'Bogotá',
  med: 'Medellín',
  ctg: 'Cartagena',
  baq: 'Barranquilla',
  pal: 'Palomino',
  smr: 'Santa Marta',
};

export const CITY_ORDER: CityCode[] = ['bog', 'med', 'ctg', 'baq', 'pal', 'smr'];

interface CityStyle {
  dot: string; // fondo sólido (puntico, franjas)
  text: string;
  border: string;
  borderB4: string; // borde inferior grueso (calendario, tickets)
  soft: string; // fondo suave mezclado con la superficie (chips, stub del ticket)
  ring: string;
}

export const CITY_STYLE: Record<CityCode, CityStyle> = {
  bog: {
    dot: 'bg-bog',
    text: 'text-bog',
    border: 'border-bog',
    borderB4: 'border-b-4 border-bog',
    soft: 'bg-bog/15',
    ring: 'ring-bog',
  },
  med: {
    dot: 'bg-med',
    text: 'text-med',
    border: 'border-med',
    borderB4: 'border-b-4 border-med',
    soft: 'bg-med/15',
    ring: 'ring-med',
  },
  ctg: {
    dot: 'bg-ctg',
    text: 'text-ctg',
    border: 'border-ctg',
    borderB4: 'border-b-4 border-ctg',
    soft: 'bg-ctg/15',
    ring: 'ring-ctg',
  },
  baq: {
    dot: 'bg-baq',
    text: 'text-baq',
    border: 'border-baq',
    borderB4: 'border-b-4 border-baq',
    soft: 'bg-baq/15',
    ring: 'ring-baq',
  },
  pal: {
    dot: 'bg-pal',
    text: 'text-pal',
    border: 'border-pal',
    borderB4: 'border-b-4 border-pal',
    soft: 'bg-pal/15',
    ring: 'ring-pal',
  },
  smr: {
    dot: 'bg-smr',
    text: 'text-smr',
    border: 'border-smr',
    borderB4: 'border-b-4 border-smr',
    soft: 'bg-smr/15',
    ring: 'ring-smr',
  },
};

// Nombre de ciudad completo ("Medellín") -> código corto ("med"). El modelo
// de datos guarda el nombre completo (más legible en la base y en las
// sugerencias); el código corto solo se usa para mapear al color.
export function cityCodeFromName(name: string): CityCode {
  const found = (Object.entries(CITY_LABEL) as [CityCode, string][]).find(
    ([, label]) => label.toLowerCase() === name.toLowerCase()
  );
  return found ? found[0] : 'med';
}
