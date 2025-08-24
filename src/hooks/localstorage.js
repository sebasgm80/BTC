import { useState, useEffect } from 'react';

/**
 * Hook para sincronizar un estado con localStorage.
 *
 * @param {string} key Clave donde se almacenará el valor.
 * @param {*} initialValue Valor inicial usado si no existe nada en localStorage.
 * @returns {[any, Function]} Par con el valor almacenado y una función para actualizarlo.
 */
export function UseLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch {
      // Ignorar errores de escritura
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

