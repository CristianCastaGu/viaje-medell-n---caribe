// Extrae {lat, lng} de un enlace de Google Maps (o de una coordenada
// pegada directamente), para que el admin no tenga que escribir
// latitud/longitud a mano al agregar un lugar.
//
// Cubre los formatos más comunes:
//  - .../@10.4227,-75.5389,17z...              (mapa centrado ahí)
//  - ...!3d10.4227!4d-75.5389...                (pin exacto de un lugar)
//  - https://maps.google.com/?q=10.4227,-75.5389
//  - "10.4227, -75.5389" pegado tal cual, sin URL
//
// Los enlaces acortados (maps.app.goo.gl, goo.gl/maps, g.co) no traen
// coordenadas en el texto — hay que seguir la redirección primero
// (resolveGoogleMapsLink se encarga de eso desde el servidor, ya que el
// navegador no puede seguir redirecciones cross-origin por CORS).

const NUM = String.raw`-?\d{1,3}\.\d+`;

const PATTERNS: RegExp[] = [
  new RegExp(`!3d(${NUM})!4d(${NUM})`), // pin exacto de un lugar
  new RegExp(`@(${NUM}),(${NUM})`), // centro del mapa visible
  new RegExp(`[?&]q=(${NUM}),(${NUM})`), // ?q=lat,lng
  new RegExp(`[?&]ll=(${NUM}),(${NUM})`), // ?ll=lat,lng
  new RegExp(`^\\s*(${NUM})\\s*,\\s*(${NUM})\\s*$`), // pegado directo: "lat, lng"
];

export function extractLatLngFromText(text: string): { lat: number; lng: number } | null {
  for (const re of PATTERNS) {
    const m = text.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return { lat, lng };
      }
    }
  }
  return null;
}

const SHORTENED_HOSTS = ['goo.gl', 'maps.app.goo.gl', 'g.co', 'app.goo.gl'];

function isShortenedMapsLink(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return SHORTENED_HOSTS.includes(host);
  } catch {
    return false;
  }
}

/**
 * Intenta leer coordenadas directamente del texto/enlace. Si es un
 * enlace acortado y no se encontró nada, lo sigue (fetch con
 * redirección) y vuelve a intentar sobre la URL final.
 */
export async function resolveGoogleMapsLink(input: string): Promise<{ lat: number; lng: number } | null> {
  const trimmed = input.trim();
  const direct = extractLatLngFromText(trimmed);
  if (direct) return direct;

  if (!isShortenedMapsLink(trimmed)) return null;

  const res = await fetch(trimmed, {
    method: 'GET',
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RutaCaribeBot/1.0)' },
  });
  // La URL final (tras seguir el/los redirects) suele traer las
  // coordenadas en alguno de los formatos de arriba.
  const fromUrl = extractLatLngFromText(res.url);
  if (fromUrl) return fromUrl;

  // Algunos acortados solo revelan el destino dentro del HTML (meta
  // refresh / JS), no en la URL final: como último intento, se busca
  // el patrón dentro del cuerpo de la respuesta.
  const body = await res.text();
  return extractLatLngFromText(body);
}
