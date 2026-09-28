import React, { useEffect, useRef, useState } from 'react';
import { useLang } from './i18n';

// Traduce en vivo el texto libre que escribe el grupo (ideas, avisos,
// notas de hospedaje/transporte, descripciones de lugares...) cuando la
// app está en inglés. El diccionario de i18n.tsx solo cubre "la app
// hablando"; esto cubre lo que escriben las personas. Ver
// src/server/translate.ts para el porqué del enfoque (endpoint gratis,
// sin llave, con fallback al texto original si falla).

const cache = new Map<string, string>();

async function translateText(text: string, target: 'en' | 'es'): Promise<string> {
  if (!text || !text.trim()) return text;
  const key = `${target}:${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  try {
    const res = await fetch('/api/trip/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    const translated = typeof data.translated === 'string' && data.translated ? data.translated : text;
    cache.set(key, translated);
    return translated;
  } catch {
    return text;
  }
}

/** Traduce `text` al inglés cuando el idioma activo es 'en'; en español lo devuelve tal cual. */
export function useAutoTranslate(text: string | undefined | null): string {
  const { lang } = useLang();
  const original = text || '';
  const [translated, setTranslated] = useState(original);
  const requestId = useRef(0);

  useEffect(() => {
    if (lang === 'es' || !original.trim()) {
      setTranslated(original);
      return;
    }
    const id = ++requestId.current;
    setTranslated(original);
    translateText(original, 'en').then((res) => {
      if (requestId.current === id) setTranslated(res);
    });
  }, [original, lang]);

  return lang === 'es' ? original : translated;
}

/** Envoltorio de conveniencia para usar directamente en JSX: <Tx>{texto}</Tx> */
export const Tx: React.FC<{ children: string | undefined | null }> = ({ children }) => (
  <>{useAutoTranslate(children)}</>
);
