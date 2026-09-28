// Traducción automática de texto libre (ideas, avisos, notas, etc.) cuando
// el grupo ve la app en inglés. Usa el endpoint público y sin llave de
// Google Translate ("gtx", el mismo truco que usan varias librerías open
// source): no requiere cuenta ni costo, a cambio de no tener garantía de
// disponibilidad — por eso cada traducción cae de vuelta al texto original
// si el endpoint falla o tarda demasiado.

const cache = new Map<string, string>();
const MAX_CACHE = 2000;

async function googleTranslate(text: string, source: string, target: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`translate http ${res.status}`);
    const data = await res.json();
    const segments: any[] = data?.[0] ?? [];
    return segments.map((seg) => seg?.[0] ?? '').join('');
  } finally {
    clearTimeout(timeout);
  }
}

export async function translateText(text: string, target: 'en' | 'es'): Promise<string> {
  const trimmed = (text || '').trim();
  if (!trimmed) return text || '';

  const source = target === 'en' ? 'es' : 'en';
  const key = `${target}:${trimmed}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  try {
    const translated = await googleTranslate(trimmed, source, target);
    if (!translated) return text;
    if (cache.size >= MAX_CACHE) cache.clear();
    cache.set(key, translated);
    return translated;
  } catch {
    return text; // fallback: mostramos el texto original si la traducción falla
  }
}
