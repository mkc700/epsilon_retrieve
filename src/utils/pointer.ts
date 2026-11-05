import { Platform } from 'react-native';

type MediaQueryList = { matches: boolean };

const webGlobals = globalThis as unknown as {
  matchMedia?: (query: string) => MediaQueryList;
};

function matchesMediaQuery(query: string): boolean {
  if (Platform.OS !== 'web' || typeof webGlobals.matchMedia !== 'function') {
    return false;
  }
  try {
    return webGlobals.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/**
 * Ratón o trackpad presentes: en web habilita el clic derecho como disparador
 * de las opciones. En Android/iOS siempre es falso.
 */
export function hasFinePointer(): boolean {
  return matchesMediaQuery('(pointer: fine)');
}
