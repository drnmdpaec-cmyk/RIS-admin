import { useState, useCallback } from 'react';
import { STORAGE_PREFIX } from '@/lib/constants';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const prefixedKey = `${STORAGE_PREFIX}${key}`;

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(prefixedKey);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (e) {
      // Log only the error type — never the raw value, which may include PHI
      // if a previous session stored data that now fails to parse (IEC 62304 §7.4.4)
      // eslint-disable-next-line no-console
      console.warn(`[RIS Admin] localStorage read failed for "${prefixedKey}": ${e instanceof Error ? e.message : typeof e}`);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(prefixedKey, JSON.stringify(valueToStore));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`[RIS Admin] localStorage write failed for "${prefixedKey}": ${e instanceof Error ? e.message : typeof e}`);
      }
    },
    [prefixedKey, storedValue]
  );

  return [storedValue, setValue] as const;
}
